#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p work
python3 config.py
python3 analyze.py
node render_gfx.mjs
python3 audio.py
python3 comp.py
ffmpeg -v error -y -i work/video.mp4 -i work/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k \
  -shortest -movflags +faststart work/final.mp4
echo "done: work/final.mp4"
