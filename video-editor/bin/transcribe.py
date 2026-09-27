#!/usr/bin/env python3
"""Transcribe with word timings (Parakeet v3, 25 languages incl. pt/en) and, for English,
refine boundaries with pocketsphinx forced alignment (10 ms resolution).

usage: transcribe.py SRC [--out DIR] [--lang en|pt|...] [--text corrected.txt] [--pron WORD="PH ON ES"]

--text   a corrected transcript (fix names/mishearings); its words get the recognized timings.
--pron   pronunciation for words missing from the English dictionary (CMU phones), e.g.
         --pron edmeades="EH D M IY D Z"; words without one are interpolated.
writes DIR/transcript.txt, DIR/words.json ([[key, start, end], ...]), DIR/words_display.json, DIR/captions.srt
"""
import argparse
import difflib
import json
import os
import re
import subprocess
import wave

import numpy as np

SR = 16000
MODEL = os.path.join(os.environ.get("VE_CACHE", os.path.expanduser("~/.cache/video-editor")),
                     "models", "sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8")


def key_of(w):
    return re.sub(r"[^\w']+", "", w.lower()).strip("'")


def load_audio(src, out):
    wav = os.path.join(out, "audio16k.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", str(SR), wav], check=True)
    w = wave.open(wav)
    return wav, np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


def chunks(a, max_len=24.0):
    """Split at the quietest 20 ms frame in the last third of each window."""
    hop = int(0.02 * SR)
    e = np.sqrt(np.convolve(a ** 2, np.ones(hop) / hop, "same"))[::hop]
    out, s = [], 0
    n = len(a)
    while n - s > max_len * SR:
        lo, hi = (s + int(max_len * SR * 0.6)) // hop, (s + int(max_len * SR)) // hop
        cut = (lo + int(np.argmin(e[lo:hi]))) * hop
        out.append((s, cut))
        s = cut
    out.append((s, n))
    return out


def recognize(a):
    import sherpa_onnx
    r = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=f"{MODEL}/encoder.int8.onnx", decoder=f"{MODEL}/decoder.int8.onnx",
        joiner=f"{MODEL}/joiner.int8.onnx", tokens=f"{MODEL}/tokens.txt",
        model_type="nemo_transducer", num_threads=os.cpu_count() or 4)
    words = []
    for s, e in chunks(a):
        st = r.create_stream()
        st.accept_waveform(SR, a[s:e])
        r.decode_stream(st)
        off = s / SR
        for tok, ts in zip(st.result.tokens, st.result.timestamps):
            if tok.startswith(" ") or not words:
                words.append({"w": tok.strip(), "s": off + ts})
            elif re.fullmatch(r"[^\w]+", tok):
                words[-1]["w"] += tok
            else:
                words[-1]["w"] += tok
    words = [w for w in words if key_of(w["w"])]
    for i, w in enumerate(words):
        nxt = words[i + 1]["s"] if i + 1 < len(words) else w["s"] + 0.6
        w["e"] = min(nxt, w["s"] + 1.2)
    return words


def apply_text(words, text):
    """Give a corrected transcript the recognized timings (matched words keep theirs, others interpolate)."""
    toks = text.split()
    a, b = [key_of(w["w"]) for w in words], [key_of(t) for t in toks]
    out = [{"w": t, "s": None, "e": None} for t in toks]
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            out[blk.b + k]["s"], out[blk.b + k]["e"] = words[blk.a + k]["s"], words[blk.a + k]["e"]
    return interpolate(out)


def interpolate(ws):
    known = [i for i, w in enumerate(ws) if w["s"] is not None]
    if not known:
        raise SystemExit("no timings to interpolate from")
    for i, w in enumerate(ws):
        if w["s"] is not None:
            continue
        prev = max((k for k in known if k < i), default=None)
        nxt = min((k for k in known if k > i), default=None)
        t0 = ws[prev]["e"] if prev is not None else max(0.0, ws[nxt]["s"] - 0.3 * (nxt - i))
        t1 = ws[nxt]["s"] if nxt is not None else t0 + 0.3 * (i - prev)
        gap_lo = prev if prev is not None else i - 1
        gap_hi = nxt if nxt is not None else i + 1
        n = gap_hi - gap_lo - 1
        u0, u1 = (i - gap_lo - 1) / n, (i - gap_lo) / n
        w["s"], w["e"] = t0 + (t1 - t0) * u0, t0 + (t1 - t0) * u1
    return ws


def force_align_en(wav, ws, prons):
    from pocketsphinx import Decoder
    d = Decoder(samprate=SR, bestpath=False)
    for word, ph in prons.items():
        d.add_word(word, ph, True)
    keys = [key_of(w["w"]) for w in ws]
    usable = [i for i, k in enumerate(keys) if d.lookup_word(k) is not None]
    d.set_align_text(" ".join(keys[i] for i in usable))
    data = wave.open(wav).readframes(10 ** 9)
    d.start_utt()
    d.process_raw(data, full_utt=True)
    d.end_utt()
    segs = [s for s in d.seg() if s.word not in ("<s>", "</s>", "<sil>") and not s.word.startswith("[")]
    if len(segs) != len(usable):
        print(f"alignment mismatch ({len(segs)} vs {len(usable)}), keeping recognizer timings")
        return ws
    out = [{"w": w["w"], "s": None, "e": None} for w in ws]
    for i, s in zip(usable, segs):
        out[i]["s"], out[i]["e"] = s.start_frame / 100, s.end_frame / 100 + 0.01
    missing = [ws[i]["w"] for i in range(len(ws)) if i not in set(usable)]
    if missing:
        print("not in dictionary (interpolated; pass --pron to fix):", missing)
    return interpolate(out)


def srt(ws, path, max_words=6):
    def ts(t):
        ms = int(round(t * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    groups, cur = [], []
    for w in ws:
        cur.append(w)
        if len(cur) >= max_words or w["w"][-1] in ".,?!;:":
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    with open(path, "w") as f:
        for k, g in enumerate(groups, 1):
            f.write(f"{k}\n{ts(g[0]['s'])} --> {ts(g[-1]['e'])}\n{' '.join(w['w'] for w in g)}\n\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out", default="work")
    ap.add_argument("--lang", default="en", help="en enables pocketsphinx boundary refinement")
    ap.add_argument("--text", help="corrected transcript file")
    ap.add_argument("--pron", action="append", default=[], help='word="PH ON ES" (English only)')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    wav, a = load_audio(args.src, args.out)
    ws = recognize(a)
    open(os.path.join(args.out, "transcript_raw.txt"), "w").write(" ".join(w["w"] for w in ws) + "\n")
    if args.text:
        ws = apply_text(ws, open(args.text).read())
    if args.lang == "en":
        prons = dict(p.split("=", 1) for p in args.pron)
        ws = force_align_en(wav, ws, {k.lower(): v.strip('"') for k, v in prons.items()})
    for w in ws:
        w["s"], w["e"], w["key"] = round(w["s"], 3), round(w["e"], 3), key_of(w["w"])
    text = " ".join(w["w"] for w in ws)
    open(os.path.join(args.out, "transcript.txt"), "w").write(text + "\n")
    json.dump([[w["key"], w["s"], w["e"]] for w in ws], open(os.path.join(args.out, "words.json"), "w"))
    json.dump(ws, open(os.path.join(args.out, "words_display.json"), "w"), ensure_ascii=False, indent=0)
    srt(ws, os.path.join(args.out, "captions.srt"))
    print(text)
    print(f"{len(ws)} words -> {args.out}/words.json")


if __name__ == "__main__":
    main()
