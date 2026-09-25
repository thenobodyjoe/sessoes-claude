# Lunar Nocturne: the painted moon dancer

A one-minute moving oil painting with its own soundtrack (30 bars at 112 BPM, ≈64 s, looping). Everything is
drawn in code and the music is synthesised live in WebAudio: no images, no samples, no libraries.

It is a re-skin of [petergpt/painted-rickroll](https://github.com/petergpt/painted-rickroll) (MIT, see `LICENSE`):
the engine (clock, skeleton rig, brush strokes, impasto lighting, camera, physics, scene sequencer, audio desk and
the beat-locked `HITS` list) is kept; the character, moves, worlds and score are new.

## What is different from the original

| | original | this piece |
|---|---|---|
| character | a real person in a trench coat | an original astronaut: long white space-coat, orange lining, retro cap with goggles, ear pods and a wobbling antenna |
| prop | microphone + cable | brass star-lantern that pulses on the beat, on an orange tether hose |
| moves | two-step, snaps, arm rolls | added **moon bounce** (low-gravity jumps, hang time), **moonwalk**, **robot**; two-step, spin, shimmy, lasso and points are kept |
| worlds | river, brick arch, pop art, theatre, starry night, gallery | lunar sea with Earth rising, station airlock, pop art, indigo-velvet theatre, starry night, gallery |
| final gag | a defaced label | the label "Lunar Nocturne" is struck through and reads "(moonwalk, actually)" |
| score | B-flat, then C | D minor, then a tone up to E minor, ending on E major; new hook, chorus, bass, chords |

## Watch it

Open `index.html` in a recent Chrome, Safari or Firefox (WebGL2). Click (or Space/Enter) to start with sound,
`M` mutes, double-click is fullscreen, `?autoplay` skips the title card, `?t=12.5` renders one frame.

## Build

```
node tools/build.mjs      # src/*.js + src/template.html -> index.html
```

## Render to MP4

```
python tools/render.py                        # 1280x720, 30 fps
python tools/render.py --w 1920 --h 1080      # full HD (about 15 minutes)
```

The piece is a pure function of time, so `render.py` steps headless Chrome through it frame by frame, pipes the
frames to ffmpeg, renders the soundtrack offline through the same audio desk and muxes it underneath.

## Debug hooks

`window.__rick.sheet([t...], cols, scale)` (contact sheet), `.zoom(t, x0, y0, x1, y1)`, `.unsheet()`,
`.audio(b0, b1)` (loudness per bar), `.audioWav(sr, peakDb)` (whole score as base64 WAV).
