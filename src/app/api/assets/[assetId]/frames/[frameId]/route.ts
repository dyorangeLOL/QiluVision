import { db } from "@/lib/db";
import { mediaFileResponse } from "@/lib/media/file-response";
import { resolveDatabasePath } from "@/lib/media/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string; frameId: string }> },
) {
  const { assetId, frameId } = await params;
  const frame = await db.assetFrame.findFirst({ where: { id: frameId, assetId } });
  if (!frame) return Response.json({ error: "关键帧不存在。" }, { status: 404 });
  try {
    return await mediaFileResponse(request, resolveDatabasePath(frame.localPath), "image/jpeg");
  } catch {
    return Response.json({ error: "关键帧文件不存在。" }, { status: 404 });
  }
}
