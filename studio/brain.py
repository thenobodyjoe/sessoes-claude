"""The editor's brain: turns the user's global prompt + timeline intents into
(1) a briefing (plan + checklist of ambiguities) and (2) an EditSpec for the engine.

Backends (STUDIO_BRAIN):
  cli  (default) - the local `claude` CLI, already logged in on this machine (personal use)
  api            - Anthropic API via the official SDK (ANTHROPIC_API_KEY); required for a public product
"""
import base64
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.environ.get("STUDIO_MODEL", "claude-opus-5-5")
BACKEND = os.environ.get("STUDIO_BRAIN", "cli")
SPEC_DOC = open(os.path.join(HERE, "engine", "spec.md")).read()

SYSTEM = """You are the creative director and senior motion designer of Studio, an intent-driven video editor.
The user describes what they want (a global direction and/or instructions attached to time ranges); you turn it
into a premium, elegant edit — the level of a top motion designer: restrained palette, one accent color, editorial
typography (serif italic for the emotional word, tight sans for everything else), expo-out motion, text placed in the
free space beside the presenter or giant behind them, karaoke captions, cut-synced punch-ins, a considered score.
Rules:
- A time-range instruction always wins over the global direction for that range.
- Anchor every element on real word times from the transcript (source seconds).
- Never invent facts about the person (names, titles, numbers); if needed and unknown, ask in the checklist.
- Write everything user-facing in the user's language (the language of their instructions; default Brazilian Portuguese).
- Letterings on screen use the language the user chose (ask if unclear)."""


def _phrases(words, max_gap=0.35, max_len=7):
    """Compact transcript: one line per phrase with the start time of every word."""
    out, cur = [], []
    for w in words:
        if cur and (w["s"] - cur[-1]["e"] > max_gap or len(cur) >= max_len):
            out.append(cur)
            cur = []
        cur.append(w)
    if cur:
        out.append(cur)
    return "\n".join(f"[{p[0]['s']:.2f}-{p[-1]['e']:.2f}] " + " ".join(f"{w['w']}@{w['s']:.2f}" for w in p) for p in out)


def _context(proj, d, with_answers=False):
    info = proj.get("info", {})
    intents = sorted(proj.get("intents", []), key=lambda i: i["t0"])
    lines = [
        f"VIDEO: {info.get('width')}x{info.get('height')}, {info.get('duration', 0):.2f}s, {info.get('fps', 30):.3f} fps.",
        f"Camera cuts already in the footage (frame numbers): {info.get('shot_starts')}.",
        f"Loudness: {info.get('loudness')}.",
        "FRAMING (subject extent per row band, per shot — free space is where text can live):",
        proj.get("framing", "")[-2500:],
        "TRANSCRIPT (word@start, source seconds):",
        _phrases(proj.get("words", [])),
        "GLOBAL DIRECTION FROM THE USER:",
        proj.get("global_prompt") or "(none)",
        "TIME-RANGE INSTRUCTIONS:",
    ]
    for it in intents:
        lines.append(f"- id={it['id']} [{it['t0']:.2f}-{it['t1']:.2f}] kind={it['kind']} text={it.get('text')!r} options={json.dumps(it.get('options', {}), ensure_ascii=False)}")
    if not intents:
        lines.append("(none)")
    if with_answers:
        b = proj.get("briefing", {})
        lines += ["APPROVED BRIEFING PLAN:", json.dumps(b.get("plan", []), ensure_ascii=False),
                  "USER DECISIONS ON THE CHECKLIST:"]
        for q in b.get("questions", []):
            lines.append(f"- {q['question']} -> {proj.get('answers', {}).get(q['id'], '(unanswered)')}")
    return "\n".join(lines)


def _images(d):
    p = os.path.join(d, "work", "contact.jpg")
    return [p] if os.path.exists(p) else []


def _ask(prompt, images, max_tokens=32000, schema=None):
    if BACKEND == "api":
        return _ask_api(prompt, images, max_tokens, schema)
    return _ask_cli(prompt, images, schema)


def _ask_api(prompt, images, max_tokens, schema):
    import anthropic
    client = anthropic.Anthropic()
    content = []
    for p in images:
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                                     "data": base64.b64encode(open(p, "rb").read()).decode()}})
    content.append({"type": "text", "text": prompt})
    kw = {"output_config": {"effort": "high"}}
    if schema:
        kw["output_config"]["format"] = {"type": "json_schema", "schema": schema}
    with client.messages.stream(model=MODEL, max_tokens=max_tokens, system=SYSTEM,
                                messages=[{"role": "user", "content": content}], **kw) as stream:
        msg = stream.get_final_message()
    if msg.stop_reason == "refusal":
        raise RuntimeError("O modelo recusou este pedido.")
    if msg.stop_reason == "max_tokens":
        raise RuntimeError("A resposta do modelo foi cortada (max_tokens).")
    return next(b.text for b in msg.content if b.type == "text")


def _ask_cli(prompt, images, schema):
    full = SYSTEM + "\n\n" + prompt
    if images:
        full += "\n\nReference frames of the video (contact sheet, read it): " + ", ".join(images)
    if schema:
        full += "\n\nReply with ONLY a JSON object matching this JSON Schema, no prose, no code fences:\n" + json.dumps(schema)
    cmd = ["claude", "-p", "--model", MODEL, "--output-format", "json", "--allowedTools", "Read"]
    r = subprocess.run(cmd, input=full, capture_output=True, text=True, timeout=1800)
    if r.returncode:
        raise RuntimeError("claude CLI falhou: " + (r.stderr or r.stdout)[-800:])
    out = json.loads(r.stdout)
    if out.get("is_error"):
        raise RuntimeError("claude CLI: " + str(out.get("result"))[-800:])
    return out["result"]


def _json(text):
    text = text.strip()
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise RuntimeError("Resposta sem JSON: " + text[:300])
    return json.loads(m.group(0))


BRIEF_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "plan": {"type": "array", "items": {"type": "object", "properties": {
            "t0": {"type": ["number", "null"]}, "t1": {"type": ["number", "null"]},
            "title": {"type": "string"}, "detail": {"type": "string"}},
            "required": ["t0", "t1", "title", "detail"], "additionalProperties": False}},
        "questions": {"type": "array", "items": {"type": "object", "properties": {
            "id": {"type": "string"}, "question": {"type": "string"}, "why": {"type": "string"},
            "options": {"type": "array", "items": {"type": "string"}}},
            "required": ["id", "question", "why", "options"], "additionalProperties": False}},
    },
    "required": ["title", "summary", "plan", "questions"],
    "additionalProperties": False,
}


def briefing(proj, d):
    prompt = _context(proj, d) + """

TASK: write the briefing the user will approve before anything is rendered.
- "title": a short, confident headline for this edit.
- "summary": 1-2 sentences on the overall concept and look.
- "plan": 5-12 beats in time order (use null t0/t1 for global items such as grade, captions, music), each with a
  short title and a one-sentence concrete description (what appears, how it moves, what it sounds like).
  Make it feel premium and intentional; honor every time-range instruction explicitly.
- "questions": ONLY the genuinely ambiguous decisions (0-6), e.g. presenter name/title if a name title is planned
  and unknown, language of letterings, music level, how an image should be used when the user left it open,
  conflicting instructions. Each with 2-4 short options, the recommended one first. Ask nothing you can decide well
  yourself. ids are short slugs."""
    b = _json(_ask(prompt, _images(d), 16000, BRIEF_SCHEMA))
    for i, q in enumerate(b.get("questions", [])):
        q["id"] = re.sub(r"[^\w-]", "", q.get("id") or f"q{i}") or f"q{i}"
    return b


def spec(proj, d):
    assets = sorted(os.listdir(os.path.join(d, "assets"))) if os.path.isdir(os.path.join(d, "assets")) else []
    prompt = _context(proj, d, with_answers=True) + f"""

AVAILABLE ASSET FILES (reference as "assets/<name>"): {assets or '(none)'}

EDITSPEC FORMAT (follow exactly; only the listed element types exist):
{SPEC_DOC}

TASK: produce the final EditSpec JSON for this video, implementing the approved plan and the user's decisions.
- Times in SOURCE seconds, aligned to word starts. Keep elements from overlapping in the same screen zone.
- Use the framing report: side text only where the subject leaves room; giant words behind at head height.
- Captions hidden while a big lettering already says the line. Music level per the user's choice.
- retime.drops only for clear dead pauses > 0.45 s (keep 0.12 s of air), and hide each jump with a camera cut.
- Output ONLY the JSON object."""
    s = _json(_ask(prompt, _images(d), 64000))
    s.setdefault("version", 1)
    return s
