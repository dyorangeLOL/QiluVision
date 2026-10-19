import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlanningData, PlanningError } from "@/lib/planning/service";
import { buildExport, type ExportFormat } from "@/lib/planning/export";
import { resolveDatabasePath } from "@/lib/media/storage";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const format = new URL(request.url).searchParams.get("format") as ExportFormat;
  if (!["pdf", "csv", "txt", "srt"].includes(format)) return NextResponse.json({ error: "不支持的导出格式。" }, { status: 400 });
  let exportId: string | undefined;
  try {
    const { projectId } = await params;
    const data = await getPlanningData(projectId);
    if (!data.board) return NextResponse.json({ error: "请先生成并保存分镜。" }, { status: 409 });
    const record = await db.export.create({ data: { projectId, format, status: "processing" } }); exportId = record.id;
    const buffer = await buildExport(data, format);
    const filePath = `generated/${projectId}/exports/${randomUUID()}.${format}`;
    const absolute = resolveDatabasePath(filePath);
    await mkdir(path.dirname(absolute), { recursive: true }); await writeFile(absolute, buffer);
    await db.export.update({ where: { id: exportId }, data: { status: "ready", filePath, completedAt: new Date() } });
    const mime = { pdf: "application/pdf", csv: "text/csv; charset=utf-8", txt: "text/plain; charset=utf-8", srt: "application/x-subrip; charset=utf-8" };
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": mime[format], "Content-Disposition": `attachment; filename="QiluVision.${format}"; filename*=UTF-8''${encodeURIComponent(`${data.project.name}.${format}`)}`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (exportId) await db.export.update({ where: { id: exportId }, data: { status: "failed", errorMessage: "导出未完成，请重试。" } }).catch(() => {});
    return NextResponse.json({ error: error instanceof PlanningError ? error.message : "导出未完成，请检查分镜、旁白和服务器字体配置。" }, { status: error instanceof PlanningError ? error.status : 422 });
  }
}
