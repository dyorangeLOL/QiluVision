import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { MAX_BATCH_BYTES, MAX_BATCH_FILES } from "@/lib/media/constants";
import { processMedia } from "@/lib/media/processor";
import { serializeAsset } from "@/lib/media/serialize";
import { prepareAssetDirectories, toDatabasePath } from "@/lib/media/storage";
import { UploadValidationError, validateUpload } from "@/lib/media/validation";

function originalFilename(value: string): string {
  return path.win32.basename(path.posix.basename(value)).slice(0, 255) || "unnamed";
}

function errorMessage(error: unknown): string {
  if (error instanceof UploadValidationError) return error.message;
  if (error instanceof Error) {
    const message = error.message || "媒体处理失败。";
    return message.replaceAll(process.cwd(), "[project]").slice(-1600);
  }
  return "媒体处理失败。";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const assets = await db.asset.findMany({
    where: { projectId },
    include: { frames: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ assets: assets.map(serializeAsset) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BATCH_BYTES) {
    return NextResponse.json({ error: "单次上传总大小不能超过 2 GB。" }, { status: 413 });
  }
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "项目不存在。" }, { status: 404 });

  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "请选择至少一个文件。" }, { status: 400 });
  }
  if (files.length > MAX_BATCH_FILES) {
    return NextResponse.json({ error: "单次最多上传 20 个文件。" }, { status: 400 });
  }

  const results = [];
  for (const file of files) {
    let assetId: string | null = null;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const validated = validateUpload(file, bytes);
      assetId = randomUUID();
      const storedFilename = `${randomUUID()}${validated.extension}`;
      const directories = await prepareAssetDirectories(projectId, assetId);
      const absoluteSource = path.join(directories.originalDirectory, storedFilename);
      const localPath = toDatabasePath(absoluteSource);

      await db.asset.create({
        data: {
          id: assetId,
          projectId,
          originalFilename: originalFilename(file.name),
          storedFilename,
          type: validated.type,
          mimeType: file.type,
          size: file.size,
          localPath,
          status: "uploading",
        },
      });

      await writeFile(absoluteSource, bytes, { flag: "wx" });
      await db.asset.update({ where: { id: assetId }, data: { status: "uploaded" } });
      await db.asset.update({ where: { id: assetId }, data: { status: "processing" } });

      const processed = await processMedia(absoluteSource, directories.outputDirectory, validated.type);
      await db.$transaction([
        db.assetFrame.deleteMany({ where: { assetId } }),
        db.asset.update({
          where: { id: assetId },
          data: {
            thumbnailPath: toDatabasePath(processed.thumbnail_path),
            duration: processed.duration,
            width: processed.width,
            height: processed.height,
            fps: processed.fps,
            codec: processed.codec,
            status: "ready",
            errorMessage: null,
            frames: {
              create: processed.frames.map((frame) => ({
                filename: frame.filename,
                localPath: toDatabasePath(frame.path),
                position: frame.position,
                timestamp: frame.timestamp,
              })),
            },
          },
        }),
      ]);

      const ready = await db.asset.findUniqueOrThrow({
        where: { id: assetId },
        include: { frames: { orderBy: { position: "asc" } } },
      });
      results.push({ ok: true, asset: serializeAsset(ready) });
    } catch (error) {
      const message = errorMessage(error);
      if (assetId) {
        await db.asset.update({
          where: { id: assetId },
          data: { status: "failed", errorMessage: message },
        }).catch(() => undefined);
        const failed = await db.asset.findUnique({
          where: { id: assetId },
          include: { frames: { orderBy: { position: "asc" } } },
        });
        results.push({ ok: false, error: message, asset: failed ? serializeAsset(failed) : null });
      } else {
        results.push({ ok: false, error: message, filename: originalFilename(file.name) });
      }
    }
  }

  const allAccepted = results.every((result) => result.ok);
  return NextResponse.json({ results }, { status: allAccepted ? 201 : 207 });
}
