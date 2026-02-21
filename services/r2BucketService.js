import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getS3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream } from "node:fs";

const R2_BUCKET = process.env.R2_BUCKET_NAME?.trim();
const R2_PUBLIC_BUCKET = process.env.R2_PUBLIC_BUCKET_NAME?.trim();
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_ENDPOINT =
  process.env.R2_ENDPOINT?.trim() ||
  (R2_ACCOUNT_ID
    ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined);
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const R2_BUCKET_BASE_URL = process.env.R2_BUCKET_BASE_URL?.trim();
const R2_PUBLIC_BUCKET_BASE_URL = process.env.R2_PUBLIC_BUCKET_BASE_URL?.trim();

/**
 * Removes trailing slashes from a URL.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
function normalizeBaseUrl(url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

const r2EndpointBase = normalizeBaseUrl(R2_ENDPOINT);
const r2BucketBase = normalizeBaseUrl(R2_BUCKET_BASE_URL);
const r2PublicBucketBase = normalizeBaseUrl(R2_PUBLIC_BUCKET_BASE_URL);

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error("R2 credentials are required");
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/** @type {{ name: string } | null} */
export const clientBrandingBucket = R2_PUBLIC_BUCKET
  ? { name: R2_PUBLIC_BUCKET }
  : null;

/**
 * Encodes object keys to be URL safe.
 * @param {string} key
 * @returns {string}
 */
function encodeObjectKey(key) {
  return encodeURI(key).replace(/\?/g, "%3F").replace(/#/g, "%23");
}

/**
 * Ensures a bucket name is provided or falls back to default.
 * @param {string} [bucketName]
 * @returns {string}
 * @throws {Error} If no bucket name is available.
 */
function requireBucketName(bucketName) {
  const resolved = bucketName || R2_BUCKET;
  if (!resolved) throw new Error("R2_BUCKET_NAME is required");
  return resolved;
}

/**
 * Checks if the provided bucket name matches the public bucket config.
 * @param {string} bucketName
 * @returns {boolean}
 */
function isPublicBucket(bucketName) {
  return Boolean(R2_PUBLIC_BUCKET && bucketName === R2_PUBLIC_BUCKET);
}

/**
 * Generates the full URL for an object in storage.
 * @param {string} objectKey
 * @param {string} [bucketName]
 * @returns {string}
 */
export function getStorageObjectUrl(objectKey, bucketName) {
  const resolvedBucket = requireBucketName(bucketName);
  const encodedKey = encodeObjectKey(objectKey);

  if (isPublicBucket(resolvedBucket) && r2PublicBucketBase) {
    return `${r2PublicBucketBase}/${encodedKey}`;
  }
  if (resolvedBucket === R2_BUCKET && r2BucketBase) {
    return `${r2BucketBase}/${encodedKey}`;
  }
  if (!r2EndpointBase) throw new Error("R2 endpoint is not configured");
  return `${r2EndpointBase}/${resolvedBucket}/${encodedKey}`;
}

/**
 * Uploads a Buffer to R2.
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} mimetype
 * @param {string} [bucketName]
 * @returns {Promise<string>} The storage URL of the uploaded object.
 */
export async function uploadToR2(buffer, filename, mimetype, bucketName) {
  const resolvedBucket = requireBucketName(bucketName);
  await r2Client.send(
    new PutObjectCommand({
      Bucket: resolvedBucket,
      Key: filename,
      Body: buffer,
      ContentType: mimetype,
    }),
  );
  return getStorageObjectUrl(filename, resolvedBucket);
}

/**
 * Uploads a file from a local path to R2 using a ReadStream.
 * @param {string} filePath
 * @param {string} filename
 * @param {string} mimetype
 * @param {string} [bucketName]
 * @returns {Promise<string>} The storage URL of the uploaded object.
 */
export async function uploadFilePathToStorage(
  filePath,
  filename,
  mimetype,
  bucketName,
) {
  const resolvedBucket = requireBucketName(bucketName);
  await r2Client.send(
    new PutObjectCommand({
      Bucket: resolvedBucket,
      Key: filename,
      Body: createReadStream(filePath),
      ContentType: mimetype,
    }),
  );
  return getStorageObjectUrl(filename, resolvedBucket);
}

/**
 * Checks if an object exists in the storage bucket.
 * @param {string} objectKey
 * @param {string} [bucketName]
 * @returns {Promise<boolean>}
 */
export async function objectExistsInStorage(objectKey, bucketName) {
  const resolvedBucket = requireBucketName(bucketName);
  try {
    await r2Client.send(
      new HeadObjectCommand({
        Bucket: resolvedBucket,
        Key: objectKey,
      }),
    );
    return true;
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode;
    if (
      status === 404 ||
      err?.name === "NotFound" ||
      err?.Code === "NotFound"
    ) {
      return false;
    }
    throw err;
  }
}

/**
 * Parses an R2 URL to extract the bucket name and object key.
 * @param {string} fullUrl
 * @returns {{ bucketName: string, objectKey: string } | null}
 */
function parseR2Url(fullUrl) {
  try {
    const urlObj = new URL(fullUrl);
    const base = `${urlObj.protocol}//${urlObj.host}`;
    const path = urlObj.pathname.replace(/^\/+/, "");

    if (r2PublicBucketBase && fullUrl.startsWith(r2PublicBucketBase + "/")) {
      if (!R2_PUBLIC_BUCKET) return null;
      return {
        bucketName: R2_PUBLIC_BUCKET,
        objectKey: decodeURIComponent(
          fullUrl.slice(r2PublicBucketBase.length + 1),
        ),
      };
    }

    if (r2BucketBase && fullUrl.startsWith(r2BucketBase + "/")) {
      if (!R2_BUCKET) return null;
      return {
        bucketName: R2_BUCKET,
        objectKey: decodeURIComponent(fullUrl.slice(r2BucketBase.length + 1)),
      };
    }

    if (r2EndpointBase && base === r2EndpointBase) {
      const parts = path.split("/").filter(Boolean);
      if (parts.length < 2) return null;
      return {
        bucketName: parts[0],
        objectKey: decodeURIComponent(parts.slice(1).join("/")),
      };
    }

    if (urlObj.hostname.endsWith(".r2.dev")) {
      const bucketName = urlObj.hostname.split(".")[0];
      if (!bucketName || !path) return null;
      return { bucketName, objectKey: decodeURIComponent(path) };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Signs a URL for temporary access. If the URL is public, it returns the original URL.
 * @param {string} fullUrl
 * @param {number} [expiry] Timestamp in milliseconds.
 * @returns {Promise<string>} The signed URL.
 * @throws {Error} If the URL is not a recognized R2 URL.
 */
export async function signUrl(fullUrl, expiry) {
  const parsed = parseR2Url(fullUrl);
  if (!parsed) {
    throw new Error("Expected R2 URL");
  }
  if (isPublicBucket(parsed.bucketName)) {
    return fullUrl;
  }
  const expiresAt = expiry || Date.now() + 15 * 60 * 1000;
  const expiresInSeconds = Math.max(
    1,
    Math.floor((expiresAt - Date.now()) / 1000),
  );
  const command = new GetObjectCommand({
    Bucket: parsed.bucketName,
    Key: parsed.objectKey,
  });
  return getS3SignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}
