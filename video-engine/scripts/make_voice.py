#!/usr/bin/env python3
"""Write the narration for one video, and lay it out on the video's own beats.

The design decision that matters: each line is synthesized *separately* and then
placed at the frame of the beat it belongs to. The alternative — synthesize a
paragraph, then run forced alignment to find where each word landed — needs
Whisper, needs a GPU to be quick, and is only ever an estimate of timing we
already know. Here the timing is exact by construction, because we chose it.

The script itself is generated from the config, not written by a model. The
numbers in it (how many trades, how many won, what break-even is) have to be the
ones on screen, and a model paraphrasing a statistic is exactly how a channel
ends up asserting something it cannot support.

Output is one WAV, silent except where a line speaks, so the renderer plays a
single asset from frame zero and cannot drift. Alongside it, a JSON of what is
said when, which drives the on-screen captions.

    python3 scripts/make_voice.py --config src/data/lesson_hammer.json
"""

import argparse
import json
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor" / "piper"
FPS = 60
RATE = 22050  # piper's output rate for the medium voices


def first_sentence(text: str, max_words: int = 14) -> str:
    """First sentence only, and hard-capped.

    Config text is written to be read on screen, where a long rule is fine. Read
    aloud the same sentence eats eight seconds of a thirty-five second video.
    """
    head = text.split(". ")[0].rstrip(".")
    words = head.split()
    if len(words) > max_words:
        head = " ".join(words[:max_words])
    # A question keeps its question mark. Appending a full stop to one gave
    # piper "Nen Bua hay Doji Chuon Chuon?." to read, which it renders as a
    # statement with a stumble at the end instead of a question.
    return head if head.endswith(("?", "!")) else head + "."


# Which voice model belongs to which track. Both can be installed side by side;
# setup_voice.py downloads them from Hugging Face by name.
VOICE_FOR = {"vi": "vi_", "en": "en_"}


def engine(locale: str = "en") -> tuple[Path, Path]:
    """The binary, and the voice model that matches the track being built.

    Model choice used to be "first .onnx in the folder, alphabetically", which
    was fine while exactly one was installed and silently wrong the moment a
    second was: `en_US-norman` sorts before `vi_VN-vais1000`, so a machine with
    both would have read the Vietnamese track in English. The track picks the
    voice now, and a missing one says which command installs it rather than
    quietly falling back to the wrong language.
    """
    exe = next((p for p in (VENDOR / "piper.exe", VENDOR / "piper") if p.exists()), None)
    models = sorted(VENDOR.glob("*.onnx"))
    prefix = VOICE_FOR.get(locale, "en_")
    model = next((m for m in models if m.name.startswith(prefix)), None)
    if not exe or not models:
        raise SystemExit(
            "Speech engine not installed. Run:  python3 scripts/setup_voice.py"
        )
    if not model:
        want = "vi_VN-vais1000-medium" if locale == "vi" else "en_US-norman-medium"
        raise SystemExit(
            f"No {locale} voice installed (found: "
            f"{', '.join(m.stem for m in models) or 'none'}).\n"
            f"Run:  python3 scripts/setup_voice.py --voice {want}"
        )
    return exe, model


# --- the script ------------------------------------------------------------
# Each entry is (beat frame, sentence). Beat frames mirror the storyboards in
# src/*/theme.ts; a line is spoken as its beat begins.

def candle_lines(cfg: dict) -> list[tuple[int, str]]:
    p = cfg["pattern"]
    name = p["name"].lower()
    st = cfg.get("stats")

    # Short sentences, on purpose. The first draft spoke the full rule text and
    # the full statistic and ran 44 seconds against a 35 second video — nearly
    # ten seconds would have been cut off mid-word. Short lines also simply work
    # better here: the chart is carrying the detail, and narration that talks
    # over its own diagram is worse than narration that points at it.
    lines = [
        (40, f"Everyone trades the {name}."),
        (520, first_sentence(p["tagline"])),
        (860, first_sentence(p["rule"])),
        (1390, "Entry at the close. Stop beyond the wick."),
    ]

    if st:
        break_even = round(100 / (1 + st["rewardRisk"]))
        # "Here, it works" is deliberately not spoken: the chart is visibly
        # reaching target at that moment, and narrating what the picture already
        # says is exactly the padding that pushed the real payoff off the end.
        # The payoff, split in two so the turn lands before the number does.
        # Break-even is deliberately not spoken: it is already on screen beside
        # the bar, and reading out every figure is what pushed this past the end
        # of the video in the first place.
        lines.append((1660, "But once is not evidence."))
        lines.append((1820, f"{st['settled']} tries. Only {st['wins']} won."))
    else:
        lines.append((1560, "Watch what happens next."))
        lines.append((1860, "The pattern is a trigger, not a system."))
    return lines


def quiz_lines(cfg: dict) -> list[tuple[int, str]]:
    pair = cfg.get("pair", "gold").replace("/", " ")
    won = "Buyers" if cfg.get("answer") == "BUY" else "Sellers"
    return [
        (40, f"{pair}. Buy, or sell?"),
        (560, "Support and resistance first."),
        (760, "An unfilled gap, and the order block beside it."),
        (960, "The golden pocket lines up with both."),
        (1215, "Three seconds. Pick a side."),
        (1415, f"{won} won."),
        (1900, "Valid setups still lose. That is the job."),
    ]


def lesson_lines(cfg: dict) -> list[tuple[int, str]]:
    pat = (cfg.get("pattern") or {}).get("name", "the structure")
    return [
        (40, "Most entries are too early."),
        (620, "Map the structure first."),
        (840, f"That is {pat}."),
        (1000, "The neckline is the trigger."),
        (1140, "The order block is the entry."),
        (1300, "Stop beyond the shoulder. Target the measured move."),
        (1890, "The formation gives the level. Confluence gives the timing."),
    ]


def map_lines(cfg: dict) -> list[tuple[int, str]]:
    bias = cfg.get("bias", "neutral")
    zones = ", ".join(z["label"] for z in cfg.get("zones", [])[:3])
    return [
        (40, f"{cfg.get('pair','Gold').replace('/',' ')}. Bias is {bias}."),
        (620, "This is the line price respects."),
        (800, f"Liquidity rests here. {zones}."),
        (1300, "Structure changed character here."),
        (1470, "So the plan runs like this. A plan, not a prediction."),
        (1880, "These are tomorrow's levels."),
    ]


def compare_lines(cfg: dict) -> list[tuple[int, str]]:
    """The comparison, spoken as the argument it is.

    Nothing is named before the measurement, exactly as on screen. Reading the
    two names out at the start would hand over the answer before the viewer has
    been given the chance to look, which is the whole point of the format.
    """
    left = cfg["left"]["name"]
    right = cfg["right"]["name"]
    return [
        (30, first_sentence(cfg["title"], 10)),
        (560, "Same shape. Same story, apparently."),
        (950, first_sentence(cfg["same"])),
        (1230, first_sentence(cfg["diff"])),
        (1620, f"On top, {left}. Below, {right}."),
        (1910, first_sentence(cfg["why"])),
    ]


# --- the Vietnam track -----------------------------------------------------
# Not a translation of the lines above. Vietnamese traders say "nen bua", not
# "the hammer candle", and a sentence built by translating English word order
# reads as a machine speaking — which is the one thing this track cannot sound
# like. Beats are the same because the storyboards are the same.

def vi_candle_lines(cfg: dict) -> list[tuple[int, str]]:
    p = cfg["pattern"]
    name = p["name"]
    st = cfg.get("stats")
    lines = [
        (40, f"Ai cũng vào lệnh theo {name}."),
        (520, first_sentence(p["tagline"])),
        (860, first_sentence(p["rule"])),
        (1390, "Vào lệnh ở giá đóng cửa. Dừng lỗ ngoài bóng nến."),
    ]
    if st:
        lines.append((1660, "Nhưng đúng một lần thì chưa là bằng chứng."))
        lines.append((1820, f"{st['settled']} lần thử. Chỉ {st['wins']} lần thắng."))
    else:
        lines.append((1560, "Xem tiếp cái gì xảy ra."))
        lines.append((1860, "Mẫu nến là cái cò súng, không phải cả hệ thống."))
    return lines


def vi_quiz_lines(cfg: dict) -> list[tuple[int, str]]:
    won = "Bên mua" if cfg.get("answer") == "BUY" else "Bên bán"
    return [
        (40, "Mua, hay bán?"),
        (560, "Kháng cự và hỗ trợ trước đã."),
        (760, "Một khoảng nhảy giá chưa lấp, và vùng lệnh ngay cạnh nó."),
        (960, "Vùng vàng trùng với cả hai."),
        (1215, "Ba giây. Chọn một bên."),
        (1415, f"{won} thắng."),
        (1900, "Setup đúng vẫn thua được. Đó là nghề."),
    ]


def vi_lesson_lines(cfg: dict) -> list[tuple[int, str]]:
    pat = (cfg.get("pattern") or {}).get("name", "cấu trúc này")
    return [
        (40, "Phần lớn lệnh vào quá sớm."),
        (620, "Vẽ cấu trúc ra trước."),
        (840, f"Đó là {pat}."),
        (1000, "Đường viền cổ là cái cò súng."),
        (1140, "Vùng lệnh là điểm vào."),
        (1300, "Dừng lỗ ngoài vai. Chốt lời theo chiều cao mô hình."),
        (1890, "Mô hình cho mức giá. Hợp lưu cho thời điểm."),
    ]


def vi_map_lines(cfg: dict) -> list[tuple[int, str]]:
    zones = ", ".join(z["label"] for z in cfg.get("zones", [])[:3])
    bias = {"bullish": "nghiêng mua", "bearish": "nghiêng bán"}.get(
        cfg.get("bias", ""), "chưa rõ hướng"
    )
    return [
        (40, f"Bản đồ hôm nay. Thiên hướng: {bias}."),
        (620, "Đây là đường mà giá tôn trọng."),
        (800, f"Thanh khoản nằm ở đây. {zones}."),
        (1300, "Cấu trúc đổi tính chất ở chỗ này."),
        (1470, "Nên kế hoạch chạy thế này. Kế hoạch, không phải lời tiên tri."),
        (1880, "Đây là các mức cho phiên tới."),
    ]


def vi_compare_lines(cfg: dict) -> list[tuple[int, str]]:
    left = cfg["left"]["name"]
    right = cfg["right"]["name"]
    return [
        (30, first_sentence(cfg["title"], 10)),
        (560, "Nhìn thì y hệt nhau."),
        (950, first_sentence(cfg["same"])),
        (1230, first_sentence(cfg["diff"])),
        (1620, f"Ở trên là {left}. Ở dưới là {right}."),
        (1910, first_sentence(cfg["why"])),
    ]


BUILDERS = {
    "candleLesson": candle_lines,
    "quiz": quiz_lines,
    "lesson": lesson_lines,
    "marketMap": map_lines,
    "candleCompare": compare_lines,
}

VI_BUILDERS = {
    "candleLesson": vi_candle_lines,
    "quiz": vi_quiz_lines,
    "lesson": vi_lesson_lines,
    "marketMap": vi_map_lines,
    "candleCompare": vi_compare_lines,
}


def kind_of(cfg: dict, override: str) -> str:
    if override:
        return override
    k = cfg.get("kind")
    if k in BUILDERS:
        return k
    return "lesson" if cfg.get("pattern") else "quiz"


# --- synthesis -------------------------------------------------------------

def speak(exe: Path, model: Path, text: str, out: Path) -> list[int]:
    subprocess.run(
        [str(exe), "--model", str(model), "--config", str(model) + ".json",
         "--output_file", str(out)],
        input=text.encode(), check=True, capture_output=True,
    )
    with wave.open(str(out), "rb") as w:
        if w.getframerate() != RATE:
            raise SystemExit(f"voice is {w.getframerate()} Hz, expected {RATE}")
        return list(memoryview(w.readframes(w.getnframes())).cast("h"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--kind", default="", choices=["", *BUILDERS])
    ap.add_argument("--id", default="", help="output name under public/voice")
    ap.add_argument("--locale", default="", choices=["", "en", "vi"],
                    help="track to narrate; defaults to the config's own locale")
    ap.add_argument("--max-frames", type=int, default=2100,
                    help="length of the video the narration has to fit inside")
    args = ap.parse_args()

    cfg = json.loads(Path(args.config).read_text())
    # The config carries the track, so narration follows the video rather than
    # needing to be told twice.
    locale = args.locale or cfg.get("locale") or "en"
    exe, model = engine(locale)
    kind = kind_of(cfg, args.kind)
    lines = (VI_BUILDERS if locale == "vi" else BUILDERS)[kind](cfg)

    name = args.id or Path(args.config).stem
    tmp = Path("/tmp/_line.wav")
    track: list[int] = []
    marks = []

    limit = int(args.max_frames / FPS * RATE)
    dropped = []

    for frame, text in lines:
        samples = speak(exe, model, text, tmp)
        start = int(frame / FPS * RATE)
        # A line that would begin before the previous one finished is pushed
        # later rather than overlapped: two voices at once is unlistenable, and
        # silently truncating the earlier line loses information.
        start = max(start, len(track))
        # A line that will not fit is dropped whole. Letting it play and be cut
        # by the end of the video leaves a sentence severed mid-word, which
        # sounds like a broken file rather than an edit.
        if start + len(samples) > limit:
            dropped.append(text)
            continue
        if len(track) < start:
            track.extend([0] * (start - len(track)))
        track.extend(samples)
        marks.append({
            "text": text,
            "startFrame": round(start / RATE * FPS),
            "endFrame": round((start + len(samples)) / RATE * FPS),
        })

    out_dir = ROOT / "public" / "voice"
    out_dir.mkdir(parents=True, exist_ok=True)
    wav_path = out_dir / f"{name}.wav"
    with wave.open(str(wav_path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(memoryview(bytearray(len(track) * 2)).cast("h").tobytes()
                      if not track else
                      __import__("array").array("h", track).tobytes())

    (out_dir / f"{name}.json").write_text(json.dumps(marks, indent=2))

    # Point the config at what was just made, so rendering needs no extra flag.
    cfg["voiceId"] = name
    cfg["voiceMarks"] = marks
    Path(args.config).write_text(json.dumps(cfg, indent=2))

    total = len(track) / RATE
    print(f"{name}: {locale} · {len(lines)} lines, {total:.1f}s of speech")
    for m in marks:
        print(f"  f{m['startFrame']:>5}-{m['endFrame']:<5} {m['text'][:64]}")
    for text in dropped:
        print(f"  DROPPED (would not fit): {text[:70]}")
    if dropped:
        print(f"\n  {len(dropped)} line(s) dropped. Shorten the script in "
              f"{Path(__file__).name} rather than leaving them cut.")


if __name__ == "__main__":
    main()
