import type { Asset, AssetFrame } from "@prisma/client";

import type { AssetDto } from "@/types/media";

type AssetWithFrames = Asset & { frames: AssetFrame[] };

export function serializeAsset(asset: AssetWithFrames): AssetDto {
  return {
    id: asset.id,
    projectId: asset.projectId,
    originalFilename: asset.originalFilename,
    type: asset.type as AssetDto["type"],
    mimeType: asset.mimeType,
    size: asset.size,
    duration: asset.duration,
    width: asset.width,
    height: asset.height,
    fps: asset.fps,
    codec: asset.codec,
    status: asset.status as AssetDto["status"],
    errorMessage: asset.errorMessage,
    createdAt: asset.createdAt.toISOString(),
    thumbnailUrl: asset.thumbnailPath ? `/api/assets/${asset.id}/thumbnail` : null,
    fileUrl: `/api/assets/${asset.id}/file`,
    frames: asset.frames.map((frame) => ({
      id: frame.id,
      filename: frame.filename,
      position: frame.position,
      timestamp: frame.timestamp,
      url: `/api/assets/${asset.id}/frames/${frame.id}`,
    })),
  };
}
