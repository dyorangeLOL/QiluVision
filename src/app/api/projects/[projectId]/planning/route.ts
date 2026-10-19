import { NextResponse } from "next/server";
import { z } from "zod";
import { actionSchema, getPlanningData, runPlanningAction, PlanningError } from "@/lib/planning/service";

// 单实例 Demo 的重复请求保护；多实例部署应换成数据库任务锁。
const activeProjects = new Set<string>();

type Context = { params: Promise<{ projectId: string }> };
function errorResponse(error: unknown) {
  if (error instanceof PlanningError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return NextResponse.json({ error: "输入或模型输出不符合结构要求，尚未保存，请检查或重试。" }, { status: 422 });
  const message = error instanceof Error && /DeepSeek|API Key|锁定|镜头|素材|顺序|时长/.test(error.message) ? error.message : "操作未完成，原方案已保留，请稍后重试。";
  return NextResponse.json({ error: message }, { status: 502 });
}
export async function GET(_request: Request, { params }: Context) {
  try { return NextResponse.json(await getPlanningData((await params).projectId), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: Context) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "请求来源不允许。" }, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 200_000) return NextResponse.json({ error: "方案内容过长。" }, { status: 413 });
    let data: unknown;
    try { data = JSON.parse(text); } catch { return NextResponse.json({ error: "JSON 格式无效。" }, { status: 400 }); }
    const input = actionSchema.parse(data);
    const projectId = (await params).projectId;
    if (activeProjects.has(projectId)) return NextResponse.json({ error: "该项目仍有操作在执行，请等待完成后刷新结果。" }, { status: 409 });
    activeProjects.add(projectId);
    if (request.headers.get("accept")?.includes("application/x-ndjson")) {
      const encoder = new TextEncoder();
      let connected = true;
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let saved = false;
          const send = (event: unknown) => { if (connected) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); };
          try {
            await runPlanningAction(projectId, input, undefined, (stage) => send({ type: "progress", stage }));
            saved = true;
            send({ type: "progress", stage: "读取已保存结果" });
            send({ type: "done", data: await getPlanningData(projectId) });
          } catch (error) {
            const response = saved ? NextResponse.json({ error: "操作已保存，但最新结果未能读取。请先刷新，不要重复生成。" }, { status: 409 }) : errorResponse(error);
            send({ type: "error", ...(await response.json()), status: response.status });
          } finally {
            activeProjects.delete(projectId);
            if (connected) controller.close();
          }
        },
        // 断线不等于取消：已有请求仍可能保存，客户端必须先刷新再决定是否重试。
        cancel() { connected = false; },
      });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
    }
    try {
      await runPlanningAction(projectId, input);
      return NextResponse.json(await getPlanningData(projectId), { headers: { "Cache-Control": "no-store" } });
    } finally { activeProjects.delete(projectId); }
  } catch (error) { return errorResponse(error); }
}
