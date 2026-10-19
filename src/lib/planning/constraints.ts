import { randomUUID } from "node:crypto";
import { z } from "zod";
import { shotDraftSchema } from "@/lib/ai/schemas";

export type ShotDraft = z.infer<typeof shotDraftSchema>;
const contentKeys = ["position", "title", "purpose", "narration", "visualDescription", "shotSize", "cameraHeight", "cameraMovement", "durationSeconds", "assetId"] as const;

/** 模型提示词不是约束执行器；所有人工编辑及 AI 重规划均在入库前执行此检查。 */
export function validateShots(incoming: unknown, old: ShotDraft[], assets: Array<{ assetId: string; duration?: number | null; mediaType?: string }>, targetDuration?: number): ShotDraft[] {
  const parsed = z.array(shotDraftSchema).min(1).max(60).parse(incoming);
  if (parsed.some((shot) => shot.id && !old.some((previous) => previous.id === shot.id))) throw new Error("镜头 ID 不属于当前方案，新镜头不能指定 ID。");
  const shots = parsed.map((shot) => ({ ...shot, id: shot.id ?? randomUUID() }));
  const ids = new Set(shots.map((shot) => shot.id));
  if (ids.size !== shots.length) throw new Error("镜头 ID 重复。");
  for (let index = 0; index < shots.length; index++) {
    const shot = shots[index];
    if (shot.position !== index) throw new Error("镜头顺序必须从 0 连续排列。");
    if (!shot.durationSeconds) throw new Error("每个镜头都必须设置时长。");
    if (shot.assetId) {
      const asset = assets.find((item) => item.assetId === shot.assetId);
      if (!asset) throw new Error("镜头绑定了不存在、未就绪或非本项目的素材。");
      if (asset.mediaType === "video" && asset.duration != null && shot.durationSeconds > asset.duration + 0.01) throw new Error("镜头时长超过源视频，请调整时长或替换素材。");
    } else if (shot.isAssetLocked) throw new Error("未绑定素材的镜头不能锁定素材。");
  }
  for (const previous of old) {
    const next = shots.find((shot) => shot.id === previous.id);
    if (previous.isShotLocked && (!next || contentKeys.some((key) => (previous[key] ?? null) !== (next[key] ?? null)))) throw new Error("锁定镜头的内容、位置与素材不能更改；请先单独解锁并保存。");
    if (previous.isAssetLocked && (!next || next.assetId !== previous.assetId)) throw new Error("锁定素材不能被替换或移除；请先单独解锁并保存。");
  }
  if (targetDuration && Math.abs(shots.reduce((sum, shot) => sum + (shot.durationSeconds ?? 0), 0) - targetDuration) > 0.5) throw new Error("生成的镜头总时长与目标不符，请重试或调整目标。");
  return shots;
}
