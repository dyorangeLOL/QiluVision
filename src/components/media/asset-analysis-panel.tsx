"use client";

import { useState } from "react";
import { LoaderCircle, RefreshCw, ScanSearch, TriangleAlert } from "lucide-react";
import type { AssetAnalysisOutput } from "@/lib/ai/schemas/asset-analysis";

function label(value: string): string {
  return ({ extreme_wide: "超广角", wide: "广角", medium: "中景", close_up: "近景", extreme_close_up: "特写", mixed: "混合", unknown: "未知", eye_level: "平视", daylight: "日光", static: "静止", establishing: "环境建立", transition: "转场", atmosphere: "氛围", opening: "开场", ending: "结尾", detail: "细节", character: "人物", high: "高", medium_confidence: "中", low: "低" } as Record<string, string>)[value] ?? value;
}

export function AssetAnalysisPanel({ assetId, initialStatus, initialAnalysis }: { assetId: string; initialStatus: string; initialAnalysis: AssetAnalysisOutput | null }) {
  const [status, setStatus] = useState(initialStatus);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function analyze() {
    // 按钮在请求期间禁用，避免同一素材产生重复分析任务。
    if (busy) return;
    setBusy(true); setStatus("analyzing"); setError(null);
    try {
      const response = await fetch(`/api/assets/${assetId}/analysis`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "AI 分析失败。");
      setAnalysis(payload.analysis); setStatus("ready");
    } catch (reason) {
      setStatus("failed"); setError(reason instanceof Error ? reason.message : "AI 分析失败。");
    } finally { setBusy(false); }
  }

  return <section className="mt-14 border-t border-border pt-8" aria-labelledby="asset-reading-heading">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">素材解读</p><h2 id="asset-reading-heading" className="mt-2 flex items-center gap-2 border-l-2 border-seal pl-3 font-serif text-2xl font-semibold"><ScanSearch className="size-5 text-seal" aria-hidden="true" />影像观察</h2></div>
      <button type="button" onClick={analyze} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-seal hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}{busy ? "正在整理…" : analysis ? "重新解读" : "开始解读"}</button>
    </div>
    {error ? <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    {status === "failed" && !error ? <p role="status" className="mt-5 text-sm text-red-700">上一次解读未完成，请重试。</p> : null}
    {!analysis && !busy ? <p className="mt-5 text-sm text-muted-foreground">尚未建立素材解读。开始后，图片或视频关键帧会在服务器端整理为可用于创作的画面线索。</p> : null}
    {busy ? <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />正在整理画面线索，视频会综合全部关键帧…</p> : null}
    {analysis ? <div className="mt-6 grid gap-6 text-sm lg:grid-cols-2">
      <div className="border border-border bg-card p-5 lg:col-span-2"><p className="text-xs text-muted-foreground">内容概述</p><p className="mt-2 text-base leading-7">{analysis.summary}</p></div>
      <div className="grid gap-3 border border-border bg-card p-5"><p className="font-medium">场景与主体</p><p><span className="text-muted-foreground">场景：</span>{label(analysis.scene.type)} · {analysis.scene.description}</p><p><span className="text-muted-foreground">地点推测：</span>{analysis.scene.location_guess ?? "未作地点推测"}（{Math.round(analysis.scene.location_confidence * 100)}%）</p><p><span className="text-muted-foreground">主体：</span>{analysis.subjects.map((subject) => subject.name).join("、") || "未识别"}</p></div>
      <div className="grid gap-3 border border-border bg-card p-5"><p className="font-medium">镜头与氛围</p><p><span className="text-muted-foreground">景别：</span>{label(analysis.shot.shot_size)} · <span className="text-muted-foreground">运动：</span>{label(analysis.shot.camera_motion)}</p><p><span className="text-muted-foreground">光线：</span>{label(analysis.visual.lighting)} · <span className="text-muted-foreground">氛围：</span>{analysis.visual.mood.join("、") || "未知"}</p><p><span className="text-muted-foreground">推荐用途：</span>{analysis.suggested_uses.map(label).join("、") || "未建议"}</p></div>
      <div className="border border-border bg-card p-5"><p className="font-medium">关键词</p><div className="mt-3 flex flex-wrap gap-2">{analysis.keywords.map((keyword) => <span key={keyword} className="border border-border px-2.5 py-1 text-xs">{keyword}</span>)}</div></div>
      <div className="border border-border bg-card p-5"><p className="font-medium">解读把握度</p><p className="mt-3 text-2xl font-semibold">{Math.round(analysis.confidence * 100)}%</p></div>
      {analysis.uncertainties.length ? <div className="border border-amber-200 bg-amber-50 p-5 lg:col-span-2"><p className="flex items-center gap-2 font-medium text-amber-900"><TriangleAlert className="size-4" aria-hidden="true" />仍需确认</p><ul className="mt-3 grid gap-2 text-amber-900">{analysis.uncertainties.map((item) => <li key={item}>· {item}</li>)}</ul></div> : null}
    </div> : null}
  </section>;
}
