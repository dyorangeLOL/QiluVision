import { WorkspaceHeader } from "@/components/workspace-header";

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
      <WorkspaceHeader />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 lg:px-12 lg:pt-20">
        <p className="text-sm font-medium tracking-[0.16em] text-accent-foreground">项目与素材</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">你的故事，从这里开始。</h1>
        <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">写下一句创作意图，把照片与视频放进同一个项目。随时回来，继续整理画面。</p>
        <div className="mt-12"><ProjectList initialProjects={JSON.parse(JSON.stringify(projects))} /></div>
      </section>
    </main>
  );
}
