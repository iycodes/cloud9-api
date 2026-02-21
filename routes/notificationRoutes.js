export function registerNotificationRoutes({ app, commitToDB, notificationRepo }) {
  app.get("/notifications/mentions/:userId", async (req) => {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
    return await commitToDB(
      notificationRepo.getMentionNotifications(req.params.userId, limit),
    );
  });

  app.get("/notifications/mentions/:userId/unread-count", async (req) => {
    return await commitToDB(
      notificationRepo.getMentionUnreadCount(req.params.userId),
    );
  });

  app.patch("/notifications/mentions/:id/read", async (req) => {
    return await commitToDB(notificationRepo.markMentionRead(req.params.id));
  });

  app.patch("/notifications/mentions/:userId/read-all", async (req) => {
    return await commitToDB(notificationRepo.markAllMentionRead(req.params.userId));
  });

  app.get("/notifications/follows/:userId", async (req) => {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
    return await commitToDB(
      notificationRepo.getFollowNotifications(req.params.userId, limit),
    );
  });

  app.patch("/notifications/follows/:id/read", async (req) => {
    return await commitToDB(notificationRepo.markFollowRead(req.params.id));
  });

  app.patch("/notifications/follows/:userId/read-all", async (req) => {
    return await commitToDB(notificationRepo.markAllFollowRead(req.params.userId));
  });

  app.get("/notifications/:userId/unread-count", async (req) => {
    return await commitToDB(notificationRepo.getUnreadCounts(req.params.userId));
  });
}
