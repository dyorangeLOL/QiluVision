import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Images } from "lucide-react";
import { db } from "@/lib/db";

/** Only persisted, ready media is shown; an empty library has its own honest state. */
export async function RecentProjectPreview() {
  const project = await db.project.findFirst({
    where: { assets: { some: { status: "ready", thumbnailPath: { not: null } } } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true,
      _count: { select: { assets: true } },
      assets: {
        where: { status: "ready", thumbnailPath: { not: null } },
        orderBy: { createdAt: "desc" }, take: 3,
        select: { id: true, originalFilename: true },
      },
    },
  });

  if (!project) return (
    <div className="workspace-panel flex min-h-80 flex-col justify-center p-8">
      <Images className="size-8 text-seal" aria-hidden="true" />
      <h2 className="mt-5 text-xl font-semibold">给你的画面，一个故事的起点。</h2>
      <p className="mt-3 leading-7 text-muted-foreground">创建项目，放入照片与视频。你的素材会出现在这里，随时可以继续整理。</p>
      <Link href="/projects" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium">创建第一个项目<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
    </div>
  );

  return (
    <section className="workspace-panel overflow-hidden" aria-labelledby="recent-preview-heading">
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="min-w-0"><p className="text-[13px] text-muted-foreground">继续你的创作</p><h2 id="recent-preview-heading" className="mt-1 truncate text-lg font-semibold" title={project.name}>{project.name}</h2></div>
        <span className="shrink-0 text-[13px] text-muted-foreground">{project._count.assets} 个素材</span>
      </div>
      <div className="grid grid-cols-2 gap-1 bg-muted">
        {project.assets.map((asset, index) => (
          <Link key={asset.id} href={`/projects/${project.id}/assets/${asset.id}`} className={`group relative overflow-hidden ${index === 0 ? "col-span-2 aspect-[16/8]" : "aspect-[16/7]"}`} aria-label={`查看素材 ${asset.originalFilename}`}>
            <Image src={`/api/assets/${asset.id}/thumbnail`} alt={asset.originalFilename} fill unoptimized sizes="(min-width: 1024px) 560px, 100vw" className="object-cover transition-opacity group-hover:opacity-90" />
          </Link>
        ))}
      </div>
      <Link href={`/projects/${project.id}`} className="pressable flex min-h-16 items-center justify-between gap-3 px-5 text-sm font-medium hover:bg-muted sm:px-6">打开项目素材库<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
    </section>
  );
}
