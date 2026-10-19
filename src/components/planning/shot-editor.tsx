"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { ShotDraft } from "@/lib/planning/constraints";
import type { AssetAnalysisOutput } from "@/lib/ai/schemas/asset-analysis";
import { explainAssetMatch } from "@/lib/planning/matching";

type AssetOption = { id: string; originalFilename: string; thumbnailUrl: string | null; status: string; analysis: AssetAnalysisOutput | null; duration: number | null };
export function ShotEditor({ shot, assets, busy, onChange, onMove, onDelete, onRewrite }: {
  shot: ShotDraft; assets: AssetOption[]; busy: boolean;
  onChange: (patch: Partial<ShotDraft>) => void; onMove: (offset: number) => void; onDelete: () => void; onRewrite: () => void;
}) {
  const asset = assets.find((item) => item.id === shot.assetId);
  const inputClass = "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60";
  return <article className="workspace-panel p-5" aria-label={`镜头 ${shot.position + 1}`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{String(shot.position + 1).padStart(2, "0")} · {shot.title}</h3><span className="text-sm text-muted-foreground">{shot.isShotLocked ? "镜头已锁定" : shot.isAssetLocked ? "素材已锁定" : "可编辑"}</span></div>
    <div className="mt-4 grid gap-5 lg:grid-cols-[220px_1fr]">
      <div>{asset?.thumbnailUrl ? <div className="relative aspect-video overflow-hidden rounded-lg bg-muted"><Image src={asset.thumbnailUrl} alt={asset.originalFilename} fill unoptimized sizes="220px" className="object-cover" /></div> : <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">待补充素材</div>}
        <label className="mt-3 block text-sm">绑定素材<select className={`${inputClass} mt-2`} value={shot.assetId ?? ""} disabled={busy || shot.isShotLocked || shot.isAssetLocked} onChange={(event) => onChange({ assetId: event.target.value || null })}><option value="">待补拍 / 暂不绑定</option>{assets.filter((item) => item.status === "ready").map((item) => <option key={item.id} value={item.id}>{item.originalFilename}</option>)}</select></label>
      </div>
      <div className="grid gap-3"><label className="text-sm">画面描述<textarea className={`${inputClass} mt-2`} rows={2} value={shot.visualDescription} disabled={busy || shot.isShotLocked} maxLength={2000} onChange={(event) => onChange({ visualDescription: event.target.value })} /></label>
        <label className="text-sm">旁白<textarea className={`${inputClass} mt-2`} rows={2} value={shot.narration ?? ""} maxLength={3000} disabled={busy || shot.isShotLocked} onChange={(event) => onChange({ narration: event.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><label className="text-sm">时长（秒）<input type="number" min="0.1" max="600" step="0.1" className={`${inputClass} mt-2`} value={shot.durationSeconds ?? 1} disabled={busy || shot.isShotLocked} onChange={(event) => onChange({ durationSeconds: Number(event.target.value) })} /></label>{([['shotSize', '景别'], ['cameraHeight', '机位高度'], ['cameraMovement', '镜头运动']] as const).map(([field, title]) => <label key={field} className="text-sm">{title}<input className={`${inputClass} mt-2`} value={shot[field] ?? ""} disabled={busy || shot.isShotLocked} maxLength={100} onChange={(event) => onChange({ [field]: event.target.value })} /></label>)}</div>
        <p className="text-sm text-muted-foreground">叙事目的：{shot.purpose}</p>
        <details className="rounded-lg border border-border p-3 text-sm leading-7"><summary className="cursor-pointer font-medium">素材匹配依据</summary><p className="mt-2 text-muted-foreground">基于已保存分析的文字线索与媒体时长，不是匹配评分；更换素材或编辑描述后即时更新。</p><ul className="mt-2 list-disc space-y-1 pl-5">{explainAssetMatch(shot, asset?.analysis ?? null, asset?.duration ?? null).map((reason) => <li key={reason}>{reason}</li>)}</ul></details>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={shot.isShotLocked} disabled={busy} onChange={(event) => onChange({ isShotLocked: event.target.checked })} />锁定镜头</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={shot.isAssetLocked} disabled={busy || !shot.assetId} onChange={(event) => onChange({ isAssetLocked: event.target.checked })} />锁定素材</label>
      <Button variant="outline" disabled={busy || shot.isShotLocked} onClick={() => onMove(-1)} aria-label={`上移镜头 ${shot.position + 1}`}>上移</Button><Button variant="outline" disabled={busy || shot.isShotLocked} onClick={() => onMove(1)} aria-label={`下移镜头 ${shot.position + 1}`}>下移</Button>
      <Button variant="outline" disabled={busy || shot.isShotLocked} onClick={onRewrite}>重新生成此镜头</Button><Button variant="outline" disabled={busy || shot.isShotLocked || shot.isAssetLocked} onClick={onDelete}>删除镜头</Button>
    </div>
  </article>;
}
