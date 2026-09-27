#!/usr/bin/env bash
# Idempotent installer for the code-driven video editing kit. Safe to re-run.
#   bash video-editor/setup.sh           verbose
#   bash video-editor/setup.sh --quiet   only the final status line
set -euo pipefail

VE_CACHE="${VE_CACHE:-$HOME/.cache/video-editor}"
ASR_MODEL=sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8
ASR_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/$ASR_MODEL.tar.bz2"
PW_MODULE="$(npm root -g 2>/dev/null)/playwright"
QUIET="${1:-}"
log() { [ "$QUIET" = "--quiet" ] || echo "[video-editor] $*"; }

# 1. ffmpeg / ffprobe
if ! command -v ffmpeg >/dev/null || ! command -v ffprobe >/dev/null; then
  log "installing ffmpeg"
  export DEBIAN_FRONTEND=noninteractive
  apt-get install -y -qq ffmpeg >/dev/null 2>&1 || { apt-get update -qq >/dev/null 2>&1 || true; apt-get install -y -qq ffmpeg >/dev/null; }
fi

# 2. Python stack. mediapipe is pinned: 0.10.14 is the last release that bundles
#    the selfie-segmentation / face models inside the wheel (no download needed).
if ! python3 - <<'PY' >/dev/null 2>&1
import mediapipe, cv2, scipy, numpy, PIL, sherpa_onnx, pocketsphinx
assert mediapipe.__version__ == "0.10.14"
cv2.ximgproc.guidedFilter
PY
then
  log "installing python packages"
  PIP_DISABLE_PIP_VERSION_CHECK=1 pip install -q --root-user-action=ignore "mediapipe==0.10.14" opencv-contrib-python scipy numpy pillow \
    sherpa-onnx pocketsphinx >/dev/null
fi

# 3. Playwright (graphics renderer). The cloud image ships Chromium in /opt/pw-browsers.
if [ ! -d "$PW_MODULE" ]; then
  log "installing playwright"
  npm install -g -s playwright@1.56.1 >/dev/null 2>&1 || log "WARN: playwright install failed"
fi

# 4. Speech model (multilingual, 25 languages incl. pt/en, token timestamps). ~640 MB.
if [ ! -f "$VE_CACHE/models/$ASR_MODEL/tokens.txt" ]; then
  log "downloading $ASR_MODEL"
  mkdir -p "$VE_CACHE/models"
  tmp="$(mktemp -d "$VE_CACHE/models/.dl.XXXX")"
  curl -fsSL "$ASR_URL" | tar xj -C "$tmp"
  rm -rf "$tmp/$ASR_MODEL/test_wavs"
  mv "$tmp/$ASR_MODEL" "$VE_CACHE/models/" && rmdir "$tmp"
fi

ok=true
for c in ffmpeg ffprobe; do command -v $c >/dev/null || ok=false; done
python3 -c "import mediapipe, sherpa_onnx, pocketsphinx, cv2; cv2.ximgproc" 2>/dev/null || ok=false
[ -d "$PW_MODULE" ] || ok=false
[ -f "$VE_CACHE/models/$ASR_MODEL/tokens.txt" ] || ok=false
if $ok; then
  echo "video-editor kit ready (ffmpeg, mediapipe 0.10.14, parakeet ASR, playwright). Skill: .claude/skills/video-edit"
else
  echo "video-editor kit INCOMPLETE — run: bash video-editor/setup.sh" >&2
  exit 1
fi
