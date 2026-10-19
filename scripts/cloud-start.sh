#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

port="${PORT:-3000}"
if [[ ! "$port" =~ ^[0-9]+$ ]] || (( port < 1024 || port > 65535 )); then
  echo 'PORT must be an integer between 1024 and 65535.' >&2
  exit 1
fi
if [[ ! -x media-service/.venv/bin/python ]]; then
  echo 'Run bash scripts/cloud-install.sh first.' >&2
  exit 1
fi
export MEDIA_PYTHON_PATH="$PWD/media-service/.venv/bin/python"
echo "Starting QiluVision on port $port. Confirm /api/health and / return HTTP 200."
# Foreground process: the environment's start workflow owns its terminal/lifecycle.
exec pnpm exec next dev --webpack --hostname 0.0.0.0 --port "$port"
