import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <Link href="/projects" className="flex min-h-11 items-center gap-2 text-sm font-medium"><ArrowLeft className="size-4" aria-hidden="true" />所有项目</Link>
        <Link href="/" className="font-serif text-lg font-semibold">齐鲁影策</Link>
      </header>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8 lg:px-12 lg:pt-16">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Project media</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">{project.name}</h1>
        <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{project.creativeIntent}</p>
        <div className="mt-12"><MediaLibrary projectId={project.id} initialAssets={project.assets.map(serializeAsset)} /></div>
      </section>
    </main>
  );
}
