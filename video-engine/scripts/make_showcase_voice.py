#!/usr/bin/env python3
"""Synthesize the case-001 narration deterministically with local Piper voices.

The visible copy, spoken aliases, subtitle text and timings all come from the
same content core used by Remotion. Each line is generated separately and then
placed at its storyboard time, so the WAV and SRT cannot drift independently.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import tempfile
import wave
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE_PATH = ROOT / "src" / "content" / "case001.json"
VENDOR = ROOT / "vendor" / "piper"
PUBLIC_VOICE = ROOT / "public" / "voice"
OUT = ROOT / "out" / "showcase" / "case-001"

VOICES = {
    "vi": "vi_VN-vais1000-medium",
    "en": "en_US-norman-medium",
}


def piper_exe() -> Path:
    for name in ("piper.exe", "piper"):
        path = VENDOR / name
        if path.exists():
            return path
    raise SystemExit("Piper is missing. Run scripts/setup_voice.py first.")


def synthesize(exe: Path, model: Path, text: str, output: Path, pace: float) -> tuple[int, array]:
    subprocess.run(
        [str(exe), "--model", str(model), "--config", str(model) + ".json",
         "--length_scale", str(pace), "--output_file", str(output)],
        input=text.encode("utf-8"), check=True, capture_output=True,
    )
    with wave.open(str(output), "rb") as wav:
        if wav.getnchannels() != 1 or wav.getsampwidth() != 2:
            raise SystemExit(f"Unexpected Piper WAV format: {output}")
        rate = wav.getframerate()
        samples = array("h")
        samples.frombytes(wav.readframes(wav.getnframes()))
        return rate, samples


def enhance(samples: array, rate: int, clarity: float, gain_db: float) -> array:
    """Phone-first vocal chain: DC/rumble cut, gentle compression and limiter."""
    if not samples:
        return samples
    alpha = math.exp(-2 * math.pi * (55 + 45 * clarity) / rate)
    previous_in = 0.0
    previous_out = 0.0
    drive = 10 ** (gain_db / 20)
    threshold = 0.16
    ratio = 3.2
    processed = array("h")
    for raw in samples:
        x = raw / 32768.0
        high = alpha * (previous_out + x - previous_in)
        previous_in, previous_out = x, high
        value = high * drive
        sign = -1 if value < 0 else 1
        magnitude = abs(value)
        if magnitude > threshold:
            magnitude = threshold + (magnitude - threshold) / ratio
        limited = math.tanh(sign * magnitude * 1.35) / math.tanh(1.35)
        processed.append(max(-32768, min(32767, round(limited * 32767))))
    return processed


def peak_normalize(track: array, target_db: float = -1.5) -> array:
    peak = max((abs(value) for value in track), default=0)
    if peak == 0:
        return track
    scale = (32767 * (10 ** (target_db / 20))) / peak
    return array("h", (max(-32768, min(32767, round(value * scale))) for value in track))


def stamp(track: array, samples: array, start: int) -> None:
    for index, value in enumerate(samples):
        target = start + index
        if target >= len(track):
            break
        mixed = track[target] + value
        track[target] = max(-32768, min(32767, mixed))


def timestamp(seconds: float, comma: bool = True) -> str:
    millis = max(0, round(seconds * 1000))
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    sep = "," if comma else "."
    return f"{hours:02}:{minutes:02}:{secs:02}{sep}{millis:03}"


def write_srt(path: Path, marks: list[dict]) -> None:
    blocks = []
    for index, mark in enumerate(marks, 1):
        blocks.append(
            f"{index}\n{timestamp(mark['startSeconds'])} --> {timestamp(mark['endSeconds'])}\n"
            f"{mark['text']}"
        )
    path.write_text("\n\n".join(blocks) + "\n", encoding="utf-8")


def make_track(exe: Path, locale: str, lines: list[dict], duration: float, name: str, settings: dict) -> list[dict]:
    voice = VOICES[locale]
    model = VENDOR / f"{voice}.onnx"
    if not model.exists() or not Path(str(model) + ".json").exists():
        raise SystemExit(f"Voice {voice} is missing. Run scripts/setup_voice.py --voice {voice}")

    rate = 22050
    track = array("h", [0]) * round(duration * rate)
    marks: list[dict] = []
    previous_end = 0.0

    with tempfile.TemporaryDirectory(prefix="xau-showcase-") as temp:
        temp_dir = Path(temp)
        for index, line in enumerate(lines):
            wav_path = temp_dir / f"line-{index:03}.wav"
            spoken = line.get("tts") or line["text"]
            line_rate, samples = synthesize(exe, model, spoken, wav_path, float(settings.get("pace", 0.94)))
            if line_rate != rate:
                raise SystemExit(f"Voice {voice} is {line_rate} Hz; expected {rate} Hz")
            samples = enhance(samples, rate, float(settings.get("clarity", 0.72)), float(settings.get("gainDb", 3.0)))
            requested = float(line["at"])
            start_seconds = max(requested, previous_end + 0.12 if marks else requested)
            end_seconds = start_seconds + len(samples) / rate
            if end_seconds > duration - 0.08:
                raise SystemExit(
                    f"Narration line does not fit {name}: {line['text']} ends at {end_seconds:.2f}s"
                )
            stamp(track, samples, round(start_seconds * rate))
            marks.append({
                "text": line["text"],
                "spokenAlias": spoken,
                "startSeconds": round(start_seconds, 3),
                "endSeconds": round(end_seconds, 3),
            })
            previous_end = end_seconds

    track = peak_normalize(track)
    PUBLIC_VOICE.mkdir(parents=True, exist_ok=True)
    wav_out = PUBLIC_VOICE / f"{name}.wav"
    with wave.open(str(wav_out), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(track.tobytes())
    (PUBLIC_VOICE / f"{name}.json").write_text(
        json.dumps(marks, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"{name}: {len(lines)} lines, {duration:.1f}s track, speech ends {previous_end:.1f}s")
    return marks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-long", action="store_true")
    args = parser.parse_args()

    core = json.loads(CORE_PATH.read_text(encoding="utf-8"))
    settings = core.get("voice", {})
    exe = piper_exe()
    OUT.mkdir(parents=True, exist_ok=True)

    short_marks = {}
    for locale in ("vi", "en"):
        short_marks[locale] = make_track(
            exe, locale, core["locales"][locale]["shortNarration"],
            float(core["duration"]["shortSeconds"]), f"showcase-short-{locale}", settings,
        )
        write_srt(OUT / f"{locale}.srt", short_marks[locale])
        shutil.copy2(PUBLIC_VOICE / f"showcase-short-{locale}.wav", OUT / f"voice-{locale}.wav")

    if not args.skip_long:
        make_track(
            exe, "vi", core["locales"]["vi"]["longNarration"],
            float(core["duration"]["longSeconds"]), "showcase-long-vi", settings,
        )


if __name__ == "__main__":
    main()
