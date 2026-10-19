import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, copyFileSync, mkdirSync, accessSync, openSync, closeSync, constants } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import net from "node:net";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const info = (text) => console.log(`[检查] ${text}`);
const warn = (text) => console.warn(`[提示] ${text}`);
const windows = process.platform === "win32";

export function parseOptions(args) {
  let port = 3000;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port") { port = Number(args[++i]); continue; }
    if (!["--check", "--no-browser"].includes(args[i])) throw new Error(`未知参数：${args[i]}`);
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65525) throw new Error("端口必须在 1024–65525 之间。");
  return { port, check: args.includes("--check"), browser: !args.includes("--no-browser") };
}

export function supportedNode(version) {
  const [major, minor] = version.split(".").map(Number);
  return major > 20 || major === 20 && minor >= 9;
}

function run(command, args, options = {}) {
  // 只有固定的 pnpm 参数经过 Windows cmd；不将配置值或 Key 拼入 shell。
  if (windows && /\.(cmd|bat)$/i.test(command)) {
    if (/["%\r\n]/.test(command) || args.some((arg) => !/^[a-zA-Z0-9_.=-]+$/.test(arg))) throw new Error("不支持的命令路径或参数。");
    return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `""${command}" ${args.join(" ")}"`], { cwd: root, encoding: "utf8", windowsHide: true, windowsVerbatimArguments: true, timeout: 30_000, ...options });
  }
  return spawnSync(command, args, { cwd: root, encoding: "utf8", windowsHide: true, timeout: 30_000, ...options });
}

function mustRun(command, args, options = {}) {
  const result = run(command, args, { stdio: "inherit", timeout: 15 * 60_000, ...options });
  if (result.status !== 0) throw new Error("上一步未完成，请查看终端错误；不会继续启动或清空数据库。");
}

function pnpmCommand() {
  if (!windows) return "pnpm";
  const result = spawnSync("where.exe", ["pnpm.cmd"], { encoding: "utf8", windowsHide: true });
  return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : null;
}

function dependenciesReady() {
  if (!existsSync(path.join(root, "node_modules"))) return false;
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  try {
    for (const [name, expected] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      // 部分包禁止导出 package.json，从入口向上查找元信息而不是误判为未安装。
      let installed;
      try { installed = require(`${name}/package.json`).version; } catch { /* 有些包限制元信息导出。 */ }
      let directory = installed ? root : path.dirname(require.resolve(name));
      while (!installed && directory !== path.dirname(directory)) {
        const metadata = path.join(directory, "package.json");
        if (existsSync(metadata)) {
          const candidate = JSON.parse(readFileSync(metadata, "utf8"));
          if (candidate.name === name) { installed = candidate.version; break; }
        }
        directory = path.dirname(directory);
      }
      if (!installed) return false;
      if (/^\d+\.\d+\.\d+$/.test(expected) && installed !== expected) return false;
    }
    return true;
  } catch { return false; }
}

function pythonCandidate() {
  // 与现有媒体处理器一致：本项目虚拟环境优先，其次配置，最后 PATH。
  const local = path.join(root, "media-service", ".venv", windows ? "Scripts/python.exe" : "bin/python");
  return existsSync(local) ? local : process.env.MEDIA_PYTHON_PATH || "python";
}

function checkMedia() {
  const python = pythonCandidate();
  const version = run(python, ["-c", "import sys; print('.'.join(map(str,sys.version_info[:3]))); sys.exit(0 if sys.version_info >= (3,11) else 1)"]);
  if (version.status !== 0) throw new Error("Python 3.11+ 不可用（可能是 Windows 商店占位程序或失效虚拟环境）。请安装 Python，按 README 创建 media-service/.venv，并安装媒体依赖。");
  info(`Python ${version.stdout.trim()}`);
  const imports = run(python, ["-c", "import PIL, fastapi, uvicorn, pydantic_settings; import app.cli"], { cwd: path.join(root, "media-service") });
  if (imports.status !== 0) throw new Error("Python 媒体依赖不完整。请用媒体虚拟环境的 Python 执行：-m pip install -e ./media-service（在项目根目录）。");
  // 复用媒体服务自己的工具解析规则，包含 tools/ffmpeg/**/bin 的回退。
  const tools = run(python, ["-c", "import json, subprocess; from app.services.ffmpeg import resolve_tool; result={};\nfor name in ['ffmpeg','ffprobe']:\n p=resolve_tool(name); r=subprocess.run([p,'-version'],capture_output=True,text=True,timeout=15); r.check_returncode(); result[name]=r.stdout.splitlines()[0]\nprint(json.dumps(result))"], { cwd: path.join(root, "media-service") });
  if (tools.status !== 0) throw new Error("FFmpeg 或 ffprobe 不可用。请安装 FFmpeg 并加入 PATH，或在 .env 配置 FFMPEG_PATH / FFPROBE_PATH。不自动下载系统软件。");
  for (const [name, versionText] of Object.entries(JSON.parse(tools.stdout))) info(`${name} 可用：${versionText}`);
}

export function isPortFree(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => error.code === "EADDRINUSE" || error.code === "EACCES" ? resolve(false) : reject(error));
    server.listen({ port, host: "127.0.0.1", exclusive: true }, () => server.close(() => resolve(true)));
  });
}

async function isQiluVision(port, pageTimeout = 5000) {
  try {
    const base = `http://127.0.0.1:${port}`;
    const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok || (await response.json()).status !== "ok") return false;
    const page = await fetch(base, { signal: AbortSignal.timeout(pageTimeout) });
    return page.ok && (await page.text()).includes("齐鲁影策");
  } catch { return false; }
}

export async function selectPort(start, probe = isQiluVision) {
  let available = null;
  // 先找已经运行的实例，再选空闲端口，避免重复启动 Next dev 锁冲突。
  for (let port = start; port <= start + 10; port++) {
    if (await probe(port)) return { port, existing: true };
    if (await isPortFree(port)) { available ??= port; continue; }
  }
  if (available === null) throw new Error("连续 11 个端口均不可用，请用 --port 指定其它起始端口。不会结束占用端口的程序。");
  return { port: available, existing: false };
}

function openBrowser(url) {
  // URL 由本脚本生成，仅包含 localhost 与已校验的整数端口。
  const child = windows
    ? spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], { detached: true, stdio: "ignore", windowsHide: true })
    : spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], { detached: true, stdio: "ignore" });
  child.on("error", () => warn(`浏览器未能自动打开，请访问 ${url}`));
  child.unref();
}

async function main() {
  process.chdir(root);
  const options = parseOptions(process.argv.slice(2));
  console.log("\n齐鲁影策 QiluVision · 本地启动与环境检查\n");
  if (!supportedNode(process.versions.node)) throw new Error("需要 Node.js >=20.9，建议安装 Node.js 22 LTS。");
  info(`Node.js ${process.versions.node}`);
  const pnpm = pnpmCommand();
  const pm = pnpm ? run(pnpm, ["--version"]) : null;
  if (!pm || pm.status !== 0 || Number(pm.stdout.trim().split(".")[0]) !== 11) throw new Error("需要 pnpm 11。请安装后重试，例如 npm install -g pnpm@11。不会自动更改全局软件。");
  info(`pnpm ${pm.stdout.trim()}`);
  if (!dependenciesReady()) {
    if (options.check) throw new Error("项目依赖缺失或版本不匹配。正常启动会使用锁定文件安装依赖。");
    info("首次启动或依赖不匹配，安装锁定版本（需要网络）…");
    mustRun(pnpm, ["install", "--frozen-lockfile"]);
    if (!dependenciesReady()) throw new Error("依赖安装后校验仍未通过，请检查 package.json 与锁定文件。");
  }
  info("项目依赖完整");
  const envPath = path.join(root, ".env");
  if (!existsSync(envPath)) {
    if (options.check) throw new Error("尚无 .env。正常启动会从 .env.example 创建，不含真实 Key。");
    copyFileSync(path.join(root, ".env.example"), envPath, constants.COPYFILE_EXCL);
    info("已创建 .env；未覆盖任何已有配置");
  }
  // 用 Next 自身的环境加载器，保持 .env.local 等优先级与开发服务器一致。
  createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(root, true);
  checkMedia();
  for (const directory of [process.env.MEDIA_STORAGE_ROOT || "storage", process.env.MEDIA_GENERATED_ROOT || "generated", ".local"]) {
    const absolute = path.resolve(root, directory);
    if (!existsSync(absolute)) {
      if (options.check) { warn("存储目录尚未创建，正常启动时会创建。"); continue; }
      mkdirSync(absolute, { recursive: true });
    }
    accessSync(absolute, constants.W_OK);
  }
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || /your_|placeholder|example/i.test(key)) warn("未配置服务器默认 API Key，可在网页设置中填写个人 Key；本次不调用 AI。");
  const chosen = await selectPort(options.port);
  const url = `http://localhost:${chosen.port}`;
  if (chosen.existing) {
    info(`检测到可用的齐鲁影策服务，复用 ${url}`);
    if (!options.check && options.browser) openBrowser(url);
    return;
  }
  if (options.check) {
    mustRun(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "status"]);
    info(`环境检查通过，可使用端口 ${chosen.port}。检查模式没有启动服务或应用迁移。`);
    return;
  }
  const devLock = path.join(root, ".next", "dev", "lock");
  if (existsSync(devLock)) throw new Error("发现 Next 开发服务锁，但候选端口没有可用实例。请查看已有服务终端；不会强制删除锁或结束进程。");
  info("生成 Prisma 客户端并应用已有迁移（不 reset、不删除数据）…");
  let generatedSchema;
  try { generatedSchema = path.join(path.dirname(createRequire(require.resolve("@prisma/client" )).resolve(".prisma/client/default")), "schema.prisma"); } catch { /* 新安装尚未生成客户端。 */ }
  const schema = path.join(root, "prisma", "schema.prisma");
  if (!generatedSchema || !existsSync(generatedSchema) || readFileSync(generatedSchema, "utf8").replaceAll("\r\n", "\n") !== readFileSync(schema, "utf8").replaceAll("\r\n", "\n")) {
    mustRun(process.execPath, [require.resolve("prisma/build/index.js"), "generate"]);
  } else info("Prisma 客户端与 schema 一致，无需重复生成");
  // 此版本 Prisma 在 Windows 上对完全不存在的 SQLite 文件可能仅报 Schema engine error。
  // 仅创建缺失文件，绝不截断已有库；随后仍由正式迁移建立表结构。
  const databaseUrl = process.env.DATABASE_URL || "";
  if (!databaseUrl.startsWith("file:")) throw new Error("本地启动器需要 SQLite file: 数据库地址，请检查 DATABASE_URL。");
  const database = databaseUrl.startsWith("file://") ? fileURLToPath(databaseUrl) : path.resolve(root, "prisma", decodeURIComponent(databaseUrl.slice(5).split("?")[0]));
  if (!existsSync(database)) {
    if (!database.startsWith(root + path.sep)) throw new Error("数据库配置指向项目外部，启动器不会自动创建，请确认路径并自行准备数据库。");
    mkdirSync(path.dirname(database), { recursive: true });
    try { closeSync(openSync(database, "wx")); info("已创建空 SQLite 文件，接下来应用迁移"); } catch (error) { if (error.code !== "EEXIST") throw error; }
  }
  mustRun(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"]);
  info(`启动开发服务：${url}（仅本机访问）。关闭此窗口或按 Ctrl+C 停止服务。`);
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(chosen.port)], { cwd: root, stdio: "inherit", windowsHide: true, env: process.env });
  let exited = false;
  let exitCode = 0;
  const stopped = new Promise((resolve) => {
    child.on("error", () => { exited = true; exitCode = 1; resolve(); });
    child.on("exit", (code) => { exited = true; exitCode = code ?? 0; resolve(); });
  });
  const stop = () => { child.kill("SIGTERM"); };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const deadline = Date.now() + 180_000;
    let ready = false;
    while (!exited && Date.now() < deadline) {
      // 首次页面编译可能较慢，不能用端口探测的短超时反复中断编译请求。
      if (await isQiluVision(chosen.port, Math.max(1, deadline - Date.now()))) { ready = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!ready) {
      stop();
      throw new Error("服务未能在 180 秒内通过首页和数据库健康检查，请查看上方日志。");
    }
    info(`首页 HTTP 200、数据库健康检查通过。访问：${url}`);
    if (options.browser) openBrowser(url);
    await stopped;
    process.exitCode = exitCode;
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(`\n[无法启动] ${error.message}\n详见 README.md 的本地启动说明。`); process.exitCode = 1; });
}
