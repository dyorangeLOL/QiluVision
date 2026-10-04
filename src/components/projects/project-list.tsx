"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

type ProjectSummary = {
  id: string;
  name: string;
  creativeIntent: string | null;
  updatedAt: string;
  _count: { assets: number };
};

export function ProjectList({ initialProjects }: { initialProjects: ProjectSummary[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creativeIntent, setCreativeIntent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, creativeIntent }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "项目创建失败。");
      router.push(`/projects/${payload.project.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "项目创建失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
      <form onSubmit={createProject} className="border border-border bg-card/80 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <FolderPlus className="size-5 text-seal" aria-hidden="true" />
          <h2 className="font-serif text-2xl font-semibold">创建项目</h2>
        </div>
        <div className="mt-8 grid gap-5">
          <div>
            <label htmlFor="project-name" className="text-sm font-medium">项目名称</label>
            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
              className="mt-2 min-h-11 w-full border border-border bg-background px-4 outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="例如：湖城清晨"
            />
          </div>
          <div>
            <label htmlFor="creative-intent" className="text-sm font-medium">一句创作意图</label>
            <textarea
              id="creative-intent"
              value={creativeIntent}
              onChange={(event) => setCreativeIntent(event.target.value)}
              maxLength={300}
              required
              rows={4}
              className="mt-2 w-full resize-none border border-border bg-background px-4 py-3 outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              placeholder="我想讲一个年轻人眼中的大明湖。"
            />
          </div>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "正在创建…" : "创建并进入素材库"}
            {!submitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
          </Button>
        </div>
      </form>

      <section aria-labelledby="project-list-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recent projects</p>
            <h2 id="project-list-heading" className="mt-2 font-serif text-2xl font-semibold">最近项目</h2>
          </div>
          <span className="text-sm text-muted-foreground">{initialProjects.length} 个</span>
        </div>
        {initialProjects.length ? (
          <div className="mt-6 grid gap-3">
            {initialProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group flex min-h-24 items-center justify-between gap-5 border border-border bg-card/70 p-5 transition-colors hover:border-ink/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground">{project.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.creativeIntent}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{project._count.assets} 个素材</p>
                </div>
                <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            还没有项目。创建第一个项目后即可上传真实素材。
          </div>
        )}
      </section>
    </div>
  );
}
