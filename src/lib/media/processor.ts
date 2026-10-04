import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { z } from "zod";

import type { MediaType } from "./constants";

const execFileAsync = promisify(execFile);

const processorOutputSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  duration: z.number().positive().nullable(),
  fps: z.number().positive().nullable(),
  codec: z.string().nullable(),
  thumbnail_path: z.string().min(1),
  frames: z.array(
    z.object({
      filename: z.string().min(1),
      path: z.string().min(1),
      position: z.number().int().positive(),
      timestamp: z.number().nonnegative(),
    }),
  ),
});

export type ProcessorOutput = z.infer<typeof processorOutputSchema>;

function safeProcessorError(stderr: string, sourcePath: string, outputDirectory: string): string {
  if (/Invalid data found|moov atom not found|incomplete video metadata/i.test(stderr)) {
    return "视频损坏、编码不受支持或缺少可读取的视频流。";
  }
  const sanitized = stderr
    .replaceAll(sourcePath, "[uploaded-media]")
    .replaceAll(outputDirectory, "[generated-media]")
    .replaceAll(process.cwd(), "[project]");
  return `媒体预处理失败：${sanitized.slice(-1200)}`;
}

async function firstExisting(paths: string[]): Promise<string | null> {
  for (const candidate of paths) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next configured Python runtime.
    }
  }
  return null;
}

async function pythonExecutable(): Promise<string> {
  const root = process.cwd();
  const localCandidates = process.platform === "win32"
    ? [path.join(root, "media-service", ".venv", "Scripts", "python.exe")]
    : [path.join(root, "media-service", ".venv", "bin", "python")];
  const local = await firstExisting(localCandidates);
  return local ?? process.env.MEDIA_PYTHON_PATH ?? "python";
}

export async function processMedia(
  sourcePath: string,
  outputDirectory: string,
  type: MediaType,
): Promise<ProcessorOutput> {
  try {
    const { stdout } = await execFileAsync(
      await pythonExecutable(),
      ["-m", "app.cli", "--source", sourcePath, "--output", outputDirectory, "--type", type],
      {
        cwd: path.join(process.cwd(), "media-service"),
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
        timeout: 10 * 60 * 1000,
      },
    );
    return processorOutputSchema.parse(JSON.parse(stdout));
  } catch (error) {
    if (error && typeof error === "object" && "stderr" in error) {
      const stderr = String(error.stderr).trim();
      if (stderr) throw new Error(safeProcessorError(stderr, sourcePath, outputDirectory));
    }
    throw error;
  }
}
