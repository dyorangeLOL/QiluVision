"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ApiKeySettings() {
  const [apiKey, setApiKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [serverConfigured, setServerConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings/api-key", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => { setConfigured(data.configured); setServerConfigured(data.serverConfigured); })
      .catch(() => { if (!controller.signal.aborted) setError("无法读取设置，请刷新重试。"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function update(method: "POST" | "DELETE") {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/settings/api-key", {
        method, headers: { "Content-Type": "application/json" },
        ...(method === "POST" ? { body: JSON.stringify({ apiKey }) } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "设置更新失败。");
      setConfigured(data.configured); setApiKey("");
      setMessage(method === "POST" ? "已保存。后续素材解读将使用你的 API Key。保存不会发起付费请求。" : "已清除本浏览器的 API Key。");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "设置更新失败。"); }
    finally { setBusy(false); }
  }

  return <section className="workspace-panel p-6 sm:p-8" aria-labelledby="key-heading">
    <h2 id="key-heading" className="text-xl font-semibold">DeepSeek API Key</h2>
    <p className="mt-3 text-sm leading-7 text-muted-foreground">使用你自己的 DeepSeek 账户进行素材解读，调用费用由该账户承担。Key 在服务器端加密后存入本浏览器的 Cookie，有效期 30 天。</p>
    <p className="mt-4 text-sm" aria-live="polite">{loading ? "正在读取设置…" : configured ? "当前使用：你的 API Key（已保存，不显示原文）" : serverConfigured ? "当前使用：服务器默认配置" : "尚未配置 API Key"}</p>
    <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); void update("POST"); }}>
      <div><label htmlFor="deepseek-key" className="text-sm font-medium">{configured ? "替换 API Key" : "填写 API Key"}</label>
        <input id="deepseek-key" type="password" autoComplete="off" spellCheck={false} required minLength={10} maxLength={512} value={apiKey} onChange={(event) => setApiKey(event.target.value)} aria-describedby="key-help key-error" className="mt-2 min-h-12 w-full rounded-lg border border-border bg-background px-4 focus:outline-2 focus:outline-ring" placeholder="sk-…" />
        <p id="key-help" className="mt-2 text-[13px] leading-6 text-muted-foreground">仅保存到当前浏览器，不写入项目数据库。清除 Cookie 后需要重新填写。</p>
      </div>
      <p id="key-error" role="alert" className="text-sm text-red-700">{error}</p>
      {message ? <p role="status" className="text-sm leading-6">{message}</p> : null}
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || loading || !apiKey.trim()}>{busy ? "正在更新…" : "保存 API Key"}</Button><Button variant="outline" disabled={busy || loading || !configured} onClick={() => void update("DELETE")}>清除已保存的 Key</Button></div>
    </form>
  </section>;
}
