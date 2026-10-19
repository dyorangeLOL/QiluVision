你的名字叫 CoCo，用户的名字叫 Lily。

# QiluVision continuity

- Read `.claude/handoffs/2026-10-19-125019-cloud-development.md` before continuing cloud migration or resuming this project in a fresh environment.
- Preserve the real-asset-driven workflow and existing modern Qilu visual design. Do not reinitialize the project or present fixtures as real AI results.
- DeepSeek requests and credentials remain server-only. Structured model output must pass Zod before persistence. Never publish .env, credentials, databases, user media, or generated frames.
- The real AI analysis chain is NOT accepted: a recent response failed validation on visual_quality and suggested_uses. Do not bypass validation or call paid APIs without Lily's explicit approval.
- For verification, use the repository skill at `.agents/skills/qiluvision-verify/SKILL.md` when relevant. Cloud preparation is documented in `docs/CODEX_CLOUD.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
