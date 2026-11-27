#!/usr/bin/env python3
"""SWINE v2 vertical render: full-bleed crop, cold-open hook, big re-captions, end card."""
import json, subprocess, sys, os, re
HOME = os.path.expanduser("~")
SRC = f"{HOME}/Desktop/SWINE episodes/horizontal/SWINE Part {{n}} of 8.mp4"
OUT = f"{HOME}/Desktop/SWINE episodes/vertical v2"
WORK = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)

# part: (hook start sec in source, hook seconds, hook text)
HOOKS = {
    1: (56.0, 2.6, "DINNER IS STILL\\NBREATHING"),
    2: (9.0, 2.6, "THEY'RE FEASTING\\NON THE KING"),
    3: (40.0, 2.6, "THE DOLLS\\NWOKE THEM\\NAT MIDNIGHT"),
    4: (73.0, 2.6, "DON'T LOOK\\NINTO HIS EYES"),
    5: (36.0, 2.6, "HER MIRROR\\NSHOWED WHAT\\NSHE REALLY WAS"),
    6: (38.0, 2.6, "NEVER LIE\\NTO HER"),
    7: (32.0, 2.6, "SHE'S THE\\NCHOSEN ONE\\NNOW"),
    8: (52.0, 2.6, "THE FINAL\\NCOURSE"),
}

def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"

def clean(txt):
    txt = re.sub(r"\s+", " ", txt).strip().upper()
    # wrap to ~22 chars per line
    words, lines, cur = txt.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > 22 and cur:
            lines.append(cur); cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur: lines.append(cur)
    return "\\N".join(lines[:3])

FIX = [(r"\bPA[' ]?A?\s?ZUZU\b", "PAZUZU"), (r"\bPA'AZUZU\b", "PAZUZU"), (r"\bLA BOU\b", "LA BOUX"),
       (r"\bGOBLUM\b", "GOLEM"), (r"\bBARBELLO\b", "BARBELO"), (r"\bHAN PA\b", "HANPA"),
       (r"\bFOR HEAVENS\b", "OH HEAVENS"), (r"\bZDRAS,? TWEETIE\.?", ""), (r"\b12\b", "TWELVE"), (r"\bYOU'RE PRETTY\b", "YOUR PRETTY")]

def fix(t):
    t = t.upper()
    for a, b in FIX:
        t = re.sub(a, b, t)
    return re.sub(r"\s+", " ", t).strip()

def phrases(n):
    words = json.load(open(f"{WORK}/subs/p{n}_words.json"))
    out, cur = [], []
    for i, w in enumerate(words):
        if cur and (w["s"] - cur[-1]["e"] > 0.6 or len(cur) >= 6):
            out.append(cur); cur = []
        cur.append(w)
        if re.search(r"[.,?!;…]$", w["w"].strip()) and len(cur) >= 2:
            out.append(cur); cur = []
    if cur: out.append(cur)
    segs = []
    for i, p in enumerate(out):
        txt = fix("".join(x["w"] for x in p))
        if not txt: continue
        nxt = out[i+1][0]["s"] if i + 1 < len(out) else p[-1]["e"] + 1.0
        segs.append({"start": p[0]["s"], "end": min(p[-1]["e"] + 0.35, nxt), "text": txt})
    return segs

SHORT_KEEP = {5: [(0, 175.7)], 7: [(0, 161.58), (188.58, None)]}

def mapper(ranges):
    def f(t):
        off = 0.0
        for a, b in ranges:
            if a <= t < b: return off + (t - a)
            off += b - a
        return None
    return f

def build_ass(n, dur_main, hook_len, ranges=None, tag=""):
    segs = phrases(n)
    ranges = ranges or [(0, dur_main)]
    m = mapper(ranges)
    dur_main = sum(b - a for a, b in ranges)
    hs, hl, htxt = HOOKS[n]
    total = hook_len + dur_main
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hook,Georgia,82,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,2,0,1,6,4,8,60,60,330,1
Style: Cap,Georgia,62,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,1,0,1,5,2,2,70,70,560,1
Style: Tag,Georgia,40,&H40FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,6,0,1,3,0,8,60,60,210,1
Style: End,Georgia,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,3,0,1,6,4,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    # cold-open hook text with quick fade + slight pop
    ev.append(f"Dialogue: 2,{ts(0)},{ts(hook_len)},Hook,,0,0,0,,{{\\fad(80,150)\\t(0,250,\\fscx106\\fscy106)}}{htxt}")
    # small series tag for the whole video
    ev.append(f"Dialogue: 1,{ts(0)},{ts(total)},Tag,,0,0,0,,SWINE · PART {n} OF 8")
    # spoken lines during hook (from source time window)
    for s in segs:
        a, b = s["start"], s["end"]
        if b > hs and a < hs + hl:
            ev.append(f"Dialogue: 0,{ts(max(a,hs)-hs)},{ts(min(b,hs+hl)-hs)},Cap,,0,0,0,,{clean(s['text'])}")
    # main body captions, shifted by hook length
    for s in segs:
        ma = m(s["start"])
        if ma is None: continue
        a = ma + hook_len
        b = min(ma + (s["end"] - s["start"]), dur_main) + hook_len
        if b - a < 0.3: continue
        ev.append(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{clean(s['text'])}")
    end_txt = "PART " + str(n + 1) + "\\NTOMORROW" if n < 8 else "FULL FILM\\NON YOUTUBE"
    ev.append(f"Dialogue: 3,{ts(total-3.2)},{ts(total)},End,,0,0,0,,{{\\fad(200,0)}}{end_txt}")
    path = f"{WORK}/p{n}_v2{tag}.ass"
    open(path, "w").write(head + "\n".join(ev) + "\n")
    return path

def dur(p):
    return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p]).decode().strip())

def render(n, preview=False, short=False):
    src = SRC.format(n=n)
    hs, hl, _ = HOOKS[n]
    d = dur(src)
    ranges = [(a, b if b is not None else d) for a, b in SHORT_KEEP[n]] if short else [(0, d)]
    ass = build_ass(n, d, hl, ranges, "_short" if short else "")
    out = (f"{OUT}/SWINE Part {n} of 8 (YouTube Short).mp4" if short else f"{OUT}/SWINE Part {n} of 8.mp4") if not preview else f"{WORK}/preview_p{n}.mp4"
    vchain = ("crop=608:1080:656:0,scale=1080:1920:flags=lanczos,setsar=1,"
              "eq=contrast=1.06:saturation=1.08,"
              "drawbox=x=0:y=1660:w=1080:h=40:color=black@0.35:t=fill,"
              "drawbox=x=0:y=1690:w=1080:h=30:color=black@0.75:t=fill,"
              "drawbox=x=0:y=1720:w=1080:h=200:color=black@1.0:t=fill")
    k = len(ranges) + 1
    fc = (f"[0:v]setpts=PTS-STARTPTS,{vchain}[hv];"
          + f"[0:a]asetpts=PTS-STARTPTS,afade=t=out:st={hl-0.25}:d=0.25[ha];"
          + "".join(f"[{i+1}:v]setpts=PTS-STARTPTS,{vchain}[mv{i}];[{i+1}:a]asetpts=PTS-STARTPTS[ma{i}];" for i in range(len(ranges)))
          + "[hv][ha]" + "".join(f"[mv{i}][ma{i}]" for i in range(len(ranges))) + f"concat=n={k}:v=1:a=1[cv][ca];"
          + f"[cv]subtitles='{ass}'[v]")
    cmd = ["ffmpeg","-v","warning","-y","-ss",str(hs),"-t",str(hl),"-i",src]
    for ra, rb in ranges:
        cmd += ["-ss", str(ra), "-t", str(rb - ra), "-i", src]
    if preview:
        cmd += ["-t","40"]
    cmd += ["-filter_complex",fc,"-map","[v]","-map","[ca]",
            "-c:v","h264_videotoolbox","-b:v","9M","-maxrate","12M","-profile:v","high",
            "-c:a","aac","-b:a","192k","-movflags","+faststart","-r","24",out]
    subprocess.run(cmd, check=True)
    print("done", out, flush=True)

if __name__ == "__main__":
    preview = "--preview" in sys.argv
    short = "--short" in sys.argv
    parts = [int(a) for a in sys.argv[1:] if a.isdigit()]
    for n in parts:
        render(n, preview, short)
