import { z } from "zod";

const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("progress"), stage: z.string().min(1) }),
  z.object({ type: z.literal("error"), error: z.string(), status: z.number() }),
  z.object({ type: z.literal("done"), data: z.unknown() }),
]);

export class PlanningRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** NDJSON 按行解码，处理任意网络分块；缺少终止事件绝不当成成功。 */
export async function readPlanningProgress(response: Response, onProgress: (stage: string) => void): Promise<unknown> {
  if (!response.ok) {
    const payload = await response.json();
    throw new PlanningRequestError(typeof payload.error === "string" ? payload.error : "请求未完成。", response.status);
  }
  if (!response.body) throw new Error("没有收到结果，请刷新确认。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      if (done && buffer.trim()) { lines.push(buffer); buffer = ""; }
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = eventSchema.parse(JSON.parse(line));
        if (event.type === "progress") onProgress(event.stage);
        if (event.type === "error") throw new PlanningRequestError(event.error, event.status);
        if (event.type === "done") return event.data;
      }
      if (done) throw new Error("连接已结束，但未确认保存结果。请先刷新结果。");
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
