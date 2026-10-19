import type { AssetAnalysisOutput } from "@/lib/ai/schemas/asset-analysis";
import type { ShotDraft } from "./constraints";

/** 文字线索比对，不是 AI 匹配分数，也不证明画面语义正确。 */
export function explainAssetMatch(shot: ShotDraft, analysis: AssetAnalysisOutput | null, duration: number | null) {
  if (!shot.assetId) return ["尚未绑定真实素材，需要补拍或选择现有素材。"];
  const reasons: string[] = [];
  if (analysis) {
    const text = `${shot.title} ${shot.visualDescription} ${shot.purpose}`.toLocaleLowerCase();
    const terms = [...new Set([...analysis.keywords, ...analysis.subjects.map((subject) => subject.name)])]
      .filter((term) => term.trim().length >= 2 && text.includes(term.toLocaleLowerCase())).slice(0, 5);
    reasons.push(terms.length ? `画面描述与已保存分析共有线索：${terms.join("、")}。` : "当前描述未命中分析中的主体或关键词，建议人工复核绑定。");
    if (analysis.uncertainties.length) reasons.push(`分析仍有不确定性：${analysis.uncertainties.slice(0, 2).join("；")}`);
  } else reasons.push("此素材暂无有效的结构化分析，不能提供画面匹配依据。");
  if (duration !== null) reasons.push(duration >= (shot.durationSeconds ?? 0) ? `源视频 ${duration.toFixed(1)} 秒，可覆盖本镜头时长；尚未选择具体剪辑区间。` : "源视频短于镜头时长，请缩短镜头或更换素材。");
  return reasons;
}
