import type { z } from "zod";
import type { analyzeAssetInputSchema } from "../schemas/asset-analysis";

type AnalyzeInput = z.infer<typeof analyzeAssetInputSchema>;

export function buildAssetAnalysisPrompt(input: AnalyzeInput): string {
  // 视频帧顺序和“只分析可见内容”是避免模型臆测的核心上下文。
  const mediaRule = input.mediaType === "video"
    ? "这些图片来自同一个视频，已经按时间顺序排列。请综合判断整段视频，不能把每帧当成互不相关的图片。camera_motion 无充分依据时必须写 unknown。"
    : "这是一张静态图片，只分析当前画面中可观察到的内容。";
  return `你是专业影像素材分析助手，为短视频创作提供结构化素材信息。

${mediaRule}
只分析画面中可以观察到的内容，不要根据文件名猜测，不要虚构地点或文化事实。若无法确定，请写 unknown 或 null，并在 uncertainties 中说明。location_guess 只能是谨慎推测，不能把景物直接断言为具体地点。中文描述简洁、专业、适合创作工具 UI。

${input.metadata ? `已知媒体元数据（仅作辅助，不要据此编造画面内容）：${JSON.stringify(input.metadata)}` : "没有可靠的媒体元数据。"}

请严格返回合法 JSON，禁止 Markdown 代码块、解释文字或额外字段。JSON 必须符合以下结构：
{"summary":"一句话概括","scene":{"type":"campus|park|street|lake|spring|coast|building|indoor|landscape|other|unknown","description":"","location_guess":null,"location_confidence":0},"subjects":[{"name":"","importance":"primary|secondary"}],"shot":{"shot_size":"extreme_wide|wide|medium|close_up|extreme_close_up|mixed|unknown","composition":[],"camera_angle":"eye_level|high|low|aerial|unknown","camera_motion":"static|pan|tilt|push_in|pull_out|tracking|handheld|mixed|unknown"},"visual":{"lighting":"daylight|sunset|night|indoor|mixed|unknown","color_impression":[],"mood":[],"visual_quality":0},"cultural_elements":[{"name":"","confidence":0,"reason":"仅描述视觉依据"}],"suggested_uses":[],"keywords":[],"confidence":0,"uncertainties":[]}`;
}
