export const ALLOWED_MEDIA = {
  ".jpg": { type: "image", mimeTypes: ["image/jpeg"] },
  ".jpeg": { type: "image", mimeTypes: ["image/jpeg"] },
  ".png": { type: "image", mimeTypes: ["image/png"] },
  ".webp": { type: "image", mimeTypes: ["image/webp"] },
  ".mp4": { type: "video", mimeTypes: ["video/mp4"] },
  ".mov": { type: "video", mimeTypes: ["video/quicktime"] },
} as const;

export type MediaType = "image" | "video";
export type AssetStatus = "uploading" | "uploaded" | "processing" | "ready" | "failed";

export const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_UPLOAD_MB ?? 25) * 1024 * 1024;
export const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_UPLOAD_MB ?? 250) * 1024 * 1024;
export const MAX_BATCH_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_BATCH_FILES = 20;
