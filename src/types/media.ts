export type AssetFrameDto = {
  id: string;
  filename: string;
  position: number;
  timestamp: number;
  url: string;
};

export type AssetDto = {
  id: string;
  projectId: string;
  originalFilename: string;
  type: "image" | "video";
  mimeType: string;
  size: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
  status: "uploading" | "uploaded" | "processing" | "ready" | "failed";
  errorMessage: string | null;
  createdAt: string;
  thumbnailUrl: string | null;
  fileUrl: string;
  frames: AssetFrameDto[];
};
