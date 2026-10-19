import { notFound } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { WorkspaceHeader } from "@/components/workspace-header";

import { MediaLibrary } from "@/components/media/media-library";
import { db } from "@/lib/db";
import { serializeAsset } from "@/lib/media/serialize";

export const dynamic = "force-dynamic";

export default async function ProjectMediaPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { assets: { include: { frames: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!project) notFound();
  return (
    <main className="min-h-dvh">
      <WorkspaceHeader back />
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8 lg:px-12 lg:pt-16">
        <p className="text-xs tracking-[0.2em] text-muted-foreground">项目 / 素材工作台</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">{project.name}</h1>
        <p className="mt-4 max-w-3xl border-l-2 border-seal pl-4 leading-7 text-muted-foreground">{project.creativeIntent}</p>
        <Link href={`/projects/${project.id}/planning`} className={`${buttonVariants()} mt-6`}>进入创作方案 →</Link>
        <div className="mt-12"><MediaLibrary projectId={project.id} initialAssets={project.assets.map(serializeAsset)} /></div>
      </section>
    </main>
  );
}
