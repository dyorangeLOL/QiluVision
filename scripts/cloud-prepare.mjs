import { copyFileSync, existsSync, mkdirSync, openSync, closeSync, constants } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
process.chdir(root);
if (!existsSync(".env")) copyFileSync(".env.example", ".env", constants.COPYFILE_EXCL);
createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(root, true);

const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:")) throw new Error("Cloud demo setup requires a SQLite file: DATABASE_URL.");
const database = url.startsWith("file://") ? fileURLToPath(url) : path.resolve(root, "prisma", decodeURIComponent(url.slice(5).split("?")[0]));
if (!existsSync(database)) {
  if (!database.startsWith(root + path.sep)) throw new Error("Database is outside the repository; prepare it explicitly rather than auto-creating it.");
  mkdirSync(path.dirname(database), { recursive: true });
  try { closeSync(openSync(database, "wx")); } catch (error) { if (error.code !== "EEXIST") throw error; }
}
for (const directory of [process.env.MEDIA_STORAGE_ROOT || "storage", process.env.MEDIA_GENERATED_ROOT || "generated", ".local"]) {
  mkdirSync(path.resolve(root, directory), { recursive: true });
}
for (const args of [["generate"], ["migrate", "deploy"]]) {
  const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], { cwd: root, env: process.env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
