export function createNotificationRepository(sql) {
  return {
    getMentionNotifications(userId, limit) {
      return sql.query(
        `SELECT mn.*,
              'mention' AS "notificationType",
              actor."displayName" AS "actorDisplayName",
              actor."profileImageSrc" AS "actorProfileImageSrc",
              actor.firstname AS "actorFirstName",
              actor.lastname AS "actorLastName",
              actor.email AS "actorEmail",
              CASE
                WHEN mn."entityType" = 'post' THEN p.id
                WHEN mn."entityType" = 'comment' THEN c."postId"
                ELSE NULL
              END AS "postId",
              CASE
                WHEN mn."entityType" = 'post' THEN p.body
                WHEN mn."entityType" = 'comment' THEN c.body
                ELSE NULL
              END AS "entityBody"
       FROM "MentionNotification" mn
       JOIN "users" actor ON actor.id = mn."actorUserId"
       LEFT JOIN "Post" p
         ON mn."entityType" = 'post'
        AND p.id = mn."entityId"
       LEFT JOIN "Comment" c
         ON mn."entityType" = 'comment'
        AND c.id = mn."entityId"
       WHERE mn."recipientUserId" = $1
       ORDER BY mn."createdAt" DESC
       LIMIT $2`,
        [userId, limit],
      );
    },

    getMentionUnreadCount(userId) {
      return sql.one(
        `SELECT COUNT(*)::int AS "unreadCount"
       FROM "MentionNotification"
       WHERE "recipientUserId" = $1
         AND "isRead" = FALSE`,
        [userId],
      );
    },

    markMentionRead(notificationId) {
      return sql.one(
        `UPDATE "MentionNotification"
       SET "isRead" = TRUE
       WHERE id = $1
       RETURNING *`,
        [notificationId],
      );
    },

    markAllMentionRead(userId) {
      return sql.one(
        `WITH updated AS (
        UPDATE "MentionNotification"
        SET "isRead" = TRUE
        WHERE "recipientUserId" = $1
          AND "isRead" = FALSE
        RETURNING id
      )
      SELECT COUNT(*)::int AS "updatedCount" FROM updated`,
        [userId],
      );
    },

    getFollowNotifications(userId, limit) {
      return sql.query(
        `SELECT fn.*,
              'follow' AS "notificationType",
              actor."displayName" AS "actorDisplayName",
              actor."profileImageSrc" AS "actorProfileImageSrc",
              actor.firstname AS "actorFirstName",
              actor.lastname AS "actorLastName",
              actor.email AS "actorEmail"
       FROM "FollowNotification" fn
       JOIN "users" actor ON actor.id = fn."actorUserId"
       WHERE fn."recipientUserId" = $1
       ORDER BY fn."createdAt" DESC
       LIMIT $2`,
        [userId, limit],
      );
    },

    markFollowRead(notificationId) {
      return sql.one(
        `UPDATE "FollowNotification"
       SET "isRead" = TRUE
       WHERE id = $1
       RETURNING *`,
        [notificationId],
      );
    },

    markAllFollowRead(userId) {
      return sql.one(
        `WITH updated AS (
        UPDATE "FollowNotification"
        SET "isRead" = TRUE
        WHERE "recipientUserId" = $1
          AND "isRead" = FALSE
        RETURNING id
      )
      SELECT COUNT(*)::int AS "updatedCount" FROM updated`,
        [userId],
      );
    },

    getUnreadCounts(userId) {
      return sql.one(
        `SELECT
         (
           SELECT COUNT(*)::int
           FROM "MentionNotification"
           WHERE "recipientUserId" = $1
             AND "isRead" = FALSE
         ) AS "mentionUnreadCount",
         (
           SELECT COUNT(*)::int
           FROM "FollowNotification"
           WHERE "recipientUserId" = $1
             AND "isRead" = FALSE
         ) AS "followUnreadCount",
         (
           (
             SELECT COUNT(*)::int
             FROM "MentionNotification"
             WHERE "recipientUserId" = $1
               AND "isRead" = FALSE
           ) + (
             SELECT COUNT(*)::int
             FROM "FollowNotification"
             WHERE "recipientUserId" = $1
               AND "isRead" = FALSE
           )
         )::int AS "unreadCount"`,
        [userId],
      );
    },
  };
}
