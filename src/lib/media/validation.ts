import path from "node:path";

import { ALLOWED_MEDIA, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type MediaType } from "./constants";

export class UploadValidationError extends Error {}

function signatureMatches(extension: string, bytes: Uint8Array): boolean {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case ".png":
      return bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
    case ".webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case ".mp4":
    case ".mov":
      return ascii(4, 8) === "ftyp";
    default:
      return false;
  }
}

export function validateUpload(file: File, bytes: Uint8Array): {
  extension: keyof typeof ALLOWED_MEDIA;
  type: MediaType;
} {
  const extension = path.extname(path.basename(file.name)).toLowerCase() as keyof typeof ALLOWED_MEDIA;
  const definition = ALLOWED_MEDIA[extension];
  if (!definition) {
    throw new UploadValidationError("仅支持 JPG、JPEG、PNG、WEBP、MP4 和 MOV 文件。");
  }
  if (!(definition.mimeTypes as readonly string[]).includes(file.type)) {
    throw new UploadValidationError(`文件 MIME 类型与扩展名不匹配：${file.type || "未知"}。`);
  }
  const limit = definition.type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size <= 0 || file.size > limit) {
    throw new UploadValidationError(
      `${definition.type === "image" ? "图片" : "视频"}大小必须在 1 字节到 ${Math.round(limit / 1024 / 1024)} MB 之间。`,
    );
  }
  if (!signatureMatches(extension, bytes)) {
    throw new UploadValidationError("文件内容与声明的媒体格式不一致或文件已损坏。");
  }
  return { extension, type: definition.type };
}
