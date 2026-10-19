"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export function WorkspaceHeader({ back }: { back?: boolean }) {
  const pathname = usePathname();
  return (
    <header className="workspace-header">
      <nav aria-label="主导航" className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-3 sm:min-h-20 sm:px-8 lg:px-12">
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg sm:gap-3">
          <Image src="/brand/qiluvision-approved.png" width={52} height={52} className="size-9 shrink-0 sm:size-13" alt="" aria-hidden="true" />
          <span
            className="whitespace-nowrap font-sans text-base font-semibold tracking-tight sm:text-2xl"
          >齐鲁影策 <span className="ml-1 font-medium">QiluVision</span></span>
        </Link>
        <div className="flex items-center gap-1"><Link href="/projects" aria-current={pathname.startsWith("/projects") ? "page" : undefined} className={`pressable inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-[13px] font-medium hover:bg-muted sm:px-4 sm:text-sm ${pathname.startsWith("/projects") ? "bg-muted" : ""}`}>
          {back ? <ArrowLeft className="hidden size-4 sm:block" aria-hidden="true" /> : null}<span className="sm:hidden">项目</span><span className="hidden sm:inline">{back ? "返回所有项目" : "我的项目"}</span>
        </Link><Link href="/settings" aria-current={pathname === "/settings" ? "page" : undefined} className={`pressable inline-flex min-h-11 items-center rounded-lg px-2 text-[13px] font-medium hover:bg-muted sm:px-4 sm:text-sm ${pathname === "/settings" ? "bg-muted" : ""}`}>设置</Link></div>
      </nav>
    </header>
  );
}
