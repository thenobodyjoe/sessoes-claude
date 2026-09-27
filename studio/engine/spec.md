# EditSpec v1

The single source of truth for one edit. The brain writes it; `gfx.js`, `comp.py` and `audio.py` execute it.
**All times are in SOURCE seconds.** The engine maps them to output time after `retime.drops`.
Every element has `t0` and `t1`, except where noted.

```jsonc
{
  "version": 1,
  "format": { "w": 1920, "h": 1080 },               // output size; 1080x1920 for vertical
  "style": {
    "ink": "#0E0F11", "paper": "#F2EFEA", "accent": "#FF5A1F",
    "serif": "Instrument Serif", "sans": "Inter Tight",
    "grade": "cinematic",                           // cinematic | clean | warm | mono
    "grain": 0.022, "vignette": 0.32
  },
  "retime": { "drops": [[10.21, 10.61]] },          // dead pauses to remove (source seconds)
  "camera": [                                       // hard cut between segments; the video's own cuts reset face-follow
    { "t0": 0, "t1": 5.95, "s0": 1.0, "s1": 1.08, "ease": "inout", "follow": false },
    { "t0": 5.95, "t1": 7.28, "s0": 1.24, "s1": 1.26, "ease": "linear", "follow": true }
  ],
  "shakes": [18.22],
  "fx": [
    { "type": "flashIn", "t0": 0, "t1": 0.6 },
    { "type": "desaturate", "t0": 17.06, "t1": 18.22, "amount": 0.7 },
    { "type": "glow", "t0": 29.6, "t1": 33.5, "color": "#FF8046", "amount": 0.34 },
    { "type": "endFade", "t0": 33.3, "t1": 34.2 }    // footage blurs/darkens under the end card
  ],
  "elements": [
    // giant word behind the presenter, 14% outline hint in front
    { "type": "bigWord", "t0": 0.08, "t1": 1.9, "text": "MASTERCLASS", "kicker": "WELCOME TO THE", "y": 0.3 },
    // stacked title in a side zone; lines reveal at their own times
    { "type": "titleStack", "t0": 1.76, "t1": 5.8, "side": "left", "kicker": "THE MASTERCLASS",
      "lines": [ { "text": "How to build a", "style": "sans", "at": 2.89 },
                 { "text": "Successful", "style": "serifItalicAccent", "at": 3.81, "underline": true },
                 { "text": "Coaching", "style": "serif", "at": 4.44 },
                 { "text": "Practice.", "style": "serif", "at": 4.81 } ] },
    { "type": "nameTitle", "t0": 7.28, "t1": 10.2, "name": "Eric Edmeades", "role": "YOUR HOST", "at": 7.62, "side": "left" },
    { "type": "sideWord", "t0": 12.1, "t1": 14.1, "side": "right", "kicker": "YOU'RE", "word": "curious", "sub": "or intrigued?", "subAt": 12.65 },
    { "type": "cards", "t0": 14.0, "t1": 17.1, "items": [
        { "label": "ALREADY COACHING", "text": "Growing your practice", "at": 14.41, "checkAt": 15.7, "side": "left" },
        { "label": "JUST GETTING STARTED", "text": "Starting one", "at": 16.33, "checkAt": 16.91, "side": "right" } ] },
    { "type": "splitWords", "t0": 18.22, "t1": 20.85, "left": "YOU", "leftAt": 18.91, "mid": "&", "midAt": 19.07, "right": "I", "rightAt": 19.16 },
    { "type": "bigLetters", "t0": 21.7, "t1": 23.4, "text": "HELP PEOPLE", "at": 21.72 },
    { "type": "graph", "t0": 23.46, "t1": 25.4 },
    { "type": "chips", "t0": 23.9, "t1": 25.4, "items": [ { "text": "Better results", "at": 23.96, "side": "left" },
                                                          { "text": "Better performance", "at": 24.54, "side": "right" } ] },
    { "type": "pills", "t0": 25.6, "t1": 29.5, "items": [ { "text": "Business", "icon": "business", "at": 25.67 },
                                                          { "text": "Health & Fitness", "icon": "health", "at": 26.84 } ] },
    { "type": "splitType", "t0": 32.3, "t1": 34.5, "kicker": "A BETTER", "left": "Quality", "leftAt": 32.35, "mid": "of", "midAt": 32.85, "right": "Life", "rightAt": 32.95 },
    { "type": "image", "t0": 5.0, "t1": 8.0, "src": "assets/logo.png", "mode": "pip", "side": "right", "note": "what the user asked" },
    { "type": "endCard", "t0": 33.4, "kicker": "MASTERCLASS", "pre": "How to build a", "title": "Successful Coaching Practice", "accentWords": 1, "sub": "with Eric Edmeades" }
  ],
  "captions": { "enabled": true, "hide": [[0, 5.22], [7.23, 10.6]], "accentWords": ["curious", "common"], "maxWords": 4 },
  "audio": {
    "voice": { "clean": true },
    "music": { "mode": "generated", "mood": "cinematic-warm", "level": "background", "file": null,
               "hits": [18.22, 32.95], "breakdown": [30.5, 32.95] },
    "sfx": [ { "t": 0.03, "kind": "boom" }, { "t": 17.06, "kind": "riser", "t1": 18.22 }, { "t": 1.66, "kind": "whoosh" },
             { "t": 15.7, "kind": "tick" }, { "t": 5.95, "kind": "thump" } ]
  }
}
```

## Element catalog

- **Positions.** `side` is `left`, `right` or `center`. `y` is a 0–1 fraction of the height, and defaults to head height.
- **Line styles** (`titleStack.lines[].style`): `sans`, `serif`, `serifItalic`, `serifItalicAccent`, `kicker`.
- **Pill icons:** `business`, `health`, `heart`, `family`, `star`, `money`, `chat`, `idea`.
- **Image modes:**
  - `fullscreen`: slow push-in;
  - `pip`: rounded card on the chosen side;
  - `behind`: fills the backdrop behind the presenter;
  - `polaroid`: tilted card with shadow.
- **SFX kinds:** `boom`, `riser`, `whoosh`, `tick`, `thump`, `pop`.
- **Music:**
  - `mode`: `generated`, `file` or `none`;
  - `level`: `background` (ducked under the voice) or `foreground` (full level; the voice still wins);
  - `hits`: moments where the downbeats must land.
- **Grades:**
  - `cinematic`: lifted blacks, cool shadows, warm highlights;
  - `clean`: neutral with a gentle contrast;
  - `warm`;
  - `mono`.
