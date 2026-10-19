---
name: qiluvision-verify
description: Verify QiluVision source or environment changes with its local checks, isolated planning tests, and media readiness checks. Use before handing off project changes or preparing its cloud development environment.
---

# QiluVision verification

Read root AGENTS.md and the task's relevant installed Next.js guides before editing. Keep the user's requested scope; this workflow does not authorize paid AI calls, pushes, releases, or production deployment.

Run the applicable checks from the repository root:

```sh
pnpm lint
pnpm typecheck
pnpm test:launcher
pnpm test:planning
pnpm build
```

`test:planning` uses its own `.test-output/planning-tests.db`, rejects live fetch, and marks fixtures as tests. Never point it at a user database or import its fixtures into a real project. Passing offline tests is not proof that real DeepSeek calls work.

For upload/media or environment changes, also execute the configured Python's dependency imports and run ffmpeg/ffprobe version checks. For media behavior changes, test an authorized real image and video through the actual processing chain, and report what was or was not tested. Video analysis uses generated frames, never MP4 directly.

For service startup, keep it running in a terminal, read its reported port, and confirm `/api/health` and `/` return HTTP 200. A process that merely exists is not acceptance. Do not terminate unrelated processes or clear a database to fix startup.

Report files changed, checks/results, warnings, and unverified boundaries separately. If model fields violate Zod, preserve the failure and explain it; do not clamp scores, invent tags, unlock shots, or fabricate a successful analysis.
