"""Studio server: projects, uploads, background jobs (analysis, briefing, spec, render), files.

Run with `bash studio/run.sh`. Everything about a project lives in studio/projects/<id>/project.json,
so the app can be closed and resumed at any point.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import traceback
import uuid

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PROJECTS = os.path.join(HERE, "projects")
BIN = os.path.join(ROOT, "video-editor", "bin")
PY = sys.executable
os.makedirs(PROJECTS, exist_ok=True)

app = FastAPI(title="Studio")
_locks: dict[str, threading.Lock] = {}


# ---------------- persistence ----------------
def pdir(pid):
    if not re.fullmatch(r"[a-f0-9]{12}", pid):
        raise HTTPException(404)
    d = os.path.join(PROJECTS, pid)
    if not os.path.isdir(d):
        raise HTTPException(404)
    return d


def load(pid):
    return json.load(open(os.path.join(pdir(pid), "project.json")))


def save(pid, proj):
    lock = _locks.setdefault(pid, threading.Lock())
    with lock:
        path = os.path.join(pdir(pid), "project.json")
        tmp = path + ".tmp"
        json.dump(proj, open(tmp, "w"), ensure_ascii=False, indent=1)
        os.replace(tmp, path)


def update(pid, **kw):
    proj = load(pid)
    proj.update(kw)
    proj["updated"] = time.time()
    save(pid, proj)
    return proj


def set_job(pid, name, stage, progress, message="", error=None, done=False):
    update(pid, job={"name": name, "stage": stage, "progress": progress, "message": message,
                     "error": error, "done": done, "at": time.time()})


def run(*args, cwd=None):
    r = subprocess.run([str(a) for a in args], cwd=cwd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"{os.path.basename(str(args[1] if args[0] == PY else args[0]))} failed:\n{r.stderr[-2000:]}")
    return r.stdout


def job(name):
    """Decorator: run fn(pid, ...) in a thread, recording errors on the project."""
    def deco(fn):
        def start(pid, *a):
            def body():
                try:
                    fn(pid, *a)
                except Exception as e:  # surfaced in the UI
                    traceback.print_exc()
                    set_job(pid, name, "error", 1, str(e)[-600:], error=True, done=True)
            threading.Thread(target=body, daemon=True).start()
        return start
    return deco


# ---------------- analysis ----------------
EN_HINTS = {"the", "and", "you", "to", "is", "that", "it", "of", "i", "a", "in", "this", "what", "have"}


@job("analysis")
def analyze_job(pid):
    d = pdir(pid)
    work = os.path.join(d, "work")
    src = os.path.join(d, "source.mp4")
    set_job(pid, "analysis", "probe", 0.05, "Lendo o vídeo")
    run(PY, f"{BIN}/probe.py", src, "--out", work)
    info = json.load(open(os.path.join(work, "info.json")))
    update(pid, info={k: info[k] for k in ("duration", "fps", "width", "height", "frames", "shot_starts", "loudness")})

    set_job(pid, "analysis", "thumbs", 0.15, "Criando a linha do tempo")
    n = max(8, min(240, int(info["duration"])))
    run("ffmpeg", "-v", "error", "-y", "-i", src, "-vf",
        f"fps={n / info['duration']:.5f},scale=-2:120,tile={n}x1", "-frames:v", "1",
        os.path.join(work, "thumbs.jpg"))

    set_job(pid, "analysis", "listen", 0.3, "Ouvindo cada palavra")
    lang = "en"
    run(PY, f"{BIN}/transcribe.py", src, "--out", work, "--lang", "auto")
    words = json.load(open(os.path.join(work, "words_display.json")))
    keys = [w["key"] for w in words]
    if keys and sum(k in EN_HINTS for k in keys) / len(keys) > 0.12:
        run(PY, f"{BIN}/transcribe.py", src, "--out", work, "--lang", "en")
        words = json.load(open(os.path.join(work, "words_display.json")))
    else:
        lang = "other"

    import wave
    w = wave.open(os.path.join(work, "audio16k.wav"))
    a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    hop = 16000 // 50
    peaks = np.abs(a[: len(a) // hop * hop]).reshape(-1, hop).max(1)
    peaks = (peaks / (peaks.max() + 1e-9)).round(3).tolist()

    set_job(pid, "analysis", "see", 0.55, "Entendendo o enquadramento")
    shots = ",".join(map(str, info["shot_starts"]))
    report = run(PY, f"{BIN}/analyze.py", src, "--out", work, "--shots", shots)

    update(pid, words=words, lang=lang, waveform={"rate": 50, "peaks": peaks}, framing=report[-4000:],
           stage="edit")
    set_job(pid, "analysis", "done", 1, "Pronto", done=True)


# ---------------- brain jobs ----------------
@job("briefing")
def briefing_job(pid):
    import brain
    set_job(pid, "briefing", "think", 0.2, "Lendo suas instruções")
    proj = load(pid)
    b = brain.briefing(proj, pdir(pid))
    update(pid, briefing=b, stage="briefing")
    set_job(pid, "briefing", "done", 1, "Briefing pronto", done=True)


@job("render")
def render_job(pid):
    import brain
    d = pdir(pid)
    set_job(pid, "render", "spec", 0.05, "Desenhando a edição")
    proj = load(pid)
    spec = brain.spec(proj, d)
    update(pid, spec=spec)
    from engine import render as eng
    eng.render(d, spec, lambda stage, p, msg: set_job(pid, "render", stage, p, msg))
    update(pid, stage="done", outputs={"preview": "work/out/edit_preview.mp4", "master": "work/out/edit_master.mp4"})
    set_job(pid, "render", "done", 1, "Seu vídeo está pronto", done=True)


# ---------------- API ----------------
@app.get("/api/projects")
def list_projects():
    out = []
    for pid in sorted(os.listdir(PROJECTS), reverse=True):
        f = os.path.join(PROJECTS, pid, "project.json")
        if os.path.exists(f):
            p = json.load(open(f))
            out.append({k: p.get(k) for k in ("id", "name", "created", "updated", "stage")})
    return sorted(out, key=lambda p: -(p.get("updated") or 0))


@app.post("/api/projects")
async def create_project(file: UploadFile = File(...)):
    pid = uuid.uuid4().hex[:12]
    d = os.path.join(PROJECTS, pid)
    os.makedirs(os.path.join(d, "work"))
    os.makedirs(os.path.join(d, "assets"))
    with open(os.path.join(d, "upload" + os.path.splitext(file.filename or "")[1]), "wb") as f:
        shutil.copyfileobj(file.file, f)
    up = next(os.path.join(d, x) for x in os.listdir(d) if x.startswith("upload"))
    # normalize to H.264 so every browser can play it and seeking is exact
    run("ffmpeg", "-v", "error", "-y", "-i", up, "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", os.path.join(d, "source.mp4"))
    os.remove(up)
    now = time.time()
    save(pid, {"id": pid, "name": os.path.splitext(file.filename or "Vídeo")[0], "created": now, "updated": now,
               "stage": "analysis", "global_prompt": "", "intents": [], "answers": {}})
    analyze_job(pid)
    return {"id": pid}


@app.get("/api/projects/{pid}")
def get_project(pid: str):
    return load(pid)


@app.put("/api/projects/{pid}")
def put_project(pid: str, body: dict):
    allowed = {k: body[k] for k in ("name", "global_prompt", "intents", "answers") if k in body}
    if body.get("stage") == "edit":
        allowed["stage"] = "edit"
    if body.get("clear_job"):
        allowed["job"] = None
    return update(pid, **allowed)


@app.post("/api/projects/{pid}/assets")
async def upload_asset(pid: str, file: UploadFile = File(...)):
    d = os.path.join(pdir(pid), "assets")
    name = re.sub(r"[^\w.\-]+", "_", file.filename or "asset")
    name = f"{uuid.uuid4().hex[:6]}_{name}"
    with open(os.path.join(d, name), "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"path": f"assets/{name}"}


@app.post("/api/projects/{pid}/briefing")
def start_briefing(pid: str):
    briefing_job(pid)
    return {"ok": True}


@app.post("/api/projects/{pid}/render")
def start_render(pid: str):
    update(pid, stage="rendering")
    render_job(pid)
    return {"ok": True}


@app.delete("/api/projects/{pid}")
def delete_project(pid: str):
    shutil.rmtree(pdir(pid))
    return {"ok": True}


@app.get("/files/{pid}/{path:path}")
def project_file(pid: str, path: str):
    d = pdir(pid)
    f = os.path.realpath(os.path.join(d, path))
    if not f.startswith(os.path.realpath(d) + os.sep) or not os.path.isfile(f):
        raise HTTPException(404)
    return FileResponse(f)


@app.get("/")
def index():
    return FileResponse(os.path.join(HERE, "web", "index.html"))


app.mount("/web", StaticFiles(directory=os.path.join(HERE, "web")), name="web")
app.mount("/engine", StaticFiles(directory=os.path.join(HERE, "engine")), name="engine")
app.mount("/fonts", StaticFiles(directory=os.path.join(ROOT, "talking-head-edit", "graphics", "fonts")), name="fonts")


@app.exception_handler(RuntimeError)
def runtime_error(_, e):
    return JSONResponse({"error": str(e)}, status_code=500)
