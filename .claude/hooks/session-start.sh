#!/bin/bash
# Prepares the video editing kit (ffmpeg, mediapipe, ASR model, playwright) in web sessions.
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi
bash "$CLAUDE_PROJECT_DIR/video-editor/setup.sh" --quiet
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export VE_CACHE=\"$HOME/.cache/video-editor\"" >> "$CLAUDE_ENV_FILE"
fi
