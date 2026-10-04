"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import type { AssetFrameDto } from "@/types/media";

export function FrameGallery({ frames, assetName }: { frames: AssetFrameDto[]; assetName: string }) {
  const [active, setActive] = useState<AssetFrameDto | null>(null);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {frames.map((frame) => (
          <button key={frame.id} type="button" onClick={() => setActive(frame)} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="relative block aspect-video overflow-hidden bg-muted">
              <Image src={frame.url} alt={`${assetName} 的关键帧 ${frame.position}`} fill unoptimized className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            </span>
            <span className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{frame.filename}</span><span>{frame.timestamp.toFixed(2)}s</span>
            </span>
          </button>
        ))}
      </div>
      {active ? (
        <div role="dialog" aria-modal="true" aria-label={`${active.filename} 放大预览`} className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5" onClick={() => setActive(null)}>
          <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setActive(null)} aria-label="关闭关键帧预览" className="absolute right-2 top-2 z-10 grid size-11 place-items-center rounded-full bg-black/65 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X aria-hidden="true" /></button>
            <div className="relative aspect-video overflow-hidden bg-black">
              <Image src={active.url} alt={`${assetName} 的关键帧 ${active.position} 放大图`} fill unoptimized className="object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
