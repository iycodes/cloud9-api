import sharp from "sharp";

const MAX_IMAGE_DIMENSION = 2048;
const MAX_INPUT_PIXELS = 50 * 1024 * 1024; // 50MP safety limit

function isAnimatedGif(metadata, mimeType) {
  return mimeType === "image/gif" && (metadata?.pages ?? 1) > 1;
}

export async function compressPostImageBuffer({ buffer, mimeType }) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1) {
    throw new Error("Image buffer is required.");
  }

  const normalizedMime = String(mimeType || "").toLowerCase();

  const metadata = await sharp(buffer, {
    animated: true,
    limitInputPixels: MAX_INPUT_PIXELS,
    failOn: "none",
  }).metadata();

  if (isAnimatedGif(metadata, normalizedMime)) {
    return {
      buffer,
      mimeType: "image/gif",
      extension: "gif",
      originalBytes: buffer.length,
      outputBytes: buffer.length,
      width: metadata?.width ?? null,
      height: metadata?.height ?? null,
      animated: true,
      compressed: false,
    };
  }

  const resized = sharp(buffer, {
    limitInputPixels: MAX_INPUT_PIXELS,
    failOn: "none",
  })
    .rotate()
    .resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

  const outputBuffer = await resized
    .webp({
      quality: 78,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();

  const optimizedBuffer =
    outputBuffer.length > 0 && outputBuffer.length < buffer.length
      ? outputBuffer
      : buffer;

  const outputMimeType = optimizedBuffer === outputBuffer ? "image/webp" : normalizedMime;
  const outputExtension = outputMimeType === "image/webp" ? "webp" : mimeToExtension(outputMimeType);

  return {
    buffer: optimizedBuffer,
    mimeType: outputMimeType,
    extension: outputExtension,
    originalBytes: buffer.length,
    outputBytes: optimizedBuffer.length,
    width: metadata?.width ?? null,
    height: metadata?.height ?? null,
    animated: false,
    compressed: optimizedBuffer === outputBuffer,
  };
}

function mimeToExtension(mimeType) {
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
  };

  return map[mimeType] || "bin";
}
