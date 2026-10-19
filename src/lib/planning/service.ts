import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DeepSeekProvider } from "@/lib/ai/deepseek-provider";
import type { AIProvider } from "@/lib/ai/provider";
import { assetAnalysisOutputSchema, planningSettingsSchema, shotDraftSchema, missingShotSchema } from "@/lib/ai/schemas";
import { INSUFFICIENT_EVIDENCE, retrieveCulture } from "@/lib/culture/retrieval";
import { validateShots, type ShotDraft } from "./constraints";

export const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("topics") }),
  z.object({ action: z.literal("select"), topicId: z.string().min(1) }),
  z.object({ action: z.enum(["plan", "replan"]), settings: planningSettingsSchema, revision: z.number().int().optional(), instruction: z.string().max(1000).default("") }),
  z.object({ action: z.literal("save"), revision: z.number().int(), shots: z.array(shotDraftSchema).min(1).max(60) }),
  z.object({ action: z.enum(["diagnose", "verify"]), revision: z.number().int() }),
  z.object({ action: z.literal("rewrite"), revision: z.number().int(), shotId: z.string(), instruction: z.string().min(1).max(1000) }),
  z.object({ action: z.literal("checklist"), revision: z.number().int(), indices: z.array(z.number().int().nonnegative()).max(60) }),
]);
const diagnosisSchema = z.object({ missingShots: z.array(missingShotSchema), checklist: z.array(z.number().int()).default([]) });

export class PlanningError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

async function load(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId }, include: {
    assets: { include: { analysis: true }, orderBy: { createdAt: "asc" } },
    topics: { orderBy: { rank: "asc" } },
    storyboards: { orderBy: { createdAt: "desc" }, take: 1, include: { shots: { orderBy: { position: "asc" } }, culturalClaims: { include: { knowledgeEntry: true } } } },
  } });
  if (!project) throw new PlanningError("项目不存在。", 404);
  return project;
}

type StoredShot = Awaited<ReturnType<typeof load>>["storyboards"][number]["shots"][number];
export function toDraft(shot: StoredShot): ShotDraft {
  return shotDraftSchema.parse({ ...shot, narration: shot.narration ?? "", shotSize: shot.shotSize ?? "", cameraHeight: shot.cameraHeight ?? "", cameraMovement: shot.cameraMovement ?? "", durationSeconds: shot.durationSeconds ?? 1 });
}

function diagnostics(json: string) {
  try { return diagnosisSchema.parse(JSON.parse(json)); } catch { return { missingShots: [], checklist: [] }; }
}

export async function getPlanningData(projectId: string) {
  const project = await load(projectId);
  const board = project.storyboards[0];
  const culture = await retrieveCulture({ query: `${project.name} ${project.creativeIntent ?? ""}`, limit: 8 });
  return {
    project: { id: project.id, name: project.name, creativeIntent: project.creativeIntent },
    assets: project.assets.map((asset) => {
      let analysis = null;
      try { if (asset.status === "ready" && asset.analysis?.status === "ready") analysis = assetAnalysisOutputSchema.parse(JSON.parse(asset.analysis.analysisJson)); } catch { /* 无效旧分析不参与匹配说明。 */ }
      return { id: asset.id, originalFilename: asset.originalFilename, status: asset.status, aiStatus: analysis ? "ready" : "pending", analysis, duration: asset.duration, type: asset.type, thumbnailUrl: asset.thumbnailPath ? `/api/assets/${asset.id}/thumbnail` : null };
    }),
    topics: project.topics, knowledge: culture.entries,
    board: board ? { id: board.id, title: board.title, synopsis: board.synopsis, narrativeArc: board.narrativeArc, revision: board.revision, targetDuration: board.targetDuration, aspectRatio: board.aspectRatio, shots: board.shots.map(toDraft), claims: board.culturalClaims.map((claim) => ({ id: claim.id, shotId: claim.shotId, claim: claim.claim, status: claim.status, evidence: claim.evidence, source: claim.knowledgeEntry?.source ?? null })), diagnosis: diagnostics(board.diagnosisJson) } : null,
  };
}

export async function runPlanningAction(projectId: string, raw: unknown, provider: AIProvider = new DeepSeekProvider(), progress: (stage: string) => void = () => {}) {
  progress("检查素材与方案版本");
  const input = actionSchema.parse(raw);
  const project = await load(projectId);
  const board = project.storyboards[0];
  const oldShots = board?.shots.map(toDraft) ?? [];
  const available = project.assets.filter((asset) => asset.status === "ready").map((asset) => ({ assetId: asset.id, originalFilename: asset.originalFilename, mediaType: asset.type, duration: asset.duration }));
  const analyzed = project.assets.flatMap((asset) => {
    if (asset.status !== "ready" || asset.analysis?.status !== "ready") return [];
    try {
      return [{ assetId: asset.id, originalFilename: asset.originalFilename, mediaType: asset.type, duration: asset.duration, analysis: assetAnalysisOutputSchema.parse(JSON.parse(asset.analysis.analysisJson)) }];
    } catch { return []; }
  });
  if ("revision" in input && board && input.revision !== board.revision) throw new PlanningError("方案已更新，请刷新后再操作。");
  const culture = await retrieveCulture({ query: `${project.name} ${project.creativeIntent ?? ""} ${analyzed.map((asset) => `${asset.analysis.summary} ${asset.analysis.scene.location_guess ?? ""}`).join(" ")}`, limit: 8 });
  const needAnalyses = () => { if (!analyzed.length) throw new PlanningError("请先完成至少一份真实素材解读；当前没有有效分析，不能生成选题或分镜。"); };

  if (input.action === "topics") {
    needAnalyses();
    progress("根据真实素材与文化线索生成三个选题");
    const result = await provider.generateTopics({ creativeIntent: project.creativeIntent ?? project.name, assets: analyzed, cultureContext: culture.entries });
    progress("校验选题与文化引用并保存");
    const ranks = result.topics.map((topic) => topic.rank).sort().join(",");
    if (ranks !== "1,2,3") throw new PlanningError("模型返回的选题排序不完整，请重试。", 502);
    await db.$transaction(async (tx) => {
      const current = await tx.storyboard.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } });
      if (current?.id !== board?.id || current?.revision !== board?.revision) throw new PlanningError("方案已更新，请刷新。");
      await tx.topic.deleteMany({ where: { projectId } });
      for (const topic of result.topics) {
        const entry = culture.entries.find((item) => item.verified && topic.evidenceEntryIds?.includes(item.entryId) && topic.evidenceQuote && topic.evidenceQuote.length >= 12 && item.content.includes(topic.evidenceQuote));
        // 文化关联只展示确实存在的来源摘录，不展示模型未证实的事实陈述。
        await tx.topic.create({ data: { projectId, rank: topic.rank, title: topic.title, angle: topic.angle, rationale: topic.rationale, culturalRelevance: entry ? `${topic.evidenceQuote}（${entry.title}）` : INSUFFICIENT_EVIDENCE } });
      }
    });
    return;
  }
  if (input.action === "select") {
    if (!project.topics.some((topic) => topic.id === input.topicId)) throw new PlanningError("选题不属于当前项目。", 400);
    await db.$transaction(async (tx) => {
      await tx.topic.updateMany({ where: { projectId }, data: { selected: false } });
      await tx.topic.update({ where: { id: input.topicId }, data: { selected: true } });
    });
    return;
  }
  if (input.action === "plan" || input.action === "replan") {
    needAnalyses();
    const selected = project.topics.find((topic) => topic.selected);
    if (!selected) throw new PlanningError("请先选择一个选题。");
    if (input.action === "replan" && !board) throw new PlanningError("请先生成故事方案。");
    if (input.action === "plan" && oldShots.some((shot) => shot.isShotLocked || shot.isAssetLocked)) throw new PlanningError("已有锁定项，请使用受约束重新规划。");
    progress("规划故事结构");
    const plan = await provider.planStory({ creativeIntent: project.creativeIntent ?? project.name, selectedTopic: `${selected.title}：${selected.angle}`, assets: analyzed, cultureContext: culture.entries, settings: input.settings });
    progress("生成逐镜分镜并绑定真实素材");
    const generated = await provider.generateStoryboard({ storyPlan: plan, assets: analyzed, cultureContext: culture.entries, settings: input.settings, lockedShots: oldShots.filter((shot) => shot.isShotLocked || shot.isAssetLocked), instruction: input.instruction });
    progress("检查镜头数量、时长、素材绑定及锁定约束");
    // 旧镜头的锁定状态不能由模型解除。手动解锁必须单独保存。
    const candidates = generated.shots.map((shot) => { const previous = oldShots.find((old) => old.id === shot.id); return previous ? { ...shot, isShotLocked: previous.isShotLocked, isAssetLocked: previous.isAssetLocked } : shot; });
    const shots = validateShots(candidates, oldShots, analyzed, input.settings.targetDuration);
    if (shots.length !== input.settings.shotCount) throw new PlanningError("模型生成的镜头数量与要求不一致，请重试。", 502);
    if (input.instruction.includes("仅使用现有素材") && shots.some((shot) => !shot.assetId)) throw new PlanningError("现有素材不足以完成方案，请补拍或调整目标。");
    await persistBoard(projectId, board, shots, { title: plan.title, synopsis: plan.synopsis, narrativeArc: plan.narrativeArc, storyPlanJson: JSON.stringify(plan), targetDuration: input.settings.targetDuration, aspectRatio: input.settings.aspectRatio, topicId: selected.id });
    return;
  }
  if (!board) throw new PlanningError("请先生成分镜方案。");
  if (input.action === "save") {
    await persistBoard(projectId, board, validateShots(input.shots, oldShots, available));
  } else if (input.action === "rewrite") {
    progress("重写单个镜头并保留锁定素材");
    const shot = oldShots.find((item) => item.id === input.shotId);
    if (!shot) throw new PlanningError("镜头不存在。", 404);
    if (shot.isShotLocked) throw new PlanningError("请先解锁镜头并保存，再重新生成。");
    needAnalyses();
    const result = await provider.rewriteShot({ shot, instruction: input.instruction, availableAssets: analyzed, preserveShot: shot.isShotLocked, preserveAsset: shot.isAssetLocked });
    if (result.shot.id !== shot.id || result.shot.position !== shot.position || result.shot.durationSeconds !== shot.durationSeconds) throw new PlanningError("重写未保留镜头 ID、顺序或时长，请重试。", 502);
    const updated = { ...result.shot, isShotLocked: shot.isShotLocked, isAssetLocked: shot.isAssetLocked };
    await persistBoard(projectId, board, validateShots(oldShots.map((item) => item.id === shot.id ? updated : item), oldShots, available));
  } else if (input.action === "diagnose") {
    progress("对照现有素材诊断缺镜头");
    needAnalyses();
    const result = await provider.diagnoseMissingShots({ shots: oldShots, assets: analyzed });
    if (result.missingShots.some((item) => item.storyboard_position > oldShots.length)) throw new PlanningError("诊断位置超出分镜范围。", 502);
    await updateMetadata(board, { diagnosisJson: JSON.stringify({ ...result, checklist: [] }) });
  } else if (input.action === "checklist") {
    const diagnosis = diagnostics(board.diagnosisJson);
    if (input.indices.some((index) => index >= diagnosis.missingShots.length)) throw new PlanningError("补拍条目不存在。", 400);
    await updateMetadata(board, { diagnosisJson: JSON.stringify({ ...diagnosis, checklist: Array.from(new Set(input.indices)) }) });
  } else if (input.action === "verify") {
    progress("逐条核验旁白的文化依据");
    const claims = Array.from(new Set(oldShots.map((shot) => shot.narration?.trim()).filter((text): text is string => Boolean(text))));
    if (!claims.length) throw new PlanningError("当前没有可核验的旁白。");
    const result = await provider.verifyCulturalClaims({ claims, context: culture.entries });
    if (result.claims.length !== claims.length || new Set(result.claims.map((claim) => claim.claim)).size !== claims.length || result.claims.some((claim) => !claims.includes(claim.claim))) throw new PlanningError("核验结果没有逐条对应旁白。", 502);
    await db.$transaction(async (tx) => {
      await revisionGuard(tx, board);
      await tx.culturalClaim.deleteMany({ where: { storyboardId: board.id } });
      for (const claim of result.claims) {
        const validIds = claim.evidenceEntryIds.length > 0 && claim.evidenceEntryIds.every((id) => culture.entries.some((item) => item.entryId === id && item.verified));
        const entry = validIds ? culture.entries.find((item) => item.verified && claim.evidenceEntryIds.includes(item.entryId) && claim.evidenceQuote && claim.evidenceQuote.length >= 12 && item.content.includes(claim.evidenceQuote)) : undefined;
        const supported = claim.status === "supported" && Boolean(entry);
        await tx.culturalClaim.create({ data: { storyboardId: board.id, shotId: oldShots.find((shot) => shot.narration?.trim() === claim.claim)?.id, claim: claim.claim, status: supported ? "supported" : "insufficient_evidence", knowledgeEntryId: supported ? entry!.entryId : null, evidence: supported ? claim.evidenceQuote : INSUFFICIENT_EVIDENCE } });
      }
    });
  }
}

type StoredBoard = NonNullable<Awaited<ReturnType<typeof load>>["storyboards"][number]>;
async function revisionGuard(tx: Prisma.TransactionClient, board: StoredBoard) {
  const result = await tx.storyboard.updateMany({ where: { id: board.id, revision: board.revision }, data: { revision: { increment: 1 } } });
  if (result.count !== 1) throw new PlanningError("方案已被其它操作更新，请刷新。");
}
async function updateMetadata(board: StoredBoard, data: Prisma.StoryboardUpdateManyMutationInput) {
  await db.$transaction(async (tx) => { await revisionGuard(tx, board); await tx.storyboard.update({ where: { id: board.id }, data }); });
}
async function persistBoard(projectId: string, board: StoredBoard | undefined, shots: ShotDraft[], data: Prisma.StoryboardUncheckedUpdateInput = {}) {
  await db.$transaction(async (tx) => {
    if (typeof data.topicId === "string" && !await tx.topic.findFirst({ where: { id: data.topicId, projectId, selected: true } })) throw new PlanningError("选题在生成期间已更改，请刷新后重试。");
    let id: string;
    if (board) {
      await revisionGuard(tx, board); id = board.id;
      await tx.storyboard.update({ where: { id }, data: { ...data, diagnosisJson: "[]" } });
      await tx.culturalClaim.deleteMany({ where: { storyboardId: id } });
      // 先移出唯一顺序区间，保留锁定 Shot 的记录身份而非删掉重建。
      for (const old of board.shots) await tx.shot.update({ where: { id: old.id }, data: { position: -old.position - 1 } });
      await tx.shot.deleteMany({ where: { storyboardId: id, id: { notIn: shots.map((shot) => shot.id!) } } });
    } else {
      const existing = await tx.storyboard.findFirst({ where: { projectId } });
      if (existing) throw new PlanningError("另一请求已创建方案，请刷新。");
      const created = await tx.storyboard.create({ data: { projectId, title: String(data.title ?? "创作方案"), synopsis: String(data.synopsis ?? ""), ...data } as Prisma.StoryboardUncheckedCreateInput });
      id = created.id;
    }
    for (const shot of shots) {
      const { id: shotId, ...content } = shot;
      await tx.shot.upsert({ where: { id: shotId! }, create: { ...content, id: shotId, storyboardId: id }, update: content });
      if (shot.narration?.trim()) await tx.culturalClaim.create({ data: { storyboardId: id, shotId, claim: shot.narration.trim(), status: "insufficient_evidence", evidence: INSUFFICIENT_EVIDENCE } });
    }
  });
}
