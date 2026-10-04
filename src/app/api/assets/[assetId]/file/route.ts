import { db } from "@/lib/db";
import { mediaFileResponse } from "@/lib/media/file-response";
import { resolveDatabasePath } from "@/lib/media/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return Response.json({ error: "素材不存在。" }, { status: 404 });
  try {
    return await mediaFileResponse(
      request,
      resolveDatabasePath(asset.localPath),
      asset.mimeType,
      asset.originalFilename,
    );
  } catch {
    return Response.json({ error: "原始文件不存在。" }, { status: 404 });
  }
}
