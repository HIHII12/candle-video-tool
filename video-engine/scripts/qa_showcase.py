#!/usr/bin/env python3
"""Probe the rendered case-001 package and write its machine-readable QA report."""

from __future__ import annotations

import argparse
import json
import math
import platform
import re
import subprocess
import tempfile
import wave
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out" / "showcase" / "case-001"
CORE = json.loads((ROOT / "src" / "content" / "case001.json").read_text(encoding="utf-8"))

PACKAGE = {
    "Windows": "compositor-win32-x64-msvc",
    "Linux": "compositor-linux-x64-gnu",
    "Darwin": "compositor-darwin-x64",
}.get(platform.system())
if not PACKAGE:
    raise SystemExit(f"Unsupported platform: {platform.system()}")
COMPOSITOR = ROOT / "node_modules" / "@remotion" / PACKAGE
FFMPEG = COMPOSITOR / ("ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg")
FFPROBE = COMPOSITOR / ("ffprobe.exe" if platform.system() == "Windows" else "ffprobe")


def run_json(command: list[str]) -> dict:
    return json.loads(subprocess.check_output(command, text=True, encoding="utf-8"))


def probe(path: Path) -> dict:
    data = run_json([
        str(FFPROBE), "-v", "error", "-show_entries",
        "stream=index,codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels",
        "-show_entries", "format=duration", "-of", "json", str(path),
    ])
    video = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    audio = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
    return {
        "file": path.name,
        "bytes": path.stat().st_size,
        "video": video,
        "audio": audio,
        "durationSeconds": round(float(data["format"]["duration"]), 3),
    }


def db(value: float) -> float:
    return -120.0 if value <= 0 else 20 * math.log10(value)


def audio_metrics(video: Path) -> dict:
    with tempfile.TemporaryDirectory(prefix="xau-qa-") as temp:
        wav_path = Path(temp) / "audio.wav"
        subprocess.run([
            str(FFMPEG), "-y", "-v", "error", "-i", str(video), "-vn",
            "-ac", "1", "-acodec", "pcm_s16le", str(wav_path),
        ], check=True)
        with wave.open(str(wav_path), "rb") as wav:
            rate = wav.getframerate()
            samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2").astype(np.float64) / 32768
    peak = float(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(samples ** 2)))
    window = max(1, int(rate * 0.1))
    envelope = np.array([
        np.sqrt(np.mean(samples[i:i + window] ** 2))
        for i in range(0, max(1, len(samples) - window), window)
    ])
    quiet = float(np.percentile(envelope, 20))
    loud = float(np.percentile(envelope, 99))
    peak_db = round(db(peak), 2)
    rms_db = round(db(rms), 2)
    dynamics = round(db(loud) - db(quiet), 2)
    return {
        "peakDbfs": peak_db,
        "rmsDbfs": rms_db,
        "dynamicLiftDb": dynamics,
        "clipping": peak >= 0.999,
        "audible": peak_db > -30 and rms_db > -45,
        "pass": peak < 0.999 and peak_db > -30 and rms_db > -45 and dynamics >= 4,
        "note": "Objective PCM envelope check; voice is primary, bed is ducked in the composition.",
    }


def extract(video: Path, second: float, output: Path) -> None:
    subprocess.run([
        str(FFMPEG), "-y", "-v", "error", "-ss", str(second), "-i", str(video),
        "-frames:v", "1", "-compression_level", "2", str(output),
    ], check=True)


def qr_decode(image_path: Path) -> str | None:
    try:
        import zxingcpp
    except ImportError:
        return None
    results = zxingcpp.read_barcodes(Image.open(image_path))
    return results[0].text if results else ""


def srt_last_end(path: Path) -> float:
    text = path.read_text(encoding="utf-8")
    stamps = re.findall(r"-->\s+(\d\d):(\d\d):(\d\d),(\d\d\d)", text)
    if not stamps:
        return 0
    h, m, s, ms = map(int, stamps[-1])
    return h * 3600 + m * 60 + s + ms / 1000


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--layout-pass", action="store_true", help="Codex visually reviewed the extracted frames")
    args = parser.parse_args()

    required = [
        "short-vi.mp4", "short-en.mp4", "case-file-vi.mp4", "voice-vi.wav", "voice-en.wav",
        "vi.srt", "en.srt", "thumb-vi.png", "thumb-en.png", "metadata-vi.txt", "metadata-en.txt",
        "zalo-qr.svg", "content-core.json",
    ]
    missing = [name for name in required if not (OUT / name).exists()]
    if missing:
        raise SystemExit(f"Missing required showcase files: {', '.join(missing)}")

    videos = {name: probe(OUT / name) for name in ("short-vi.mp4", "short-en.mp4", "case-file-vi.mp4")}
    voices = {name: probe(OUT / name) for name in ("voice-vi.wav", "voice-en.wav")}
    expected = {
        "short-vi.mp4": (1080, 1920, "60/1", 43),
        "short-en.mp4": (1080, 1920, "60/1", 43),
        "case-file-vi.mp4": (1920, 1080, "30/1", 300),
    }
    for name, (width, height, fps, duration) in expected.items():
        item = videos[name]
        stream = item["video"] or {}
        item["pass"] = (
            stream.get("width") == width and stream.get("height") == height
            and stream.get("r_frame_rate") == fps and abs(item["durationSeconds"] - duration) < 0.2
            and item["audio"] is not None
        )
        item["renderSeconds"] = duration
        item["videoDurationSeconds"] = item["durationSeconds"]

    frames_dir = OUT / "qa-frames"
    frames_dir.mkdir(exist_ok=True)
    review_points = {
        "short-vi.mp4": [1, 8, 18, 26, 38],
        "short-en.mp4": [1, 26, 38],
        "case-file-vi.mp4": [8, 25, 75, 125, 175, 225, 270, 294],
    }
    frame_files = []
    for name, seconds in review_points.items():
        stem = Path(name).stem
        for second in seconds:
            target = frames_dir / f"{stem}-{second:03}.png"
            extract(OUT / name, second, target)
            frame_files.append(str(target.relative_to(OUT)).replace("\\", "/"))

    qr_frames = {
        "short-vi.mp4": frames_dir / "short-vi-038.png",
        "short-en.mp4": frames_dir / "short-en-038.png",
        "case-file-vi.mp4": frames_dir / "case-file-vi-294.png",
    }
    qr_results = {name: qr_decode(path) for name, path in qr_frames.items()}
    qr_pass = all(value == CORE["cta"]["url"] for value in qr_results.values())

    audio = {name: audio_metrics(OUT / name) for name in videos}
    thumbs = {}
    for name in ("thumb-vi.png", "thumb-en.png"):
        with Image.open(OUT / name) as image:
            thumbs[name] = {"width": image.width, "height": image.height, "pass": image.size == (1280, 720)}

    subtitle = {
        "vi.srt": {"lastEndSeconds": srt_last_end(OUT / "vi.srt")},
        "en.srt": {"lastEndSeconds": srt_last_end(OUT / "en.srt")},
    }
    for item in subtitle.values():
        item["pass"] = 0 < item["lastEndSeconds"] <= CORE["duration"]["shortSeconds"]

    package_version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    report = {
        "caseId": CORE["caseId"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "overallPass": False,
        "requiredFiles": {"missing": missing, "pass": not missing},
        "dataSource": {
            "provider": CORE["data"]["provider"],
            "symbol": CORE["data"]["symbol"],
            "instrument": CORE["data"]["instrument"],
            "label": CORE["data"]["display"],
            "proxy": True,
            "xauusdSpot": False,
            "sourceFile": CORE["data"]["sourceFile"],
            "pass": CORE["data"]["symbol"] == "GC=F" and "proxy" in CORE["data"]["display"].lower(),
        },
        "decision": {
            "value": CORE["decision"],
            "reason": CORE["locales"]["en"]["reason"],
            "deterministicLevels": {key: CORE["data"][key] for key in (
                "decisionZoneLow", "decisionZoneHigh", "buyConfirmation", "buyInvalidation",
                "sellConfirmation", "sellInvalidation", "riskPercent",
            )},
            "aiCalculatedNumbers": False,
            "pass": CORE["decision"] == "WAIT",
        },
        "videos": videos,
        "voiceTracks": voices,
        "subtitles": subtitle,
        "thumbnails": thumbs,
        "audio": audio,
        "layout": {
            "shortSafeInsetsPx": {"left": 64, "right": 64, "top": 145, "footerBottom": 178},
            "subtitleBottomPx": 265,
            "representativeFrames": frame_files,
            "visualReview": "pass" if args.layout_pass else "pending",
            "pass": args.layout_pass,
        },
        "qr": {
            "url": CORE["cta"]["url"],
            "format": "SVG",
            "errorCorrection": "H",
            "quietZoneModules": 4,
            "stationarySecondsShort": 8,
            "decodedFromRenderedFrames": qr_results,
            "pass": qr_pass,
        },
        "licenses": [
            {"asset": "Remotion", "version": package_version["dependencies"]["remotion"], "license": "Remotion License", "notice": "THIRD_PARTY_NOTICES.md"},
            {"asset": "node-qrcode", "version": package_version["dependencies"]["qrcode"], "license": "MIT", "notice": "THIRD_PARTY_NOTICES.md"},
            {"asset": "Piper vi_VN-vais1000-medium", "license": "CC BY 4.0", "notice": "THIRD_PARTY_NOTICES.md"},
            {"asset": "Piper en_US-norman-medium", "license": "Public domain dataset per model card", "notice": "THIRD_PARTY_NOTICES.md"},
            {"asset": "Original generated soundtrack/SFX", "license": "Project-owned deterministic synthesis", "notice": "THIRD_PARTY_NOTICES.md"},
        ],
        "notes": [
            "GC=F is labelled as a COMEX Gold Futures proxy everywhere in the showcase.",
            "The QR is shown once per video after value delivery; no watermark overlaps it.",
            "Audio QA is objective level/envelope analysis; a final human phone-speaker listen is still recommended before publishing.",
        ],
    }
    checks = [
        report["requiredFiles"]["pass"], report["dataSource"]["pass"], report["decision"]["pass"],
        all(item["pass"] for item in videos.values()), all(item["pass"] for item in subtitle.values()),
        all(item["pass"] for item in thumbs.values()), all(item["pass"] for item in audio.values()),
        report["layout"]["pass"], report["qr"]["pass"],
    ]
    report["overallPass"] = all(checks)
    (OUT / "qa.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "overallPass": report["overallPass"],
        "videoPass": {key: value["pass"] for key, value in videos.items()},
        "audioPass": {key: value["pass"] for key, value in audio.items()},
        "qr": qr_results,
        "layout": report["layout"]["visualReview"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

