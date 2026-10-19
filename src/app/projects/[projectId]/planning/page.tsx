import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { WorkspaceHeader } from "@/components/workspace-header";
import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import { getPlanningData } from "@/lib/planning/service";

export const dynamic = "force-dynamic";
export default async function PlanningPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!await db.project.findUnique({ where: { id: projectId }, select: { id: true } })) notFound();
  const data = await getPlanningData(projectId);
  return <main className="min-h-dvh"><WorkspaceHeader back /><section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12"><Link href={`/projects/${projectId}`} className="inline-flex min-h-11 items-center text-sm underline">← 返回素材库</Link><p className="mt-5 text-sm text-muted-foreground">{data.project.name} / 创作方案</p><h1 className="mt-3 font-serif text-4xl font-semibold">从素材到故事</h1><div className="mt-8"><PlanningWorkspace initial={JSON.parse(JSON.stringify(data))} /></div></section></main>;
}
