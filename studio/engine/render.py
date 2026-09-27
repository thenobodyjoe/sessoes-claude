"""Render an EditSpec for a project directory: graphics layers -> audio -> composite -> deliverables.

    python -m engine.render <project_dir> [spec.json] [--frames 30,120]   (run from studio/)
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

from timeline import Timeline, caption_groups  # noqa: E402


def gfx_spec(d, spec, tl, words):
    fmt = spec.get("format") or {}
    cap = dict(spec.get("captions") or {"enabled": True})
    cap["groups"] = caption_groups(words, tl, int(cap.get("maxWords", 4)))
    return {
        "fps": tl.fps, "tv": [round(t, 4) for t in tl.tv],
        "base": {"w": int(fmt.get("w", 1920)), "h": int(fmt.get("h", 1080))},
        "style": spec.get("style") or {}, "elements": spec.get("elements") or [], "fx": spec.get("fx") or [],
        "captions": cap, "words": [{"w": w["w"], "key": w["key"], "s": w["s"], "e": w["e"]} for w in words],
        "assetBase": "file://" + os.path.abspath(d) + "/",
    }


def render(d, spec, progress=lambda stage, p, msg: print(stage, round(p, 2), msg), frames=None):
    proj = json.load(open(os.path.join(d, "project.json")))
    info = json.load(open(os.path.join(d, "work", "info.json")))
    work = os.path.join(d, "work")
    tl = Timeline(spec, info)
    gs = os.path.join(work, "gfxspec.json")
    json.dump(gfx_spec(d, spec, tl, proj.get("words", [])), open(gs, "w"))
    json.dump(spec, open(os.path.join(work, "spec.json"), "w"), indent=1, ensure_ascii=False)

    progress("gfx", 0.15, "Animando os letreiros")
    cmd = ["node", os.path.join(HERE, "render_gfx.mjs"), gs, os.path.join(work, "gfx")]
    if frames:
        cmd.append(",".join(map(str, frames)))
    subprocess.run(cmd, check=True, capture_output=True)

    from comp import render_video
    if frames:
        prev = os.path.join(work, "preview")
        os.makedirs(prev, exist_ok=True)
        render_video(d, spec, tl, info, prev, lambda p: None, only=frames)
        return prev

    progress("audio", 0.35, "Compondo o som")
    from audio import render_audio
    mix = os.path.join(work, "mix.wav")
    render_audio(d, spec, tl, mix)

    progress("comp", 0.45, "Compondo cada quadro")
    video = os.path.join(work, "video.mp4")
    render_video(d, spec, tl, info, video, lambda p: progress("comp", 0.45 + 0.45 * p, f"Compondo cada quadro · {int(p * 100)}%"))

    progress("deliver", 0.92, "Finalizando")
    subprocess.run([sys.executable, os.path.join(ROOT, "video-editor", "bin", "deliver.py"), video, mix,
                    "--out", os.path.join(work, "out"), "--name", "edit"], check=True, capture_output=True)
    return os.path.join(work, "out")


if __name__ == "__main__":
    args = sys.argv[1:]
    frames = None
    if "--frames" in args:
        i = args.index("--frames")
        frames = [int(x) for x in args[i + 1].split(",")]
        del args[i:i + 2]
    d = args[0]
    spec = json.load(open(args[1] if len(args) > 1 else os.path.join(d, "work", "spec.json")))
    print(render(d, spec, frames=frames))
