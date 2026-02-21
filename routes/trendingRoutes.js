const VALID_TYPES = new Set(["all", "hashtag", "user", "text"]);
const VALID_WINDOWS = new Set(["15m", "1h", "24h"]);

export function registerTrendingRoutes({ app, commitToDB, trendRepo }) {
  app.get("/trending", async (req, res) => {
    const type = String(req.query.type ?? "all").toLowerCase();
    const window = String(req.query.window ?? "1h").toLowerCase();
    const limit = Number(req.query.limit ?? 20);

    if (!VALID_TYPES.has(type)) {
      return res.code(400).send({
        message: "Invalid type. Use one of: all, hashtag, user, text.",
      });
    }

    if (!VALID_WINDOWS.has(window)) {
      return res.code(400).send({
        message: "Invalid window. Use one of: 15m, 1h, 24h.",
      });
    }

    try {
      const data = await commitToDB(
        trendRepo.getTrending({
          entityType: type,
          window,
          limit,
        }),
      );

      if (data?.statusCode >= 400) {
        console.error("Trending request failed", {
          type,
          window,
          limit,
          statusCode: data.statusCode,
          message: data.message,
        });
      } else {
        const size =
          type === "all"
            ? {
                hashtag: Array.isArray(data?.hashtag) ? data.hashtag.length : 0,
                user: Array.isArray(data?.user) ? data.user.length : 0,
                text: Array.isArray(data?.text) ? data.text.length : 0,
              }
            : Array.isArray(data)
              ? data.length
              : 0;

        console.log("Trending request succeeded", { type, window, limit, size });
      }

      return data;
    } catch (error) {
      console.error("Trending route threw unexpectedly", {
        type,
        window,
        limit,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      return res.code(500).send({ message: "Failed to load trending." });
    }
  });

  app.post("/trending/recompute", async (req, res) => {
    try {
      const data = await commitToDB(trendRepo.refreshSnapshots());
      if (data?.statusCode >= 400) {
        console.error("Trending recompute failed", {
          statusCode: data.statusCode,
          message: data.message,
        });
      } else {
        console.log("Trending recompute succeeded", { result: data });
      }
      return data;
    } catch (error) {
      console.error("Trending recompute threw unexpectedly", {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      return res.code(500).send({ message: "Failed to recompute trending." });
    }
  });

  app.get("/trending/job-state", async (req, res) => {
    try {
      const data = await commitToDB(trendRepo.getJobState());
      if (data?.statusCode >= 400) {
        console.error("Trending job-state request failed", {
          statusCode: data.statusCode,
          message: data.message,
        });
      }
      return data;
    } catch (error) {
      console.error("Trending job-state threw unexpectedly", {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      return res.code(500).send({ message: "Failed to read trending job state." });
    }
  });
}
