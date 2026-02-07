import "dotenv/config";

import fastify from "fastify";
// import dotenv from "dotenv";
import pg from "pg";
import { randomUUID } from "crypto";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import jwt from "@fastify/jwt";
import {
  createToken,
  validateAccessToken,
  validateRefreshToken,
} from "./token.js";
import bcrypt from "fastify-bcrypt";
import cookie from "@fastify/cookie";
import { getTransporter, sendMail } from "./mySMTP.js";
import { uploadToGCS } from "./services/googleCloudService.js";
// dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

export const app = fastify();

app.register(jwt, {
  secret: process.env.JWT_SECRET_KEY,
});
app.register(sensible);
app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }

    const allowedUrl = process.env.CLIENT_URL;
    const urlData = new URL(origin);

    if (
      origin === allowedUrl ||
      urlData.port === "4173" ||
      urlData.port === "5173"
    ) {
      cb(null, true);
      return;
    }

    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
});
app.register(fastifySwagger);
app.register(bcrypt, {
  saltWorkFactor: 8,
});
app.register(cookie, {
  secret: process.env.JWT_SECRET_KEY,
});

async function commitToDB(promise) {
  const [error, data] = await app.to(promise);
  if (error) {
    return app.httpErrors.internalServerError(error.message);
  }
  return data;
}

async function dbQuery(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function dbOne(text, params = []) {
  const rows = await dbQuery(text, params);
  return rows[0] ?? null;
}

function isErrorResult(value) {
  return Boolean(value && typeof value === "object" && value.statusCode >= 400);
}

function parseEntitiesFromText(text) {
  const safeText = typeof text === "string" ? text : "";
  const hashtags = [];
  const mentions = [];
  const seenHashtags = new Set();
  const seenMentions = new Set();

  const hashtagRegex = /(^|[^A-Za-z0-9_])#([A-Za-z0-9_]{1,64})/g;
  const mentionRegex = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{1,30})/g;

  let match;
  while ((match = hashtagRegex.exec(safeText)) !== null) {
    const tokenRaw = match[2];
    const normalized = tokenRaw.toLowerCase();
    const startIndex = match.index + match[1].length;
    const endIndex = startIndex + tokenRaw.length + 1;
    const key = `${normalized}:${startIndex}:${endIndex}`;
    if (seenHashtags.has(key)) continue;
    seenHashtags.add(key);
    hashtags.push({
      token: tokenRaw,
      normalized,
      startIndex,
      endIndex,
    });
  }

  while ((match = mentionRegex.exec(safeText)) !== null) {
    const tokenRaw = match[2];
    const normalized = tokenRaw.toLowerCase();
    const startIndex = match.index + match[1].length;
    const endIndex = startIndex + tokenRaw.length + 1;
    const key = `${normalized}:${startIndex}:${endIndex}`;
    if (seenMentions.has(key)) continue;
    seenMentions.add(key);
    mentions.push({
      token: tokenRaw,
      normalized,
      startIndex,
      endIndex,
    });
  }

  return { hashtags, mentions };
}

async function upsertHashtags(client, hashtagEntities, ownerId, ownerType) {
  if (!Array.isArray(hashtagEntities) || hashtagEntities.length === 0) return;

  const uniqueNormalized = [...new Set(hashtagEntities.map((item) => item.normalized))];
  for (const normalized of uniqueNormalized) {
    const displayName =
      hashtagEntities.find((item) => item.normalized === normalized)?.token ||
      normalized;
    const hashtagRow = await client.query(
      `INSERT INTO "Hashtag" (id, name, "nameNormalized")
       VALUES ($1, $2, $3)
       ON CONFLICT ("nameNormalized")
       DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [randomUUID(), displayName, normalized],
    );
    const hashtagId = hashtagRow.rows[0]?.id;
    if (!hashtagId) continue;

    if (ownerType === "post") {
      await client.query(
        `INSERT INTO "PostHashtag" (id, "postId", "hashtagId")
         VALUES ($1, $2, $3)
         ON CONFLICT ("postId", "hashtagId") DO NOTHING`,
        [randomUUID(), ownerId, hashtagId],
      );
    } else if (ownerType === "comment") {
      await client.query(
        `INSERT INTO "CommentHashtag" (id, "commentId", "hashtagId")
         VALUES ($1, $2, $3)
         ON CONFLICT ("commentId", "hashtagId") DO NOTHING`,
        [randomUUID(), ownerId, hashtagId],
      );
    }
  }
}

async function resolveMentionUsers(client, mentionEntities) {
  if (!Array.isArray(mentionEntities) || mentionEntities.length === 0) {
    return new Map();
  }

  const handles = [...new Set(mentionEntities.map((m) => m.normalized))];
  if (handles.length === 0) return new Map();

  const rows = await client.query(
    `SELECT id,
            LOWER(COALESCE("displayName", '')) AS "displayNameLower",
            LOWER(SPLIT_PART(email, '@', 1)) AS "emailHandleLower"
     FROM "User"
     WHERE LOWER(COALESCE("displayName", '')) = ANY($1::text[])
        OR LOWER(SPLIT_PART(email, '@', 1)) = ANY($1::text[])`,
    [handles],
  );

  const userByHandle = new Map();
  for (const row of rows.rows) {
    if (row.displayNameLower && !userByHandle.has(row.displayNameLower)) {
      userByHandle.set(row.displayNameLower, row.id);
    }
    if (row.emailHandleLower && !userByHandle.has(row.emailHandleLower)) {
      userByHandle.set(row.emailHandleLower, row.id);
    }
  }
  return userByHandle;
}

async function insertMentions(
  client,
  mentionEntities,
  ownerId,
  ownerType,
  authorUserId,
) {
  if (!Array.isArray(mentionEntities) || mentionEntities.length === 0) return [];
  const resolvedUsers = await resolveMentionUsers(client, mentionEntities);
  const mentionedUserIds = new Set();

  for (const mention of mentionEntities) {
    const mentionedUserId = resolvedUsers.get(mention.normalized);
    if (!mentionedUserId || mentionedUserId === authorUserId) continue;
    mentionedUserIds.add(mentionedUserId);

    if (ownerType === "post") {
      await client.query(
        `INSERT INTO "PostMention" (
          id, "postId", "mentionedUserId", "authorUserId", token, "startIndex", "endIndex"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("postId", "mentionedUserId", "startIndex", "endIndex") DO NOTHING`,
        [
          randomUUID(),
          ownerId,
          mentionedUserId,
          authorUserId,
          mention.token,
          mention.startIndex,
          mention.endIndex,
        ],
      );
    } else if (ownerType === "comment") {
      await client.query(
        `INSERT INTO "CommentMention" (
          id, "commentId", "mentionedUserId", "authorUserId", token, "startIndex", "endIndex"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("commentId", "mentionedUserId", "startIndex", "endIndex") DO NOTHING`,
        [
          randomUUID(),
          ownerId,
          mentionedUserId,
          authorUserId,
          mention.token,
          mention.startIndex,
          mention.endIndex,
        ],
      );
    }
  }

  return [...mentionedUserIds];
}

async function insertMentionNotifications(
  client,
  ownerType,
  ownerId,
  authorUserId,
  mentionedUserIds,
) {
  if (!Array.isArray(mentionedUserIds) || mentionedUserIds.length === 0) return;

  for (const mentionedUserId of mentionedUserIds) {
    await client.query(
      `INSERT INTO "MentionNotification" (
        id,
        "recipientUserId",
        "actorUserId",
        "entityType",
        "entityId"
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING`,
      [randomUUID(), mentionedUserId, authorUserId, ownerType, ownerId],
    );
  }
}

app.get("/", () => {
  return "api is active";
});

app.decorate("authenticate", async (req, res) => {
  try {
    return await req.jwtVerify();
  } catch (err) {
    res.send(err);
  }
});

app.get("/generate_token/:userId", async (req, res) => {
  const accessToken = app.jwt.sign({ userId: req.params.userId });
  res.send({ accessToken });
});

app.get(
  "/validate_token",
  {
    onRequest: [app.authenticate],
  },
  async (req) => {
    return req.user;
  },
);

app.get("/users", async () => {
  return await commitToDB(dbQuery('SELECT * FROM "User"'));
});

app.get("/user/me", { onRequest: validateAccessToken }, async (req) => {
  return await commitToDB(
    dbOne('SELECT * FROM "User" WHERE id = $1', [req.authInfo]),
  );
});

app.get("/user/:id", async (req) => {
  const user = await commitToDB(
    dbOne('SELECT * FROM "User" WHERE id = $1', [req.params.id]),
  );
  if (!user || isErrorResult(user)) {
    return user;
  }

  const [followedBy, following] = await Promise.all([
    commitToDB(
      dbQuery('SELECT * FROM "Follows" WHERE "followingId" = $1', [
        req.params.id,
      ]),
    ),
    commitToDB(
      dbQuery('SELECT * FROM "Follows" WHERE "followerId" = $1', [
        req.params.id,
      ]),
    ),
  ]);

  return {
    ...user,
    followedBy: isErrorResult(followedBy) ? [] : followedBy,
    following: isErrorResult(following) ? [] : following,
  };
});

app.get("/seed", async (_, res) => {
  return res
    .code(501)
    .send({ message: "Prisma seed endpoint removed. Use SQL seed scripts." });
});

app.post("/signUp", async (req, res) => {
  const token =
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).toUpperCase().slice(2);

  if (req.body.profileImageSrc == null) {
    req.body.profileImageSrc =
      "https://www.pngrepo.com/png/170303/512/avatar.png";
  }

  try {
    const hash = await app.bcrypt.hash(req.body.password, 10);
    const user = await dbOne(
      `INSERT INTO "User" (
        firstname, lastname, "displayName", "profileImageSrc", "coverImageSrc", website,
        email, password, phone, gender, bio, region, birthday, "confirmationToken"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        req.body.firstname,
        req.body.lastname,
        req.body.displayName ?? null,
        req.body.profileImageSrc ?? null,
        req.body.coverImageSrc ?? null,
        req.body.website ?? null,
        req.body.email,
        hash,
        req.body.phone ?? null,
        req.body.gender,
        req.body.bio ?? null,
        req.body.region ?? null,
        req.body.birthday ?? null,
        token,
      ],
    );

    req.body.name = user.firstname;
    req.body.host = req?.headers?.host;
    req.body.userId = user.id;
    req.body.email = user.email;
    req.body.token = token;

    const accessToken = createToken(user, "1d");
    const transporter = getTransporter();
    await sendMail(transporter, req.body);

    return res.send({
      accessToken,
      userId: user.id,
      msg: "verification code sent succesfully",
    });
  } catch (err) {
    if (err?.code === "23505") {
      if (String(err?.constraint).toLowerCase().includes("email")) {
        return res.code(409).send({ message: "Email already exists" });
      }
      if (String(err?.constraint).toLowerCase().includes("phone")) {
        return res.code(409).send({ message: "Phone number already exists" });
      }
      return res.code(409).send({ message: "Duplicate value conflict" });
    }
    return res.send(app.httpErrors.internalServerError(err.message));
  }
});

app.post("/test/send_verification_email", async (req, res) => {
  const transporter = getTransporter();
  try {
    req.body.name = "a name";
    req.body.host = req?.headers?.host;
    req.body.userId = "random Id";
    await sendMail(transporter, req.body);
    return res.send({ message: "Success: email was sent" });
  } catch (error) {
    return res.code(500).send("error sending mail");
  }
});

app.get("/send_verification_link/:userId", async (req, res) => {
  const token =
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).toUpperCase().slice(2);

  const user = await commitToDB(
    dbOne(
      'UPDATE "User" SET "confirmationToken" = $1 WHERE id = $2 RETURNING *',
      [token, req.params.userId],
    ),
  );

  if (!user || isErrorResult(user)) {
    return res.send(user ?? app.httpErrors.notFound("User not found"));
  }

  if (user.isEmailVerified === true) {
    return res.send({ msg: "email already verified" });
  }

  req.body = {};
  req.body.name = user.firstname;
  req.body.host = req?.headers?.host;
  req.body.userId = user.id;
  req.body.email = user.email;
  req.body.token = token;

  try {
    const transporter = getTransporter();
    await sendMail(transporter, req.body);
    return res.send(token);
  } catch (error) {
    return res.send(error);
  }
});

app.get("/verify_email/:userId/:token", async (req, res) => {
  if (req.params.token === "") {
    return res.send(app.httpErrors.badRequest("empty params"));
  }

  const user = await commitToDB(
    dbOne('SELECT "confirmationToken" FROM "User" WHERE id = $1', [
      req.params.userId,
    ]),
  );

  if (!user || isErrorResult(user)) {
    return res.send(user ?? app.httpErrors.notFound("User not found"));
  }

  if (user.confirmationToken === req.params.token) {
    await commitToDB(
      dbOne(
        'UPDATE "User" SET "isEmailVerified" = true, "confirmationToken" = $1 WHERE id = $2 RETURNING id',
        ["", req.params.userId],
      ),
    );
    return res.send("email verified");
  }

  await commitToDB(
    dbOne(
      'UPDATE "User" SET "confirmationToken" = $1 WHERE id = $2 RETURNING id',
      ["", req.params.userId],
    ),
  );

  return res.send(
    app.httpErrors.badRequest("please generate a new verification link"),
  );
});

app.get("/:userId/isEmailVerified", async (req) => {
  const user = await commitToDB(
    dbOne('SELECT "isEmailVerified" FROM "User" WHERE id = $1', [
      req.params.userId,
    ]),
  );
  return user?.isEmailVerified ?? false;
});

app.get(
  "/auth/refresh",
  { onRequest: validateRefreshToken },
  async (req, res) => {
    const user = await commitToDB(
      dbOne('SELECT * FROM "User" WHERE id = $1', [req.decodedUserId]),
    );
    if (!user || isErrorResult(user)) {
      return res.code(404).send({ message: "user not found" });
    }

    try {
      const accessToken = createToken(user, "30s");
      if (accessToken) {
        return res.code(200).send({ accessToken });
      }
      return res.code(500).send("failed to create access token");
    } catch (err) {
      return res.code(500).send(err);
    }
  },
);

app.route({
  method: "POST",
  url: "/login",
  handler: async (req, res) => {
    const { email, password } = req.body;
    const user = await commitToDB(
      dbOne('SELECT * FROM "User" WHERE email = $1', [email]),
    );

    if (!user || isErrorResult(user)) {
      return res.code(404).send({ message: "user does not exist" });
    }

    const hashedPassword = user.password;
    return app.bcrypt.compare(password, hashedPassword).then((match) => {
      if (match) {
        const accessToken = createToken(user, "1d");
        const refreshToken = createToken(user, "30d");
        res.cookie("refresh_token", refreshToken, {
          maxAge: 60 * 60 * 24 * 30,
          httpOnly: true,
        });
        return res.code(200).send({
          accessToken,
          userId: user.id,
        });
      }
      return res.code(401).send("invalid credentials");
    });
  },
});

app.post("/auth/logout", async (req, res) => {
  const refreshToken = req.cookies["refresh_token"];
  if (!refreshToken) {
    res.code(204);
  }
  await res.clearCookie("refresh_token", {
    httpOnly: true,
  });
  res.send({ message: "cookie cleared" });
});

app.delete("/delete_user/:userId", async (req, res) => {
  try {
    await commitToDB(
      dbOne('DELETE FROM "User" WHERE email = $1 RETURNING id', [
        req.params.userId,
      ]),
    );
    res.send("user deleted succesfully");
  } catch (err) {
    res.send(err);
  }
});

app.patch("/user/:id", async (req, res) => {
  const allowedFields = [
    "firstname",
    "lastname",
    "displayName",
    "phone",
    "bio",
    "region",
    "birthday",
    "profileImageSrc",
    "coverImageSrc",
    "website",
  ];

  const updateData = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  if (Object.keys(updateData).length === 0) {
    return res.code(400).send({ message: "No valid fields to update." });
  }

  const fields = Object.keys(updateData);
  const setClause = fields
    .map((field, idx) => `"${field}" = $${idx + 1}`)
    .join(", ");
  const values = fields.map((field) => updateData[field]);

  try {
    const updatedUser = await commitToDB(
      dbOne(
        `UPDATE "User" SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, req.params.id],
      ),
    );
    return res.code(200).send(updatedUser);
  } catch (error) {
    return res.code(500).send({ message: "Failed to update user." });
  }
});

app.post("/user/:id/upload-image", async (req, res) => {
  const { imageData, imageType = "profile", mimeType } = req.body || {};
  if (!imageData || typeof imageData !== "string") {
    return res.code(400).send({ message: "imageData is required." });
  }
  if (!["profile", "cover"].includes(imageType)) {
    return res
      .code(400)
      .send({ message: "imageType must be either profile or cover." });
  }

  const base64Match = imageData.match(/^data:(.+);base64,(.+)$/);
  if (!base64Match) {
    return res
      .code(400)
      .send({ message: "imageData must be a valid base64 data URL." });
  }

  const detectedMimeType = mimeType || base64Match[1];
  if (!detectedMimeType.startsWith("image/")) {
    return res.code(400).send({ message: "Only image uploads are supported." });
  }

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  const extension = extensionMap[detectedMimeType] || "bin";
  const base64Payload = base64Match[2];
  const buffer = Buffer.from(base64Payload, "base64");
  const maxFileSizeInBytes = 10 * 1024 * 1024;

  if (buffer.length > maxFileSizeInBytes) {
    return res.code(413).send({ message: "Image is larger than 10MB." });
  }

  try {
    const objectName = `users/${req.params.id}/${imageType}-${Date.now()}-${randomUUID()}.${extension}`;
    const uploadedUrl = await uploadToGCS(buffer, objectName, detectedMimeType);
    const imageField =
      imageType === "cover" ? "coverImageSrc" : "profileImageSrc";

    const updatedUser = await commitToDB(
      dbOne(
        `UPDATE "User" SET "${imageField}" = $1 WHERE id = $2 RETURNING *`,
        [uploadedUrl, req.params.id],
      ),
    );

    if (updatedUser?.statusCode >= 400) {
      return res.code(updatedUser.statusCode).send(updatedUser);
    }

    return res.code(200).send({
      message: "Image uploaded successfully.",
      imageType,
      imageUrl: uploadedUrl,
      userId: req.params.id,
    });
  } catch (error) {
    return res.code(500).send({ message: "Failed to upload image." });
  }
});

app.get("/posts", async (request) => {
  const refreshToken = request.cookies["refresh_token"];
  if (refreshToken) {
    void refreshToken;
  }

  return await commitToDB(
    dbQuery(`
      SELECT
        p.*,
        COALESCE((SELECT json_agg(l.*) FROM "Like" l WHERE l."postId" = p.id), '[]'::json) AS likes,
        COALESCE((SELECT json_agg(b.*) FROM "BroadcastPost" b WHERE b."postId" = p.id), '[]'::json) AS broadcasts,
        COALESCE((
          SELECT json_agg(h."nameNormalized")
          FROM "PostHashtag" ph
          JOIN "Hashtag" h ON h.id = ph."hashtagId"
          WHERE ph."postId" = p.id
        ), '[]'::json) AS hashtags,
        COALESCE((
          SELECT json_agg(json_build_object(
            'mentionedUserId', pm."mentionedUserId",
            'token', pm.token,
            'startIndex', pm."startIndex",
            'endIndex', pm."endIndex"
          ))
          FROM "PostMention" pm
          WHERE pm."postId" = p.id
        ), '[]'::json) AS mentions
      FROM "Post" p
    `),
  );
});

app.get("/posts/:id", async (req) => {
  return await commitToDB(
    dbOne(
      `
      SELECT
        p.*,
        COALESCE((SELECT json_agg(l.*) FROM "Like" l WHERE l."postId" = p.id), '[]'::json) AS likes,
        COALESCE((SELECT json_agg(b.*) FROM "BroadcastPost" b WHERE b."postId" = p.id), '[]'::json) AS broadcasts,
        COALESCE((
          SELECT json_agg(h."nameNormalized")
          FROM "PostHashtag" ph
          JOIN "Hashtag" h ON h.id = ph."hashtagId"
          WHERE ph."postId" = p.id
        ), '[]'::json) AS hashtags,
        COALESCE((
          SELECT json_agg(json_build_object(
            'mentionedUserId', pm."mentionedUserId",
            'token', pm.token,
            'startIndex', pm."startIndex",
            'endIndex', pm."endIndex"
          ))
          FROM "PostMention" pm
          WHERE pm."postId" = p.id
        ), '[]'::json) AS mentions
      FROM "Post" p
      WHERE p.id = $1
      `,
      [req.params.id],
    ),
  );
});

app.get("/posts/userId/:id", async (req) => {
  return await commitToDB(
    dbQuery('SELECT * FROM "Post" WHERE "userId" = $1', [req.params.id]),
  );
});

app.post("/posts", async (req, res) => {
  const postId = req.body.id ?? randomUUID();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const postInsert = await client.query(
      `INSERT INTO "Post" (id, title, body, "userId", "displayName", "ogPostId")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        postId,
        req.body.title,
        req.body.body ?? null,
        req.body.userId,
        req.body.displayName ?? null,
        req.body.ogPostId ?? null,
      ],
    );

    const createdPost = postInsert.rows[0];
    const { hashtags, mentions } = parseEntitiesFromText(req.body.body ?? "");
    await upsertHashtags(client, hashtags, postId, "post");
    const mentionedUserIds = await insertMentions(
      client,
      mentions,
      postId,
      "post",
      req.body.userId,
    );
    await insertMentionNotifications(
      client,
      "post",
      postId,
      req.body.userId,
      mentionedUserIds,
    );

    await client.query("COMMIT");
    return createdPost;
  } catch (error) {
    await client.query("ROLLBACK");
    console.log(error);
    return res.code(500).send({ message: "Failed to create post." });
  } finally {
    client.release();
  }
});

app.delete("/post/:id", async (req) => {
  return await commitToDB(
    dbOne('DELETE FROM "Post" WHERE id = $1 RETURNING *', [req.params.id]),
  );
});

app.get("/comments", async () => {
  return await commitToDB(dbQuery('SELECT * FROM "Comment"'));
});

app.get("/:postId/comments", async (req) => {
  const comments = await commitToDB(
    dbQuery(
      'SELECT * FROM "Comment" WHERE "postId" = $1 ORDER BY "createdAt" DESC',
      [req.params.postId],
    ),
  );

  if (!Array.isArray(comments) || comments.length === 0) {
    return comments;
  }

  const commentIds = comments.map((comment) => comment.id);
  const [likes, broadcasts] = await Promise.all([
    commitToDB(
      dbQuery(
        'SELECT * FROM "LikeComment" WHERE "commentId" = ANY($1::text[])',
        [commentIds],
      ),
    ),
    commitToDB(
      dbQuery(
        'SELECT * FROM "BroadcastComment" WHERE "commentId" = ANY($1::text[])',
        [commentIds],
      ),
    ),
  ]);

  const likesByComment = new Map();
  if (Array.isArray(likes)) {
    for (const like of likes) {
      if (!likesByComment.has(like.commentId))
        likesByComment.set(like.commentId, []);
      likesByComment.get(like.commentId).push(like);
    }
  }

  const broadcastsByComment = new Map();
  if (Array.isArray(broadcasts)) {
    for (const broadcast of broadcasts) {
      if (!broadcastsByComment.has(broadcast.commentId)) {
        broadcastsByComment.set(broadcast.commentId, []);
      }
      broadcastsByComment.get(broadcast.commentId).push(broadcast);
    }
  }

  return comments.map((comment) => {
    const children = comments
      .filter((child) => child.parentId === comment.id)
      .map((child) => ({
        ...child,
        likes: likesByComment.get(child.id) ?? [],
        broadcasts: broadcastsByComment.get(child.id) ?? [],
      }));

    return {
      ...comment,
      likes: likesByComment.get(comment.id) ?? [],
      broadcasts: broadcastsByComment.get(comment.id) ?? [],
      children,
    };
  });
});

app.get("/comment/:commentId", async (req) => {
  const comment = await commitToDB(
    dbOne('SELECT * FROM "Comment" WHERE id = $1', [req.params.commentId]),
  );
  if (!comment || isErrorResult(comment)) {
    return comment;
  }

  const likes = await commitToDB(
    dbQuery('SELECT * FROM "LikeComment" WHERE "commentId" = $1', [
      req.params.commentId,
    ]),
  );

  return {
    ...comment,
    likes: isErrorResult(likes) ? [] : likes,
  };
});

app.get("/post/:postId/comment_count", async (req) => {
  const result = await commitToDB(
    dbOne('SELECT COUNT(*)::int AS count FROM "Comment" WHERE "postId" = $1', [
      req.params.postId,
    ]),
  );
  return result?.count ?? 0;
});

app.get("/comment/:commentId/comment_count", async (req) => {
  const result = await commitToDB(
    dbOne(
      'SELECT COUNT(*)::int AS count FROM "Comment" WHERE "parentId" = $1',
      [req.params.commentId],
    ),
  );
  return result?.count ?? 0;
});

app.post("/posts/:id/comments", async (req, res) => {
  const commentId = req.body.id ?? randomUUID();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const commentInsert = await client.query(
      `INSERT INTO "Comment" (id, body, "userId", "postId", "displayName", "parentId")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        commentId,
        req.body.body,
        req.body.userId,
        req.params.id,
        req.body.displayName ?? null,
        req.body.parentId ?? null,
      ],
    );
    const createdComment = commentInsert.rows[0];

    const { hashtags, mentions } = parseEntitiesFromText(req.body.body ?? "");
    await upsertHashtags(client, hashtags, commentId, "comment");
    const mentionedUserIds = await insertMentions(
      client,
      mentions,
      commentId,
      "comment",
      req.body.userId,
    );
    await insertMentionNotifications(
      client,
      "comment",
      commentId,
      req.body.userId,
      mentionedUserIds,
    );

    await client.query("COMMIT");
    return createdComment;
  } catch (error) {
    await client.query("ROLLBACK");
    console.log(error);
    return res.code(500).send({ message: "Failed to create comment." });
  } finally {
    client.release();
  }
});

app.get("/search/hashtags", async (req) => {
  const query = String(req.query.q ?? "").trim().toLowerCase();
  if (query.length < 1) return [];

  return await commitToDB(
    dbQuery(
      `SELECT h."nameNormalized" as tag,
              h.name as "displayName",
              COUNT(ph.id)::int as "postCount"
       FROM "Hashtag" h
       LEFT JOIN "PostHashtag" ph ON ph."hashtagId" = h.id
       WHERE h."nameNormalized" LIKE $1
       GROUP BY h.id
       ORDER BY "postCount" DESC, h."nameNormalized" ASC
       LIMIT 10`,
      [`${query}%`],
    ),
  );
});

app.get("/search/users", async (req) => {
  const query = String(req.query.q ?? "").trim().toLowerCase();
  if (query.length < 1) return [];

  return await commitToDB(
    dbQuery(
      `SELECT id, firstname, lastname, "displayName", email
       FROM "User"
       WHERE LOWER(COALESCE("displayName", '')) LIKE $1
          OR LOWER(SPLIT_PART(email, '@', 1)) LIKE $1
       ORDER BY "displayName" NULLS LAST, firstname, lastname
       LIMIT 10`,
      [`${query}%`],
    ),
  );
});

app.get("/hashtags/:tag", async (req) => {
  const tag = String(req.params.tag ?? "").replace(/^#/, "").toLowerCase();
  if (!tag) return [];

  return await commitToDB(
    dbQuery(
      `SELECT p.*,
              COALESCE((SELECT json_agg(l.*) FROM "Like" l WHERE l."postId" = p.id), '[]'::json) AS likes,
              COALESCE((SELECT json_agg(b.*) FROM "BroadcastPost" b WHERE b."postId" = p.id), '[]'::json) AS broadcasts,
              COALESCE((
                SELECT json_agg(h."nameNormalized")
                FROM "PostHashtag" ph2
                JOIN "Hashtag" h ON h.id = ph2."hashtagId"
                WHERE ph2."postId" = p.id
              ), '[]'::json) AS hashtags
       FROM "Post" p
       JOIN "PostHashtag" ph ON ph."postId" = p.id
       JOIN "Hashtag" ht ON ht.id = ph."hashtagId"
       WHERE ht."nameNormalized" = $1
       ORDER BY p."createdAt" DESC`,
      [tag],
    ),
  );
});

app.get("/mentions/:userId", async (req) => {
  return await commitToDB(
    dbQuery(
      `SELECT 'post' as "entityType",
              pm."createdAt",
              pm.token,
              pm."startIndex",
              pm."endIndex",
              pm."authorUserId",
              p.id as "entityId",
              p.body as "entityBody"
       FROM "PostMention" pm
       JOIN "Post" p ON p.id = pm."postId"
       WHERE pm."mentionedUserId" = $1
       UNION ALL
       SELECT 'comment' as "entityType",
              cm."createdAt",
              cm.token,
              cm."startIndex",
              cm."endIndex",
              cm."authorUserId",
              c.id as "entityId",
              c.body as "entityBody"
       FROM "CommentMention" cm
       JOIN "Comment" c ON c.id = cm."commentId"
       WHERE cm."mentionedUserId" = $1
       ORDER BY "createdAt" DESC`,
      [req.params.userId],
    ),
  );
});

app.get("/notifications/mentions/:userId", async (req) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
  return await commitToDB(
    dbQuery(
      `SELECT mn.*,
              actor."displayName" AS "actorDisplayName",
              actor."profileImageSrc" AS "actorProfileImageSrc",
              actor.firstname AS "actorFirstName",
              actor.lastname AS "actorLastName",
              actor.email AS "actorEmail",
              CASE
                WHEN mn."entityType" = 'post' THEN p.body
                WHEN mn."entityType" = 'comment' THEN c.body
                ELSE NULL
              END AS "entityBody"
       FROM "MentionNotification" mn
       JOIN "User" actor ON actor.id = mn."actorUserId"
       LEFT JOIN "Post" p
         ON mn."entityType" = 'post'
        AND p.id = mn."entityId"
       LEFT JOIN "Comment" c
         ON mn."entityType" = 'comment'
        AND c.id = mn."entityId"
       WHERE mn."recipientUserId" = $1
       ORDER BY mn."createdAt" DESC
       LIMIT $2`,
      [req.params.userId, limit],
    ),
  );
});

app.patch("/notifications/mentions/:id/read", async (req) => {
  return await commitToDB(
    dbOne(
      `UPDATE "MentionNotification"
       SET "isRead" = TRUE
       WHERE id = $1
       RETURNING *`,
      [req.params.id],
    ),
  );
});

app.patch("/notifications/mentions/:userId/read-all", async (req) => {
  return await commitToDB(
    dbOne(
      `WITH updated AS (
        UPDATE "MentionNotification"
        SET "isRead" = TRUE
        WHERE "recipientUserId" = $1
          AND "isRead" = FALSE
        RETURNING id
      )
      SELECT COUNT(*)::int AS "updatedCount" FROM updated`,
      [req.params.userId],
    ),
  );
});

app.delete("/comment/:id", async (req) => {
  return await commitToDB(
    dbOne('DELETE FROM "Comment" WHERE id = $1 RETURNING *', [req.params.id]),
  );
});

app.get("/follows", async () => {
  return await commitToDB(dbQuery('SELECT * FROM "Follows"'));
});

app.post("/follows", async (req, res) => {
  const { followerId, followingId } = req.body ?? {};
  if (!followerId || !followingId) {
    return res
      .code(400)
      .send({ message: "followerId and followingId are required." });
  }
  if (followerId === followingId) {
    return res.code(400).send({ message: "You cannot follow yourself." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Serialize follow-toggle operations for this pair to prevent races.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
      [followerId, followingId],
    );

    const deleteResult = await client.query(
      'DELETE FROM "Follows" WHERE "followerId" = $1 AND "followingId" = $2 RETURNING *',
      [followerId, followingId],
    );
    if (deleteResult.rows.length > 0) {
      await client.query("COMMIT");
      return deleteResult.rows[0];
    }

    const insertResult = await client.query(
      'INSERT INTO "Follows" (id, "followerId", "followingId") VALUES ($1, $2, $3) RETURNING *',
      [req.body.id || randomUUID(), followerId, followingId],
    );

    await client.query("COMMIT");
    return insertResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.log(error);
    return res.code(500).send({ message: "Failed to toggle follow." });
  } finally {
    client.release();
  }
});

app.get("/likes", async () => {
  return await commitToDB(dbQuery('SELECT * FROM "Like"'));
});

app.post("/likes", async (req, res) => {
  const { id, userId, postId } = req.body ?? {};
  if (!id || !userId || !postId) {
    return res.code(400).send({ message: "id, userId and postId are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [id]);

    const deleteResult = await client.query(
      'DELETE FROM "Like" WHERE id = $1 RETURNING id',
      [id],
    );
    if (deleteResult.rows.length > 0) {
      await client.query("COMMIT");
      return deleteResult.rows[0];
    }

    const insertResult = await client.query(
      'INSERT INTO "Like" (id, "userId", "postId") VALUES ($1, $2, $3) RETURNING id',
      [id, userId, postId],
    );
    await client.query("COMMIT");
    return insertResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.log(error);
    return res.code(500).send({ message: "Failed to toggle like." });
  } finally {
    client.release();
  }
});

app.get("/broadcastPost", async () => {
  return await commitToDB(dbQuery('SELECT * FROM "BroadcastPost"'));
});

app.post("/broadcastPost", async (req, res) => {
  const { id, userId, ogPostId, displayName } = req.body ?? {};
  if (!id || !userId || !ogPostId) {
    return res
      .code(400)
      .send({ message: "id, userId and ogPostId are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [id]);

    const deleteBroadcast = await client.query(
      'DELETE FROM "BroadcastPost" WHERE id = $1 RETURNING id',
      [id],
    );
    if (deleteBroadcast.rows.length > 0) {
      await client.query('DELETE FROM "Post" WHERE id = $1', [id]);
      await client.query("COMMIT");
      return deleteBroadcast.rows[0];
    }

    const insertBroadcast = await client.query(
      'INSERT INTO "BroadcastPost" (id, "postId", "userId") VALUES ($1, $2, $3) RETURNING id',
      [id, ogPostId, userId],
    );
    await client.query(
      `INSERT INTO "Post" (id, title, "ogPostId", "userId", "displayName")
       VALUES ($1, $2, $3, $4, $5)`,
      [id, "BROADCAST", ogPostId, userId, displayName],
    );

    await client.query("COMMIT");
    return insertBroadcast.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.log(error);
    return res.code(500).send({ message: "Failed to toggle broadcast post." });
  } finally {
    client.release();
  }
});

app.get("/broadcastComment", async () => {
  return await commitToDB(dbQuery('SELECT * FROM "BroadcastComment"'));
});

app.post("/broadcast_comment", async (req, res) => {
  const { id, userId, ogPostId, displayName } = req.body ?? {};
  if (!id || !userId || !ogPostId) {
    return res
      .code(400)
      .send({ message: "id, userId and ogPostId are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [id]);

    const deleteBroadcastComment = await client.query(
      'DELETE FROM "BroadcastComment" WHERE id = $1 RETURNING id',
      [id],
    );
    if (deleteBroadcastComment.rows.length > 0) {
      await client.query('DELETE FROM "Post" WHERE id = $1', [id]);
      await client.query("COMMIT");
      return deleteBroadcastComment.rows[0];
    }

    const insertBroadcastComment = await client.query(
      'INSERT INTO "BroadcastComment" (id, "userId", "commentId") VALUES ($1, $2, $3) RETURNING id',
      [id, userId, ogPostId],
    );
    await client.query(
      `INSERT INTO "Post" (id, title, "ogPostId", "userId", "displayName")
       VALUES ($1, $2, $3, $4, $5)`,
      [id, "BC_COMMENT", ogPostId, userId, displayName],
    );

    await client.query("COMMIT");
    return insertBroadcastComment.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.log(error);
    return res
      .code(500)
      .send({ message: "Failed to toggle broadcast comment." });
  } finally {
    client.release();
  }
});

app.post("/like_comment", async (req, res) => {
  const { id, userId, commentId } = req.body ?? {};
  if (!id || !userId || !commentId) {
    return res
      .code(400)
      .send({ message: "id, userId and commentId are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [id]);

    const deleteResult = await client.query(
      'DELETE FROM "LikeComment" WHERE id = $1 RETURNING *',
      [id],
    );
    if (deleteResult.rows.length > 0) {
      await client.query("COMMIT");
      return deleteResult.rows[0];
    }

    const insertResult = await client.query(
      'INSERT INTO "LikeComment" (id, "userId", "commentId") VALUES ($1, $2, $3) RETURNING *',
      [id, userId, commentId],
    );
    await client.query("COMMIT");
    return insertResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.log(error);
    return res.code(500).send({ message: "Failed to toggle comment like." });
  } finally {
    client.release();
  }
});

app.listen({ port: process.env.PORT, host: "0.0.0.0" }, (err, addr) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`server is live at ${addr}`);
});
