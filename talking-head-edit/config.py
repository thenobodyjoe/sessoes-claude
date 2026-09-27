"""Shared edit decisions: source, retime, word timings, captions, camera."""
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "work")
SRC = os.environ.get(
    "SRC_VIDEO",
    "/root/.claude/uploads/ef3bdf07-4ffa-5e3e-845d-0842c25078e5/646ed4c3-Talking_Head_Sample.mp4",
)
W, H = 1920, 1080
FPS_NUM, FPS_DEN = 30000, 1001
FPS = FPS_NUM / FPS_DEN
N_SRC = 1003
# First frame of each camera shot already present in the source.
SHOT_STARTS = [0, 546, 625, 789, 886]
# Dead pause after "here's why I'm excited" (10.21s-10.61s) is removed.
DROP = range(306, 318)
DROP_SEC = len(DROP) / FPS
END_CARD = 2.2  # seconds held after the last source frame

src_frames = [f for f in range(N_SRC) if f not in DROP]
N_OUT = len(src_frames) + round(END_CARD * FPS)


def ft(i):
    return i / FPS


def out_to_src_frame(i):
    return src_frames[min(i, len(src_frames) - 1)]


def src_to_out_time(t):
    return t - DROP_SEC if t >= DROP.start / FPS else t


DISPLAY = (
    "Welcome to the MasterClass. / This MasterClass is all about / how to build a successful / "
    "coaching practice, / and I'm really excited / to be sharing it with you. / "
    "My name is Eric Edmeades, / I'll be your host, / and here's why I'm excited. / "
    "Because if you're here / right now, it means / that you're curious / or intrigued about either / "
    "growing your existing / coaching practice / or starting one, / and that tells me something. / "
    "It tells me that / you and I have / something in common, / and that is that / "
    "you like to help people. / That you want to / help people have / better results, / "
    "better performance, / maybe in their business, / maybe in their health and fitness, / "
    "maybe in their relationship / or in their parenting style. / Ultimately, what you want to do / "
    "is help people have / a better quality of life."
)
ACCENT_WORDS = {"curious", "intrigued", "common", "results", "performance"}


def build_words():
    aligned = json.load(open(os.path.join(HERE, "words.json")))
    groups = [g.split() for g in DISPLAY.split(" / ")]
    tokens = [t for g in groups for t in g]
    assert len(tokens) == len(aligned), (len(tokens), len(aligned))
    words, k = [], 0
    caps = []
    for g in groups:
        idx = []
        for tok in g:
            a = aligned[k]
            clean = tok.strip(".,")
            words.append({
                "w": clean,
                "key": a[0],
                "s": round(src_to_out_time(a[1]), 3),
                "e": round(src_to_out_time(a[2]), 3),
                "accent": clean.lower() in ACCENT_WORDS,
            })
            idx.append(k)
            k += 1
        caps.append(idx)
    return words, caps


WORDS, CAPTION_GROUPS = build_words()


def wt(key, n=1, edge="s"):
    """Output-time of the n-th occurrence of aligned word `key`."""
    c = 0
    for w in WORDS:
        if w["key"] == key:
            c += 1
            if c == n:
                return w[edge]
    raise KeyError(key)


CUTS_OUT = [round(src_to_out_time(ft(f)), 3) for f in SHOT_STARTS]
T_LIFE_END = wt("life", edge="e")
T_SRC_END = ft(len(src_frames))
DURATION = ft(N_OUT)

# Camera: (t_start, t_end, scale_from, scale_to, ease, face_follow)
# Segments are hard cuts on their start time.
CAMERA = [
    (0.00, wt("excited", 1), 1.00, 1.08, "inout", False),
    (wt("excited", 1), wt("my"), 1.24, 1.26, "linear", True),
    (wt("my"), DROP.start / FPS, 1.00, 1.04, "linear", False),
    (DROP.start / FPS, wt("either"), 1.12, 1.15, "linear", True),
    (wt("either"), wt("and", 3), 1.00, 1.02, "linear", False),
    (wt("and", 3), CUTS_OUT[1], 1.02, 1.09, "inout", True),
    (CUTS_OUT[1], CUTS_OUT[2], 1.00, 1.04, "out", False),
    (CUTS_OUT[2], CUTS_OUT[3], 1.00, 1.05, "linear", False),
    (CUTS_OUT[3], CUTS_OUT[4], 1.00, 1.035, "linear", False),
    (CUTS_OUT[4], wt("life"), 1.00, 1.06, "in", False),
    (wt("life"), DURATION + 1, 1.06, 1.12, "out", False),
]
SHAKES = [CUTS_OUT[1], wt("life")]  # short impact shakes


def timeline_json():
    return {
        "fps": FPS,
        "nOut": N_OUT,
        "duration": DURATION,
        "cuts": CUTS_OUT,
        "srcEnd": T_SRC_END,
        "words": WORDS,
        "captions": CAPTION_GROUPS,
    }


if __name__ == "__main__":
    os.makedirs(WORK, exist_ok=True)
    with open(os.path.join(HERE, "graphics", "timeline.js"), "w") as f:
        f.write("window.TL = " + json.dumps(timeline_json()) + ";\n")
    print("out frames", N_OUT, "duration", round(DURATION, 2), "cuts", CUTS_OUT)
