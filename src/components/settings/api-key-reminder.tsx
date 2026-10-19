"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { KeyRound } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/** 仅检查是否已配置，不读取密钥、不发起 AI 请求。 */
export function ApiKeyReminder() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dismissed = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    // 设置页保持可直接操作；“稍后设置”后本次页面会话不再打扰。
    if (!dialog || pathname === "/settings" || dismissed.current) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    async function checkConfiguration() {
      try {
        const response = await fetch("/api/settings/api-key", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (controller.signal.aborted || typeof data !== "object" || data === null) return;
        // 请求失败或响应异常不能当成“未配置”。
        if ("configured" in data && "serverConfigured" in data && data.configured === false && data.serverConfigured === false) {
          if (dialog?.isConnected && !dialog.open) dialog.showModal();
        }
      } catch {
        // 网络异常不阻断素材浏览；用户仍可通过导航进入设置。
      } finally { window.clearTimeout(timeout); }
    }

    void checkConfiguration();
    return () => { controller.abort(); window.clearTimeout(timeout); dialog.close(); };
  }, [pathname]);

  function dismiss() {
    dismissed.current = true;
    dialogRef.current?.close();
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="api-reminder-title" aria-describedby="api-reminder-description"
      onCancel={() => { dismissed.current = true; }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/35 sm:p-8">
      <KeyRound className="size-6 text-seal" aria-hidden="true" />
      <h2 id="api-reminder-title" className="mt-4 text-2xl font-semibold">先配置你的 API Key</h2>
      <p id="api-reminder-description" className="mt-3 text-sm leading-7 text-muted-foreground">尚未配置 DeepSeek API Key。填写后即可使用素材解读；你也可以先创建项目、上传和整理素材。</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/settings" className={buttonVariants()} onClick={dismiss}>前往设置</Link>
        <Button variant="outline" onClick={dismiss}>稍后设置</Button>
      </div>
    </dialog>
  );
}
