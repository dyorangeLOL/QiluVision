import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";

export const API_KEY_COOKIE = "qiluvision_deepseek_key";
export const API_KEY_MAX_AGE = 30 * 24 * 60 * 60;

async function encryptionKey(): Promise<Buffer> {
  const secret = process.env.COOKIE_ENCRYPTION_SECRET;
  if (secret) {
    if (secret.length < 32) throw new Error("Cookie 加密配置不足，请联系部署者。");
    return createHash("sha256").update(secret).digest();
  }
  if (process.env.NODE_ENV === "production") throw new Error("请配置 COOKIE_ENCRYPTION_SECRET 后再保存 API Key。");
  // 本地密钥持久化，开发服务器重启后 Cookie 仍然有效；此目录不提交 Git。
  const dir = path.join(process.cwd(), ".local");
  const filename = path.join(dir, "cookie-key");
  await mkdir(dir, { recursive: true });
  try { await writeFile(filename, randomBytes(32), { flag: "wx", mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  const key = await readFile(filename);
  if (key.length !== 32) throw new Error("本地 Cookie 加密配置无效。");
  return key;
}

export async function encryptApiKey(apiKey: string): Promise<string> {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", await encryptionKey(), iv);
  cipher.setAAD(Buffer.from(API_KEY_COOKIE));
  const data = JSON.stringify({ apiKey, expiresAt: Date.now() + API_KEY_MAX_AGE * 1000 });
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export async function getCookieApiKey(): Promise<string | null> {
  const value = (await cookies()).get(API_KEY_COOKIE)?.value;
  if (!value) return null;
  try {
    const buffer = Buffer.from(value, "base64url");
    if (buffer.length < 29 || buffer.length > 2048) return null;
    const decipher = createDecipheriv("aes-256-gcm", await encryptionKey(), buffer.subarray(0, 12));
    decipher.setAAD(Buffer.from(API_KEY_COOKIE));
    decipher.setAuthTag(buffer.subarray(12, 28));
    const data: unknown = JSON.parse(Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString("utf8"));
    if (typeof data !== "object" || data === null || !("apiKey" in data) || !("expiresAt" in data)) return null;
    if (typeof data.apiKey !== "string" || typeof data.expiresAt !== "number" || data.expiresAt <= Date.now()) return null;
    return data.apiKey;
  } catch { return null; } // 篡改、过期或加密密钥轮换后按未配置处理，不返回解密细节。
}
