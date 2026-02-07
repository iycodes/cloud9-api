import { Storage } from "@google-cloud/storage";

const GCP_BUCKET = process.env.GCP_BUCKET;
const CLIENT_BRANDING_BUCKET = process.env.CLIENT_BRANDING_BUCKET;

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: "google-cloud-key.json",
  // credentials: {
  // 	client_email: process.env.GCP_CLIENT_EMAIL,
  // 	// private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n')
  // }
});

if (!GCP_BUCKET) {
  throw new Error("GCP_BUCKET is required");
}

export const bucket = storage.bucket(GCP_BUCKET);
export const clientBrandingBucket = CLIENT_BRANDING_BUCKET
  ? storage.bucket(CLIENT_BRANDING_BUCKET)
  : null;

export async function uploadToGCS(
  buffer,
  filename,
  mimetype,
  bucketName = GCP_BUCKET,
) {
  try {
    if (!bucketName) {
      throw new Error("GCS bucket name is required");
    }
    const targetBucket = storage.bucket(bucketName);
    const file = targetBucket.file(filename);

    await file.save(buffer, {
      contentType: mimetype,
      // public: true
    });
    return `https://storage.googleapis.com/${targetBucket.name}/${filename}`;
  } catch (err) {
    throw new Error("error uploading to gcs ==> " + err.message);
  }
}

export async function uploadToClientBrandingBucket(buffer, filename, mimetype) {
  if (!CLIENT_BRANDING_BUCKET) {
    throw new Error("CLIENT_BRANDING_BUCKET is required");
  }
  return uploadToGCS(buffer, filename, mimetype, CLIENT_BRANDING_BUCKET);
}

export async function signUrl(fullUrl, expiry) {
  const urlObj = new URL(fullUrl);
  const parts = urlObj.pathname.split("/").filter(Boolean);
  // parts[0] should === your bucket name
  if (parts[0] === CLIENT_BRANDING_BUCKET) {
    return fullUrl;
  }
  if (parts[0] !== GCP_BUCKET) {
    throw new Error(`Unexpected bucket: ${parts[0]}`);
  }
  // objectName = everything after the bucket in the path
  const objectName = parts.slice(1).join("/");
  const [signed] = await bucket.file(objectName).getSignedUrl({
    action: "read",
    expires: expiry || Date.now() + 15 * 60 * 1000,
  });

  return signed;
}
