import { mkdirSync, openSync, closeSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
mkdirSync(".test-output", { recursive: true });
closeSync(openSync(".test-output/planning-tests.db", "a"));
const env = { ...process.env, DATABASE_URL: "file:../.test-output/planning-tests.db", MEDIA_STORAGE_ROOT: path.resolve(".test-output/storage"), MEDIA_GENERATED_ROOT: path.resolve(".test-output/generated") };
for (const args of [[require.resolve("prisma/build/index.js"), "migrate", "deploy"], ["--conditions=react-server", "--import", "tsx", "--test", "tests/planning.test.ts"]]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
