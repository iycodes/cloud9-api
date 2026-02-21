export function registerPostRoutes({
  app,
  commitToDB,
  postRepo,
  userRepo,
  entityRepo,
  trendRepo,
  isErrorResult,
  pool,
  randomUUID,
  parseEntitiesFromText,
  uploadToR2,
  compressPostImageBuffer,
}) {
  const PRIVATE_MEDIA_BUCKET = process.env.R2_BUCKET_NAME?.trim();
  if (!PRIVATE_MEDIA_BUCKET) {
    throw new Error("R2_BUCKET_NAME is required for post and comment media uploads.");
  }
  const MAX_IMAGES_PER_POST = 2;
  const MAX_IMAGES_PER_COMMENT = 1;
  const MAX_IMAGE_INPUT_BYTES = 10 * 1024 * 1024;
  const MAX_IMAGE_OUTPUT_BYTES = 5 * 1024 * 1024;
  const ALLOWED_IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/avif",
    "image/bmp",
    "image/tiff",
  ]);
  const TREND_TEXT_STOPWORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "had",
    "has",
    "have",
    "he",
    "her",
    "here",
    "hers",
    "him",
    "his",
    "how",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "me",
    "my",
    "no",
    "not",
    "of",
    "on",
    "or",
    "our",
    "ours",
    "so",
    "she",
    "that",
    "the",
    "their",
    "them",
    "there",
    "they",
    "this",
    "to",
    "too",
    "us",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
    "you",
    "your",
    "yours",
  ]);
  const TREND_HASHTAG_LIMIT = 10;
  const TREND_USER_LIMIT = 10;
  const TREND_TEXT_LIMIT = 20;
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function extractTrendTextTokens(text) {
    const safe = String(text ?? "").toLowerCase();
    if (!safe.trim()) return [];

    const withoutUrls = safe.replace(/https?:\/\/\S+/g, " ");
    const withoutEntities = withoutUrls
      .replace(/(^|[^a-z0-9_])#[a-z0-9_]{1,64}/g, " ")
      .replace(/(^|[^a-z0-9_])@[a-z0-9_]{1,64}/g, " ");

    const matches = withoutEntities.match(/[a-z0-9_]{3,32}/g) || [];
    const tokens = [];
    const seen = new Set();

    for (const token of matches) {
      if (seen.has(token)) continue;
      if (TREND_TEXT_STOPWORDS.has(token)) continue;
      if (/^\d+$/.test(token)) continue;

      seen.add(token);
      tokens.push(token);
      if (tokens.length >= TREND_TEXT_LIMIT) break;
    }

    return tokens;
  }

  function buildTrendSignals({
    sourceType,
    sourceId,
    actorUserId,
    hashtags,
    mentionedUserIds,
    text,
    createdAt,
  }) {
    const normalizedSourceType = sourceType === "comment" ? "comment" : "post";
    const normalizedSourceId = String(sourceId || "").trim();
    const normalizedActorUserId = String(actorUserId || "").trim();
    if (!normalizedSourceId || !normalizedActorUserId) return [];

    const timestamp = createdAt ? new Date(createdAt) : new Date();
    const signals = [];

    signals.push({
      id: randomUUID(),
      entityType: "user",
      entityKey: normalizedActorUserId,
      sourceType: normalizedSourceType,
      sourceId: normalizedSourceId,
      actorUserId: normalizedActorUserId,
      signalKind: "author",
      weight: 0.75,
      createdAt: timestamp,
    });

    const uniqueHashtags = [...new Set((hashtags || []).map((item) => item?.normalized))]
      .filter(Boolean)
      .slice(0, TREND_HASHTAG_LIMIT);

    for (const normalizedHashtag of uniqueHashtags) {
      signals.push({
        id: randomUUID(),
        entityType: "hashtag",
        entityKey: String(normalizedHashtag).toLowerCase(),
        sourceType: normalizedSourceType,
        sourceId: normalizedSourceId,
        actorUserId: normalizedActorUserId,
        signalKind: "hashtag",
        weight: 1.3,
        createdAt: timestamp,
      });
    }

    const uniqueMentionedUsers = [...new Set(mentionedUserIds || [])]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, TREND_USER_LIMIT);

    for (const mentionedUserId of uniqueMentionedUsers) {
      signals.push({
        id: randomUUID(),
        entityType: "user",
        entityKey: mentionedUserId,
        sourceType: normalizedSourceType,
        sourceId: normalizedSourceId,
        actorUserId: normalizedActorUserId,
        signalKind: "mention",
        weight: 2,
        createdAt: timestamp,
      });
    }

    const textTokens = extractTrendTextTokens(text).slice(0, TREND_TEXT_LIMIT);
    for (const token of textTokens) {
      signals.push({
        id: randomUUID(),
        entityType: "text",
        entityKey: token,
        sourceType: normalizedSourceType,
        sourceId: normalizedSourceId,
        actorUserId: normalizedActorUserId,
        signalKind: "text",
        weight: 1,
        createdAt: timestamp,
      });
    }

    return signals;
  }

  function parseBase64Image(imageData, mimeTypeOverride) {
    if (!imageData || typeof imageData !== "string") {
      throw new Error("imageData is required for each file.");
    }

    const base64Match = imageData.match(/^data:(.+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Each file imageData must be a valid base64 data URL.");
    }

    const detectedMimeType = (mimeTypeOverride || base64Match[1] || "").toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(detectedMimeType)) {
      throw new Error("Unsupported image type. Use jpg, png, webp, or gif.");
    }

    const payload = base64Match[2];
    const buffer = Buffer.from(payload, "base64");
    return { buffer, mimeType: detectedMimeType };
  }

  function parseProfileTabLimit(value) {
    const parsed = Number.parseInt(String(value ?? "50"), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 50;
    return Math.min(parsed, 100);
  }

  function parseProfileTabCursor(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;

    const decodeCandidate = (candidate) => {
      try {
        const parsed = JSON.parse(candidate);
        if (!parsed || typeof parsed !== "object") return null;
        if (!parsed.createdAt || !parsed.id) return null;

        const createdAt = new Date(parsed.createdAt);
        if (Number.isNaN(createdAt.getTime())) return null;

        return {
          createdAt: createdAt.toISOString(),
          id: String(parsed.id),
        };
      } catch {
        return null;
      }
    };

    const parsedPlain = decodeCandidate(raw);
    if (parsedPlain) return parsedPlain;

    try {
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      return decodeCandidate(decoded);
    } catch {
      return null;
    }
  }

  function parseProfileTabPagination(query) {
    return {
      limit: parseProfileTabLimit(query?.limit),
      cursor: parseProfileTabCursor(query?.cursor),
    };
  }

  async function getRequesterUserId(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;

    try {
      const token = authHeader.split(" ")[1];
      const payload = await app.jwt.verify(token);
      if (!payload) return null;

      const candidate =
        payload.userId ||
        payload.user?.userId ||
        payload.user?.id ||
        payload.user;
      if (!candidate) return null;
      const normalized = String(candidate);
      if (!UUID_REGEX.test(normalized)) return null;
      return normalized;
    } catch {
      return null;
    }
  }

  function hiddenTabPayload() {
    return {
      hidden: true,
      reason: "hidden",
      items: [],
      pageInfo: {
        hasMore: false,
        nextCursor: null,
      },
    };
  }

  async function canRequesterViewContent({
    ownerUserId,
    requesterUserId,
    visibilityField,
  }) {
    if (!UUID_REGEX.test(String(ownerUserId ?? ""))) {
      return app.httpErrors.badRequest("Invalid user id.");
    }

    if (!requesterUserId) {
      return { allowed: false };
    }

    if (String(ownerUserId) === String(requesterUserId)) {
      return { allowed: true };
    }

    const owner = await commitToDB(userRepo.getUserById(ownerUserId));
    if (!owner || isErrorResult(owner)) {
      return owner ?? app.httpErrors.notFound("User not found.");
    }

    const visibility = String(owner?.[visibilityField] ?? "PRIVATE").toUpperCase();
    if (visibility === "PUBLIC") {
      return { allowed: true };
    }

    if (visibility === "PRIVATE") {
      return { allowed: false };
    }

    const relationship = await commitToDB(
      userRepo.getFollowRelationship(ownerUserId, requesterUserId),
    );
    if (isErrorResult(relationship)) {
      return relationship;
    }

    const requesterFollowsTarget = Boolean(relationship?.requesterFollowsTarget);
    const targetFollowsRequester = Boolean(relationship?.targetFollowsRequester);

    if (visibility === "FOLLOWERS") {
      return { allowed: requesterFollowsTarget };
    }
    if (visibility === "FOLLOWING") {
      return { allowed: targetFollowsRequester };
    }
    if (visibility === "MUTUALS") {
      return { allowed: requesterFollowsTarget && targetFollowsRequester };
    }

    return { allowed: false };
  }

  app.get("/posts", async (request) => {
    const refreshToken = request.cookies["refresh_token"];
    if (refreshToken) {
      void refreshToken;
    }

    return await commitToDB(postRepo.getPostsFeed());
  });

  app.get("/posts/:id", async (req) => {
    return await commitToDB(postRepo.getPostById(req.params.id));
  });

  app.get("/posts/userId/:id", async (req) => {
    return await commitToDB(postRepo.getPostsByUserId(req.params.id));
  });

  app.get("/profile/:userId/tab/posts", async (req) => {
    const { limit, cursor } = parseProfileTabPagination(req.query);
    return await commitToDB(
      postRepo.getProfilePostsTab(req.params.userId, limit, cursor),
    );
  });

  app.get("/profile/:userId/tab/reposts", async (req) => {
    const { limit, cursor } = parseProfileTabPagination(req.query);
    return await commitToDB(
      postRepo.getProfileRepostsTab(req.params.userId, limit, cursor),
    );
  });

  app.get("/profile/:userId/tab/replies", async (req) => {
    const { limit, cursor } = parseProfileTabPagination(req.query);
    return await commitToDB(
      postRepo.getProfileRepliesTab(req.params.userId, limit, cursor),
    );
  });

  app.get("/profile/:userId/tab/media", async (req) => {
    const { limit, cursor } = parseProfileTabPagination(req.query);
    return await commitToDB(
      postRepo.getProfileMediaTab(req.params.userId, limit, cursor),
    );
  });

  app.get("/profile/:userId/tab/likes", async (req) => {
    const { limit, cursor } = parseProfileTabPagination(req.query);
    const requesterUserId = await getRequesterUserId(req);
    const access = await canRequesterViewContent({
      ownerUserId: req.params.userId,
      requesterUserId,
      visibilityField: "likesVisibility",
    });

    if (isErrorResult(access)) return access;
    if (!access?.allowed) return hiddenTabPayload();

    return await commitToDB(
      postRepo.getProfileLikesTab(req.params.userId, limit, cursor),
    );
  });

  app.get("/profile/:userId/tab/bookmarks", async (req) => {
    const { limit, cursor } = parseProfileTabPagination(req.query);
    const requesterUserId = await getRequesterUserId(req);
    const access = await canRequesterViewContent({
      ownerUserId: req.params.userId,
      requesterUserId,
      visibilityField: "bookmarksVisibility",
    });

    if (isErrorResult(access)) return access;
    if (!access?.allowed) return hiddenTabPayload();

    return await commitToDB(
      postRepo.getProfileBookmarksTab(req.params.userId, limit, cursor),
    );
  });

  app.post("/posts/upload-images", async (req, res) => {
    const { userId, files } = req.body ?? {};
    if (!userId) {
      return res.code(400).send({ message: "userId is required." });
    }

    if (!Array.isArray(files) || files.length < 1) {
      return res.code(400).send({ message: "files must be a non-empty array." });
    }

    if (files.length > MAX_IMAGES_PER_POST) {
      return res
        .code(400)
        .send({ message: `A post can have at most ${MAX_IMAGES_PER_POST} images.` });
    }

    const uploadedMedia = [];

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const { buffer, mimeType } = parseBase64Image(
          file?.imageData,
          file?.mimeType,
        );

        if (buffer.length > MAX_IMAGE_INPUT_BYTES) {
          return res
            .code(413)
            .send({ message: `Image ${index + 1} exceeds 10MB.` });
        }

        const processed = await compressPostImageBuffer({
          buffer,
          mimeType,
        });

        if (processed.buffer.length > MAX_IMAGE_OUTPUT_BYTES) {
          return res.code(413).send({
            message: `Compressed image ${index + 1} still exceeds 5MB.`,
          });
        }

        const objectName = `posts/${userId}/${Date.now()}-${randomUUID()}.${processed.extension}`;
        const uploadedUrl = await uploadToR2(
          processed.buffer,
          objectName,
          processed.mimeType,
          PRIVATE_MEDIA_BUCKET,
        );

        uploadedMedia.push({
          url: uploadedUrl,
          mimeType: processed.mimeType,
          sortOrder: index,
          originalBytes: processed.originalBytes,
          outputBytes: processed.outputBytes,
          compressed: processed.compressed,
          animated: processed.animated,
        });
      }

      return res.code(200).send({ media: uploadedMedia });
    } catch (error) {
      const message = error?.message || "Failed to upload post images.";
      if (
        message.includes("required") ||
        message.includes("Unsupported") ||
        message.includes("valid") ||
        message.includes("format")
      ) {
        return res.code(400).send({ message });
      }
      return res.code(500).send({ message: "Failed to upload post images." });
    }
  });

  app.post("/comments/upload-media", async (req, res) => {
    const { userId, file } = req.body ?? {};

    if (!userId) {
      return res.code(400).send({ message: "userId is required." });
    }

    if (!file || typeof file !== "object") {
      return res.code(400).send({ message: "file is required." });
    }

    try {
      const { buffer, mimeType } = parseBase64Image(
        file?.imageData,
        file?.mimeType,
      );

      if (buffer.length > MAX_IMAGE_INPUT_BYTES) {
        return res.code(413).send({ message: "Image exceeds 10MB." });
      }

      const processed = await compressPostImageBuffer({
        buffer,
        mimeType,
      });

      if (processed.buffer.length > MAX_IMAGE_OUTPUT_BYTES) {
        return res.code(413).send({
          message: "Compressed image still exceeds 5MB.",
        });
      }

      const objectName = `comments/${userId}/${Date.now()}-${randomUUID()}.${processed.extension}`;
      const uploadedUrl = await uploadToR2(
        processed.buffer,
        objectName,
        processed.mimeType,
        PRIVATE_MEDIA_BUCKET,
      );

      return res.code(200).send({
        media: {
          url: uploadedUrl,
          mimeType: processed.mimeType,
          originalBytes: processed.originalBytes,
          outputBytes: processed.outputBytes,
          compressed: processed.compressed,
          animated: processed.animated,
        },
      });
    } catch (error) {
      const message = error?.message || "Failed to upload comment media.";
      if (
        message.includes("required") ||
        message.includes("Unsupported") ||
        message.includes("valid") ||
        message.includes("format")
      ) {
        return res.code(400).send({ message });
      }
      return res.code(500).send({ message: "Failed to upload comment media." });
    }
  });

  app.post("/posts", async (req, res) => {
    const requestBody = req.body ?? {};
    const postId = requestBody.id ?? randomUUID();
    const bodyText = typeof requestBody.body === "string" ? requestBody.body : "";
    const mediaInput = Array.isArray(requestBody.media) ? requestBody.media : [];

    if (!requestBody.userId) {
      return res.code(400).send({ message: "userId is required." });
    }

    if (!requestBody.title) {
      return res.code(400).send({ message: "title is required." });
    }

    const hasQuotedTarget = Boolean(
      typeof requestBody.ogPostId === "string" && requestBody.ogPostId.trim(),
    );

    if (!bodyText.trim() && mediaInput.length === 0 && !hasQuotedTarget) {
      return res.code(400).send({ message: "Post must contain text or images." });
    }

    if (mediaInput.length > MAX_IMAGES_PER_POST) {
      return res
        .code(400)
        .send({ message: `A post can have at most ${MAX_IMAGES_PER_POST} images.` });
    }

    const normalizedMedia = [];
    for (let index = 0; index < mediaInput.length; index += 1) {
      const item = mediaInput[index];
      const url = typeof item?.url === "string" ? item.url.trim() : "";
      const mimeType = typeof item?.mimeType === "string" ? item.mimeType.toLowerCase() : "";

      if (!url || !mimeType || !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        return res.code(400).send({
          message: "Each media item must include a valid url and mimeType.",
        });
      }

      normalizedMedia.push({
        id: randomUUID(),
        url,
        mimeType,
        sortOrder: Number.isInteger(item?.sortOrder) ? item.sortOrder : index,
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const postInsert = await postRepo.insertPost(client, {
        id: postId,
        title: requestBody.title,
        body: bodyText || null,
        userId: requestBody.userId,
        displayName: requestBody.displayName,
        ogPostId: requestBody.ogPostId,
      });

      const createdPost = postInsert.rows[0];
      const { hashtags, mentions } = parseEntitiesFromText(bodyText);
      await entityRepo.upsertHashtags(client, hashtags, postId, "post");
      const mentionedUserIds = await entityRepo.insertMentions(
        client,
        mentions,
        postId,
        "post",
        requestBody.userId,
      );
      await entityRepo.insertMentionNotifications(
        client,
        "post",
        postId,
        requestBody.userId,
        mentionedUserIds,
      );
      if (trendRepo?.insertSignals) {
        const trendSignals = buildTrendSignals({
          sourceType: "post",
          sourceId: postId,
          actorUserId: requestBody.userId,
          hashtags,
          mentionedUserIds,
          text: bodyText,
          createdAt: createdPost?.createdAt,
        });
        await trendRepo.insertSignals(client, trendSignals);
      }

      let insertedMedia = { rows: [] };
      if (normalizedMedia.length > 0) {
        insertedMedia = await postRepo.insertPostMedia(client, {
          postId,
          media: normalizedMedia,
        });
      }

      await client.query("COMMIT");
      return {
        ...createdPost,
        media: insertedMedia.rows ?? [],
      };
    } catch (error) {
      await client.query("ROLLBACK");
      console.log(error);
      return res.code(500).send({ message: "Failed to create post." });
    } finally {
      client.release();
    }
  });

  app.delete("/post/:id", async (req) => {
    return await commitToDB(postRepo.deletePostById(req.params.id));
  });

  app.get("/comments", async () => {
    return await commitToDB(postRepo.getAllComments());
  });

  app.get("/:postId/comments", async (req) => {
    const comments = await commitToDB(postRepo.getCommentsByPostId(req.params.postId));

    if (!Array.isArray(comments) || comments.length === 0) {
      return comments;
    }

    const commentIds = comments.map((comment) => comment.id);
    const [likes, broadcasts, mediaRows] = await Promise.all([
      commitToDB(postRepo.getCommentLikesByCommentIds(commentIds)),
      commitToDB(postRepo.getCommentBroadcastsByCommentIds(commentIds)),
      commitToDB(postRepo.getCommentMediaByCommentIds(commentIds)),
    ]);

    const likesByComment = new Map();
    if (Array.isArray(likes)) {
      for (const like of likes) {
        if (!likesByComment.has(like.commentId)) likesByComment.set(like.commentId, []);
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

    const mediaByComment = new Map();
    if (Array.isArray(mediaRows)) {
      for (const media of mediaRows) {
        if (!mediaByComment.has(media.commentId)) {
          mediaByComment.set(media.commentId, []);
        }
        mediaByComment.get(media.commentId).push(media);
      }
    }

    return comments.map((comment) => {
      const children = comments
        .filter((child) => child.parentId === comment.id)
        .map((child) => ({
          ...child,
          likes: likesByComment.get(child.id) ?? [],
          broadcasts: broadcastsByComment.get(child.id) ?? [],
          media: mediaByComment.get(child.id) ?? [],
        }));

      return {
        ...comment,
        likes: likesByComment.get(comment.id) ?? [],
        broadcasts: broadcastsByComment.get(comment.id) ?? [],
        media: mediaByComment.get(comment.id) ?? [],
        children,
      };
    });
  });

  app.get("/comment/:commentId", async (req) => {
    const comment = await commitToDB(postRepo.getCommentById(req.params.commentId));
    if (!comment || isErrorResult(comment)) {
      return comment;
    }

    const [likes, media] = await Promise.all([
      commitToDB(postRepo.getCommentLikesByCommentId(req.params.commentId)),
      commitToDB(postRepo.getCommentMediaByCommentId(req.params.commentId)),
    ]);

    return {
      ...comment,
      likes: isErrorResult(likes) ? [] : likes,
      media: isErrorResult(media) ? [] : media,
    };
  });

  app.get("/post/:postId/comment_count", async (req) => {
    const result = await commitToDB(postRepo.getPostCommentCount(req.params.postId));
    return result?.count ?? 0;
  });

  app.get("/comment/:commentId/comment_count", async (req) => {
    const result = await commitToDB(postRepo.getReplyCommentCount(req.params.commentId));
    return result?.count ?? 0;
  });

  app.post("/posts/:id/comments", async (req, res) => {
    const bodyText = typeof req.body?.body === "string" ? req.body.body : "";
    const mediaInput = Array.isArray(req.body?.media)
      ? req.body.media
      : req.body?.media
        ? [req.body.media]
        : [];

    if (!req.body?.userId) {
      return res.code(400).send({ message: "userId is required." });
    }

    if (!bodyText.trim() && mediaInput.length === 0) {
      return res.code(400).send({ message: "Comment must contain text or media." });
    }

    if (mediaInput.length > MAX_IMAGES_PER_COMMENT) {
      return res
        .code(400)
        .send({ message: `A comment can have at most ${MAX_IMAGES_PER_COMMENT} media item.` });
    }

    const normalizedMedia = [];
    for (let index = 0; index < mediaInput.length; index += 1) {
      const item = mediaInput[index];
      const url = typeof item?.url === "string" ? item.url.trim() : "";
      const mimeType = typeof item?.mimeType === "string" ? item.mimeType.toLowerCase() : "";

      if (!url || !mimeType || !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
        return res.code(400).send({
          message: "Comment media must include a valid url and mimeType.",
        });
      }

      normalizedMedia.push({
        id: randomUUID(),
        url,
        mimeType,
      });
    }

    const commentId = req.body.id ?? randomUUID();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const commentInsert = await postRepo.insertComment(client, {
        id: commentId,
        body: bodyText.trim() ? bodyText : null,
        userId: req.body.userId,
        postId: req.params.id,
        displayName: req.body.displayName,
        parentId: req.body.parentId,
      });
      const createdComment = commentInsert.rows[0];

      let insertedMedia = { rows: [] };
      if (normalizedMedia.length > 0) {
        insertedMedia = await postRepo.insertCommentMedia(client, {
          commentId,
          media: normalizedMedia,
        });
      }

      const { hashtags, mentions } = parseEntitiesFromText(bodyText);
      await entityRepo.upsertHashtags(client, hashtags, commentId, "comment");
      const mentionedUserIds = await entityRepo.insertMentions(
        client,
        mentions,
        commentId,
        "comment",
        req.body.userId,
      );
      await entityRepo.insertMentionNotifications(
        client,
        "comment",
        commentId,
        req.body.userId,
        mentionedUserIds,
      );
      if (trendRepo?.insertSignals) {
        const trendSignals = buildTrendSignals({
          sourceType: "comment",
          sourceId: commentId,
          actorUserId: req.body.userId,
          hashtags,
          mentionedUserIds,
          text: bodyText,
          createdAt: createdComment?.createdAt,
        });
        await trendRepo.insertSignals(client, trendSignals);
      }

      await client.query("COMMIT");
      return {
        ...createdComment,
        media: insertedMedia.rows ?? [],
      };
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

    return await commitToDB(postRepo.searchHashtags(query));
  });

  app.get("/search/users", async (req) => {
    const query = String(req.query.q ?? "").trim().toLowerCase();
    if (query.length < 1) return [];

    return await commitToDB(postRepo.searchUsers(query));
  });

  app.get("/search/posts", async (req) => {
    const rawQuery = String(req.query.q ?? "").trim().toLowerCase();
    const query = rawQuery.replace(/^[@#]+/, "");
    if (query.length < 1) return [];

    const sort = String(req.query.sort ?? "top").toLowerCase() === "latest"
      ? "latest"
      : "top";
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 50));

    return await commitToDB(
      postRepo.searchPosts({
        query,
        sort,
        limit,
      }),
    );
  });

  app.get("/hashtags/:tag", async (req) => {
    const tag = String(req.params.tag ?? "").replace(/^#/, "").toLowerCase();
    if (!tag) return [];

    return await commitToDB(postRepo.getPostsByHashtag(tag));
  });

  app.get("/mentions/:userId", async (req) => {
    return await commitToDB(postRepo.getMentionsByUserId(req.params.userId));
  });

  app.delete("/comment/:id", async (req) => {
    return await commitToDB(postRepo.deleteCommentById(req.params.id));
  });
}
