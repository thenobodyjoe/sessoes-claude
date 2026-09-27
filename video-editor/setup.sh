#!/usr/bin/env bash
# Idempotent installer for the video-editor skill. Safe to re-run; fast when already set up.
# Everything lives in $VE_CACHE (default ~/.cache/video-editor):
#   venv/    Python env (mediapipe 0.10.14, opencv-contrib, scipy, sherpa-onnx, pocketsphinx)
#   node/    playwright for the graphics renderer
#   models/  Parakeet v3 multilingual speech model (~640 MB)
# Prints the env vars to use: VE_CACHE, VE_PY.
set -euo pipefail

VE_CACHE="${VE_CACHE:-$HOME/.cache/video-editor}"
ASR_MODEL=sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8
ASR_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/$ASR_MODEL.tar.bz2"
PW_VERSION="${PW_VERSION:-1.56.1}"
QUIET="${1:-}"
log() { [ "$QUIET" = "--quiet" ] || echo "[video-editor] $*" >&2; }
mkdir -p "$VE_CACHE"

# 1. ffmpeg
if ! command -v ffmpeg >/dev/null || ! command -v ffprobe >/dev/null; then
  log "installing ffmpeg"
  if command -v apt-get >/dev/null; then
    SUDO=""; [ "$(id -u)" = 0 ] || SUDO="sudo"
    export DEBIAN_FRONTEND=noninteractive
    $SUDO apt-get install -y -qq ffmpeg >/dev/null 2>&1 || { $SUDO apt-get update -qq >/dev/null 2>&1 || true; $SUDO apt-get install -y -qq ffmpeg >/dev/null; }
  elif command -v brew >/dev/null; then
    brew install ffmpeg >/dev/null
  else
    echo "please install ffmpeg" >&2; exit 1
  fi
fi

# 2. Python venv. mediapipe is pinned: 0.10.14 is the last wheel that bundles the
#    selfie-segmentation and face models (no model download). It needs Python 3.9-3.12.
VE_PY="$VE_CACHE/venv/bin/python"
if ! "$VE_PY" - <<'PY' >/dev/null 2>&1
import mediapipe, cv2, scipy, numpy, PIL, sherpa_onnx, pocketsphinx
assert mediapipe.__version__ == "0.10.14"
cv2.ximgproc.guidedFilter
PY
then
  PYBIN=""
  for c in python3.12 python3.11 python3.10 python3.9 python3; do
    if command -v $c >/dev/null && $c -c 'import sys; sys.exit(not ((3,9) <= sys.version_info[:2] <= (3,12)))'; then PYBIN=$c; break; fi
  done
  [ -n "$PYBIN" ] || { echo "need Python 3.9-3.12 for mediapipe 0.10.14" >&2; exit 1; }
  log "creating python env with $PYBIN"
  rm -rf "$VE_CACHE/venv"
  $PYBIN -m venv "$VE_CACHE/venv"
  PIP_DISABLE_PIP_VERSION_CHECK=1 "$VE_PY" -m pip install -q "mediapipe==0.10.14" opencv-contrib-python \
    scipy numpy pillow sherpa-onnx pocketsphinx >/dev/null
fi

# 3. Playwright + Chromium (graphics renderer)
PW_DIR="$VE_CACHE/node/node_modules/playwright"
if [ ! -d "$PW_DIR" ]; then
  log "installing playwright $PW_VERSION"
  npm install -s --prefix "$VE_CACHE/node" "playwright@$PW_VERSION" >/dev/null 2>&1
fi
if ! node -e "
const { chromium } = require('$PW_DIR');
chromium.launch().then(b => b.close()).catch(() => process.exit(1));" >/dev/null 2>&1; then
  log "installing chromium for playwright"
  node "$PW_DIR/cli.js" install chromium >/dev/null 2>&1 || log "WARN: chromium install failed"
fi

# 4. Speech model (25 languages incl. pt/en, punctuation, token timestamps)
if [ ! -f "$VE_CACHE/models/$ASR_MODEL/tokens.txt" ]; then
  log "downloading $ASR_MODEL (~640 MB)"
  mkdir -p "$VE_CACHE/models"
  tmp="$(mktemp -d "$VE_CACHE/models/.dl.XXXX")"
  curl -fsSL "$ASR_URL" | tar xj -C "$tmp"
  rm -rf "$tmp/$ASR_MODEL/test_wavs"
  mv "$tmp/$ASR_MODEL" "$VE_CACHE/models/" && rmdir "$tmp"
fi

"$VE_PY" -c "import mediapipe, sherpa_onnx, pocketsphinx, cv2; cv2.ximgproc" 2>/dev/null
[ -f "$VE_CACHE/models/$ASR_MODEL/tokens.txt" ]
command -v ffmpeg >/dev/null
echo "video-editor ready. Use: export VE_CACHE=\"$VE_CACHE\" VE_PY=\"$VE_PY\""
