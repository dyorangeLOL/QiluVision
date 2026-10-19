import { NextResponse } from "next/server";

import { DeepSeekProvider } from "@/lib/ai/deepseek-provider";
import { db } from "@/lib/db";
import { resolveDatabasePath } from "@/lib/media/storage";

const activeAnalyses = new Set<string>();

// 401、402、413、429 等明确的业务错误重试没有收益，避免浪费模型额度。
function shouldRetry(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return !/HTTP (401|402|413|429)/.test(message);
}

function publicError(error: unknown): string {
  if (error instanceof Error && /API Key|未配置|请求过于频繁|HTTP \d+|JSON|分析内容|文件/.test(error.message)) return error.message;
  return "AI 素材分析失败，请稍后重试。";
}

export async function POST(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  if (activeAnalyses.has(assetId)) return NextResponse.json({ error: "该素材正在分析中，请稍候。" }, { status: 409 });
  const asset = await db.asset.findUnique({ where: { id: assetId }, include: { frames: { orderBy: { position: "asc" } } } });
  if (!asset) return NextResponse.json({ error: "素材不存在。" }, { status: 404 });
  if (asset.status !== "ready") return NextResponse.json({ error: "素材尚未完成媒体预处理。" }, { status: 409 });

  // 进程内互斥足以防止同一 Demo 实例的重复点击造成并发分析。
  activeAnalyses.add(assetId);
  const startedAt = Date.now();
  await db.asset.update({ where: { id: assetId }, data: { aiStatus: "analyzing" } });
  // 图片使用缩略图降低请求体积；视频使用 Phase 1 的全部代表性关键帧。
  const imagePaths = asset.type === "video"
    ? asset.frames.map((frame) => resolveDatabasePath(frame.localPath))
    : [resolveDatabasePath(asset.thumbnailPath ?? asset.localPath)];
  if (!imagePaths.length) {
    activeAnalyses.delete(assetId);
    await db.asset.update({ where: { id: assetId }, data: { aiStatus: "failed" } });
    return NextResponse.json({ error: "没有找到可用于分析的关键帧。" }, { status: 422 });
  }
  const input = {
    assetId, mediaType: asset.type as "image" | "video", imagePaths, detail: "low" as const,
    metadata: { duration: asset.duration, width: asset.width, height: asset.height, fps: asset.fps, codec: asset.codec },
  };
  const provider = new DeepSeekProvider();
  try {
    let result;
    let lastError: unknown;
    // 最多两次尝试，且不会对不可重试的 HTTP 错误重复扣费。
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try { result = await provider.analyzeAsset(input); break; } catch (error) {
        lastError = error;
        if (!shouldRetry(error)) break;
      }
    }
    if (!result) throw lastError ?? new Error("分析失败");
    const analysisJson = JSON.stringify(result);
    const usage = provider.lastUsage;
    // 结构化结果先经过 Provider 内部的 Zod 校验，再写入数据库。
    await db.assetAnalysis.upsert({
      where: { assetId },
      create: { assetId, provider: "deepseek", model: process.env.DEEPSEEK_MODEL ?? "deepseek-flash", status: "ready", analysisJson, summary: result.summary, subjectsJson: JSON.stringify(result.subjects), scenesJson: JSON.stringify([result.scene.description]), visualTagsJson: JSON.stringify(result.keywords), locationHint: result.scene.location_guess, culturalHints: JSON.stringify(result.cultural_elements), confidence: result.confidence, inputCount: imagePaths.length, requestDurationMs: Date.now() - startedAt, promptTokens: usage?.promptTokens, completionTokens: usage?.completionTokens, totalTokens: usage?.totalTokens },
      update: { provider: "deepseek", model: process.env.DEEPSEEK_MODEL ?? "deepseek-flash", status: "ready", rawResponse: null, analysisJson, errorMessage: null, summary: result.summary, subjectsJson: JSON.stringify(result.subjects), scenesJson: JSON.stringify([result.scene.description]), visualTagsJson: JSON.stringify(result.keywords), locationHint: result.scene.location_guess, culturalHints: JSON.stringify(result.cultural_elements), confidence: result.confidence, inputCount: imagePaths.length, requestDurationMs: Date.now() - startedAt, promptTokens: usage?.promptTokens, completionTokens: usage?.completionTokens, totalTokens: usage?.totalTokens },
    });
    await db.asset.update({ where: { id: assetId }, data: { aiStatus: "ready" } });
    return NextResponse.json({ analysis: result });
  } catch (error) {
    console.error("[AI analysis failed]", error instanceof Error ? error.message : "unknown error");
    const message = publicError(error);
    await db.asset.update({ where: { id: assetId }, data: { aiStatus: "failed" } });
    await db.assetAnalysis.upsert({ where: { assetId }, create: { assetId, provider: "deepseek", model: process.env.DEEPSEEK_MODEL ?? "deepseek-flash", status: "failed", errorMessage: message, analysisJson: "{}", summary: "分析失败", subjectsJson: "[]", scenesJson: "[]", visualTagsJson: "[]" }, update: { status: "failed", errorMessage: message, analysisJson: "{}" } });
    return NextResponse.json({ error: message }, { status: 502 });
  } finally { activeAnalyses.delete(assetId); }
}
