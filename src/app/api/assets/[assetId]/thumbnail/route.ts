import { db } from "@/lib/db";
import { mediaFileResponse } from "@/lib/media/file-response";
import { resolveDatabasePath } from "@/lib/media/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset?.thumbnailPath) return Response.json({ error: "缩略图不存在。" }, { status: 404 });
  try {
    return await mediaFileResponse(request, resolveDatabasePath(asset.thumbnailPath), "image/jpeg");
  } catch {
    return Response.json({ error: "缩略图文件不存在。" }, { status: 404 });
  }
}
