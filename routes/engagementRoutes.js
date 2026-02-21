export function registerEngagementRoutes({ app, commitToDB, engagementRepo }) {
  function resolveRequesterUserId(req) {
    return String(req?.user?.userId || "");
  }

  function toBoolean(value) {
    return value === true;
  }

  function normalizeInteractionType(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizePostId(value) {
    return String(value || "").trim();
  }

  function coalesceInteractionOps(ops) {
    const latestByKey = new Map();
    const orderByKey = new Map();
    let orderCounter = 0;

    for (const rawOp of ops) {
      const type = normalizeInteractionType(rawOp?.type);
      const postId = normalizePostId(rawOp?.postId);
      if (!postId) continue;
      if (!["like", "repost", "bookmark"].includes(type)) continue;

      const seqValue = Number(rawOp?.seq);
      const seq = Number.isFinite(seqValue) ? seqValue : 0;
      const key = `${type}:${postId}`;
      const previous = latestByKey.get(key);

      if (!orderByKey.has(key)) {
        orderByKey.set(key, orderCounter);
        orderCounter += 1;
      }

      if (!previous || seq >= Number(previous?.seq || 0)) {
        latestByKey.set(key, {
          type,
          postId,
          desired: toBoolean(rawOp?.desired),
          displayName: rawOp?.displayName ?? null,
          seq,
        });
      }
    }

    return Array.from(latestByKey.entries())
      .sort((left, right) => {
        return (orderByKey.get(left[0]) || 0) - (orderByKey.get(right[0]) || 0);
      })
      .map((entry) => entry[1]);
  }

  app.get("/follows", async () => {
    return await commitToDB(engagementRepo.getFollows());
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

    try {
      return await engagementRepo.toggleFollow({
        id: req.body.id,
        followerId,
        followingId,
      });
    } catch (error) {
      console.log(error);
      return res.code(500).send({ message: "Failed to toggle follow." });
    }
  });

  app.get("/likes", async () => {
    return await commitToDB(engagementRepo.getLikes());
  });

  app.get("/bookmarks/:userId", async (req, res) => {
    const userId = req.params?.userId;
    if (!userId) {
      return res.code(400).send({ message: "userId is required." });
    }
    return await commitToDB(engagementRepo.getBookmarksByUserId(userId));
  });

  app.put(
    "/posts/:postId/like",
    {
      onRequest: [app.authenticate],
    },
    async (req, res) => {
      const userId = resolveRequesterUserId(req);
      const postId = normalizePostId(req.params?.postId);
      const liked = req.body?.liked;
      const seq = Number(req.body?.seq || 0);

      if (!userId) {
        return res.code(401).send({ message: "Unauthorized." });
      }
      if (!postId) {
        return res.code(400).send({ message: "postId is required." });
      }
      if (typeof liked !== "boolean") {
        return res.code(400).send({ message: "liked must be a boolean." });
      }

      const result = await commitToDB(
        engagementRepo.setPostInteractionState({
          userId,
          type: "like",
          postId,
          desired: liked,
          seq,
        }),
      );

      return result;
    },
  );

  app.put(
    "/posts/:postId/bookmark",
    {
      onRequest: [app.authenticate],
    },
    async (req, res) => {
      const userId = resolveRequesterUserId(req);
      const postId = normalizePostId(req.params?.postId);
      const bookmarked = req.body?.bookmarked;
      const seq = Number(req.body?.seq || 0);

      if (!userId) {
        return res.code(401).send({ message: "Unauthorized." });
      }
      if (!postId) {
        return res.code(400).send({ message: "postId is required." });
      }
      if (typeof bookmarked !== "boolean") {
        return res.code(400).send({ message: "bookmarked must be a boolean." });
      }

      const result = await commitToDB(
        engagementRepo.setPostInteractionState({
          userId,
          type: "bookmark",
          postId,
          desired: bookmarked,
          seq,
        }),
      );

      return result;
    },
  );

  app.get("/broadcastPost", async () => {
    return await commitToDB(engagementRepo.getBroadcastPosts());
  });

  app.put(
    "/posts/:postId/repost",
    {
      onRequest: [app.authenticate],
    },
    async (req, res) => {
      const userId = resolveRequesterUserId(req);
      const postId = normalizePostId(req.params?.postId);
      const reposted = req.body?.reposted;
      const seq = Number(req.body?.seq || 0);
      const displayName = req.body?.displayName ?? null;

      if (!userId) {
        return res.code(401).send({ message: "Unauthorized." });
      }
      if (!postId) {
        return res.code(400).send({ message: "postId is required." });
      }
      if (typeof reposted !== "boolean") {
        return res.code(400).send({ message: "reposted must be a boolean." });
      }

      const result = await commitToDB(
        engagementRepo.setPostInteractionState({
          userId,
          type: "repost",
          postId,
          desired: reposted,
          displayName,
          seq,
        }),
      );

      return result;
    },
  );

  app.post(
    "/interactions/batch",
    {
      onRequest: [app.authenticate],
    },
    async (req, res) => {
      const userId = resolveRequesterUserId(req);
      if (!userId) {
        return res.code(401).send({ message: "Unauthorized." });
      }

      const rawOps = Array.isArray(req.body?.ops) ? req.body.ops : [];
      if (rawOps.length > 100) {
        return res
          .code(400)
          .send({ message: "Maximum 100 interaction operations per batch." });
      }

      const ops = coalesceInteractionOps(rawOps);
      if (ops.length < 1) {
        return { results: [] };
      }

      const result = await commitToDB(
        engagementRepo.applyPostInteractionBatch({
          userId,
          ops,
        }),
      );

      return result;
    },
  );

  app.post(
    "/impressions/batch",
    {
      onRequest: [app.authenticate],
    },
    async (req, res) => {
      const userId = resolveRequesterUserId(req);
      if (!userId) {
        return res.code(401).send({ message: "Unauthorized." });
      }

      const rawPostIds = Array.isArray(req.body?.postIds) ? req.body.postIds : [];
      if (rawPostIds.length > 100) {
        return res
          .code(400)
          .send({ message: "Maximum 100 postIds per impressions batch." });
      }

      const postIds = [...new Set(
        rawPostIds
          .map((value) => normalizePostId(value))
          .filter(Boolean),
      )];

      if (postIds.length < 1) {
        return { results: [] };
      }

      const result = await commitToDB(
        engagementRepo.recordPostImpressions({
          viewerUserId: userId,
          postIds,
        }),
      );

      return result;
    },
  );

  app.get("/broadcastComment", async () => {
    return await commitToDB(engagementRepo.getBroadcastComments());
  });

  app.post("/broadcast_comment", async (req, res) => {
    const { id, userId, ogPostId, displayName } = req.body ?? {};
    if (!id || !userId || !ogPostId) {
      return res
        .code(400)
        .send({ message: "id, userId and ogPostId are required." });
    }

    try {
      return await engagementRepo.toggleBroadcastComment({
        id,
        userId,
        ogPostId,
        displayName,
      });
    } catch (error) {
      console.log(error);
      return res
        .code(500)
        .send({ message: "Failed to toggle broadcast comment." });
    }
  });

  app.post("/like_comment", async (req, res) => {
    const { id, userId, commentId } = req.body ?? {};
    if (!id || !userId || !commentId) {
      return res
        .code(400)
        .send({ message: "id, userId and commentId are required." });
    }

    try {
      return await engagementRepo.toggleCommentLike({ id, userId, commentId });
    } catch (error) {
      console.log(error);
      return res.code(500).send({ message: "Failed to toggle comment like." });
    }
  });
}
