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

系统中的 Shot 将直接绑定真实 Asset；后续重新规划时，用户锁定的 Shot 和 Asset 将作为不可删除、不可替换的硬约束。

## 核心功能

当前版本已经提供：

- 项目创建与创作意图记录；
- JPG、JPEG、PNG、WEBP、MP4、MOV 多文件上传；
- 文件类型、扩展名、大小和文件头校验；
- 图片尺寸读取与缩略图生成；
- 使用 ffprobe 读取视频时长、分辨率、帧率和编码信息；
- 使用 FFmpeg 生成视频缩略图和 3–8 张代表性关键帧；
- 真实素材库、素材详情、视频预览与关键帧查看；
- 素材处理状态、错误信息和安全删除。

AI 素材理解、文化知识检索、选题、故事规划、Storyboard、缺镜头诊断和导出仍处于后续开发计划中。

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
- AI Provider：已建立服务端抽象和 DeepSeekProvider 占位实现，尚未接入真实模型调用。

## 使用的 AI

产品计划使用 DeepSeek API 提供多模态素材理解、文化上下文检索辅助、选题生成和故事规划等能力。DeepSeek API 只能由服务器端调用，结构化输出在写入数据库前必须通过 Zod 校验。

开发过程中使用 Codex 辅助程序开发、调试和代码优化。

## 本地运行方法

### 环境要求

- Node.js 20.9 或更高版本；
- pnpm 10（仓库包含 `pnpm-lock.yaml`）；
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

复制 `.env.example` 为 `.env` 后按需修改：

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | Prisma SQLite 数据库地址 |
| `DEEPSEEK_API_KEY` | DeepSeek 服务端密钥；当前阶段不会调用 |
| `DEEPSEEK_BASE_URL` | DeepSeek API 基础地址 |
| `DEEPSEEK_MODEL` | DeepSeek 模型名称 |
| `FFMPEG_PATH` / `FFPROBE_PATH` | 媒体工具路径 |
| `MEDIA_PYTHON_PATH` | Python 可执行文件路径 |
| `MEDIA_STORAGE_ROOT` | 原始素材保存目录 |
| `MEDIA_GENERATED_ROOT` | 缩略图与关键帧保存目录 |
| `MAX_IMAGE_UPLOAD_MB` | 单张图片大小上限，默认 25 MB |
| `MAX_VIDEO_UPLOAD_MB` | 单个视频大小上限，默认 250 MB |

不要给 `DEEPSEEK_API_KEY` 添加 `NEXT_PUBLIC_` 前缀，也不要提交 `.env` 或任何真实密钥。

## 当前开发进度

### 已完成

- Phase 0：项目基础架构、Prisma 数据模型、AIProvider 抽象、Zod schema 基础和首页框架；
- Phase 1：真实素材上传、媒体管理、图片处理、视频元数据读取、FFmpeg 缩略图与关键帧生成；
- 上传安全校验、处理失败隔离、素材持久化展示与删除。

### 开发中

- 部署配置与公网 Demo 环境验证；
- Phase 2 的接口与数据契约设计。

### 计划功能

- DeepSeek 多模态素材理解；
- 齐鲁文化知识库与事实核验；
- 三个 AI 选题推荐与故事规划；
- 逐镜头 Storyboard、Shot/Asset 自动绑定和锁定约束重规划；
- 缺镜头诊断与补拍清单；
- PDF、CSV、TXT、SRT 导出；
- Experimental：FCPXML / Premiere 集成。

## 文件与上传限制

- 图片：JPG、JPEG、PNG、WEBP，单文件默认最大 25 MB；
- 视频：MP4、MOV，单文件默认最大 250 MB；
- 单次请求最多 20 个文件，总大小最大 500 MB；
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
```

## 比赛信息

- 赛事：2026 山东省首届大学生 AI 大模型创新传播大赛；
- 赛道：AI 传播工具创新赛道。

## AI 使用说明

产品设计、交互逻辑、文化内容整理、测试与最终决策由参赛者主导。DeepSeek 用于产品中的 AI 能力；Codex 用于辅助代码开发、调试和代码优化。

## 许可证

本仓库当前用于比赛作品的公开展示，尚未选择开源许可证。未经明确许可，不代表授予复制、修改或再分发权利。
