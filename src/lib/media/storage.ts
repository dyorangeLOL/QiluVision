import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = process.cwd();
const storageRoot = path.resolve(
  /* turbopackIgnore: true */ process.env.MEDIA_STORAGE_ROOT ?? path.join(repositoryRoot, "storage"),
);
const generatedRoot = path.resolve(
  /* turbopackIgnore: true */
  process.env.MEDIA_GENERATED_ROOT ?? path.join(repositoryRoot, "generated"),
);

function assertIdentifier(value: string, label: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
}

function assertInsideRoot(candidate: string, root: string): string {
  const resolved = path.resolve(candidate);
  const normalizedRoot = `${path.resolve(root)}${path.sep}`;
  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error("Resolved media path escapes its storage root.");
  }
  return resolved;
}

export function toDatabasePath(absolutePath: string): string {
  const resolved = path.resolve(absolutePath);
  for (const [prefix, root] of [
    ["storage", storageRoot],
    ["generated", generatedRoot],
  ] as const) {
    const relative = path.relative(root, resolved);
    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      return [prefix, ...relative.split(path.sep)].join("/");
    }
  }
  throw new Error("Media output is outside the configured storage roots.");
}

export function resolveDatabasePath(databasePath: string): string {
  const normalized = databasePath.replaceAll("\\", "/");
  const [prefix, ...segments] = normalized.split("/");
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Stored media path contains unsafe segments.");
  }
  if (prefix === "storage") {
    return assertInsideRoot(path.join(/* turbopackIgnore: true */ storageRoot, ...segments), storageRoot);
  }
  if (prefix === "generated") {
    return assertInsideRoot(
      path.join(/* turbopackIgnore: true */ generatedRoot, ...segments),
      generatedRoot,
    );
  }
  throw new Error("Stored media path is outside allowed roots.");
}

export async function prepareAssetDirectories(projectId: string, assetId: string) {
  assertIdentifier(projectId, "project id");
  assertIdentifier(assetId, "asset id");
  const originalDirectory = assertInsideRoot(
    path.join(/* turbopackIgnore: true */ storageRoot, projectId, assetId, "original"),
    storageRoot,
  );
  const outputDirectory = assertInsideRoot(
    path.join(/* turbopackIgnore: true */ generatedRoot, projectId, assetId),
    generatedRoot,
  );
  await Promise.all([
    mkdir(originalDirectory, { recursive: true }),
    mkdir(outputDirectory, { recursive: true }),
  ]);
  return { originalDirectory, outputDirectory };
}

export async function removeAssetDirectories(projectId: string, assetId: string): Promise<void> {
  assertIdentifier(projectId, "project id");
  assertIdentifier(assetId, "asset id");
  const originalRoot = assertInsideRoot(
    path.join(/* turbopackIgnore: true */ storageRoot, projectId, assetId),
    storageRoot,
  );
  const outputRoot = assertInsideRoot(
    path.join(/* turbopackIgnore: true */ generatedRoot, projectId, assetId),
    generatedRoot,
  );
  const results = await Promise.allSettled([
    rm(originalRoot, { recursive: true, force: true }),
    rm(outputRoot, { recursive: true, force: true }),
  ]);
  const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failure) {
    throw failure.reason;
  }
}
