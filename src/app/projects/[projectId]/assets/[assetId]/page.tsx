import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

import { DeleteAssetButton } from "@/components/media/asset-actions";
import { FrameGallery } from "@/components/media/frame-gallery";
import { db } from "@/lib/db";
import { serializeAsset } from "@/lib/media/serialize";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default async function AssetDetailPage({ params }: { params: Promise<{ projectId: string; assetId: string }> }) {
  const { projectId, assetId } = await params;
  const record = await db.asset.findFirst({
    where: { id: assetId, projectId },
    include: { project: true, frames: { orderBy: { position: "asc" } } },
  });
  if (!record) notFound();
  const asset = serializeAsset(record);
  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <Link href={`/projects/${projectId}`} className="flex min-h-11 items-center gap-2 text-sm font-medium"><ArrowLeft className="size-4" aria-hidden="true" />返回素材库</Link>
        <Link href="/" className="font-serif text-lg font-semibold">齐鲁影策</Link>
      </header>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{asset.type} asset</p>
            <h1 className="mt-3 break-words font-serif text-3xl font-semibold sm:text-4xl">{asset.originalFilename}</h1>
            <p className={`mt-4 flex items-center gap-2 text-sm ${asset.status === "failed" ? "text-red-700" : "text-emerald-700"}`}>
              {asset.status === "failed" ? <XCircle className="size-4" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
              {asset.status === "failed" ? "预处理失败" : "已完成预处理"}
            </p>
          </div>
          <DeleteAssetButton assetId={asset.id} projectId={projectId} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_0.5fr]">
          <div className="overflow-hidden border border-border bg-black">
            {asset.type === "video" ? (
              <video src={asset.fileUrl} controls preload="metadata" poster={asset.thumbnailUrl ?? undefined} className="aspect-video w-full" />
            ) : (
              <div className="relative aspect-video"><Image src={asset.fileUrl} alt={asset.originalFilename} fill unoptimized className="object-contain" /></div>
            )}
          </div>
          <dl className="grid content-start gap-0 border-t border-border">
            {[
              ["原始文件名", asset.originalFilename],
              ["文件大小", formatBytes(asset.size)],
              ["分辨率", asset.width && asset.height ? `${asset.width} × ${asset.height}` : "—"],
              ["时长", asset.duration !== null ? `${asset.duration.toFixed(2)} 秒` : "—"],
              ["帧率", asset.fps !== null ? `${asset.fps.toFixed(2)} FPS` : "—"],
              ["编码", asset.codec?.toUpperCase() ?? "—"],
              ["MIME", asset.mimeType],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[7rem_1fr] gap-4 border-b border-border py-4 text-sm">
                <dt className="text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {asset.errorMessage ? <p role="alert" className="mt-8 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{asset.errorMessage}</p> : null}
        {asset.type === "video" && asset.frames.length ? (
          <section className="mt-14" aria-labelledby="frames-heading">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
              <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Extracted frames</p><h2 id="frames-heading" className="mt-2 font-serif text-2xl font-semibold">关键帧</h2></div>
              <p className="text-sm text-muted-foreground">{asset.frames.length} 张</p>
            </div>
            <div className="mt-6"><FrameGallery frames={asset.frames} assetName={asset.originalFilename} /></div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
