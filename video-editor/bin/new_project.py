#!/usr/bin/env python3
"""Scaffold a new edit project from the reference project (talking-head-edit).

usage: new_project.py NAME --src /path/to/video.mp4
Copies the pipeline (config, analyze, comp, audio, graphics engine, fonts, build.sh) into NAME/.
Everything story-specific (DISPLAY text, CAMERA, SHOT_STARTS, DROP, scenes in graphics/gfx.js,
score in audio.py) must then be rewritten for the new video — see .claude/skills/video-edit/SKILL.md.
"""
import argparse
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEMPLATE = os.path.join(ROOT, "talking-head-edit")
FILES = ["config.py", "analyze.py", "comp.py", "audio.py", "render_gfx.mjs", "build.sh", ".gitignore",
         "graphics/index.html", "graphics/gfx.js"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--src", required=True)
    args = ap.parse_args()
    dst = os.path.join(ROOT, args.name)
    if os.path.exists(dst):
        raise SystemExit(f"{dst} already exists")
    for f in FILES:
        os.makedirs(os.path.dirname(os.path.join(dst, f)), exist_ok=True)
        shutil.copy2(os.path.join(TEMPLATE, f), os.path.join(dst, f))
    shutil.copytree(os.path.join(TEMPLATE, "graphics", "fonts"), os.path.join(dst, "graphics", "fonts"))
    cfg = os.path.join(dst, "config.py")
    s = open(cfg).read()
    s = re.sub(r'(SRC = os\.environ\.get\(\s*"SRC_VIDEO",\s*)"[^"]*"', lambda m: m.group(1) + repr(os.path.abspath(args.src)).replace("'", '"'), s)
    open(cfg, "w").write(s)
    os.makedirs(os.path.join(dst, "work"), exist_ok=True)
    print(f"created {dst}\nnext: probe -> transcribe (copy words.json into {args.name}/) -> rewrite config.py + gfx.js scenes")


if __name__ == "__main__":
    main()
