#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Run inside the cloud development VM, not a production deployment host.
for tool in node pnpm python3 ffmpeg ffprobe; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing $tool. Prepare Node.js >=20.9 (recommended 22), pnpm 11, Python >=3.11, ffmpeg and ffprobe in this cloud environment." >&2
    exit 1
  fi
done
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<20 || a===20 && b<9) process.exit(1)'
if [[ "$(pnpm --version)" != 11.* ]]; then
  echo 'This lockfile expects pnpm 11. Install pnpm 11 before continuing.' >&2
  exit 1
fi
python3 -c 'import sys; assert sys.version_info >= (3,11), "Python >=3.11 required"'
ffmpeg -version >/dev/null
ffprobe -version >/dev/null

pnpm install --frozen-lockfile --prod=false
if [[ ! -x media-service/.venv/bin/python ]]; then
  python3 -m venv media-service/.venv
fi
media-service/.venv/bin/python -m pip install -e ./media-service
media-service/.venv/bin/python -c 'import PIL, fastapi, uvicorn, pydantic_settings'
node scripts/cloud-prepare.mjs
echo 'Cloud dependencies and database are prepared. No AI requests were made.'
