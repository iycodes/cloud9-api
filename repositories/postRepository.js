export function createPostRepository(sql) {
  const PROFILE_TAB_POST_SELECT = `
      SELECT
        p.*,
        COALESCE((SELECT json_agg(l.*) FROM "Like" l WHERE l."postId" = p.id), '[]'::json) AS likes,
        COALESCE((SELECT json_agg(b.*) FROM "BroadcastPost" b WHERE b."postId" = p.id), '[]'::json) AS broadcasts,
        COALESCE((SELECT COUNT(*)::int FROM "Comment" c WHERE c."postId" = p.id), 0) AS "commentCount",
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', pm.id,
              'url', pm.url,
              'mimeType', pm."mimeType",
              'sortOrder', pm."sortOrder"
            )
            ORDER BY pm."sortOrder" ASC
          )
          FROM "PostMedia" pm
          WHERE pm."postId" = p.id
        ), '[]'::json) AS media,
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
    `;

  function encodePageCursor({ createdAt, id }) {
    if (!createdAt || !id) return null;
    const createdAtIso =
      createdAt instanceof Date ? createdAt.toISOString() : String(createdAt);
    return Buffer.from(
      JSON.stringify({ createdAt: createdAtIso, id: String(id) }),
      "utf8",
    ).toString("base64");
  }

  function normalizeCursor(cursor) {
    if (!cursor || !cursor.createdAt || !cursor.id) {
      return { createdAt: null, id: null };
    }

    const createdAt = new Date(cursor.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return { createdAt: null, id: null };
    }

    return {
      createdAt: createdAt.toISOString(),
      id: String(cursor.id),
    };
  }

  function toPagedResult(rows, limit, cursorKeys = { createdAt: "createdAt", id: "id" }) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const hasMore = safeRows.length > limit;
    const slicedRows = hasMore ? safeRows.slice(0, limit) : safeRows;
    const lastRow = slicedRows[slicedRows.length - 1];

    const nextCursor =
      hasMore && lastRow
        ? encodePageCursor({
            createdAt: lastRow?.[cursorKeys.createdAt],
            id: lastRow?.[cursorKeys.id],
          })
        : null;

    const items = slicedRows.map((row) => {
      if (!row || typeof row !== "object") return row;
      if (!Object.prototype.hasOwnProperty.call(row, "__cursorCreatedAt")) return row;
      const { __cursorCreatedAt, __cursorId, ...rest } = row;
      void __cursorCreatedAt;
      void __cursorId;
      return rest;
    });

    return {
      items,
      pageInfo: {
        hasMore,
        nextCursor,
      },
    };
  }

  return {
    getPostsFeed() {
      return sql.query(`
      SELECT
        p.*,
        COALESCE((SELECT json_agg(l.*) FROM "Like" l WHERE l."postId" = p.id), '[]'::json) AS likes,
        COALESCE((SELECT json_agg(b.*) FROM "BroadcastPost" b WHERE b."postId" = p.id), '[]'::json) AS broadcasts,
        COALESCE((SELECT COUNT(*)::int FROM "Comment" c WHERE c."postId" = p.id), 0) AS "commentCount",
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', pm.id,
              'url', pm.url,
              'mimeType', pm."mimeType",
              'sortOrder', pm."sortOrder"
            )
            ORDER BY pm."sortOrder" ASC
          )
          FROM "PostMedia" pm
          WHERE pm."postId" = p.id
        ), '[]'::json) AS media,
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
    `);
    },

    getPostById(postId) {
      return sql.one(
        `
      SELECT
        p.*,
        COALESCE((SELECT json_agg(l.*) FROM "Like" l WHERE l."postId" = p.id), '[]'::json) AS likes,
        COALESCE((SELECT json_agg(b.*) FROM "BroadcastPost" b WHERE b."postId" = p.id), '[]'::json) AS broadcasts,
        COALESCE((SELECT COUNT(*)::int FROM "Comment" c WHERE c."postId" = p.id), 0) AS "commentCount",
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', pm.id,
              'url', pm.url,
              'mimeType', pm."mimeType",
              'sortOrder', pm."sortOrder"
            )
            ORDER BY pm."sortOrder" ASC
          )
          FROM "PostMedia" pm
          WHERE pm."postId" = p.id
        ), '[]'::json) AS media,
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
        [postId],
      );
    },

    getPostsByUserId(userId) {
      return sql.query(
        `
      SELECT
        p.*,
        COALESCE((SELECT json_agg(l.*) FROM "Like" l WHERE l."postId" = p.id), '[]'::json) AS likes,
        COALESCE((SELECT json_agg(b.*) FROM "BroadcastPost" b WHERE b."postId" = p.id), '[]'::json) AS broadcasts,
        COALESCE((SELECT COUNT(*)::int FROM "Comment" c WHERE c."postId" = p.id), 0) AS "commentCount",
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', pm.id,
              'url', pm.url,
              'mimeType', pm."mimeType",
              'sortOrder', pm."sortOrder"
            )
            ORDER BY pm."sortOrder" ASC
          )
          FROM "PostMedia" pm
          WHERE pm."postId" = p.id
        ), '[]'::json) AS media,
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
      WHERE p."userId" = $1
      ORDER BY p."createdAt" DESC
      `,
        [userId],
      );
    },

    async getProfilePostsTab(userId, limit = 50, cursor = null) {
      const safeCursor = normalizeCursor(cursor);
      const rows = await sql.query(
        `
      ${PROFILE_TAB_POST_SELECT}
      WHERE p."userId" = $1
        AND COALESCE(p.title, '') <> 'BROADCAST'
        AND COALESCE(p.title, '') <> 'BC_COMMENT'
        AND (
          $3::timestamp IS NULL
          OR (p."createdAt", p.id) < ($3::timestamp, $4)
        )
      ORDER BY p."createdAt" DESC, p.id DESC
      LIMIT $2
      `,
        [userId, limit + 1, safeCursor.createdAt, safeCursor.id],
      );

      return toPagedResult(rows, limit);
    },

    async getProfileRepostsTab(userId, limit = 50, cursor = null) {
      const safeCursor = normalizeCursor(cursor);
      const rows = await sql.query(
        `
      ${PROFILE_TAB_POST_SELECT}
      WHERE p."userId" = $1
        AND p.title = 'BROADCAST'
        AND (
          $3::timestamp IS NULL
          OR (p."createdAt", p.id) < ($3::timestamp, $4)
        )
      ORDER BY p."createdAt" DESC, p.id DESC
      LIMIT $2
      `,
        [userId, limit + 1, safeCursor.createdAt, safeCursor.id],
      );

      return toPagedResult(rows, limit);
    },

    async getProfileRepliesTab(userId, limit = 50, cursor = null) {
      const safeCursor = normalizeCursor(cursor);
      const rows = await sql.query(
        `
      SELECT
        c.*,
        COALESCE((SELECT json_agg(lc.*) FROM "LikeComment" lc WHERE lc."commentId" = c.id), '[]'::json) AS likes,
        COALESCE((SELECT json_agg(bc.*) FROM "BroadcastComment" bc WHERE bc."commentId" = c.id), '[]'::json) AS broadcasts,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', cm.id,
              'url', cm.url,
              'mimeType', cm."mimeType",
              'createdAt', cm."createdAt"
            )
            ORDER BY cm."createdAt" ASC
          )
          FROM "CommentMedia" cm
          WHERE cm."commentId" = c.id
        ), '[]'::json) AS media,
        COALESCE((SELECT COUNT(*)::int FROM "Comment" rc WHERE rc."parentId" = c.id), 0) AS "replyCount",
        p.title AS "postTitle",
        p.body AS "postBody",
        p."userId" AS "postUserId",
        p."displayName" AS "postDisplayName"
      FROM "Comment" c
      LEFT JOIN "Post" p ON p.id = c."postId"
      WHERE c."userId" = $1
        AND (
          $3::timestamp IS NULL
          OR (c."createdAt", c.id) < ($3::timestamp, $4)
        )
      ORDER BY c."createdAt" DESC, c.id DESC
      LIMIT $2
      `,
        [userId, limit + 1, safeCursor.createdAt, safeCursor.id],
      );

      return toPagedResult(rows, limit);
    },

    async getProfileMediaTab(userId, limit = 50, cursor = null) {
      const safeCursor = normalizeCursor(cursor);
      const rows = await sql.query(
        `
      ${PROFILE_TAB_POST_SELECT}
      WHERE p."userId" = $1
        AND COALESCE(p.title, '') <> 'BROADCAST'
        AND EXISTS (SELECT 1 FROM "PostMedia" pm WHERE pm."postId" = p.id)
        AND (
          $3::timestamp IS NULL
          OR (p."createdAt", p.id) < ($3::timestamp, $4)
        )
      ORDER BY p."createdAt" DESC, p.id DESC
      LIMIT $2
      `,
        [userId, limit + 1, safeCursor.createdAt, safeCursor.id],
      );

      return toPagedResult(rows, limit);
    },

    async getProfileLikesTab(userId, limit = 50, cursor = null) {
      const safeCursor = normalizeCursor(cursor);
      const rows = await sql.query(
        `
      ${PROFILE_TAB_POST_SELECT}
      JOIN "Like" li ON li."postId" = p.id
      WHERE li."userId" = $1
        AND (
          $3::timestamp IS NULL
          OR (p."createdAt", p.id) < ($3::timestamp, $4)
        )
      ORDER BY p."createdAt" DESC, p.id DESC
      LIMIT $2
      `,
        [userId, limit + 1, safeCursor.createdAt, safeCursor.id],
      );

      return toPagedResult(rows, limit);
    },

    async getProfileBookmarksTab(userId, limit = 50, cursor = null) {
      const safeCursor = normalizeCursor(cursor);
      const rows = await sql.query(
        `
      SELECT
        p.*,
        COALESCE((SELECT json_agg(l.*) FROM "Like" l WHERE l."postId" = p.id), '[]'::json) AS likes,
        COALESCE((SELECT json_agg(b.*) FROM "BroadcastPost" b WHERE b."postId" = p.id), '[]'::json) AS broadcasts,
        COALESCE((SELECT COUNT(*)::int FROM "Comment" c WHERE c."postId" = p.id), 0) AS "commentCount",
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', pm.id,
              'url', pm.url,
              'mimeType', pm."mimeType",
              'sortOrder', pm."sortOrder"
            )
            ORDER BY pm."sortOrder" ASC
          )
          FROM "PostMedia" pm
          WHERE pm."postId" = p.id
        ), '[]'::json) AS media,
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
        ), '[]'::json) AS mentions,
        bp."createdAt" AS "__cursorCreatedAt",
        bp.id AS "__cursorId"
      FROM "Post" p
      JOIN "BookmarkPost" bp ON bp."postId" = p.id
      WHERE bp."userId" = $1
        AND (
          $3::timestamp IS NULL
          OR (bp."createdAt", bp.id) < ($3::timestamp, $4)
        )
      ORDER BY bp."createdAt" DESC, bp.id DESC
      LIMIT $2
      `,
        [userId, limit + 1, safeCursor.createdAt, safeCursor.id],
      );

      return toPagedResult(rows, limit, {
        createdAt: "__cursorCreatedAt",
        id: "__cursorId",
      });
    },

    insertPost(client, { id, title, body, userId, displayName, ogPostId }) {
      return client.query(
        `INSERT INTO "Post" (id, title, body, "userId", "displayName", "ogPostId", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
        [id, title, body ?? null, userId, displayName ?? null, ogPostId ?? null],
      );
    },

    insertPostMedia(client, { postId, media }) {
      if (!Array.isArray(media) || media.length === 0) {
        return Promise.resolve({ rows: [] });
      }

      const values = [];
      const placeholders = media.map((item, index) => {
        const base = index * 6;
        values.push(
          item.id,
          postId,
          item.url,
          item.mimeType,
          Number.isInteger(item.sortOrder) ? item.sortOrder : index,
          item.createdAt ?? null,
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, COALESCE($${base + 6}, NOW()))`;
      });

      return client.query(
        `INSERT INTO "PostMedia" (id, "postId", url, "mimeType", "sortOrder", "createdAt")
         VALUES ${placeholders.join(", ")}
         RETURNING *`,
        values,
      );
    },

    deletePostById(postId) {
      return sql.one('DELETE FROM "Post" WHERE id = $1 RETURNING *', [postId]);
    },

    getAllComments() {
      return sql.query('SELECT * FROM "Comment"');
    },

    getCommentsByPostId(postId) {
      return sql.query(
        'SELECT * FROM "Comment" WHERE "postId" = $1 ORDER BY "createdAt" DESC',
        [postId],
      );
    },

    getCommentMediaByCommentId(commentId) {
      return sql.query(
        'SELECT * FROM "CommentMedia" WHERE "commentId" = $1 ORDER BY "createdAt" ASC',
        [commentId],
      );
    },

    getCommentMediaByCommentIds(commentIds) {
      return sql.query(
        'SELECT * FROM "CommentMedia" WHERE "commentId" = ANY($1::text[]) ORDER BY "createdAt" ASC',
        [commentIds],
      );
    },

    getCommentById(commentId) {
      return sql.one('SELECT * FROM "Comment" WHERE id = $1', [commentId]);
    },

    getCommentLikesByCommentId(commentId) {
      return sql.query('SELECT * FROM "LikeComment" WHERE "commentId" = $1', [
        commentId,
      ]);
    },

    getCommentLikesByCommentIds(commentIds) {
      return sql.query(
        'SELECT * FROM "LikeComment" WHERE "commentId" = ANY($1::text[])',
        [commentIds],
      );
    },

    getCommentBroadcastsByCommentIds(commentIds) {
      return sql.query(
        'SELECT * FROM "BroadcastComment" WHERE "commentId" = ANY($1::text[])',
        [commentIds],
      );
    },

    getPostCommentCount(postId) {
      return sql.one('SELECT COUNT(*)::int AS count FROM "Comment" WHERE "postId" = $1', [
        postId,
      ]);
    },

    getReplyCommentCount(commentId) {
      return sql.one(
        'SELECT COUNT(*)::int AS count FROM "Comment" WHERE "parentId" = $1',
        [commentId],
      );
    },

    insertComment(client, { id, body, userId, postId, displayName, parentId }) {
      return client.query(
        `INSERT INTO "Comment" (id, body, "userId", "postId", "displayName", "parentId", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
        [id, body ?? null, userId, postId, displayName ?? null, parentId ?? null],
      );
    },

    insertCommentMedia(client, { commentId, media }) {
      if (!Array.isArray(media) || media.length === 0) {
        return Promise.resolve({ rows: [] });
      }

      const values = [];
      const placeholders = media.map((item, index) => {
        const base = index * 5;
        values.push(
          item.id,
          commentId,
          item.url,
          item.mimeType,
          item.createdAt ?? null,
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, COALESCE($${base + 5}, NOW()))`;
      });

      return client.query(
        `INSERT INTO "CommentMedia" (id, "commentId", url, "mimeType", "createdAt")
         VALUES ${placeholders.join(", ")}
         RETURNING *`,
        values,
      );
    },

    searchHashtags(query) {
      return sql.query(
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
      );
    },

    searchUsers(query) {
      return sql.query(
        `SELECT
          id,
          username,
          firstname,
          lastname,
          "displayName",
          email,
          "profileImageSrc",
          "verificationStatus"
       FROM "users"
       WHERE LOWER(COALESCE("displayName", '')) LIKE $1
          OR LOWER(SPLIT_PART(email, '@', 1)) LIKE $1
          OR LOWER(COALESCE(username, '')) LIKE $1
       ORDER BY "displayName" NULLS LAST, firstname, lastname
       LIMIT 10`,
        [`${query}%`],
      );
    },

    searchPosts({ query, sort = "top", limit = 20 }) {
      const safeSort = sort === "latest" ? "latest" : "top";
      const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50));
      const safeQuery = String(query ?? "")
        .trim()
        .toLowerCase();

      const normalizedLikeQuery = `%${safeQuery}%`;
      const hashtagLikeQuery = `%${safeQuery.replace(/^#/, "")}%`;
      const orderByClause =
        safeSort === "latest"
          ? `p."createdAt" DESC`
          : `(
               COALESCE(p."impressionCount", 0)
               + (SELECT COUNT(*)::int FROM "Like" l2 WHERE l2."postId" = p.id) * 4
               + (SELECT COUNT(*)::int FROM "BroadcastPost" b2 WHERE b2."postId" = p.id) * 5
               + (SELECT COUNT(*)::int FROM "Comment" c2 WHERE c2."postId" = p.id) * 3
             ) DESC,
             p."createdAt" DESC`;

      return sql.query(
        `SELECT
          p.*,
          u.username AS "userName",
          u."profileImageSrc" AS "profileImageSrc",
          u."verificationStatus" AS "authorVerificationStatus",
          COALESCE((SELECT json_agg(l.*) FROM "Like" l WHERE l."postId" = p.id), '[]'::json) AS likes,
          COALESCE((SELECT json_agg(b.*) FROM "BroadcastPost" b WHERE b."postId" = p.id), '[]'::json) AS broadcasts,
          COALESCE((SELECT COUNT(*)::int FROM "Comment" c WHERE c."postId" = p.id), 0) AS "commentCount",
          COALESCE((
            SELECT json_agg(
              json_build_object(
                'id', pm.id,
                'url', pm.url,
                'mimeType', pm."mimeType",
                'sortOrder', pm."sortOrder"
              )
              ORDER BY pm."sortOrder" ASC
            )
            FROM "PostMedia" pm
            WHERE pm."postId" = p.id
          ), '[]'::json) AS media,
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
        LEFT JOIN "users" u ON u.id = p."userId"
        WHERE COALESCE(p.title, '') <> 'BROADCAST'
          AND COALESCE(p.title, '') <> 'BC_COMMENT'
          AND (
            LOWER(COALESCE(p.body, '')) LIKE $1
            OR LOWER(COALESCE(p."displayName", '')) LIKE $1
            OR LOWER(COALESCE(u.username, '')) LIKE $1
            OR EXISTS (
              SELECT 1
              FROM "PostHashtag" phs
              JOIN "Hashtag" hs ON hs.id = phs."hashtagId"
              WHERE phs."postId" = p.id
                AND hs."nameNormalized" LIKE $2
            )
          )
        ORDER BY ${orderByClause}
        LIMIT $3`,
        [normalizedLikeQuery, hashtagLikeQuery, safeLimit],
      );
    },

    getPostsByHashtag(tag) {
      return sql.query(
        `SELECT p.*,
              COALESCE((SELECT json_agg(l.*) FROM "Like" l WHERE l."postId" = p.id), '[]'::json) AS likes,
              COALESCE((SELECT json_agg(b.*) FROM "BroadcastPost" b WHERE b."postId" = p.id), '[]'::json) AS broadcasts,
              COALESCE((SELECT COUNT(*)::int FROM "Comment" c WHERE c."postId" = p.id), 0) AS "commentCount",
              COALESCE((
                SELECT json_agg(
                  json_build_object(
                    'id', pm.id,
                    'url', pm.url,
                    'mimeType', pm."mimeType",
                    'sortOrder', pm."sortOrder"
                  )
                  ORDER BY pm."sortOrder" ASC
                )
                FROM "PostMedia" pm
                WHERE pm."postId" = p.id
              ), '[]'::json) AS media,
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
      );
    },

    getMentionsByUserId(userId) {
      return sql.query(
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
        [userId],
      );
    },

    deleteCommentById(commentId) {
      return sql.one('DELETE FROM "Comment" WHERE id = $1 RETURNING *', [commentId]);
    },
  };
}
