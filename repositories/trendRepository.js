const TREND_TYPES = ["hashtag", "user", "text"];
const TREND_WINDOWS = ["15m", "1h", "24h"];
const JOB_STATE_ID = "default";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function floorToMinute(date) {
  const minuteMs = 60 * 1000;
  return new Date(Math.floor(date.getTime() / minuteMs) * minuteMs);
}

function safeEntityKey(value) {
  const key = String(value ?? "").trim().toLowerCase();
  if (!key) return "";
  return key.slice(0, 128);
}

function scoreTrend(window, counts, events, uniqueUsers) {
  const count15 = Number(counts.count15m ?? 0);
  const count1h = Number(counts.count1h ?? 0);
  const count24 = Number(counts.count24h ?? 0);
  const events24 = Number(events.events24h ?? 0);
  const unique = Number(uniqueUsers ?? 0);

  let base = 0;
  if (window === "15m") {
    base = count15 * 3 + count1h * 1.1 + count24 * 0.2;
  } else if (window === "1h") {
    base = count15 * 1.6 + count1h * 2.2 + count24 * 0.45;
  } else {
    base = count15 * 0.9 + count1h * 1.5 + count24 * 1.4;
  }

  const trailingHourWithoutRecent = Math.max(0, count1h - count15);
  const surgeRaw = (count15 + 1) / (trailingHourWithoutRecent / 3 + 1);
  const surgeFactor = clamp(surgeRaw, 0.75, 2.25);

  const breadth = unique / Math.max(1, events24);
  const spamPenalty = clamp(0.55 + breadth * 1.1, 0.55, 1);

  const uniqueFactor = Math.log1p(Math.max(1, unique));
  return base * surgeFactor * spamPenalty * uniqueFactor;
}

async function ensureJobStateRow(client) {
  const existing = await client.query(
    `SELECT *
     FROM "TrendJobState"
     WHERE id = $1
     FOR UPDATE`,
    [JOB_STATE_ID],
  );

  if (existing.rows[0]) return existing.rows[0];

  const inserted = await client.query(
    `INSERT INTO "TrendJobState" (id, "lastProcessedAt")
     VALUES ($1, $2)
     RETURNING *`,
    [JOB_STATE_ID, "1970-01-01T00:00:00.000Z"],
  );

  return inserted.rows[0];
}

async function upsertMinuteBuckets(client, lastProcessedAt, upperBound) {
  if (upperBound <= lastProcessedAt) return;

  await client.query(
    `INSERT INTO "TrendMinuteBucket" (
       "bucketMinute",
       "entityType",
       "entityKey",
       "signalWeight",
       "eventCount",
       "updatedAt"
     )
     SELECT
       date_trunc('minute', "createdAt") AS "bucketMinute",
       "entityType",
       "entityKey",
       COALESCE(SUM(weight), 0)::double precision AS "signalWeight",
       COUNT(*)::int AS "eventCount",
       NOW()
     FROM "TrendSignal"
     WHERE "createdAt" > $1
       AND "createdAt" <= $2
     GROUP BY 1, 2, 3
     ON CONFLICT ("bucketMinute", "entityType", "entityKey")
     DO UPDATE SET
       "signalWeight" = "TrendMinuteBucket"."signalWeight" + EXCLUDED."signalWeight",
       "eventCount" = "TrendMinuteBucket"."eventCount" + EXCLUDED."eventCount",
       "updatedAt" = NOW()`,
    [lastProcessedAt, upperBound],
  );
}

async function fetchTypeCandidates(client, entityType, candidateLimit) {
  const result = await client.query(
    `SELECT
       "entityKey",
       COALESCE(
         SUM(CASE WHEN "bucketMinute" > NOW() - INTERVAL '15 minutes'
             THEN "signalWeight" ELSE 0 END),
         0
       )::double precision AS "count15m",
       COALESCE(
         SUM(CASE WHEN "bucketMinute" > NOW() - INTERVAL '1 hour'
             THEN "signalWeight" ELSE 0 END),
         0
       )::double precision AS "count1h",
       COALESCE(SUM("signalWeight"), 0)::double precision AS "count24h",
       COALESCE(
         SUM(CASE WHEN "bucketMinute" > NOW() - INTERVAL '15 minutes'
             THEN "eventCount" ELSE 0 END),
         0
       )::int AS "events15m",
       COALESCE(
         SUM(CASE WHEN "bucketMinute" > NOW() - INTERVAL '1 hour'
             THEN "eventCount" ELSE 0 END),
         0
       )::int AS "events1h",
       COALESCE(SUM("eventCount"), 0)::int AS "events24h"
     FROM "TrendMinuteBucket"
     WHERE "entityType" = $1
       AND "bucketMinute" > NOW() - INTERVAL '24 hours'
     GROUP BY "entityKey"
     HAVING COALESCE(SUM("signalWeight"), 0) > 0
     ORDER BY "count15m" DESC, "count1h" DESC, "count24h" DESC
     LIMIT $2`,
    [entityType, candidateLimit],
  );

  return result.rows;
}

async function fetchUniqueUserCounts(client, entityType, entityKeys) {
  if (!Array.isArray(entityKeys) || entityKeys.length === 0) {
    return new Map();
  }

  const result = await client.query(
    `SELECT
       "entityKey",
       COUNT(DISTINCT "actorUserId")::int AS "uniqueUsers24h"
     FROM "TrendSignal"
     WHERE "entityType" = $1
       AND "entityKey" = ANY($2::text[])
       AND "createdAt" > NOW() - INTERVAL '24 hours'
     GROUP BY "entityKey"`,
    [entityType, entityKeys],
  );

  const uniqueByKey = new Map();
  for (const row of result.rows) {
    uniqueByKey.set(String(row.entityKey), Number(row.uniqueUsers24h ?? 0));
  }
  return uniqueByKey;
}

async function replaceSnapshots(client, entityType, window, rows, randomUUID, computedAt) {
  await client.query(
    `DELETE FROM "TrendSnapshot"
     WHERE "entityType" = $1
       AND "timeWindow" = $2`,
    [entityType, window],
  );

  if (!Array.isArray(rows) || rows.length === 0) return;

  const values = [];
  const placeholders = rows.map((row, index) => {
    const base = index * 14;
    values.push(
      randomUUID(),
      window,
      entityType,
      row.rank,
      row.entityKey,
      row.score,
      row.count15m,
      row.count1h,
      row.count24h,
      row.events15m,
      row.events1h,
      row.events24h,
      row.uniqueUsers24h,
      computedAt,
    );
    return `(
      $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4},
      $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8},
      $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12},
      $${base + 13}, $${base + 14}
    )`;
  });

  await client.query(
    `INSERT INTO "TrendSnapshot" (
       id,
       "timeWindow",
       "entityType",
       rank,
       "entityKey",
       score,
       "count15m",
       "count1h",
       "count24h",
       "events15m",
       "events1h",
       "events24h",
       "uniqueUsers24h",
       "computedAt"
      )
     VALUES ${placeholders.join(", ")}`,
    values,
  );
}

async function refreshSnapshotsForType(client, entityType, randomUUID, candidateLimit, topN, computedAt) {
  const candidateRows = await fetchTypeCandidates(client, entityType, candidateLimit);
  const entityKeys = candidateRows.map((row) => String(row.entityKey));
  const uniqueByKey = await fetchUniqueUserCounts(client, entityType, entityKeys);

  const metricRows = candidateRows.map((row) => {
    const entityKey = String(row.entityKey);
    return {
      entityKey,
      count15m: Number(row.count15m ?? 0),
      count1h: Number(row.count1h ?? 0),
      count24h: Number(row.count24h ?? 0),
      events15m: Number(row.events15m ?? 0),
      events1h: Number(row.events1h ?? 0),
      events24h: Number(row.events24h ?? 0),
      uniqueUsers24h: Number(uniqueByKey.get(entityKey) ?? 0),
    };
  });

  const snapshotsByWindow = {};
  for (const window of TREND_WINDOWS) {
    const sorted = metricRows
      .map((metric) => ({
        ...metric,
        score: scoreTrend(window, metric, metric, metric.uniqueUsers24h),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.uniqueUsers24h !== a.uniqueUsers24h) {
          return b.uniqueUsers24h - a.uniqueUsers24h;
        }
        return b.count24h - a.count24h;
      })
      .slice(0, topN)
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));

    snapshotsByWindow[window] = sorted;
    await replaceSnapshots(
      client,
      entityType,
      window,
      sorted,
      randomUUID,
      computedAt,
    );
  }

  return snapshotsByWindow;
}

async function maybeCleanupOldTrendRows(client, lastCleanupAt, cleanupSignalDays, cleanupBucketDays) {
  const now = Date.now();
  const lastCleanupTs = new Date(lastCleanupAt ?? 0).getTime();
  const sixHoursMs = 6 * 60 * 60 * 1000;

  if (Number.isFinite(lastCleanupTs) && now - lastCleanupTs < sixHoursMs) {
    return false;
  }

  await client.query(
    `DELETE FROM "TrendSignal"
     WHERE "createdAt" < NOW() - ($1::text || ' days')::interval`,
    [String(cleanupSignalDays)],
  );

  await client.query(
    `DELETE FROM "TrendMinuteBucket"
     WHERE "bucketMinute" < NOW() - ($1::text || ' days')::interval`,
    [String(cleanupBucketDays)],
  );

  await client.query(
    `UPDATE "TrendJobState"
     SET "lastCleanupAt" = NOW()
     WHERE id = $1`,
    [JOB_STATE_ID],
  );

  return true;
}

export function createTrendRepository(sql, { randomUUID }) {
  async function insertSignals(client, signals) {
    if (!Array.isArray(signals) || signals.length === 0) return { inserted: 0 };

    const uniqueSignals = new Map();
    for (const rawSignal of signals) {
      const entityType = String(rawSignal?.entityType ?? "").toLowerCase();
      if (!TREND_TYPES.includes(entityType)) continue;

      const entityKey = safeEntityKey(rawSignal?.entityKey);
      if (!entityKey) continue;

      const sourceType = String(rawSignal?.sourceType ?? "").toLowerCase();
      if (sourceType !== "post" && sourceType !== "comment") continue;

      const sourceId = String(rawSignal?.sourceId ?? "").trim();
      const actorUserId = String(rawSignal?.actorUserId ?? "").trim();
      if (!sourceId || !actorUserId) continue;

      const signalKind = String(rawSignal?.signalKind ?? "").toLowerCase();
      if (!["hashtag", "mention", "author", "text"].includes(signalKind)) continue;

      const dedupeKey =
        `${entityType}:${entityKey}:${sourceType}:${sourceId}:${signalKind}`;

      uniqueSignals.set(dedupeKey, {
        id: String(rawSignal?.id ?? randomUUID()),
        entityType,
        entityKey,
        sourceType,
        sourceId,
        actorUserId,
        signalKind,
        weight: Number(rawSignal?.weight ?? 1),
        createdAt: rawSignal?.createdAt ? new Date(rawSignal.createdAt) : new Date(),
      });
    }

    if (uniqueSignals.size === 0) return { inserted: 0 };

    const rows = [...uniqueSignals.values()];
    const values = [];
    const placeholders = rows.map((row, index) => {
      const base = index * 9;
      values.push(
        row.id,
        row.entityType,
        row.entityKey,
        row.sourceType,
        row.sourceId,
        row.actorUserId,
        row.signalKind,
        Number.isFinite(row.weight) ? row.weight : 1,
        row.createdAt,
      );
      return `(
        $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5},
        $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}
      )`;
    });

    const result = await client.query(
      `INSERT INTO "TrendSignal" (
         id,
         "entityType",
         "entityKey",
         "sourceType",
         "sourceId",
         "actorUserId",
         "signalKind",
         weight,
         "createdAt"
       )
       VALUES ${placeholders.join(", ")}
       ON CONFLICT ("entityType", "entityKey", "sourceType", "sourceId", "signalKind")
       DO NOTHING`,
      values,
    );

    return { inserted: Number(result.rowCount ?? 0) };
  }

  async function refreshSnapshots({
    intervalLagMs = 15 * 1000,
    candidateLimit = 320,
    topN = 50,
    cleanupSignalDays = 14,
    cleanupBucketDays = 30,
  } = {}) {
    return await sql.withTransaction(async (client) => {
      const lockResult = await client.query(
        `SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked`,
        ["trend_snapshot_refresh_v1"],
      );
      if (!lockResult.rows[0]?.locked) {
        return { skipped: true, reason: "locked" };
      }

      const state = await ensureJobStateRow(client);
      const lastProcessedAt = new Date(state.lastProcessedAt);

      const now = new Date();
      const upperBound = floorToMinute(new Date(now.getTime() - intervalLagMs));

      await upsertMinuteBuckets(client, lastProcessedAt, upperBound);

      if (upperBound > lastProcessedAt) {
        await client.query(
          `UPDATE "TrendJobState"
           SET "lastProcessedAt" = $2
           WHERE id = $1`,
          [JOB_STATE_ID, upperBound],
        );
      }

      const computedAt = new Date();
      for (const entityType of TREND_TYPES) {
        await refreshSnapshotsForType(
          client,
          entityType,
          randomUUID,
          candidateLimit,
          topN,
          computedAt,
        );
      }

      const cleaned = await maybeCleanupOldTrendRows(
        client,
        state.lastCleanupAt,
        cleanupSignalDays,
        cleanupBucketDays,
      );

      await client.query(
        `UPDATE "TrendJobState"
         SET "lastSuccessfulAt" = NOW()
         WHERE id = $1`,
        [JOB_STATE_ID],
      );

      return {
        skipped: false,
        processedThrough: upperBound.toISOString(),
        computedAt: computedAt.toISOString(),
        cleaned,
      };
    });
  }

  async function getSnapshotRows(entityType, window, limit) {
    const parsedLimit = clamp(Number(limit || 20), 1, 100);

    if (entityType === "user") {
      return await sql.query(
        `SELECT
           s."timeWindow",
           s."entityType",
           s.rank,
           s."entityKey",
           s.score,
           s."count15m",
           s."count1h",
           s."count24h",
           s."events15m",
           s."events1h",
           s."events24h",
           s."uniqueUsers24h",
           s."computedAt",
           u.id AS "userId",
           u."displayName",
           u.username,
           u.firstname,
           u.lastname
         FROM "TrendSnapshot" s
         LEFT JOIN "users" u ON u.id::text = s."entityKey"
         WHERE s."timeWindow" = $1
           AND s."entityType" = $2
         ORDER BY s.rank ASC
         LIMIT $3`,
        [window, entityType, parsedLimit],
      );
    }

    return await sql.query(
      `SELECT
         "timeWindow",
         "entityType",
         rank,
         "entityKey",
         score,
         "count15m",
         "count1h",
         "count24h",
         "events15m",
         "events1h",
         "events24h",
         "uniqueUsers24h",
         "computedAt"
       FROM "TrendSnapshot"
       WHERE "timeWindow" = $1
         AND "entityType" = $2
       ORDER BY rank ASC
       LIMIT $3`,
      [window, entityType, parsedLimit],
    );
  }

  function toApiRow(row) {
    const entityType = String(row.entityType);
    const entityKey = String(row.entityKey);

    if (entityType === "user") {
      const displayName =
        row.displayName ||
        row.username ||
        row.firstname ||
        row.lastname ||
        "User";

      return {
        type: "user",
        key: entityKey,
        label: displayName,
        user: {
          id: row.userId || entityKey,
          displayName,
          username: row.username || null,
          firstname: row.firstname || null,
          lastname: row.lastname || null,
        },
        rank: Number(row.rank),
        score: Number(row.score),
        count15m: Number(row.count15m),
        count1h: Number(row.count1h),
        count24h: Number(row.count24h),
        events15m: Number(row.events15m),
        events1h: Number(row.events1h),
        events24h: Number(row.events24h),
        uniqueUsers24h: Number(row.uniqueUsers24h),
        computedAt: row.computedAt,
      };
    }

    return {
      type: entityType,
      key: entityKey,
      label: entityType === "hashtag" ? `#${entityKey}` : entityKey,
      rank: Number(row.rank),
      score: Number(row.score),
      count15m: Number(row.count15m),
      count1h: Number(row.count1h),
      count24h: Number(row.count24h),
      events15m: Number(row.events15m),
      events1h: Number(row.events1h),
      events24h: Number(row.events24h),
      uniqueUsers24h: Number(row.uniqueUsers24h),
      computedAt: row.computedAt,
    };
  }

  async function getTrending({ entityType = "all", window = "1h", limit = 20 } = {}) {
    const normalizedWindow = TREND_WINDOWS.includes(window) ? window : "1h";
    const parsedLimit = clamp(Number(limit || 20), 1, 100);
    const normalizedType = String(entityType || "all").toLowerCase();

    if (normalizedType === "all") {
      const [hashtags, users, texts] = await Promise.all(
        TREND_TYPES.map((type) => getSnapshotRows(type, normalizedWindow, parsedLimit)),
      );

      return {
        window: normalizedWindow,
        hashtag: hashtags.map(toApiRow),
        user: users.map(toApiRow),
        text: texts.map(toApiRow),
      };
    }

    if (!TREND_TYPES.includes(normalizedType)) {
      return [];
    }

    const rows = await getSnapshotRows(normalizedType, normalizedWindow, parsedLimit);
    return rows.map(toApiRow);
  }

  async function getJobState() {
    return await sql.one(
      `SELECT id, "lastProcessedAt", "lastSuccessfulAt", "lastCleanupAt"
       FROM "TrendJobState"
       WHERE id = $1`,
      [JOB_STATE_ID],
    );
  }

  return {
    insertSignals,
    refreshSnapshots,
    getTrending,
    getJobState,
  };
}
