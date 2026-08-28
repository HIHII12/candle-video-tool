#!/usr/bin/env python3
"""Soi san mot video da render — chay bang chuong trinh, khong soi bang mat.

Vi sao co file nay: soi tay 10 khung hinh thi bo sot dung cai khung hinh hong.
Loi that su xay ra o cho khong ai lay mau: mot nhan bay ra khoi khung o giay 22,
bon giay cuoi dung hinh, mot dong chu nam duoi thanh dieu khien cua YouTube.

Nam phep do, moi phep ung voi mot kieu hong:

  bleed   muc o hang/cot ngoai cung  -> co thu dang tran ra ngoai khung
  safe    muc nam duoi giao dien nen tang (day ~14%, phai ~10%) -> bi che
  drift   muc lech han ve mot ben     -> bo cuc trong nhu dat ho
  freeze  nhieu khung hinh giong het  -> video dung hinh, dau hieu "khong ai dung"
  audio   co tieng khong, to nho the nao, co clip khong

Dung:
    python3 scripts/kiem_video.py out/qa/v3/hammer.mp4
    python3 scripts/kiem_video.py out/batch/2026-08-28/*.mp4 --json bao-cao.json

Ma thoat: 0 = sach | 1 = co LOI | 2 = khong chay duoc
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

try:
    import imageio_ffmpeg

    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:  # pragma: no cover - only on a machine without the wheel
    FFMPEG = "ffmpeg"

# Fraction of the frame each platform's own UI covers. Deliberately conservative:
# being wrong here costs a caption moved 30px, being wrong the other way costs a
# caption nobody can read on any phone.
SAFE = {"bottom": 0.14, "right": 0.10, "top": 0.05}

# A pixel counts as ink when it differs from its row's background by this much,
# summed over RGB. Low enough to catch dim small print, high enough to ignore the
# vertical gradient every format paints.
INK = 26

# Small print is allowed under the platform band; it is required to be present,
# not to be prominent. Ink is only reported when there is enough of it to be a
# real element rather than a disclaimer.
SAFE_INK_BUDGET = 0.006


@dataclass
class Report:
    file: str
    width: int = 0
    height: int = 0
    frames: int = 0
    fps: float = 0.0
    problems: list[tuple[str, str]] = field(default_factory=list)
    stats: dict = field(default_factory=dict)

    def add(self, level: str, msg: str) -> None:
        self.problems.append((level, msg))

    @property
    def errors(self) -> int:
        return sum(1 for level, _ in self.problems if level == "LOI")


def probe(video: Path) -> dict:
    out = subprocess.run(
        [FFMPEG, "-i", str(video), "-hide_banner"],
        capture_output=True, text=True,
    ).stderr
    info: dict = {"audio": "Audio:" in out}
    for token in out.split():
        if "x" in token and token.replace("x", "").replace(",", "").isdigit():
            w, _, h = token.strip(",").partition("x")
            if w.isdigit() and h.isdigit() and int(w) > 200:
                info.setdefault("width", int(w))
                info.setdefault("height", int(h))
    if " fps," in out:
        info["fps"] = float(out.split(" fps,")[0].split()[-1])
    return info


def frames(video: Path, count: int) -> tuple[np.ndarray, int, int]:
    """Sample `count` frames evenly, decoded once in a single pass."""
    info = probe(video)
    w, h = info.get("width", 1080), info.get("height", 1920)
    # fps filter keeps the sampling even without seeking per frame, which is both
    # faster and immune to keyframe snapping.
    dur = duration(video)
    rate = max(0.1, count / max(0.1, dur))
    raw = subprocess.run(
        [FFMPEG, "-v", "error", "-i", str(video),
         "-vf", f"fps={rate:.4f},scale=270:-1", "-f", "rawvideo",
         "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True,
    ).stdout
    sw = 270
    sh = round(h * sw / w / 2) * 2
    n = len(raw) // (sw * sh * 3)
    if n == 0:
        raise RuntimeError("no frames decoded")
    arr = np.frombuffer(raw[: n * sw * sh * 3], dtype=np.uint8).reshape(n, sh, sw, 3)
    return arr.astype(np.int16), w, h


def duration(video: Path) -> float:
    out = subprocess.run(
        [FFMPEG, "-i", str(video), "-hide_banner"], capture_output=True, text=True
    ).stderr
    for line in out.splitlines():
        if "Duration:" in line:
            hh, mm, ss = line.split("Duration:")[1].split(",")[0].strip().split(":")
            return int(hh) * 3600 + int(mm) * 60 + float(ss)
    return 0.0


def ink_mask(img: np.ndarray) -> np.ndarray:
    """Pixels differing from their own row's background.

    Per row, not per frame: every format paints a vertical gradient, and a single
    background sampled from a corner reports half the frame as ink.
    """
    edge = np.concatenate([img[:, :3], img[:, -3:]], axis=1)
    bg = np.median(edge, axis=1)[:, None, :]
    return np.abs(img - bg).sum(axis=2) > INK


def check_frame(mask: np.ndarray, rep: Report, when: str) -> None:
    h, w = mask.shape
    total = mask.sum()
    if total < 40:
        return  # An essentially blank frame; the drift test would be noise.

    # bleed: ink touching the outermost rows/columns.
    band = max(2, w // 180)
    edges = {
        "trai": mask[:, :band].sum(),
        "phai": mask[:, -band:].sum(),
        "tren": mask[:band, :].sum(),
        "duoi": mask[-band:, :].sum(),
    }
    for side, amount in edges.items():
        if amount > total * 0.004:
            rep.add("LOI", f"{when}: muc cham canh {side} — co thu tran ra ngoai khung")

    # safe: ink under the platform's own overlays.
    # The very bottom strip is where the disclaimer lives. It is required to be
    # present, not readable, and src/safeArea.ts says so — counting it here made
    # every clean frame report a violation.
    bottom = mask[int(h * (1 - SAFE["bottom"])):int(h * 0.962), :].sum()
    right = mask[:, int(w * (1 - SAFE["right"])):].sum()
    if bottom > total * SAFE_INK_BUDGET * 6:
        rep.add("CANH BAO", f"{when}: {bottom/total:.0%} muc nam duoi thanh Shorts")
    if right > total * SAFE_INK_BUDGET * 4:
        rep.add("CANH BAO", f"{when}: {right/total:.0%} muc nam duoi cot nut ben phai")

    # drift: centre of mass a long way from the middle.
    xs = np.arange(w)
    cx = (mask.sum(axis=0) * xs).sum() / max(1, total)
    if abs(cx / w - 0.5) > 0.22:
        rep.add("CANH BAO", f"{when}: bo cuc lech ngang {cx/w:.0%} (giua la 50%)")


def check(video: Path, samples: int, freeze_seconds: float) -> Report:
    rep = Report(file=str(video))
    info = probe(video)
    rep.width, rep.height = info.get("width", 0), info.get("height", 0)
    rep.fps = info.get("fps", 0.0)
    dur = duration(video)
    rep.stats["seconds"] = round(dur, 2)

    if not info.get("audio"):
        rep.add("LOI", "khong co tieng — file nay khong co track am thanh nao")

    if rep.width and rep.height:
        ratio = rep.width / rep.height
        if abs(ratio - 9 / 16) > 0.01:
            rep.add("LOI", f"ti le {rep.width}x{rep.height} khong phai 9:16")

    arr, _, _ = frames(video, samples)
    rep.frames = len(arr)
    masks = [ink_mask(f) for f in arr]

    step = dur / max(1, len(arr))
    for i, mask in enumerate(masks):
        check_frame(mask, rep, f"giay {i*step:4.1f}")

    # freeze: consecutive samples that are pixel-near-identical.
    run = 0
    worst = 0.0
    for i in range(1, len(arr)):
        diff = np.abs(arr[i] - arr[i - 1]).mean()
        if diff < 0.35:
            run += 1
            worst = max(worst, run * step)
        else:
            run = 0
    rep.stats["freeze_seconds"] = round(worst, 2)
    if worst >= freeze_seconds:
        rep.add("LOI", f"dung hinh {worst:.1f}s lien — khan gia doc la video da het")
    elif worst >= freeze_seconds * 0.6:
        rep.add("CANH BAO", f"gan nhu dung hinh {worst:.1f}s lien")

    # motion: a short that barely moves reads as a slideshow.
    motion = float(np.mean([np.abs(arr[i] - arr[i - 1]).mean() for i in range(1, len(arr))]))
    rep.stats["motion"] = round(motion, 3)
    if motion < 1.2:
        rep.add("CANH BAO", f"gan nhu khong chuyen dong (do dong {motion:.2f})")

    return rep


def audio_stats(video: Path) -> dict:
    """Peak, mean, and the number the platforms actually judge: integrated LUFS.

    dBFS mean is easy to read and does not say whether a phone will hear this.
    LUFS does, which is why every platform normalises against it, so it is the
    one measured here even though it costs a second pass.
    """
    out = subprocess.run(
        [FFMPEG, "-v", "info", "-i", str(video), "-af", "volumedetect",
         "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    stats = {}
    for line in out.splitlines():
        if "max_volume:" in line:
            stats["peak_db"] = float(line.split("max_volume:")[1].split("dB")[0])
        if "mean_volume:" in line:
            stats["mean_db"] = float(line.split("mean_volume:")[1].split("dB")[0])

    meter = subprocess.run(
        [FFMPEG, "-v", "info", "-i", str(video),
         "-af", "loudnorm=I=-14:TP=-1.5:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    start, end = meter.rfind("{"), meter.rfind("}")
    if start != -1 and end != -1:
        try:
            m = json.loads(meter[start:end + 1])
            stats["lufs"] = float(m["input_i"])
            stats["true_peak_db"] = float(m["input_tp"])
        except (json.JSONDecodeError, KeyError, ValueError):
            pass
    return stats


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("videos", nargs="+")
    ap.add_argument("--samples", type=int, default=70)
    ap.add_argument("--freeze", type=float, default=2.4,
                    help="giay dung hinh lien tuc thi tinh la LOI")
    ap.add_argument("--json", default="")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    reports = []
    for pattern in a.videos:
        for path in sorted(Path().glob(pattern)) if "*" in pattern else [Path(pattern)]:
            if not path.exists():
                print(f"khong thay file: {path}", file=sys.stderr)
                return 2
            rep = check(path, a.samples, a.freeze)
            rep.stats.update(audio_stats(path))
            peak = rep.stats.get("peak_db")
            mean = rep.stats.get("mean_db")
            if peak is not None and peak > -0.4:
                rep.add("CANH BAO", f"dinh tieng {peak:+.1f} dB — sat nguong, de bi ran")
            lufs = rep.stats.get("lufs")
            tp = rep.stats.get("true_peak_db")
            # -14 LUFS is where the platforms normalise to. More than 3 dB under
            # it and the platform lifts the video, noise floor and all; over it
            # and the platform turns it down, so the extra was never gained.
            if lufs is not None and lufs < -17:
                rep.add("LOI", f"am luong {lufs:.1f} LUFS — thap hon chuan -14 qua nhieu, "
                               f"dien thoai gan nhu khong nghe thay")
            elif lufs is not None and lufs > -11:
                rep.add("CANH BAO", f"am luong {lufs:.1f} LUFS — to hon chuan, nen tang se van van xuong")
            if tp is not None and tp > -0.6:
                rep.add("CANH BAO", f"dinh that {tp:+.1f} dBTP — se ran khi nen tang ma hoa lai")
            if mean is not None and mean < -32:
                rep.add("CANH BAO", f"tieng qua nho (trung binh {mean:.1f} dB)")
            reports.append(rep)

    errors = 0
    for rep in reports:
        errors += rep.errors
        head = f"{Path(rep.file).name:38s} {rep.width}x{rep.height} {rep.stats.get('seconds')}s"
        marks = f"dung hinh {rep.stats.get('freeze_seconds')}s · dong {rep.stats.get('motion')}"
        if rep.stats.get("lufs") is not None:
            marks += f" · {rep.stats['lufs']:.1f} LUFS / dinh {rep.stats.get('true_peak_db', 0):+.1f} dBTP"
        print(f"{'LOI ' if rep.errors else 'ok  '} {head}  {marks}")
        if not a.quiet:
            seen = set()
            for level, msg in rep.problems:
                # Collapse the same complaint repeated across many samples.
                key = (level, msg.split(": ", 1)[-1][:40])
                if key in seen:
                    continue
                seen.add(key)
                print(f"       {level:<9} {msg}")

    if a.json:
        Path(a.json).write_text(
            json.dumps([r.__dict__ for r in reports], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\nBao cao: {a.json}")

    print(f"\n{len(reports)} video · {errors} LOI")
    return 1 if errors else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # pragma: no cover
        print(f"CHAY THAT BAI: {exc}", file=sys.stderr)
        sys.exit(2)
