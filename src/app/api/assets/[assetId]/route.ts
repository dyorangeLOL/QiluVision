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
    include: { frames: { orderBy: { position: "asc" } }, analysis: true },
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
    await db.$transaction(async (tx) => {
      const shots = await tx.shot.findMany({ where: { assetId: asset.id }, select: { isAssetLocked: true, isShotLocked: true, storyboardId: true } });
      if (shots.some((shot) => shot.isAssetLocked || shot.isShotLocked)) throw new Error("该素材被锁定镜头使用，请先解锁并保存方案，再删除素材。");
      await removeAssetDirectories(asset.projectId, asset.id);
      for (const storyboardId of new Set(shots.map((shot) => shot.storyboardId))) {
        await tx.storyboard.update({ where: { id: storyboardId }, data: { revision: { increment: 1 }, diagnosisJson: "[]" } });
      }
      await tx.asset.delete({ where: { id: asset.id } });
    }, { timeout: 20_000 });
  } catch (error) {
    const locked = error instanceof Error && error.message.includes("锁定镜头");
    return NextResponse.json({ error: locked ? error.message : "文件清理失败，请稍后重试。" }, { status: locked ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
