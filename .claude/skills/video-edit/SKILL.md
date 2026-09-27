---
name: video-edit
description: Code-driven professional video editing and motion design, done end to end inside this cloud container (no Premiere/After Effects) — talking heads, reels, ads, interviews. Use whenever the user sends/attaches a video and asks to edit it, write an edit script/roteiro, add letterings, kinetic typography, text behind the subject, captions/legendas, punch-ins/zooms, color grade, soundtrack/trilha, SFX, or to re-cut/re-export one. Covers setup, analysis, transcription (pt/en + 23 languages), the approval-first workflow, the rendering pipeline, QC and delivery.
---

# Video edit (motion designer pipeline)

Everything here was proven on `talking-head-edit/` (a 33 s talking head → 35 s finished edit). Reuse it; do not re-discover it.

## 0. Setup (seconds if already done)

```bash
bash video-editor/setup.sh      # idempotent; the SessionStart hook normally already ran it
```
Installs/verifies ffmpeg, `mediapipe==0.10.14` (pinned: last wheel that bundles the segmentation + face models), opencv-contrib, scipy, sherpa-onnx, pocketsphinx, Playwright, and the Parakeet v3 ASR model into `~/.cache/video-editor/models`.

Network facts for this container: HuggingFace, openaipublic, alphacephei are **blocked**. GitHub release downloads, PyPI, npm (`@fontsource/*` fonts) **work**. Uploaded files arrive under `/root/.claude/uploads/<session>/`.

## 1. Workflow — approval first

The user decides after reading a script. **Do not start producing before the script is approved** (a previous user interrupted exactly that: "me escreva isso… se eu ver que ficou bom, você vai editar").

1. **Probe** — `$VE_PY video-editor/bin/probe.py SRC --out <proj>/work` → `info.json` (fps, cuts, silences, loudness) + `contact.jpg` / `cuts.jpg`. **Read the jpgs** to see framing, wardrobe, background, negative space.
2. **Transcribe** — `$VE_PY video-editor/bin/transcribe.py SRC --out <proj>/work --lang en|pt`. English gets 10 ms pocketsphinx boundaries; names missing from the dictionary need `--pron name="CMU PHONES"`. Fix mishearings by writing the corrected text to a file and re-running with `--text fixed.txt` (timings are transferred; verified to reproduce the hand-tuned edit exactly).
3. **Write the script (roteiro)** in the user's language, in chat: material summary, art direction (type pair, palette, motion rules), a beat-by-beat timeline anchored on real word times and cuts, captions, sound design, deliverables, how you'll execute + honest limits, and a short list of **decisions to confirm** (presenter name/title, language of letterings, format 16:9 / 9:16, music: theirs or generated). Then stop and wait.
4. After approval: **scaffold** `$VE_PY video-editor/bin/new_project.py <proj> --src SRC`, copy `work/words.json` into `<proj>/`, then adapt:
   - `config.py`: `N_SRC`, `SHOT_STARTS` (from `info.json`), `DROP` (dead pauses to remove; hide the jump with a punch-in), `DISPLAY` (display transcript with `/` caption-group breaks — token count must equal `words.json`), `ACCENT_WORDS`, `CAMERA` segments, `SHAKES`, `END_CARD`.
   - `graphics/gfx.js`: rewrite the scene functions (keep the primitives, `renderFrame`, captions). Use `wt(key, n, edge)` — n counts occurrences of that exact word.
   - `audio.py`: chords/tempo; the grid is solved so two chosen hits land on beats.
5. **Analyze** — `python3 <proj>/analyze.py` (or `video-editor/bin/analyze.py SRC --out <proj>/work` for the free-space report: subject x-extent per row band per shot — lay text where it's free).
6. **Iterate on stills** — `node <proj>/render_gfx.mjs 30,120,560` then `python3 <proj>/comp.py 30,120,560` → `work/preview/*.jpg`; tile them with ffmpeg and **look**. Fix, repeat. Cheap.
7. **Full render** — `node render_gfx.mjs` (~3 min) → `python3 audio.py` (~10 s) → `python3 comp.py` (~8 min for 1000 frames 1080p; run in background if > 10 min timeout risk).
8. **QC** — contact sheet at 2 fps of the final, 1:1 crops of matte edges (hair) under behind-text, loudness (`ebur128`: target −14 LUFS / −1 dBTP), spectrogram of the music stem. You cannot listen: say so and verify by measurement.
9. **Deliver** — `$VE_PY video-editor/bin/deliver.py work/video.mp4 work/mix.wav --out <scratchpad> --name X` → `X_master.mp4` + `X_preview.mp4` (< 29 MiB; the in-chat file limit is **30 MiB**). Send the preview with SendUserFile (`display: render`). Commit code, never media (`work/` is gitignored).

## 2. Pipeline architecture (`talking-head-edit/`)

- `analyze.py` — per frame: MediaPipe selfie matte (stored 480×270) + face box.
- `graphics/gfx.js` + `render_gfx.mjs` — Canvas 2D in headless Chromium, one transparent PNG per frame per layer: **behind** (between backdrop and presenter) and **front**. 5 sub-frames averaged with `lighter` = 180° shutter motion blur. Empty frames are skipped.
- `comp.py` — camera (scale/center per segment, face-follow with Gaussian-smoothed track, clamp to frame, decaying-sine shake) applied to plate **and** matte; LUT grade; matte upsampled + `cv2.ximgproc.guidedFilter` (radius 8, eps 1e-3) → crisp hair; `comp = over(plate, behind); comp = lerp(comp, plate, matte); over(front)`; bloom, vignette, grain; fades. Pipes rgb24 to libx264 (`-crf 17 -tune film -x264-params aq-mode=3`).
- `audio.py` — voice: 12 ms crossfaded retime, `highpass 85 / afftdn / EQ −2 dB@250, +2.5 dB@3.8k / compressor / deesser / limiter`; score: numpy synthesis (detuned-saw pads, FM keys, sub, kick/clap/hat, synthetic-IR reverb); SFX: booms, riser, whooshes, ticks, thumps at cue times; duck music −6 dB under voice; two-pass `loudnorm` to −14 LUFS / −1 dBTP.

## 3. House style (what read as "3k motion designer")

- Type pair: **Instrument Serif** (italic for the emotional word) + **Inter Tight** (600 small caps kickers with wide tracking, 800 for giant words). Fonts are in `talking-head-edit/graphics/fonts`; more via `npm pack @fontsource/<name>`.
- Palette: ink `#0E0F11`, paper `#F2EFEA`, one accent `#FF5A1F` used only on key words.
- Motion: expo-out entrances (0.5–0.7 s), cubic-in exits, "slot" reveals (text rising out of a clip box), per-letter stagger 25–30 ms, back-out pops only for small UI (checks, chips, "?", "&").
- Signature: giant word **behind** the presenter at head height; a 14 % outline copy in front hints the occluded letters (higher looks like text on the face). Side text goes in the free zones beside the head (above the shoulders the zones are huge; below them they shrink).
- UI inserts: dark translucent cards/pills with 1.5 px hairline, accent icon discs, paper chips for stats. Keep items alive across a cut for continuity.
- Camera: slow push-ins (1.00→1.08) inside shots; cut-synced punch-ins to 1.12–1.25 on emphasis words; punch back out when a title needs room. Impact shake only on the 2–3 biggest beats.
- Captions: karaoke word-by-word (spoken 100 %, upcoming 42 %), accent color for accent words, **hidden** whenever a big lettering already says the line (titles, name, end card).
- Beats: desaturate + slow zoom + riser on a dramatic pause, hard cut on the riser peak; warm backdrop glow for the emotional close; end card over blurred, darkened last frame.

## 4. Gotchas already paid for

- ffmpeg `-ss` to the last 1–2 frames returns nothing → `read_src_at` steps back.
- Canvas `letterSpacing` adds trailing space → `measure()` subtracts it.
- `wt('and', 3)` means the 3rd "and" in the whole transcript — recount when the text changes.
- Grain explodes bitrate (CRF 14 → 47 Mbps). Use CRF 17 + `tune film` for masters, capped CRF for previews.
- `deliver.py` avoids 2-pass (x264 "slice=P but 2pass stats say B" mismatch).
- Chunking changes ASR output slightly; always review `transcript.txt` and use `--text` for the final.
- Higgsfield Bridge (AE/Premiere) exists but check `get_host_status` — it was not connected; the code pipeline doesn't need it.
- Vertical 9:16: set `W, H` in `config.py` and the canvas size in `graphics/index.html`, use face-follow on every segment, redesign layouts (don't just crop).
