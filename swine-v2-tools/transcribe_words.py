import sys, json, os, wave, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8", download_root=os.path.expanduser("~/Library/Application Support/ANIMUSCULT Visualizer/models"))
for wav in sys.argv[1:]:
    w = wave.open(wav); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)/32768.0
    segs, _ = m.transcribe(a, language="en", vad_filter=True, word_timestamps=True, beam_size=5,
        initial_prompt="Pazuzu, La Boux, Barbelo, Mesmer, golem, poppet, Blood Moon, Chosen One, Worm, His Majesty.")
    words = [{"s": round(x.start,2), "e": round(x.end,2), "w": x.word} for s in segs for x in (s.words or [])]
    json.dump(words, open(wav.replace("/audio/","/subs/").replace(".wav","_words.json"),"w"))
    print(os.path.basename(wav), len(words), flush=True)
