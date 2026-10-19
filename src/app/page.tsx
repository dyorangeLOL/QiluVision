import { ArrowRight, ArrowUpRight, Images, ScanSearch, Film } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WorkspaceHeader } from "@/components/workspace-header";
import { RecentProjectPreview } from "@/components/projects/recent-project-preview";

export const dynamic = "force-dynamic";

const workflow = [
  { label: "收集画面", detail: "照片与视频，按项目妥善整理。", icon: Images },
  { label: "浏览关键帧", detail: "快速查看视频中的代表画面。", icon: Film },
  { label: "解读素材", detail: "配置 API Key，整理场景与镜头线索。", icon: ScanSearch },
] as const;

export default function Home() {
  return (
    <main id="main-content" className="relative min-h-dvh overflow-hidden">
      <WorkspaceHeader />

      <section className="mx-auto grid max-w-7xl items-start gap-10 px-5 pb-14 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:px-12 lg:pb-16">
        <div className="pt-2 lg:pt-6">
          <p className="mb-6 flex items-center gap-3 text-sm font-medium text-accent-foreground"><span className="h-px w-6 bg-seal" aria-hidden="true" />青年创作者的齐鲁文化影像助手</p>
          <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[1.25] tracking-[-0.02em] text-balance sm:text-5xl lg:text-6xl">让每一帧山东，<span className="mt-2 block text-seal">都有故事可讲。</span></h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-muted-foreground">把照片与视频放进同一个项目，浏览关键帧、解读画面，为下一个故事找到线索。</p>
          <div className="mt-8 flex flex-wrap items-center gap-3"><Link href="/projects" className={cn(buttonVariants({ size: "lg" }))}>进入素材工作台<ArrowUpRight className="size-4" aria-hidden="true" /></Link><a href="#workflow" className="pressable inline-flex min-h-12 items-center gap-2 rounded-lg px-4 text-sm text-muted-foreground hover:bg-muted">了解创作方法<ArrowRight className="size-4" aria-hidden="true" /></a></div>
          <p className="mt-5 text-[13px] text-muted-foreground">照片与视频上传 · 视频关键帧 · 素材解读</p>
        </div>

        <RecentProjectPreview />
      </section>

      <section id="workflow" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-14 sm:px-8 lg:px-12" aria-labelledby="workflow-heading">
        <h2 id="workflow-heading" className="text-xl font-semibold">从画面开始，一步步整理灵感。</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">{workflow.map((item) => { const Icon = item.icon; return <li key={item.label} className="border-t border-border pt-5"><Icon className="size-5 text-seal" aria-hidden="true" /><h3 className="mt-3 font-semibold">{item.label}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{item.detail}</p></li>; })}</ol>
        <p className="mt-6 text-[13px] leading-6 text-muted-foreground">项目内已加入创作方案：文化检索、选题与分镜、补拍清单及方案导出。AI 生成待真实调用验收。</p>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-border px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <div className="space-y-1">
          <p>© 2026 齐鲁影策 QiluVision. 保留所有权利。</p>
          <p>团队：Qilu Frame · 作者：Lily</p>
        </div>
        <p>让每一帧山东，都有故事可讲。</p>
      </footer>
    </main>
  );
}
