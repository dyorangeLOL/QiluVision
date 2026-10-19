import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { getServerEnv } from "@/lib/env";
import { getCookieApiKey } from "@/lib/api-key-cookie";
import { assetAnalysisOutputSchema, type analyzeAssetInputSchema } from "./schemas/asset-analysis";
import { buildAssetAnalysisPrompt } from "./prompts/analyze-asset";
import type { AIProvider } from "./provider";
import type { z } from "zod";
import * as schemas from "./schemas";
import { requestStructured } from "./structured-request";
import { retrieveCulture, INSUFFICIENT_EVIDENCE } from "@/lib/culture/retrieval";

type AnalyzeInput = z.infer<typeof analyzeAssetInputSchema>;

const mimeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
};

/**
 * DeepSeek 的服务端适配器。
 * 图片文件只在这里读取并转成 data URL，API Key 不会进入客户端代码或日志。
 */
export class DeepSeekProvider implements AIProvider {
  public lastUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | null = null;

  async analyzeAsset(input: AnalyzeInput) {
    const env = getServerEnv(await getCookieApiKey());
    // 视频不会把 MP4 直接提交给模型，而是提交 Phase 1 生成的有序关键帧。
    const images = await Promise.all(input.imagePaths.map(async (imagePath) => {
      const data = (await readFile(imagePath)).toString("base64");
      const mime = mimeByExtension[path.extname(imagePath).toLowerCase()] ?? "image/jpeg";
      return { type: "image_url", image_url: { url: `data:${mime};base64,${data}`, detail: input.detail } };
    }));
    // 使用 OpenAI 兼容的 JSON 输出能力，减少模型返回非结构化文本的概率。
    const response = await fetch(`${env.DEEPSEEK_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: [{ type: "text", text: buildAssetAnalysisPrompt(input) }, ...images] }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error("DeepSeek API Key 无效或未配置。");
      if (response.status === 429) throw new Error("DeepSeek 请求过于频繁，请稍后重试。");
      throw new Error(`DeepSeek 服务暂时不可用（HTTP ${response.status}）。`);
    }
    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    this.lastUsage = payload.usage ? {
      promptTokens: payload.usage.prompt_tokens,
      completionTokens: payload.usage.completion_tokens,
      totalTokens: payload.usage.total_tokens,
    } : null;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek 未返回可解析的分析内容。");
    // 即使模型意外包裹 Markdown，也先剥离代码围栏，再交给 JSON.parse。
    const jsonText = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let parsed: unknown;
    try { parsed = JSON.parse(jsonText); } catch { throw new Error("DeepSeek 返回的内容不是合法 JSON。"); }
    return assetAnalysisOutputSchema.parse(parsed);
  }

  retrieveCultureContext(input: z.infer<typeof schemas.retrieveCultureContextInputSchema>) { return retrieveCulture(input); }
  generateTopics(input: z.infer<typeof schemas.generateTopicsInputSchema>) {
    return requestStructured("基于真实素材分析和文化上下文推荐恰好三个不同选题，rank 为1、2、3且不重复。rationale只解释真实素材支持，angle为创作建议。文化事实只放入culturalRelevance，并提供evidenceEntryIds及从verified知识content逐字摘录、至少12字的evidenceQuote。文化依据不足明确说明，不凭地点推测确认地点。", schemas.generateTopicsInputSchema.parse(input), schemas.generateTopicsOutputSchema);
  }
  planStory(input: z.infer<typeof schemas.planStoryInputSchema>) {
    return requestStructured("根据用户选中的选题规划故事结构，分段总时长与settings.targetDuration一致。只使用现有素材可支持的叙事，不把文化知识当成现场画面证据。", schemas.planStoryInputSchema.parse(input), schemas.planStoryOutputSchema);
  }
  generateStoryboard(input: z.infer<typeof schemas.generateStoryboardInputSchema>) {
    return requestStructured("逐镜头规划。position从0连续递增。总时长须等于settings.targetDuration。默认8–12镜头，以settings.shotCount为目标。每个assetId只能取自assets；无合适素材则null。视频镜头时长不得超过源视频。lockedShots中isShotLocked=true的镜头所有内容、id、position、assetId原样保留；isAssetLocked=true的镜头保留id与assetId，允许调整其它内容。新镜头不提供id。instruction可能要求仅用现有素材。不要删除任何锁定项。", schemas.generateStoryboardInputSchema.parse(input), schemas.generateStoryboardOutputSchema);
  }
  diagnoseMissingShots(input: z.infer<typeof schemas.diagnoseMissingShotsInputSchema>) {
    return requestStructured("检查分镜与真实素材之间的缺口，输出具体补拍建议，必须包含全部missingShot字段。storyboard_position对应从0开始的位置。alternatives给出现有素材ID及如何替代，或明确无可用替代。没有缺口返回空数组。不得假定未上传的画面存在。", schemas.diagnoseMissingShotsInputSchema.parse(input), schemas.diagnoseMissingShotsOutputSchema);
  }
  rewriteShot(input: z.infer<typeof schemas.rewriteShotInputSchema>) {
    return requestStructured("只重写一个镜头。保留id和position。preserveShot=true则全部原样返回；preserveAsset=true则assetId原样。assetId必须来自availableAssets或null，无法满足时不虚构素材。保留原时长。", schemas.rewriteShotInputSchema.parse(input), schemas.rewriteShotOutputSchema);
  }
  verifyCulturalClaims(input: z.infer<typeof schemas.verifyCulturalClaimsInputSchema>) {
    return requestStructured(`逐条检查claims，每条原文必须返回一次，不能遗漏、改写。只能依据context中verified=true条目。supported需给出evidenceEntryIds及从来源content逐字摘录的evidenceQuote。含推测或依据不足的结论使用insufficient_evidence，displayMessage必须为“${INSUFFICIENT_EVIDENCE}”。不作真假判定。`, schemas.verifyCulturalClaimsInputSchema.parse(input), schemas.verifyCulturalClaimsOutputSchema);
  }
}
