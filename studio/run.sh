#!/usr/bin/env bash
# Start Studio locally: http://localhost:${PORT:-8787}
set -euo pipefail
cd "$(dirname "$0")"
bash ../video-editor/setup.sh --quiet
VE_CACHE="${VE_CACHE:-$HOME/.cache/video-editor}"
PY="$VE_CACHE/venv/bin/python"
"$PY" -c "import fastapi, uvicorn, multipart, anthropic" 2>/dev/null || \
  PIP_DISABLE_PIP_VERSION_CHECK=1 "$PY" -m pip install -q fastapi "uvicorn[standard]" python-multipart anthropic
export VE_CACHE PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-$VE_CACHE/node/node_modules/playwright}"
echo "Studio → http://localhost:${PORT:-8787}"
exec "$PY" -m uvicorn server:app --host "${HOST:-127.0.0.1}" --port "${PORT:-8787}"
