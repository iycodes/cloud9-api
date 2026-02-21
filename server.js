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
import { uploadToR2 } from "./services/r2BucketService.js";
import { compressPostImageBuffer } from "./services/imageCompressionService.js";
import { registerAuthUserRoutes } from "./routes/authUserRoutes.js";
import { registerPostRoutes } from "./routes/postRoutes.js";
import { registerNotificationRoutes } from "./routes/notificationRoutes.js";
import { registerEngagementRoutes } from "./routes/engagementRoutes.js";
import { registerTrendingRoutes } from "./routes/trendingRoutes.js";
import { createSqlRepository } from "./repositories/sqlRepository.js";
import { createUserRepository } from "./repositories/userRepository.js";
import { createPostRepository } from "./repositories/postRepository.js";
import { createNotificationRepository } from "./repositories/notificationRepository.js";
import { createEngagementRepository } from "./repositories/engagementRepository.js";
import { createEntityRepository } from "./repositories/entityRepository.js";
import { createTrendRepository } from "./repositories/trendRepository.js";
// dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

export const app = fastify({
  // Base64 image upload payloads are larger than the raw files.
  bodyLimit: 60 * 1024 * 1024,
});

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
      urlData.port === "4174" ||
      urlData.port === "4175" ||
      urlData.port === "5173" ||
      urlData.port === "5174" ||
      urlData.port === "5175"
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
    console.error("Database operation failed", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      where: error?.where,
    });
    return app.httpErrors.internalServerError(error.message);
  }
  return data;
}

function isErrorResult(value) {
  return Boolean(value && typeof value === "object" && value.statusCode >= 400);
}

const sqlRepo = createSqlRepository(pool);
const userRepo = createUserRepository(sqlRepo);
const postRepo = createPostRepository(sqlRepo);
const notificationRepo = createNotificationRepository(sqlRepo);
const engagementRepo = createEngagementRepository(sqlRepo, { randomUUID });
const entityRepo = createEntityRepository({ randomUUID });
const trendRepo = createTrendRepository(sqlRepo, { randomUUID });

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

app.decorate("authenticate", async (req, res) => {
  try {
    return await req.jwtVerify();
  } catch (err) {
    res.send(err);
  }
});

registerAuthUserRoutes({
  app,
  commitToDB,
  userRepo,
  isErrorResult,
  validateAccessToken,
  validateRefreshToken,
  createToken,
  getTransporter,
  sendMail,
  uploadToR2,
  randomUUID,
});

registerPostRoutes({
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
});

registerNotificationRoutes({
  app,
  commitToDB,
  notificationRepo,
});

registerEngagementRoutes({
  app,
  commitToDB,
  engagementRepo,
});

registerTrendingRoutes({
  app,
  commitToDB,
  trendRepo,
});

const TREND_REFRESH_INTERVAL_MS = 60 * 1000;
const runTrendRefresh = async () => {
  const [error, result] = await app.to(trendRepo.refreshSnapshots());
  if (error) {
    console.error("Trend snapshot refresh failed", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
    });
    return;
  }

  if (result?.skipped) {
    console.log("Trend snapshot refresh skipped", { reason: result.reason });
    return;
  }

  console.log("Trend snapshot refresh completed", {
    processedThrough: result?.processedThrough,
    computedAt: result?.computedAt,
    cleaned: result?.cleaned,
  });
};

app.listen({ port: process.env.PORT, host: "0.0.0.0" }, (err, addr) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`server is live at ${addr}`);

  // Prime shortly after boot, then refresh every minute.
  setTimeout(() => {
    runTrendRefresh();
  }, 5000);
  setInterval(runTrendRefresh, TREND_REFRESH_INTERVAL_MS);
});
