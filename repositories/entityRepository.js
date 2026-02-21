export function createEntityRepository({ randomUUID }) {
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
       FROM "users"
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

  return {
    upsertHashtags,
    insertMentions,
    insertMentionNotifications,
  };
}
