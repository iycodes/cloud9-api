export function createEngagementRepository(sql, { randomUUID }) {
  function normalizeDesired(value) {
    return value === true;
  }

  function normalizePostId(value) {
    return String(value || "").trim();
  }

  function normalizePostIds(values, limit = 100) {
    const list = Array.isArray(values) ? values : [];
    const seen = new Set();
    const result = [];

    for (const value of list) {
      const postId = normalizePostId(value);
      if (!postId || seen.has(postId)) continue;
      seen.add(postId);
      result.push(postId);
      if (result.length >= limit) break;
    }

    return result;
  }

  async function getPostInteractionStateTx(client, { userId, postId }) {
    const result = await client.query(
      `
      SELECT
        EXISTS(
          SELECT 1 FROM "Like" l
          WHERE l."userId" = $1 AND l."postId" = $2
        ) AS liked,
        EXISTS(
          SELECT 1 FROM "BroadcastPost" bp
          WHERE bp."userId" = $1 AND bp."postId" = $2
        ) AS reposted,
        EXISTS(
          SELECT 1 FROM "BookmarkPost" bm
          WHERE bm."userId" = $1 AND bm."postId" = $2
        ) AS bookmarked,
        (SELECT COUNT(*)::int FROM "Like" l WHERE l."postId" = $2) AS "likeCount",
        (SELECT COUNT(*)::int FROM "BroadcastPost" bp WHERE bp."postId" = $2) AS "repostCount",
        (SELECT COUNT(*)::int FROM "BookmarkPost" bm WHERE bm."postId" = $2) AS "bookmarkCount"
    `,
      [userId, postId],
    );
    return result.rows[0] || null;
  }

  async function applyLikeStateTx(client, { userId, postId, desired }) {
    const shouldLike = normalizeDesired(desired);
    if (shouldLike) {
      await client.query(
        `INSERT INTO "Like" (id, "userId", "postId")
         VALUES ($1, $2, $3)
         ON CONFLICT ("userId", "postId") DO NOTHING`,
        [randomUUID(), userId, postId],
      );
      return;
    }

    await client.query('DELETE FROM "Like" WHERE "userId" = $1 AND "postId" = $2', [
      userId,
      postId,
    ]);
  }

  async function applyBookmarkStateTx(client, { userId, postId, desired }) {
    const shouldBookmark = normalizeDesired(desired);
    if (shouldBookmark) {
      await client.query(
        `INSERT INTO "BookmarkPost" (id, "userId", "postId")
         VALUES ($1, $2, $3)
         ON CONFLICT ("userId", "postId") DO NOTHING`,
        [randomUUID(), userId, postId],
      );
      return;
    }

    await client.query(
      'DELETE FROM "BookmarkPost" WHERE "userId" = $1 AND "postId" = $2',
      [userId, postId],
    );
  }

  async function applyRepostStateTx(
    client,
    { userId, postId, desired, displayName = null },
  ) {
    const shouldRepost = normalizeDesired(desired);
    if (shouldRepost) {
      const existingBroadcast = await client.query(
        `SELECT id
         FROM "BroadcastPost"
         WHERE "userId" = $1 AND "postId" = $2
         ORDER BY id
         LIMIT 1`,
        [userId, postId],
      );

      let broadcastId = existingBroadcast.rows[0]?.id || `${userId}${postId}`;

      await client.query(
        `INSERT INTO "BroadcastPost" (id, "postId", "userId")
         VALUES ($1, $2, $3)
         ON CONFLICT ("userId", "postId") DO NOTHING`,
        [broadcastId, postId, userId],
      );

      const resolvedBroadcast = await client.query(
        `SELECT id
         FROM "BroadcastPost"
         WHERE "userId" = $1 AND "postId" = $2
         ORDER BY id
         LIMIT 1`,
        [userId, postId],
      );
      broadcastId = resolvedBroadcast.rows[0]?.id || broadcastId;

      await client.query(
        `INSERT INTO "Post" (id, title, "ogPostId", "userId", "displayName", "updatedAt")
         VALUES ($1, 'BROADCAST', $2, $3, $4, NOW())
         ON CONFLICT (id)
         DO UPDATE SET
           "updatedAt" = NOW(),
           "displayName" = COALESCE(EXCLUDED."displayName", "Post"."displayName")`,
        [broadcastId, postId, userId, displayName || null],
      );
      return;
    }

    const deletedBroadcasts = await client.query(
      `DELETE FROM "BroadcastPost"
       WHERE "userId" = $1 AND "postId" = $2
       RETURNING id`,
      [userId, postId],
    );
    const deletedIds = deletedBroadcasts.rows
      .map((row) => String(row?.id || ""))
      .filter(Boolean);

    if (deletedIds.length > 0) {
      await client.query(
        `DELETE FROM "Post"
         WHERE id = ANY($1::text[]) AND title = 'BROADCAST'`,
        [deletedIds],
      );
    }

    // Fallback cleanup in case there are stale broadcast posts without matching ids.
    await client.query(
      `DELETE FROM "Post"
       WHERE title = 'BROADCAST'
         AND "userId" = $1
         AND "ogPostId" = $2`,
      [userId, postId],
    );
  }

  async function applyPostInteractionOpTx(client, { userId, op }) {
    const type = String(op?.type || "").toLowerCase();
    const postId = String(op?.postId || "");
    const desired = normalizeDesired(op?.desired);
    const displayName = op?.displayName ?? null;

    if (!postId) {
      throw new Error("postId is required for interaction operations.");
    }

    if (type === "like") {
      await applyLikeStateTx(client, { userId, postId, desired });
    } else if (type === "repost") {
      await applyRepostStateTx(client, {
        userId,
        postId,
        desired,
        displayName,
      });
    } else if (type === "bookmark") {
      await applyBookmarkStateTx(client, { userId, postId, desired });
    } else {
      throw new Error(`Unsupported interaction type: ${type}`);
    }

    const state = await getPostInteractionStateTx(client, { userId, postId });
    return {
      type,
      postId,
      desired,
      seq: Number(op?.seq || 0),
      state: {
        liked: Boolean(state?.liked),
        reposted: Boolean(state?.reposted),
        bookmarked: Boolean(state?.bookmarked),
        likeCount: Number(state?.likeCount || 0),
        repostCount: Number(state?.repostCount || 0),
        bookmarkCount: Number(state?.bookmarkCount || 0),
      },
    };
  }

  return {
    getFollows() {
      return sql.query('SELECT * FROM "Follows"');
    },

    async toggleFollow({ id, followerId, followingId }) {
      return await sql.withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [
          followerId,
          followingId,
        ]);

        const deleteResult = await client.query(
          'DELETE FROM "Follows" WHERE "followerId" = $1 AND "followingId" = $2 RETURNING *',
          [followerId, followingId],
        );
        if (deleteResult.rows.length > 0) {
          return deleteResult.rows[0];
        }

        const insertResult = await client.query(
          'INSERT INTO "Follows" (id, "followerId", "followingId") VALUES ($1, $2, $3) RETURNING *',
          [id || randomUUID(), followerId, followingId],
        );

        await client.query(
          `INSERT INTO "FollowNotification" (
            id,
            "recipientUserId",
            "actorUserId",
            "isRead",
            "createdAt"
          ) VALUES ($1, $2, $3, FALSE, NOW())
          ON CONFLICT ("recipientUserId", "actorUserId")
          DO UPDATE SET
            "isRead" = FALSE,
            "createdAt" = NOW()`,
          [randomUUID(), followingId, followerId],
        );

        return insertResult.rows[0];
      });
    },

    getLikes() {
      return sql.query('SELECT * FROM "Like"');
    },

    getBookmarksByUserId(userId) {
      return sql.query(
        'SELECT * FROM "BookmarkPost" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
        [userId],
      );
    },

    async toggleLike({ id, userId, postId }) {
      return await sql.withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [id]);

        const deleteResult = await client.query(
          'DELETE FROM "Like" WHERE id = $1 RETURNING id',
          [id],
        );
        if (deleteResult.rows.length > 0) {
          return deleteResult.rows[0];
        }

        const insertResult = await client.query(
          'INSERT INTO "Like" (id, "userId", "postId") VALUES ($1, $2, $3) RETURNING id',
          [id, userId, postId],
        );
        return insertResult.rows[0];
      });
    },

    async toggleBookmark({ id, userId, postId }) {
      return await sql.withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [
          userId,
          postId,
        ]);

        const deleteResult = await client.query(
          'DELETE FROM "BookmarkPost" WHERE "userId" = $1 AND "postId" = $2 RETURNING *',
          [userId, postId],
        );
        if (deleteResult.rows.length > 0) {
          return deleteResult.rows[0];
        }

        const insertResult = await client.query(
          'INSERT INTO "BookmarkPost" (id, "userId", "postId") VALUES ($1, $2, $3) RETURNING *',
          [id || randomUUID(), userId, postId],
        );
        return insertResult.rows[0];
      });
    },

    getBroadcastPosts() {
      return sql.query('SELECT * FROM "BroadcastPost"');
    },

    async toggleBroadcastPost({ id, userId, ogPostId, displayName }) {
      return await sql.withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [id]);

        const deleteBroadcast = await client.query(
          'DELETE FROM "BroadcastPost" WHERE id = $1 RETURNING id',
          [id],
        );
        if (deleteBroadcast.rows.length > 0) {
          await client.query('DELETE FROM "Post" WHERE id = $1', [id]);
          return deleteBroadcast.rows[0];
        }

        const insertBroadcast = await client.query(
          'INSERT INTO "BroadcastPost" (id, "postId", "userId") VALUES ($1, $2, $3) RETURNING id',
          [id, ogPostId, userId],
        );
        await client.query(
          `INSERT INTO "Post" (id, title, "ogPostId", "userId", "displayName", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [id, "BROADCAST", ogPostId, userId, displayName],
        );

        return insertBroadcast.rows[0];
      });
    },

    getBroadcastComments() {
      return sql.query('SELECT * FROM "BroadcastComment"');
    },

    async toggleBroadcastComment({ id, userId, ogPostId, displayName }) {
      return await sql.withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [id]);

        const deleteBroadcastComment = await client.query(
          'DELETE FROM "BroadcastComment" WHERE id = $1 RETURNING id',
          [id],
        );
        if (deleteBroadcastComment.rows.length > 0) {
          await client.query('DELETE FROM "Post" WHERE id = $1', [id]);
          return deleteBroadcastComment.rows[0];
        }

        const insertBroadcastComment = await client.query(
          'INSERT INTO "BroadcastComment" (id, "userId", "commentId") VALUES ($1, $2, $3) RETURNING id',
          [id, userId, ogPostId],
        );
        await client.query(
          `INSERT INTO "Post" (id, title, "ogPostId", "userId", "displayName", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [id, "BC_COMMENT", ogPostId, userId, displayName],
        );

        return insertBroadcastComment.rows[0];
      });
    },

    async toggleCommentLike({ id, userId, commentId }) {
      return await sql.withTransaction(async (client) => {
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [id]);

        const deleteResult = await client.query(
          'DELETE FROM "LikeComment" WHERE id = $1 RETURNING *',
          [id],
        );
        if (deleteResult.rows.length > 0) {
          return deleteResult.rows[0];
        }

        const insertResult = await client.query(
          'INSERT INTO "LikeComment" (id, "userId", "commentId") VALUES ($1, $2, $3) RETURNING *',
          [id, userId, commentId],
        );
        return insertResult.rows[0];
      });
    },

    async setPostInteractionState({ userId, type, postId, desired, displayName, seq }) {
      return await sql.withTransaction(async (client) => {
        return await applyPostInteractionOpTx(client, {
          userId,
          op: { type, postId, desired, displayName, seq },
        });
      });
    },

    async applyPostInteractionBatch({ userId, ops }) {
      const safeOps = Array.isArray(ops) ? ops : [];
      if (safeOps.length < 1) {
        return { results: [] };
      }

      return await sql.withTransaction(async (client) => {
        const results = [];
        for (const op of safeOps) {
          const result = await applyPostInteractionOpTx(client, { userId, op });
          results.push(result);
        }
        return { results };
      });
    },

    async recordPostImpressions({ viewerUserId, postIds }) {
      const normalizedViewerUserId = String(viewerUserId || "").trim();
      const normalizedPostIds = normalizePostIds(postIds, 100);
      if (!normalizedViewerUserId || normalizedPostIds.length < 1) {
        return { results: [] };
      }

      return await sql.withTransaction(async (client) => {
        const candidateRows = await client.query(
          `
          SELECT p.id
          FROM "Post" p
          WHERE p.id = ANY($1::text[])
            AND COALESCE(p.title, '') <> 'BROADCAST'
            AND COALESCE(p.title, '') <> 'BC_COMMENT'
            AND COALESCE(p.title, '') <> 'DELETED'
            AND p."userId" <> $2::uuid
        `,
          [normalizedPostIds, normalizedViewerUserId],
        );

        const candidatePostIds = (candidateRows.rows || [])
          .map((row) => normalizePostId(row?.id))
          .filter(Boolean);

        if (candidatePostIds.length < 1) {
          return { results: [] };
        }

        const generatedIds = candidatePostIds.map(() => randomUUID());
        const insertResult = await client.query(
          `
          INSERT INTO "PostImpression" (id, "postId", "viewerUserId")
          SELECT src.id, src.post_id, $3::uuid
          FROM unnest($1::text[], $2::text[]) AS src(id, post_id)
          ON CONFLICT ("postId", "viewerUserId") DO NOTHING
          RETURNING "postId"
        `,
          [generatedIds, candidatePostIds, normalizedViewerUserId],
        );

        const insertedPostIds = [...new Set(
          (insertResult.rows || [])
            .map((row) => normalizePostId(row?.postId))
            .filter(Boolean),
        )];

        if (insertedPostIds.length > 0) {
          await client.query(
            `
            UPDATE "Post"
            SET "impressionCount" = COALESCE("impressionCount", 0) + 1
            WHERE id = ANY($1::text[])
          `,
            [insertedPostIds],
          );
        }

        const countRows = await client.query(
          `
          SELECT id AS "postId", COALESCE("impressionCount", 0)::int AS "impressionCount"
          FROM "Post"
          WHERE id = ANY($1::text[])
        `,
          [candidatePostIds],
        );

        const countByPostId = new Map();
        for (const row of countRows.rows || []) {
          const postId = normalizePostId(row?.postId);
          if (!postId) continue;
          countByPostId.set(postId, Number(row?.impressionCount || 0));
        }

        const insertedSet = new Set(insertedPostIds);
        const results = candidatePostIds.map((postId) => ({
          postId,
          impressionCount: Number(countByPostId.get(postId) || 0),
          recorded: insertedSet.has(postId),
        }));

        return { results };
      });
    },
  };
}
