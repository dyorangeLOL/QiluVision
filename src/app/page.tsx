import { ArrowRight, Film, Library, ScanSearch, Sparkles } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const workflow = [
  { label: "理解素材", detail: "关键帧与图片语义分析", icon: ScanSearch },
  { label: "检索齐鲁", detail: "连接可核验的文化知识", icon: Library },
  { label: "规划故事", detail: "从选题到逐镜头脚本", icon: Sparkles },
  { label: "绑定镜头", detail: "Shot 对应真实 Asset", icon: Film },
] as const;

export default function Home() {
  return (
    <main id="main-content" className="relative min-h-dvh overflow-hidden">
      <div className="paper-grid absolute inset-0 -z-10" aria-hidden="true" />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
        <a href="#main-content" className="flex min-h-11 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="seal-mark" aria-hidden="true">齐</span>
          <span>
            <span className="block font-serif text-lg font-semibold tracking-wide">齐鲁影策</span>
            <span className="block text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">QiluVision</span>
          </span>
        </a>
        <span className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
          Phase 0 · 工程基座
        </span>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:pb-28 lg:pt-32">
        <div>
          <p className="mb-6 flex items-center gap-3 text-sm font-medium tracking-[0.18em] text-accent-foreground">
            <span className="h-px w-8 bg-seal" aria-hidden="true" />
            青年创作者的齐鲁文化影像助手
          </p>
          <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-[1.12] tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl">
            让每一帧山东，
            <span className="ink-emphasis">都有故事可讲。</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            从散落的照片与视频出发，理解真实素材，连接齐鲁文化知识，规划可执行的故事，并让每个镜头都能回到它对应的画面。
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/projects" className={cn(buttonVariants({ size: "lg" }))}>
              进入素材工作台
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a href="#workflow" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              查看核心链路
            </a>
            <p className="text-sm text-muted-foreground">当前仅展示产品与工程框架</p>
          </div>
        </div>

        <div id="workflow" className="relative scroll-mt-8 border-l border-ink/15 pl-6 sm:pl-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Core workflow</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold">从素材到可拍摄方案</h2>
            </div>
            <span className="font-serif text-5xl text-ink/10" aria-hidden="true">01</span>
          </div>

          <ol className="grid gap-3">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="group flex items-center gap-4 border border-border bg-card/75 p-4 backdrop-blur-sm transition-colors hover:border-ink/25 hover:bg-card">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground" aria-hidden="true">
                    0{index + 1}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-border px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>齐鲁影策 QiluVision</p>
        <p>AI 只在服务端运行 · 文化事实需经知识库核验</p>
      </footer>
    </main>
  );
}
