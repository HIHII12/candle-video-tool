#!/usr/bin/env python3
"""Dat am luong cuoi cung cho video — mot lan, tren file da render xong.

Vi sao lam o day chu khong chinh trong engine:

Am luong trong engine la CAN BANG giua nhac nen, hieu ung va giong doc — thu do
phai dung o moi khung hinh. Con am luong TUYET DOI la thu chi do duoc khi ca ban
mix da xong. Do trên file that roi chinh mot lan la cach duy nhat khong phai doan.

Do that truoc khi co file nay: trung binh -30 dB, tuc la thap hon chuan nen tang
khoang 16 dB. Nen tang khong bo qua — no keo len, keo ca nen nhieu len theo, va
tren loa dien thoai thi gan nhu khong nghe thay gi.

Chuan dung o day la chuan cac nen tang dang dung:
    -14 LUFS tich hop, dinh that -1.5 dBTP

Chay hai luot: luot 1 do, luot 2 chinh dung bang so vua do. Luot mot khong the
bo qua — loudnorm mot luot la bo nen dong (dynamic), no bop transient va lam
hieu ung nghe bet lai.

    python3 scripts/chuan_am_luong.py out/batch/2026-08-28/*.mp4
    python3 scripts/chuan_am_luong.py video.mp4 --lufs -16
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import imageio_ffmpeg

    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:  # pragma: no cover
    FFMPEG = "ffmpeg"


def do(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def measure(video: Path, lufs: float, tp: float, lra: float) -> dict | None:
    """Pass one: what the file actually is."""
    res = do([
        FFMPEG, "-v", "info", "-i", str(video),
        "-af", f"loudnorm=I={lufs}:TP={tp}:LRA={lra}:print_format=json",
        "-f", "null", "-",
    ])
    text = res.stderr
    start = text.rfind("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None


def normalise(video: Path, lufs: float, tp: float, lra: float, dry: bool) -> tuple[bool, str]:
    before = measure(video, lufs, tp, lra)
    if not before:
        return False, "khong do duoc am luong (file co tieng khong?)"

    was = float(before["input_i"])
    if was == float("-inf") or was < -70:
        return False, "file khong co tieng"

    if dry:
        return True, f"{was:.1f} LUFS -> se chinh ve {lufs:.1f}"

    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / video.name
        # Pass two, with the measurements pinned. Video is copied, so this is a
        # seconds-long operation and the picture is bit-identical.
        res = do([
            FFMPEG, "-v", "error", "-y", "-i", str(video),
            "-af",
            f"loudnorm=I={lufs}:TP={tp}:LRA={lra}"
            f":measured_I={before['input_i']}:measured_TP={before['input_tp']}"
            f":measured_LRA={before['input_lra']}:measured_thresh={before['input_thresh']}"
            f":offset={before['target_offset']}:linear=true:print_format=summary",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
            str(out),
        ])
        if res.returncode != 0 or not out.exists():
            return False, f"ffmpeg loi: {res.stderr.strip()[-200:]}"
        shutil.move(str(out), str(video))

    after = measure(video, lufs, tp, lra)
    now = float(after["input_i"]) if after else float("nan")
    return True, f"{was:.1f} -> {now:.1f} LUFS (dinh {after['input_tp'] if after else '?'} dBTP)"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("videos", nargs="+")
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--tp", type=float, default=-1.5)
    ap.add_argument("--lra", type=float, default=11.0)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    paths: list[Path] = []
    for pattern in a.videos:
        paths.extend(sorted(Path().glob(pattern)) if "*" in pattern else [Path(pattern)])

    bad = 0
    for path in paths:
        if not path.exists():
            print(f"khong thay: {path}", file=sys.stderr)
            bad += 1
            continue
        ok, msg = normalise(path, a.lufs, a.tp, a.lra, a.dry_run)
        print(f"{'ok  ' if ok else 'LOI '} {path.name:38s} {msg}")
        if not ok:
            bad += 1

    print(f"\n{len(paths)} file · {bad} loi")
    return 1 if bad else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # pragma: no cover
        print(f"CHAY THAT BAI: {exc}", file=sys.stderr)
        sys.exit(2)
