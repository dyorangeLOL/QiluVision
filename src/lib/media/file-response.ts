import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

function webStream(path: string, start?: number, end?: number): BodyInit {
  return Readable.toWeb(createReadStream(path, { start, end })) as unknown as BodyInit;
}

export async function mediaFileResponse(
  request: Request,
  absolutePath: string,
  mimeType: string,
  filename?: string,
): Promise<Response> {
  const file = await stat(absolutePath);
  const range = request.headers.get("range");
  const commonHeaders: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Content-Type": mimeType,
    "Cache-Control": "private, max-age=3600",
  };
  if (filename) {
    commonHeaders["Content-Disposition"] = `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }

  if (!range) {
    return new Response(webStream(absolutePath), {
      headers: { ...commonHeaders, "Content-Length": String(file.size) },
    });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return new Response(null, { status: 416 });
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : file.size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || end >= file.size) {
    return new Response(null, { status: 416 });
  }
  return new Response(webStream(absolutePath, start, end), {
    status: 206,
    headers: {
      ...commonHeaders,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${file.size}`,
    },
  });
}
