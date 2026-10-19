# 齐鲁影策 QiluVision

面向青年创作者的齐鲁文化 AI 影像创作助手。

> 让每一帧山东，都有故事可讲。

## 项目简介

青年创作者在文旅拍摄中往往积累大量照片和视频，但回到后期阶段后，仍会面临素材整理困难、脚本创作困难，以及真实素材与叙事脱节等问题。

QiluVision 以创作者已经拍摄的真实素材为起点，规划通过 AI 理解素材内容，并结合齐鲁文化知识，为创作者提供素材分析、选题策划、故事规划、逐镜头素材匹配和缺镜头诊断。项目不会用静态假数据冒充模型或媒体处理结果。

## 核心创新

QiluVision 的设计原则是“素材驱动创作”。

传统生成式创作工具通常采用：

```text
主题 → AI 凭空生成脚本
```

QiluVision 采用：

```text
真实素材 → AI 理解 → 文化知识 → 故事规划 → 真实素材匹配 → 可执行分镜
```

系统中的 Shot 直接绑定真实 Asset；重新规划时，用户锁定的 Shot 和 Asset 由服务器执行不可删除、不可替换的约束检查。

## 核心功能

当前版本已经提供：

- 项目创建与创作意图记录；
- JPG、JPEG、PNG、WEBP、MP4、MOV 多文件上传；
- 文件类型、扩展名、大小和文件头校验；
- 图片尺寸读取与缩略图生成；
- 使用 ffprobe 读取视频时长、分辨率、帧率和编码信息；
- 使用 FFmpeg 生成视频缩略图和 3–8 张代表性关键帧；
- 真实素材库、素材详情、视频预览与关键帧查看；
- 素材处理状态、错误信息和安全删除；
- 六条带官方来源的齐鲁文化知识、本地关键词检索；
- 创作方案工作台：三个选题、选题选择、故事规划、逐镜头分镜及素材绑定；
- 旁白/画面编辑、素材替换、镜头删除与排序、镜头/素材锁定、单镜头重写及受约束重规划；
- 缺镜头诊断、补拍清单、使用现有素材重规划；
- 生成过程的服务端阶段提示、失败后的手动重试与最新结果刷新；
- 分镜素材匹配依据：对照已保存分析中的主体、关键词和视频时长，不提供虚构匹配分数；
- 旁白文化依据核验、PDF/CSV/TXT/SRT 创作方案导出。

**实现与验收状态不同**：媒体链路已有真实文件验证；AI 素材理解及新创作链路已实现，但未完成真实 DeepSeek 调用验收。本轮依用户选择不调用真实 API。离线测试使用独立数据库中的明确测试夹具，禁止联网，不将测试结果放入用户项目或冒充模型结果。

### 生成进度与失败恢复

创作方案请求通过 NDJSON 返回真实执行阶段，不使用计时模拟百分比。生成结果通过结构验证、锁定约束和事务检查后才保存；失败不覆盖原分镜。明确失败后可手动重试，重试 AI 操作可能再次计费，不自动重试。

网络中断不等于服务器取消。未收到终止结果时会暂停提交并提示先刷新已保存结果；刷新后若旧请求仍在执行，服务端会拒绝重复操作。重复请求保护仅适用于当前单实例进程，不是持久后台任务：刷新页面不会恢复进度流，多实例部署需改用数据库任务锁或任务队列。

素材匹配说明是可解释的文字线索对照，不是额外 AI 调用，也不是文化事实核验或语义准确率。没有有效分析时明确提示无法提供依据；视频时长充足不代表已选定可用剪辑区间。

## 技术架构

```text
Next.js App Router / TypeScript / Tailwind CSS / shadcn/ui
                         │
                         ├── Prisma ── SQLite
                         │
                         └── Python Media Service
                                  ├── Pillow（图片处理）
                                  └── FFmpeg / ffprobe（视频预处理）
```

- 前端与 Web 服务：Next.js 16、React 19、TypeScript（strict）；
- UI：Tailwind CSS 4、shadcn/ui、Lucide；
- 数据层：Prisma 6、SQLite；
- 数据校验：Zod；
- 媒体处理：Python 3.11+、Pillow、FFmpeg、ffprobe；
- AI Provider：服务端 AIProvider 抽象与 DeepSeekProvider 已接入真实多模态请求；真实分析需要配置有可用额度的 DeepSeek API Key。

## 使用的 AI

DeepSeekProvider 分别实现多模态素材理解、选题生成、故事规划、分镜生成、单镜头重写、缺镜头诊断和文化依据核验。本地文化检索不调用模型、不计费。DeepSeek API 只能由服务器端调用，结构化输出在写入数据库前必须通过 Zod 校验。

开发过程中使用 Codex 辅助程序开发、调试和代码优化。

## 本地运行方法

如需转到 Codex Cloud 继续开发，请参阅 [云端环境说明](docs/CODEX_CLOUD.md)。项目自带 `.agents/skills/qiluvision-verify/SKILL.md` 验证技能；本地个人技能和运行数据不会自动迁移。

### Windows 双击启动与环境检查

解压源码后双击根目录 `start-qiluvision.cmd`。需要预先安装 Node.js（建议 22 LTS）、pnpm 11、Python 3.11+ 和 FFmpeg。首次启动可联网安装项目依赖；不自动安装全局软件或 Python 依赖。Python 虚拟环境与依赖的准备方式见下方安装步骤。

启动器检查 Node/pnpm、依赖版本、Python 导入、FFmpeg/ffprobe 实际执行、存储目录写权限和端口。从 `.env.example` 创建缺失的 `.env`，不覆盖已有配置；正常新启动时生成 Prisma 客户端并执行 `migrate deploy`，不清空已有数据库。

如果已有可用的齐鲁影策服务，会复用；否则从 3000 起寻找可用端口，并在首页与数据库健康检查通过后自动打开浏览器。新启动的服务仅监听本机。请保持终端窗口运行，按 Ctrl+C 停止。检测到无法识别的 Next 开发锁时会停止，不强行删除锁或结束其他程序。

启动器使用 Next.js 的 Webpack 开发模式；Tailwind 仅扫描 `src`，避免无关目录带来的首次编译开销。原有 `pnpm dev` 命令不变。首次编译最多等待 180 秒，超时会报错，不打开尚未就绪的页面。依赖安装和当前在线字体获取需要网络；字体请求可能出现超时重试。

```powershell
pnpm launch                   # 检查并启动
pnpm check:env                # 仅检查，不安装依赖、不应用迁移或启动服务
pnpm launch --no-browser      # 启动但不自动打开浏览器
pnpm launch --port 3100       # 从指定端口开始查找
pnpm test:launcher            # 启动器参数、端口占用与复用测试
```

缺少 API Key 只提示，不阻止上传与媒体处理；启动检查不会请求 DeepSeek，也不验证 Key 有效性。启动成功不代表已知的 AI 解读格式问题已修复。启动器不是离线安装包或生产环境部署工具。

### 环境要求

- Node.js 20.9 或更高版本；
- pnpm 11（仓库包含 `pnpm-lock.yaml` 和构建脚本许可配置）；
- Python 3.11 或更高版本；
- FFmpeg 与 ffprobe。

### 安装与启动

```powershell
Copy-Item .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate

cd media-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
cd ..

pnpm dev
```

默认访问地址为 `http://localhost:3000`。Next.js 上传接口会调用 Python CLI，因此无需另外启动 FastAPI 服务。若需独立调试媒体服务，可参考 [media-service/README.md](media-service/README.md)。

### FFmpeg 配置

请确保 `ffmpeg` 和 `ffprobe` 位于系统 PATH 中，或者通过环境变量指定可执行文件。开发环境也会查找 `tools/ffmpeg/**/bin/` 下的本地构建；该目录不会提交到 Git。

## 环境变量配置

个人 API Key 可在网页「设置」中填写，优先于服务器的 `DEEPSEEK_API_KEY`。Key 由服务器使用 AES-256-GCM 加密后存入 HttpOnly、SameSite=Strict Cookie，作用域为 `/api`，有效期 30 天；生产环境还启用 Secure（需要 HTTPS）。设置接口只返回是否配置，不回传 Key。清除个人配置后恢复服务器默认配置。保存只验证格式，不调用 DeepSeek、不验证余额或有效性。

生产部署必须设置 `COOKIE_ENCRYPTION_SECRET` 为至少 32 字符的随机密钥，且所有实例使用同一值。更换密钥会使此前保存的 Cookie 失效。开发环境未配置时自动生成 `.local/cookie-key`，该目录已忽略，不提交 Git。备份或清除浏览器 Cookie 会影响此浏览器的个人配置；此设置不是账户系统。

复制 `.env.example` 为 `.env` 后按需修改：

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | Prisma SQLite 数据库地址 |
| `DEEPSEEK_API_KEY` | DeepSeek 服务端默认密钥；未保存个人 Key 时使用 |
| `COOKIE_ENCRYPTION_SECRET` | 生产环境个人 Key Cookie 加密密钥，至少 32 个随机字符 |
| `DEEPSEEK_BASE_URL` | DeepSeek API 基础地址 |
| `DEEPSEEK_MODEL` | DeepSeek 模型名称 |
| `FFMPEG_PATH` / `FFPROBE_PATH` | 媒体工具路径 |
| `MEDIA_PYTHON_PATH` | Python 可执行文件路径 |
| `MEDIA_STORAGE_ROOT` | 原始素材保存目录 |
| `MEDIA_GENERATED_ROOT` | 缩略图与关键帧保存目录 |
| `MAX_IMAGE_UPLOAD_MB` | 单张图片大小上限，默认 50 MB |
| `MAX_VIDEO_UPLOAD_MB` | 单个视频大小上限，默认 2048 MB（2 GB） |

不要给 `DEEPSEEK_API_KEY` 添加 `NEXT_PUBLIC_` 前缀，也不要提交 `.env` 或任何真实密钥。

## 当前开发进度

### 已完成

- Phase 0：项目基础架构、Prisma 数据模型、AIProvider 抽象、Zod schema 基础和首页框架；
- Phase 1：真实素材上传、媒体管理、图片处理、视频元数据读取、FFmpeg 缩略图与关键帧生成；
- DeepSeek 多模态素材理解接口、图片/关键帧分析、Zod 结构化校验、AssetAnalysis 持久化与详情页展示（代码已实现，真实调用待验收）；
- 上传安全校验、处理失败隔离、素材持久化展示与删除；
- 文化条目与检索、创作方案编辑、服务器锁定约束和四种导出；
- 完整 AI 创作操作接口及页面（代码已实现，真实生成质量待验收）。

### 开发中

- DeepSeek 真实图片/视频分析、选题、分镜、诊断与核验的端到端验收（本轮未调用）；
- 部署配置与公网 Demo 环境验证。

### 计划功能

- 扩充文化知识条目、改进检索相关性和人工复核流程；
- Experimental：FCPXML / Premiere 集成。

## 文件与上传限制

- 图片：JPG、JPEG、PNG、WEBP，单文件默认最大 50 MB；
- 视频：MP4、MOV，单文件默认最大 2 GB；
- 单次请求最多 20 个文件，总大小最大 2 GB；
- 原文件名仅用于展示，磁盘文件名由系统生成；
- 本地数据库、用户上传素材、缩略图和关键帧均已排除在 Git 提交之外。

## 项目结构

```text
QiluVision/
├── prisma/                 # Prisma schema 与数据库迁移
├── media-service/          # Python 媒体处理模块
│   └── app/services/       # metadata、frames、FFmpeg 与处理流程
├── src/
│   ├── app/                # 页面与 Route Handlers
│   ├── components/         # UI、项目与媒体组件
│   ├── lib/ai/             # AIProvider、DeepSeekProvider 与 Zod schemas
│   └── lib/media/          # 上传校验、存储、处理器与媒体响应
├── storage/                # 本地原始素材（不提交）
├── generated/              # 缩略图和关键帧（不提交）
├── Dockerfile              # 容器部署配置
└── render.yaml             # Render 部署蓝图
```

## 常用检查命令

```powershell
pnpm lint
pnpm typecheck
pnpm build
pnpm test:planning
```

## 创作方案工作流

1. 在项目上传素材并完成媒体处理；配置个人 API Key，手动触发真实素材解读。
2. 从项目点击「进入创作方案」。未完成有效素材解读时，服务器拒绝 AI 选题/分镜生成，不根据文件名猜内容。
3. 检索文化线索，推荐三个选题并选择一个。默认 9:16、60 秒、10 个镜头，可调整为 16:9、10–600 秒、3–30 个镜头。
4. 规划故事并生成分镜，自动绑定本项目素材。没有合适素材时允许空绑定，交由补拍诊断处理；视频镜头时长不能超过源视频时长。
5. 编辑旁白、画面、时长、景别和机位；选择素材、删除/调整镜头顺序，并保存。锁定镜头保留内容/位置/素材；锁定素材保留该镜头及绑定，允许调整旁白和位置。先单独解锁保存，再改原锁定内容。
6. 单镜头重写、整体重规划、缺镜头诊断、加入/移除补拍清单，或要求仅使用现有素材重规划。AI 输出违反约束时拒绝整次写入，原方案保留。
7. 核验旁白依据：模型需提供已有条目 ID 和原文摘录，服务器再次检查引用存在且来自已核对来源的条目。无法支持的内容只显示「未在当前知识库中找到充分依据」，不作真假判定。编辑旁白会使原核验失效。
8. 导出已保存方案。PDF 内嵌随项目部署的 Noto Sans CJK SC，许可证位于 `assets/fonts/OFL.txt`；CSV 使用 UTF-8 BOM 并防范公式注入；SRT 累加全部镜头时长，无旁白镜头保留时间间隔。导出记录保存在 Export，文件位于 `generated/{projectId}/exports/`。

并发修改使用 Storyboard revision 检查；请求完成前如方案或选题改变，不覆盖新方案。删除被锁定镜头使用的素材会被拒绝。当前无账号隔离，适用于本地/比赛 Demo；不能当作多租户服务。

`pnpm test:planning` 自动创建并迁移 `.test-output/planning-tests.db`，覆盖锁定、跨项目绑定拒绝、过期版本拒绝、单镜头重写、诊断与补拍持久化、伪造引用拒绝、中文 PDF 和 CSV/TXT/SRT。测试中网络请求被禁用；测试数据库和生成文件不提交 Git。

知识来源包括：[济南市园林和林业绿化局·大明湖](https://jnly.jinan.gov.cn/col117783/art/2025/art_117783_4779721.html)、[天下第一泉风景区](https://jnly.jinan.gov.cn/col38755/art/2023/art_38755_4761649.html)、[济南市政府·趵突泉泉群](https://www.jinan.gov.cn/col25651/art/2024/art_25651_2060301.html)、[烟台历史文化名城保护规划](https://gtj.yantai.gov.cn/art/2023/8/2/art_17923_2915278.html)、[烟台海洋经济规划](https://www.yantai.gov.cn/art/2021/5/25/art_99956_51345.html)。条目摘要仅覆盖这些页面支持的事实，未收录动态票价、营业时间等易变信息。

## 比赛信息

- 赛事：2026 山东省首届大学生 AI 大模型创新传播大赛；
- 赛道：AI 传播工具创新赛道。

## AI 使用说明

产品设计、交互逻辑、文化内容整理、测试与最终决策由参赛者主导。DeepSeek 用于产品中的 AI 能力；Codex 用于辅助代码开发、调试和代码优化。

## 许可证

本仓库当前用于比赛作品的公开展示，尚未选择开源许可证。未经明确许可，不代表授予复制、修改或再分发权利。
