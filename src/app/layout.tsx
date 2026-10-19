import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";

import "./globals.css";
import { ApiKeyReminder } from "@/components/settings/api-key-reminder";

const sans = Noto_Sans_SC({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  display: "swap",
});

const serif = Noto_Serif_SC({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "齐鲁影策 QiluVision",
  description: "面向青年创作者的齐鲁文化 AI 影像创作助手。",
  icons: { icon: [{ url: "/brand/qiluvision-approved.ico", type: "image/x-icon" }], apple: "/brand/qiluvision-approved-180.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body className={`${sans.variable} ${serif.variable}`}><ApiKeyReminder />{children}</body>
    </html>
  );
}
