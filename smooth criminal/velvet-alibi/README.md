# Velvet Alibi: a 30 second painted club scene

A moving oil painting with its own soundtrack, built as a test of turning a *reference video* into a new scene
with the painted-animation engine (see `../../moon-dancer` and petergpt/painted-rickroll, MIT).
Everything is drawn in code and the music is synthesised live in WebAudio: no images, no samples.

**Reference.** A 1988 music-video staging: a smoky 1930s speakeasy, blue windows, orange lamps, brick, a stair,
a lone man in a light suit and white fedora stepping into a floor spotlight, a line of dancers in dark suits and
hats, and a forward lean. Overlays, captions and logos were ignored on purpose.

**What is new here (nothing is copied from the reference).** The character is an original figure with the engine's
generic face; the music is an original score in G minor; the room, lighting, camera and choreography were written
from scratch and are only *inspired by* the staging: a cream suit and white hat, four dancers in charcoal, brown,
navy and plum, the walk into the light, a hat tip, a spin, a sideways glide, arms flung out in unison, a tap
sequence, and a lean that goes past the balance point.

## Timeline (112 BPM, 56 beats = 30.0 s)

| beats | what happens |
|---|---|
| 0-8 | wide shot: the lead waits in the smoke at the back, hat low; a flick of the brim |
| 8-16 | the walk out into the room; the follow-spot finds him at beat 14 |
| 16-24 | in the light: shoulder pop and a point, a hat tip, a full spin, up on his toes |
| 18-26 | four dancers march in from both sides and take up a V behind him |
| 24-32 | a sideways glide, left and back, the line swaying |
| 32-40 | hits on the even beats: arms flung out, the whole line together; a spin |
| 40-48 | low camera on the feet: taps and slides |
| 48-50 | full stop; hands go to the brims |
| 50-56 | the lean, held, then a snap up and a hat tip; fade to black |

## Files

`src/` is concatenated into one `index.html` by `node tools/build.mjs`. `60-figure.js` dresses everybody (suit,
shirt, tie, lapels, shoes, fedora), `40-dance.js` is the choreography (pure functions of the beat), `70-club.js` is
the room, `75-scenes.js` the camera and lights, `80-audio.js` the score, `90-main.js` the frame loop.
`python tools/render.py --w 1920 --h 1080` renders the MP4 frame by frame with the soundtrack.

Open `index.html` in Chrome (WebGL2); click to start with sound, `?autoplay` starts silently, `?t=12.5` shows one frame.
