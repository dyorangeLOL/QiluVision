import Link from "next/link";

import { ProjectList } from "@/components/projects/project-list";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <Link href="/" className="font-serif text-xl font-semibold">齐鲁影策</Link>
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Phase 1 · Media</span>
      </header>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 lg:px-12 lg:pt-20">
        <p className="text-sm font-medium tracking-[0.16em] text-accent-foreground">项目与素材</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">从一句创作意图，开始整理真实画面。</h1>
        <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">创建项目后上传照片与视频。系统会保存原始文件，并完成缩略图、媒体信息和视频关键帧预处理。</p>
        <div className="mt-12"><ProjectList initialProjects={JSON.parse(JSON.stringify(projects))} /></div>
      </section>
    </main>
  );
}
