"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteAssetButton({ assetId, projectId }: { assetId: string; projectId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function removeAsset() {
    if (!window.confirm("确定删除这个素材及其缩略图和关键帧吗？此操作不可撤销。")) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "删除失败。");
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败。");
      setDeleting(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={removeAsset}
        disabled={deleting}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-300 px-4 text-sm font-medium text-red-800 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {deleting ? "正在删除…" : "删除素材"}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
