# Handoff: QiluVision cloud development

## Session Metadata

- Created: 2026-10-19, Asia/Shanghai.
- Project: QiluVision, repository dyorangeLOL/QiluVision.
- Prepared branch: codex/cloud-development, based on main commit 1842b69a9a94be4740100fb4ba198e89f39c3f88.
- User: Lily. Assistant name: CoCo.
- Purpose: continue development in Codex Cloud, not public production hosting.

## Current State Summary

The Windows workspace contains functioning media ingestion and implemented planning/editor/export code. A teacher-preview ZIP named Qilu-Vision-v1.zip was published on 2026-10-18 as an asset on tag v0.1.0-teacher-preview.20261018. That tag initially pointed to the old main commit, not the current working source. Cloud preparation adds Linux installation/start scripts, a project-level verification skill and this handoff. Preparing these files does not prove GitHub synchronization or cloud publication: verify the actual remote source and environment setup report first.

## Important Context

The workflow is creative intent → real images/videos → FFmpeg preprocessing/frames → validated AI analysis → culture retrieval → three topics → selected story → per-shot storyboard → real-asset binding → missing-shot diagnosis → locks and constrained replanning → exports. Do not reinitialize the application, redesign the approved UI or introduce mock success.

Lily approved cloud migration, not paid DeepSeek verification. Earlier instructions deferred real API tests; user-triggered analysis attempts did occur and failed records remain local. Do not retry them during setup. Keep credentials server-only, validate structured output with Zod before persistence, enforce locked Shot/Asset hard constraints and use cautious cultural evidence wording.

## Architecture Overview

Next.js 16.3.8 App Router, React 19.3, strict TypeScript, Tailwind 4, Prisma 6.19.3 with SQLite, Python media CLI and FFmpeg/ffprobe. Local media is excluded from Git. DeepSeekProvider separates task methods; planning uses validation, revisions and transactions. Four database migrations exist. Repository skills use .agents/skills; personal Windows skills and connector credentials do not automatically transfer.

## Critical Files

- `AGENTS.md`: project invariants and installed Next.js documentation requirement.
- `docs/CODEX_CLOUD.md`: Linux preparation, startup and acceptance.
- `scripts/cloud-install.sh`: tooling checks, venv and dependency installation.
- `scripts/cloud-prepare.mjs`: local configuration, safe SQLite creation and Prisma migrations.
- `scripts/cloud-start.sh`: foreground Webpack development server for cloud previews.
- `src/lib/ai/prompts/analyze-asset.ts`: analysis prompt, first likely repair target.
- `src/lib/ai/schemas/asset-analysis.ts`: authoritative analysis ranges and enums.
- `src/app/api/assets/[assetId]/analysis/route.ts`: retries, persistence and failure handling.
- `src/lib/planning/service.ts`: valid-analysis gate, revisions and transactions.
- `src/lib/planning/constraints.ts`: ownership, locks, positions and duration checks.
- `tests/planning.test.ts`: isolated offline fixtures with network disabled.

## Files Modified

Migration adds cloud install/start/preparation scripts, docs/CODEX_CLOUD.md, the qiluvision-verify repository skill, LF attributes for shell scripts, this handoff and AGENTS.md/README.md continuity notes. It also carries forward the existing local product implementation. Unrelated animated-bar-chart work must stay out of project synchronization.

## Decisions Made

- Keep the existing compatible dependency versions. Migration is not a major-upgrade task.
- Preserve Windows start-qiluvision.cmd; use separate cloud Linux scripts.
- Exclude user media, SQLite files, generated frames, .env, cookie secrets and local caches.
- Add one project-authored verification skill, not all personal skills or third-party skills with unreviewed redistribution rights.
- Keep services in foreground-owned terminals; verify home and database health HTTP 200 without a paid AI call.

## Immediate Next Steps

1. Verify the remote branch contains this handoff, cloud files and full current application rather than only old main source.
2. Prepare Node.js 22, pnpm 11, Python 3.11+ with venv, FFmpeg/ffprobe in the cloud VM. Execute cloud-install, lint, typecheck, launcher tests, offline planning tests and build. Record actual cloud results.
3. Start the cloud server, verify home and /api/health HTTP 200, review the setup report, then publish the private prepared environment.
4. For a subsequent development request, repair the analysis contract and useful error display without weakening validation. Ask Lily before any paid live API acceptance test.

## Pending Work

Real AI acceptance is incomplete. The most recent inspected user-triggered image analysis returned visual.visual_quality above 1 and invalid suggested_uses values. The prompt shows an informal JSON example without fully specifying all bounds/enums. The route logs detailed Zod failures but stores a generic error. Improve the contract and meaningful errors; do not clamp arbitrary scores or declare failed results valid. Historical HTTP 402 failures are a separate problem.

Cloud account access, installed skill discovery, source publication, environment publication, preview readiness and production hosting are distinct states. Verify each before claiming completion.

## Assumptions Made

This competition demo does not need account isolation or cloud storage in this migration. Cloud starts with empty project data. DeepSeek credentials remain absent until Lily wants live tests. Approved branding, copyright and teacher-facing limitations stay intact.

## Potential Gotchas

- A missing SQLite file may cause an unclear Windows Prisma engine error; setup only creates missing files, never truncates existing ones.
- Tailwind scans src only to avoid nested extracted-project overhead. Launcher uses Webpack; pnpm dev retains the Next default.
- Prisma downloads and Google fonts need network hosts. Inspect failures before granting domains; do not disable TLS checks.
- Ready media is not ready AI analysis. No valid AssetAnalysis means planning stays disabled.
- Duplicate-operation locks are in-process and single-instance only.
- Personal API keys use encrypted HttpOnly cookies and are not migrated. Saved keys do not establish validity or funding.

## Environment State

Before migration, Windows lint, TypeScript, build, offline planning tests and launcher tests passed. An isolated fresh copy installed dependencies, applied four migrations and returned home/health HTTP 200. Those are historical local results, not proof of these new Linux scripts. The original project had eight uploaded assets; they remain local and must not enter GitHub. No new live AI requests are authorized by migration.

Environment variable names: DATABASE_URL, MEDIA_PYTHON_PATH, FFMPEG_PATH, FFPROBE_PATH, MEDIA_STORAGE_ROOT, MEDIA_GENERATED_ROOT, DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL, COOKIE_ENCRYPTION_SECRET, PORT. No secret values belong in this document. Local running processes do not move to the cloud; check cloud listeners independently.

## Related Resources

- `README.md`
- `docs/CODEX_CLOUD.md`
- `.agents/skills/qiluvision-verify/SKILL.md`
- https://learn.chatgpt.com/docs/environments/cloud-environments
- https://learn.chatgpt.com/docs/build-skills
- https://github.com/dyorangeLOL/QiluVision/releases/tag/v0.1.0-teacher-preview.20261018
