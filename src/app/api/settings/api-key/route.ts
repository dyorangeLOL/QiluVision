import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { API_KEY_COOKIE, API_KEY_MAX_AGE, encryptApiKey, getCookieApiKey } from "@/lib/api-key-cookie";

const schema = z.object({ apiKey: z.string().trim().min(10).max(512).regex(/^[\x21-\x7E]+$/) });
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/api", maxAge: API_KEY_MAX_AGE };
const headers = { "Cache-Control": "no-store" };

function sameOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function GET() {
  // 只返回配置状态，不把 Cookie 内的 Key 或服务器默认 Key 回传客户端。
  return NextResponse.json({ configured: Boolean(await getCookieApiKey()), serverConfigured: Boolean(process.env.DEEPSEEK_API_KEY) }, { headers });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "请求来源不允许。" }, { status: 403, headers });
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "请提交 JSON 格式。" }, { status: 415, headers });
  try {
    const text = await request.text();
    if (text.length > 2048) return NextResponse.json({ error: "提交内容过长。" }, { status: 413, headers });
    let data: unknown;
    try { data = JSON.parse(text); } catch { return NextResponse.json({ error: "提交格式无效。" }, { status: 400, headers }); }
    const parsed = schema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "请输入有效的 API Key（10–512 个字符，不含空格）。" }, { status: 400, headers });
    const value = await encryptApiKey(parsed.data.apiKey);
    (await cookies()).set(API_KEY_COOKIE, value, cookieOptions);
    return NextResponse.json({ configured: true }, { headers });
  } catch {
    return NextResponse.json({ error: "保存失败，请确认服务器已配置 Cookie 加密密钥。" }, { status: 500, headers });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "请求来源不允许。" }, { status: 403, headers });
  (await cookies()).set(API_KEY_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return NextResponse.json({ configured: false }, { headers });
}
