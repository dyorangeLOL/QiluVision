"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ChevronDown, FileImage, FileVideo2, LoaderCircle, UploadCloud, XCircle } from "lucide-react";

import type { AssetDto } from "@/types/media";
import { Button } from "@/components/ui/button";

type UploadStatus = "uploading" | "processing" | "ready" | "failed";
type UploadItem = { id: string; name: string; size: number; status: UploadStatus; error?: string };

const statusLabels: Record<UploadStatus, string> = {
  uploading: "正在上传",
  processing: "正在预处理",
  ready: "处理完成",
  failed: "处理失败",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

export function MediaLibrary({ projectId, initialAssets }: { projectId: string; initialAssets: AssetDto[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState(initialAssets);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  function updateUpload(id: string, patch: Partial<UploadItem>) {
    setUploads((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function uploadFile(file: File, id: string) {
    const request = new XMLHttpRequest();
    request.open("POST", `/api/projects/${projectId}/assets`);
    request.upload.addEventListener("load", () => updateUpload(id, { status: "processing" }));
    request.addEventListener("load", () => {
      try {
        const payload = JSON.parse(request.responseText);
        const result = payload.results?.[0];
        if (!result?.ok) throw new Error(result?.error ?? payload.error ?? "上传失败。");
        updateUpload(id, { status: "ready" });
        setAssets((current) => [result.asset, ...current.filter((asset) => asset.id !== result.asset.id)]);
      } catch (error) {
        updateUpload(id, { status: "failed", error: error instanceof Error ? error.message : "上传失败。" });
      }
    });
    request.addEventListener("error", () => updateUpload(id, { status: "failed", error: "网络连接失败。" }));
    const body = new FormData();
    body.append("files", file, file.name);
    request.send(body);
  }

  function acceptFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const items = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      status: "uploading" as const,
      file,
    }));
    setUploads((current) => [
      ...items.map((item) => ({ id: item.id, name: item.name, size: item.size, status: item.status })),
      ...current,
    ]);
    items.forEach((item) => uploadFile(item.file, item.id));
  }

  async function analyzePending() {
    // 批量分析采用串行队列，控制请求峰值；单个失败不会中断后续素材。
    const pending = assets.filter((asset) => asset.status === "ready" && asset.aiStatus === "not_analyzed");
    if (!pending.length || batchBusy) return;
    setBatchBusy(true); setBatchProgress({ done: 0, total: pending.length });
    for (const asset of pending) {
      setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, aiStatus: "analyzing" } : item));
      let success = false;
      try {
        const response = await fetch(`/api/assets/${asset.id}/analysis`, { method: "POST" });
        success = response.ok;
      } catch {
        success = false;
      }
      setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, aiStatus: success ? "ready" : "failed" } : item));
      setBatchProgress((current) => current ? { ...current, done: current.done + 1 } : current);
    }
    setBatchBusy(false);
  }

  return (
    <div className="grid gap-12">
      <details open={initialAssets.length === 0} className="workspace-panel group p-5 sm:p-6">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
          <div>
            <span className="block text-lg font-semibold">添加素材</span>
            <span className="mt-1 block text-[13px] text-muted-foreground">展开上传照片与视频</span>
          </div>
          <span className="flex items-center gap-3 text-[13px] text-muted-foreground">图片 50 MB · 视频 2 GB <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></span>
        </summary>
        <div
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
          onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFiles(event.dataTransfer.files); }}
          className={`mt-6 grid min-h-48 place-items-center rounded-xl border border-dashed p-6 text-center transition-colors ${dragging ? "border-seal bg-accent/50" : "border-border bg-background"}`}
        >
          <div>
            <UploadCloud className="mx-auto size-9 text-seal" aria-hidden="true" />
            <p className="mt-4 font-medium">拖拽照片或视频到这里</p>
            <p className="mt-2 text-sm text-muted-foreground">支持 JPG、JPEG、PNG、WEBP、MP4、MOV，可一次选择多个文件</p>
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-5"
            >
              选择文件
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              className="sr-only"
              onChange={(event) => { if (event.target.files) acceptFiles(event.target.files); event.target.value = ""; }}
            />
          </div>
        </div>
      </details>

      {uploads.length ? (
        <section aria-label="上传任务" className="grid gap-2" aria-live="polite">
          {uploads.map((upload) => (
            <div key={upload.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
              {upload.status === "failed" ? <XCircle className="size-5 shrink-0 text-red-700" aria-hidden="true" /> : upload.status === "ready" ? <CheckCircle2 className="size-5 shrink-0 text-emerald-700" aria-hidden="true" /> : <LoaderCircle className="size-5 shrink-0 animate-spin text-seal" aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{upload.name}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{formatBytes(upload.size)} · {statusLabels[upload.status]}</p>
                {upload.error ? <p className="mt-1 text-xs text-red-700">{upload.error}</p> : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section aria-labelledby="asset-library-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 id="asset-library-heading" className="text-2xl font-semibold">素材库</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-muted-foreground">{assets.length} 个素材</p><Button variant="outline" onClick={analyzePending} disabled={batchBusy || !assets.some((asset) => asset.status === "ready" && asset.aiStatus === "not_analyzed")}>{batchBusy ? `解读中 ${batchProgress?.done ?? 0} / ${batchProgress?.total ?? 0}` : "解读待处理素材"}</Button></div>
        </div>
        {assets.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <Link key={asset.id} href={`/projects/${projectId}/assets/${asset.id}`} className="pressable group overflow-hidden rounded-xl border border-border bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="relative aspect-video overflow-hidden bg-muted">
                  {asset.thumbnailUrl ? (
                    <Image src={asset.thumbnailUrl} alt={`${asset.originalFilename} 缩略图`} fill unoptimized className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground">{asset.type === "video" ? <FileVideo2 aria-hidden="true" /> : <FileImage aria-hidden="true" />}</div>
                  )}
                  <span className="absolute left-3 top-3 rounded-md bg-ink/85 px-2 py-1 text-xs font-medium text-paper">{asset.type === "video" ? "视频" : "图片"}</span>
                </div>
                <div className="p-4">
                  <h3 className="truncate font-medium" title={asset.originalFilename}>{asset.originalFilename}</h3>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] tabular-nums text-muted-foreground">
                    {asset.duration !== null ? <span>{formatDuration(asset.duration)}</span> : null}
                    {asset.width && asset.height ? <span>{asset.width} × {asset.height}</span> : null}
                    {asset.fps ? <span>{asset.fps.toFixed(asset.fps % 1 ? 2 : 0)} FPS</span> : null}
                  </div>
                  <p className={`mt-4 flex items-center gap-2 text-sm ${asset.status === "failed" ? "text-red-700" : asset.status === "ready" ? "text-emerald-700" : "text-amber-700"}`}>
                    {asset.status === "failed" ? <XCircle className="size-4" aria-hidden="true" /> : asset.status === "ready" ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                    {asset.status === "failed" ? "素材处理失败" : asset.status === "ready" ? "素材已就绪" : statusLabels[asset.status as UploadStatus] ?? asset.status}
                  </p>
                  {asset.errorMessage ? <p className="mt-2 line-clamp-2 text-xs text-red-700">{asset.errorMessage}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-border p-10 text-center text-sm text-muted-foreground">素材库还是空的。上传后，真实处理结果会显示在这里。</div>
        )}
      </section>
    </div>
  );
}
