"""Output timeline for a spec: which source frame each output frame shows, and its 'virtual source time'.

All spec times are source seconds. Output frame i shows source frame src[i] and is evaluated at tv[i]
(= that frame's source time; past the end of the source, time keeps running for the end card).
"""
import math


class Timeline:
    def __init__(self, spec, info):
        self.fps = info["fps"]
        n = info["frames"]
        drops = sorted((spec.get("retime") or {}).get("drops") or [])
        self.drops = [(a, b) for a, b in drops if b > a]
        keep = [f for f in range(n) if not any(a <= f / self.fps < b for a, b in self.drops)]
        self.src_end = n / self.fps
        tail = 0.0
        for e in spec.get("elements", []):
            if e.get("type") == "endCard":
                tail = max(tail, e["t0"] + 2.6 - self.src_end)
        tail = max(tail, 0.0)
        n_tail = math.ceil(tail * self.fps)
        self.src = keep + [keep[-1]] * n_tail
        self.tv = [f / self.fps for f in keep] + [self.src_end + (k + 1) / self.fps for k in range(n_tail)]
        self.n = len(self.src)
        self.duration = self.n / self.fps

    def out_time(self, t_src):
        """Source seconds -> output seconds (pauses removed)."""
        removed = sum(min(b, t_src) - a for a, b in self.drops if t_src > a)
        return t_src - removed

    def in_drop(self, t):
        return any(a <= t < b for a, b in self.drops)


def caption_groups(words, tl, max_words=4, gap=0.5):
    groups, cur = [], []
    for i, w in enumerate(words):
        if tl.in_drop(w["s"]):
            continue
        if cur and (len(cur) >= max_words or w["s"] - words[cur[-1]]["e"] > gap):
            groups.append(cur)
            cur = []
        cur.append(i)
        if w["w"][-1:] in ".?!,;:":
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups
