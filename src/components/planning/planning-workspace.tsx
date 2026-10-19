"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ShotEditor } from "./shot-editor";
import type { getPlanningData } from "@/lib/planning/service";
import type { ShotDraft } from "@/lib/planning/constraints";
import { PlanningRequestError, readPlanningProgress } from "@/lib/planning/progress";

type Data = Awaited<ReturnType<typeof getPlanningData>>;
export function PlanningWorkspace({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial);
  const [shots, setShots] = useState<ShotDraft[]>(initial.board?.shots ?? []);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stage, setStage] = useState("");
  const [retry, setRetry] = useState<{ action: string; extra: Record<string, unknown> } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const inFlight = useRef(false);
  const [settings, setSettings] = useState({ aspectRatio: initial.board?.aspectRatio ?? "9:16", targetDuration: initial.board?.targetDuration ?? 60, shotCount: initial.board?.shots.length ?? 10 });
  const [instruction, setInstruction] = useState("");
  const [rewriteId, setRewriteId] = useState<string | null>(null);
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [query, setQuery] = useState("");
  const [knowledge, setKnowledge] = useState(initial.knowledge);
  const [searching, setSearching] = useState(false);
  const url = `/api/projects/${data.project.id}/planning`;
  const ready = data.assets.filter((asset) => asset.aiStatus === "ready" && asset.status === "ready").length;

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (inFlight.current || uncertain) return;
    if (dirty && action !== "save") { setError("请先保存当前编辑，再执行其它操作。"); return; }
    inFlight.current = true;
    setBusy(action); setError(""); setNotice(""); setStage("提交请求"); setRetry(null);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify({ action, revision: data.board?.revision, ...extra }) });
      const payload = await readPlanningProgress(response, setStage) as Data;
      setData(payload); setShots(payload.board?.shots ?? []); setDirty(false); setRewriteId(null);
      setNotice("已保存最新结果。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败，请重试。");
      if (reason instanceof PlanningRequestError && reason.status !== 409 && reason.status !== 404) setRetry({ action, extra });
      else setUncertain(true);
    }
    finally { inFlight.current = false; setBusy(""); setStage(""); }
  }
  async function refreshResult() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy("refresh");
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("暂时无法刷新，请稍后再试。");
      const latest: Data = await response.json();
      // 有本地草稿时保留原 revision，不能用新 revision 悄悄覆盖远端更新。
      if (!dirty) { setData(latest); setShots(latest.board?.shots ?? []); }
      setUncertain(false); setRetry(null); setError("");
      setNotice(dirty ? "已检查服务器结果，当前草稿及其原版本号已保留。若保存提示版本冲突，请先复制编辑内容再刷新页面。" : "已读取最新保存结果。若上次请求尚未完成，请稍后再刷新；重新生成可能产生 API 费用。");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "刷新失败。"); }
    finally { inFlight.current = false; setBusy(""); }
  }
  function edit(next: ShotDraft[]) { setShots(next); setDirty(true); setError(""); setRetry(null); }
  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= shots.length) return;
    const next = [...shots]; [next[index], next[target]] = [next[target], next[index]];
    const positioned = next.map((shot, position) => ({ ...shot, position }));
    if (data.board?.shots.some((old) => old.isShotLocked && positioned.find((shot) => shot.id === old.id)?.position !== old.position)) { setError("不能改变已锁定镜头的位置，请先解锁并保存。"); return; }
    edit(positioned);
  }
  async function searchKnowledge(event: React.FormEvent) {
    event.preventDefault(); setSearching(true); setError("");
    try { const response = await fetch(`/api/knowledge?q=${encodeURIComponent(query)}`); const result = await response.json(); if (!response.ok) throw new Error(result.error); setKnowledge(result.entries); }
    catch { setError("知识检索未完成，请重试。"); } finally { setSearching(false); }
  }
  const control = "min-h-11 rounded-lg border border-border bg-card px-3 text-sm";
  return <div className="grid gap-8">
    <div className="rounded-xl border border-border bg-card p-5 text-sm leading-7"><p>AI 选题、故事与分镜功能已接入，尚待真实 API 验收。点击生成会调用你配置的 DeepSeek，产生账户费用。</p><p className="text-muted-foreground">已解读素材：{ready} / {data.assets.length}。仅有效分析参与创作；上传与媒体处理不能替代画面理解。<Link href={`/projects/${data.project.id}`} className="ml-2 underline">返回素材库</Link></p></div>
    {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    {retry || uncertain ? <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={Boolean(busy)} onClick={() => void refreshResult()}>刷新已保存结果</Button>{retry && !uncertain ? <Button variant="outline" disabled={Boolean(busy)} onClick={() => { if (window.confirm("重试会重新执行此操作，AI 操作可能产生费用。是否继续？")) void act(retry.action, retry.extra); }}>重试上次操作</Button> : null}<p className="text-sm text-muted-foreground">{uncertain ? "请求结果尚未确认，已暂停提交；请先刷新，避免重复计费。" : "原方案和当前输入已保留。修改输入后请使用对应的生成按钮。"}</p></div> : null}
    {notice ? <p role="status" className="text-sm">{notice}</p> : null}
    {busy ? <div role="status" aria-live="polite" aria-atomic="true" className="rounded-lg border border-border bg-card p-4 text-sm"><p>{stage || "正在读取最新结果"}…</p><p className="mt-1 text-muted-foreground">显示实际执行阶段，不代表完成百分比。AI 操作可能需要数分钟，请勿重复提交。</p></div> : null}

    <section className="workspace-panel p-6"><h2 className="text-xl font-semibold">1. 文化线索</h2><form onSubmit={searchKnowledge} className="mt-4 flex flex-wrap gap-3"><label className="sr-only" htmlFor="culture-query">文化检索词</label><input id="culture-query" className={`${control} min-w-0 flex-1`} value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} placeholder="大明湖 / 趵突泉 / 烟台海洋" /><Button type="submit" variant="outline" disabled={searching}>{searching ? "检索中…" : "检索知识库"}</Button></form><div className="mt-5 grid gap-4 sm:grid-cols-2">{knowledge.map((entry) => <article key={entry.entryId} className="rounded-xl border border-border p-4"><h3 className="font-semibold">{entry.title}</h3><p className="mt-2 text-sm leading-7">{entry.content}</p><a href={entry.source} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm underline">查看官方来源 · {entry.verified ? "已核对来源" : "待核验"}</a></article>)}</div>{!knowledge.length ? <p className="mt-4 text-sm text-muted-foreground">未在当前知识库中找到充分依据</p> : null}</section>

    <section className="workspace-panel p-6"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-semibold">2. 选择一个故事方向</h2><Button disabled={Boolean(busy) || !ready} onClick={() => void act("topics")}>{data.topics.length ? "重新推荐三个选题" : "推荐三个选题"}</Button></div><div className="mt-5 grid gap-4 lg:grid-cols-3">{data.topics.map((topic) => <article key={topic.id} className={`rounded-xl border p-5 ${topic.selected ? "border-seal bg-accent/20" : "border-border"}`}><h3 className="font-semibold">{topic.rank}. {topic.title}</h3><p className="mt-3 text-sm leading-7">{topic.angle}</p><p className="mt-3 text-sm text-muted-foreground">素材依据：{topic.rationale}</p><p className="mt-3 text-sm text-muted-foreground">文化关联：{topic.culturalRelevance}</p><Button className="mt-4" variant="outline" disabled={Boolean(busy) || topic.selected} onClick={() => void act("select", { topicId: topic.id })}>{topic.selected ? "已选择" : "选择此方向"}</Button></article>)}</div>{!data.topics.length ? <p className="mt-4 text-sm text-muted-foreground">完成真实素材解读后，在这里生成三个不同的创作方向。</p> : null}</section>

    <section className="workspace-panel p-6"><h2 className="text-xl font-semibold">3. 故事与分镜</h2><div className="mt-5 flex flex-wrap items-end gap-4"><label className="grid gap-2 text-sm">画幅<select className={control} value={settings.aspectRatio} onChange={(event) => setSettings({ ...settings, aspectRatio: event.target.value })}><option>9:16</option><option>16:9</option></select></label><label className="grid gap-2 text-sm">目标时长（秒）<input className={`${control} w-32`} type="number" min={10} max={600} value={settings.targetDuration} onChange={(event) => setSettings({ ...settings, targetDuration: Number(event.target.value) })} /></label><label className="grid gap-2 text-sm">目标镜头数<input className={`${control} w-32`} type="number" min={3} max={30} value={settings.shotCount} onChange={(event) => setSettings({ ...settings, shotCount: Number(event.target.value) })} /></label><Button disabled={Boolean(busy) || !ready || !data.topics.some((topic) => topic.selected)} onClick={() => void act(data.board ? "replan" : "plan", { settings, instruction })}>{data.board ? "受约束重新规划" : "规划故事并生成分镜"}</Button></div>
      <label className="mt-5 grid gap-2 text-sm">规划要求<input className={control} maxLength={1000} value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="例如：以清晨到傍晚为线索，保留已锁定镜头" /></label><p className="mt-3 text-[13px] leading-6 text-muted-foreground">锁定镜头保留内容、位置与素材；仅锁定素材时允许调整旁白与位置。更改锁定状态后先保存。解锁与改内容需分两次保存。</p>
      {data.board ? <div className="mt-6 border-t border-border pt-5"><h3 className="text-lg font-semibold">{data.board.title}</h3><p className="mt-3 leading-7">{data.board.synopsis}</p><p className="mt-2 text-sm text-muted-foreground">{data.board.narrativeArc}</p><p className="mt-3 text-sm">{shots.length} 个镜头 · 实际 {shots.reduce((sum, shot) => sum + (shot.durationSeconds ?? 0), 0).toFixed(1)} 秒 · 目标 {data.board.targetDuration} 秒</p></div> : null}
    </section>
    {data.board ? <>
      <div className="flex flex-wrap items-center gap-3"><Button disabled={!dirty || Boolean(busy)} onClick={() => void act("save", { shots })}>保存分镜编辑</Button><Button variant="outline" disabled={Boolean(busy)} onClick={() => { setShots(data.board!.shots); setDirty(false); setError(""); }}>放弃未保存编辑</Button><span className="text-sm text-muted-foreground">{dirty ? "有未保存修改，生成与导出前请先保存" : "修改已保存"}</span></div>
      {shots.map((shot, index) => <ShotEditor key={shot.id} shot={shot} assets={data.assets} busy={Boolean(busy)} onChange={(patch) => edit(shots.map((item, i) => i === index ? { ...item, ...patch } : item))} onMove={(offset) => move(index, offset)} onDelete={() => { if (shots.length <= 1) { setError("至少保留一个镜头。"); return; } const next = shots.filter((_, i) => i !== index).map((item, position) => ({ ...item, position })); if (data.board!.shots.some((old) => old.isShotLocked && next.find((item) => item.id === old.id)?.position !== old.position)) { setError("删除会改变锁定镜头的位置，请先解锁并保存。"); return; } edit(next); }} onRewrite={() => { setRewriteId(shot.id!); setRewriteInstruction(""); }} />)}
      {rewriteId ? <form className="workspace-panel p-5" onSubmit={(event) => { event.preventDefault(); void act("rewrite", { shotId: rewriteId, instruction: rewriteInstruction }); }}><label className="grid gap-2 text-sm">单镜头修改要求<input className={control} value={rewriteInstruction} maxLength={1000} required onChange={(event) => setRewriteInstruction(event.target.value)} /></label><div className="mt-4 flex gap-3"><Button type="submit" disabled={Boolean(busy)}>确认重新生成</Button><Button variant="outline" onClick={() => setRewriteId(null)}>取消</Button></div></form> : null}
      <section className="workspace-panel p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">4. 缺镜头与补拍清单</h2><Button variant="outline" disabled={Boolean(busy) || !ready} onClick={() => void act("diagnose")}>诊断缺镜头</Button></div><p className="mt-3 text-sm text-muted-foreground">未绑定素材的镜头：{shots.filter((shot) => !shot.assetId).length}。AI 诊断后可选择补拍，或使用现有素材重规划。</p><div className="mt-4 grid gap-4">{data.board.diagnosis.missingShots.map((item, index) => <article key={index} className="rounded-xl border border-border p-4 text-sm leading-7"><h3 className="font-semibold">镜头 {item.storyboard_position + 1} · {item.missing_shot_type}</h3><p>目的：{item.purpose}</p><p>建议主体：{item.recommended_subject}</p><p>{item.shot_size} · {item.camera_height} · {item.camera_movement} · {item.duration} 秒</p><p>替代方案：{item.alternatives.join("；") || "暂无"}</p><Button className="mt-3" variant="outline" disabled={Boolean(busy)} onClick={() => { const selected = data.board!.diagnosis.checklist; void act("checklist", { indices: selected.includes(index) ? selected.filter((i) => i !== index) : [...selected, index] }); }}>{data.board!.diagnosis.checklist.includes(index) ? "已加入补拍清单 · 点击移除" : "加入补拍清单"}</Button></article>)}</div><Button className="mt-5" variant="outline" disabled={Boolean(busy) || !ready} onClick={() => void act("replan", { settings, instruction: `仅使用现有素材，不保留空素材绑定。${instruction}` })}>使用现有素材重新规划</Button></section>
      <section className="workspace-panel p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">5. 旁白文化依据</h2><Button variant="outline" disabled={Boolean(busy)} onClick={() => void act("verify")}>核验旁白依据</Button></div><p className="mt-3 text-sm text-muted-foreground">旁白修改后依据检查会失效，需重新核验。通过核验表示当前知识条目提供支持，不等于外部事实的绝对保证。</p><div className="mt-4 grid gap-3">{data.board.claims.map((claim) => <div key={claim.id} className="border-l-2 border-border pl-4 text-sm leading-7"><p>{claim.claim}</p><p className="text-muted-foreground">{claim.status === "supported" ? `当前知识库有依据：${claim.evidence}` : "未在当前知识库中找到充分依据"}</p>{claim.source ? <a href={claim.source} target="_blank" rel="noreferrer" className="underline">查看来源</a> : null}</div>)}</div></section>
      <section className="workspace-panel p-6"><h2 className="text-xl font-semibold">6. 导出创作方案</h2><p className="mt-3 text-sm text-muted-foreground">导出已保存的分镜、素材对应及补拍清单；SRT 按镜头时长累计生成，不包含视频剪辑或渲染。</p><div className="mt-5 flex flex-wrap gap-3">{["pdf", "csv", "txt", "srt"].map((format) => dirty ? <Button key={format} disabled>{format.toUpperCase()} · 先保存</Button> : <a key={format} className={buttonVariants({ variant: "outline" })} href={`/api/projects/${data.project.id}/export?format=${format}`}>{format.toUpperCase()}</a>)}</div></section>
    </> : null}
  </div>;
}
