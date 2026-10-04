import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { serializeAsset } from "@/lib/media/serialize";
import { removeAssetDirectories } from "@/lib/media/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const asset = await db.asset.findUnique({
    where: { id: assetId },
    include: { frames: { orderBy: { position: "asc" } } },
  });
  if (!asset) return NextResponse.json({ error: "素材不存在。" }, { status: 404 });
  return NextResponse.json({ asset: serializeAsset(asset) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return NextResponse.json({ error: "素材不存在。" }, { status: 404 });

  try {
    await removeAssetDirectories(asset.projectId, asset.id);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? `文件清理失败：${error.message}` : "文件清理失败。" },
      { status: 500 },
    );
  }
  await db.asset.delete({ where: { id: asset.id } });
  return NextResponse.json({ ok: true });
}
