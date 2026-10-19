import "server-only";
import PDFDocument from "pdfkit";
import path from "node:path";
import type { getPlanningData } from "./service";

type PlanningData = Awaited<ReturnType<typeof getPlanningData>>;
export type ExportFormat = "pdf" | "csv" | "txt" | "srt";
function timestamp(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}
function textPlan(data: PlanningData): string {
  const board = data.board!;
  const lines = ["齐鲁影策 QiluVision · 创作方案", `项目：${data.project.name}`, `创作意图：${data.project.creativeIntent ?? ""}`, `选题：${board.title}`, `画幅：${board.aspectRatio} · 目标 ${board.targetDuration} 秒`, `概述：${board.synopsis}`, `叙事结构：${board.narrativeArc ?? ""}`, "", "逐镜头分镜"];
  for (const shot of board.shots) {
    const asset = data.assets.find((item) => item.id === shot.assetId);
    lines.push(`${shot.position + 1}. ${shot.title} (${shot.durationSeconds} 秒)`, `画面：${shot.visualDescription}`, `目的：${shot.purpose}`, `旁白：${shot.narration ?? ""}`, `素材：${asset?.originalFilename ?? "待补拍"} | Asset ID: ${shot.assetId ?? "无"}`, `景别 / 机位 / 运动：${shot.shotSize ?? ""} / ${shot.cameraHeight ?? ""} / ${shot.cameraMovement ?? ""}`, `锁定：镜头${shot.isShotLocked ? "是" : "否"}，素材${shot.isAssetLocked ? "是" : "否"}`, "");
  }
  lines.push("缺镜头诊断与补拍清单");
  for (const [index, item] of board.diagnosis.missingShots.entries()) lines.push(`${board.diagnosis.checklist.includes(index) ? "[已加入补拍]" : "[建议]"} 镜头${item.storyboard_position + 1} ${item.missing_shot_type}`, `目的：${item.purpose}；主体：${item.recommended_subject}；景别：${item.shot_size}；机位：${item.camera_height}；运动：${item.camera_movement}；时长：${item.duration}秒`, `替代：${item.alternatives.join("；")}`);
  if (!board.diagnosis.missingShots.length) lines.push("暂无已保存的诊断结果；不代表素材一定完整。");
  lines.push("", "旁白文化依据");
  for (const claim of board.claims) lines.push(claim.claim, claim.status === "supported" ? `当前知识库支持：${claim.evidence}；来源：${claim.source ?? ""}` : "未在当前知识库中找到充分依据");
  lines.push("", "参考知识条目");
  for (const entry of data.knowledge) lines.push(`${entry.title}：${entry.content}`, entry.source);
  return lines.join("\n");
}

export async function buildExport(data: PlanningData, format: ExportFormat): Promise<Buffer> {
  if (!data.board?.shots.length) throw new Error("请先保存有效分镜再导出。");
  if (format === "txt") return Buffer.from(textPlan(data), "utf8");
  if (format === "srt") {
    let cursor = 0; let count = 0;
    const captions: string[] = [];
    for (const shot of data.board.shots) {
      const end = cursor + (shot.durationSeconds ?? 0);
      if (shot.narration?.trim()) captions.push(`${++count}\n${timestamp(cursor)} --> ${timestamp(end)}\n${shot.narration.replace(/\r?\n\s*\r?\n/g, "\n").trim()}\n`);
      cursor = end; // 无旁白镜头仍占时间，避免后续字幕提前。
    }
    if (!captions.length) throw new Error("当前没有旁白，无法生成字幕。");
    return Buffer.from(captions.join("\n"), "utf8");
  }
  if (format === "csv") {
    const cell = (value: unknown) => { let text = String(value ?? ""); if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
    const rows: unknown[][] = [["序号", "标题", "叙事目的", "旁白", "画面描述", "素材原文件名", "Asset ID", "景别", "机位高度", "镜头运动", "时长秒", "锁定镜头", "锁定素材"]];
    for (const shot of data.board.shots) rows.push([shot.position + 1, shot.title, shot.purpose, shot.narration, shot.visualDescription, data.assets.find((asset) => asset.id === shot.assetId)?.originalFilename ?? "待补拍", shot.assetId, shot.shotSize, shot.cameraHeight, shot.cameraMovement, shot.durationSeconds, shot.isShotLocked, shot.isAssetLocked]);
    return Buffer.from("\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n"), "utf8");
  }
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: data.board!.title, Author: "QiluVision" } });
    const buffers: Buffer[] = [];
    document.on("data", (chunk: Buffer) => buffers.push(chunk)); document.on("error", reject); document.on("end", () => resolve(Buffer.concat(buffers)));
    // 字体随项目部署，中文和长段落自动换行、分页。
    try { document.font(path.join(process.cwd(), "assets/fonts/NotoSansCJKsc-Regular.otf")).fontSize(10).text(textPlan(data), { lineGap: 4 }); document.end(); }
    catch (error) { document.destroy(); reject(error); }
  });
}
