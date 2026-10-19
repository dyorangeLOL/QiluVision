# Codex Cloud 开发环境

本配置用于云端继续开发，不是比赛作品公网部署，也不迁移个人素材或现有 SQLite 数据。先使用最新源码分支，不要把 Release 标签自动生成的旧版 Source code 当作当前完整版本。

## 准备与安装

在 Codex Cloud 创建仅自己可用的环境，选择本仓库与包含当前源码的分支。让环境准备 Node.js 22、pnpm 11.25.0、Python 3.11+、Python venv、FFmpeg 与 ffprobe，然后在项目根目录执行：

```sh
bash scripts/cloud-install.sh
```

此脚本不安装全局系统工具，缺少时会明确报错；请让云端环境准备流程在 VM 中补齐。脚本安装前后端依赖、创建缺失的 .env、生成 Prisma 客户端并应用已有迁移。不会 reset 数据库、导入假素材或调用 AI。

环境网络需要允许 npm、PyPI、Prisma 引擎下载及当前在线字体来源；按实际日志补充所需主机，不默认开放所有域名。Prisma 常用下载域名为 binaries.prisma.sh，字体为 fonts.googleapis.com 和 fonts.gstatic.com。没有明确批准时，不配置 DeepSeek 凭证、不开放其付费调用。

## 启动与检查

```sh
bash scripts/cloud-start.sh
```

保持服务终端运行，从另一终端验证实际端口：

```sh
curl --fail http://127.0.0.1:3000/api/health
curl --fail --output /dev/null http://127.0.0.1:3000/
```

设置 PORT 时需相应替换检查端口。云端启动默认监听 0.0.0.0，供云端预览转发；这不是对外提供永久生产服务。环境准备完、测试完成后再 Publish 环境。首个开发任务先阅读根目录 AGENTS.md 与交接文档。

## 验证

```sh
pnpm lint
pnpm typecheck
pnpm test:launcher
pnpm test:planning
pnpm build
```

云端执行成功前，不能把本地 Windows 检查写成 Linux 云端已验收。首次环境没有个人项目数据，请使用明确的测试项目与授权测试媒体验证，不使用个人原数据库。

## Skills

项目内技能位于 `.agents/skills/qiluvision-verify/SKILL.md`，与源码一起进入云端。它约束本项目的验证与验收边界，不赋予额外权限。可以显式要求使用 `$qiluvision-verify`。

电脑上的个人技能、Windows 路径、连接器登录态不会随仓库自动复制。若需迁移其他设计技能，请逐项审查来源、许可证、脚本依赖及云端工具支持；不要上传整个个人 Codex 配置目录。

官方参考：[Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environments)、[Build skills](https://learn.chatgpt.com/docs/build-skills)。
