#!/usr/bin/env python3
"""Nap am thanh that (vi du tai tu Pixabay) vao dung 8 o ma engine can.

Vi sao khong tai thang tu day: Pixabay khong mo API cho muc sound effects — API
cong khai cua ho chi co anh va video. Nen buoc tai ve la buoc cua nguoi, con
buoc bien tap — cat, chuan hoa, dat dung ten, ghi nguon — la buoc cua may. File
nay lam phan cua may.

Cach dung:

  1. Vao https://pixabay.com/vi/sound-effects/ tim theo tu khoa o bang duoi.
  2. Tai ve, bo het vao MOT thu muc. Ten file khong quan trong.
  3. Chay:

        python3 scripts/nap_am_thanh.py ~/Downloads/sfx --map

     No liet ke file va cho ban gan file nao vao o nao. Hoac dat ten file
     bat dau bang ten o (vi du "whoosh-01.mp3") thi no tu nhan.

  4. Chay that:

        python3 scripts/nap_am_thanh.py ~/Downloads/sfx --apply

May se: doi sang WAV 44.1kHz mono, cat dung do dai o do can, fade 5ms hai dau
de khong lach cach, chuan hoa ve dung muc o do dung, va ghi nguon vao
public/audio/NGUON-AM-THANH.md.

Giay phep: Pixabay Content License cho dung mien phi ca thuong mai, khong bat
buoc ghi nguon — nhung file nay VAN ghi nguon, vi mot kenh kiem tien ma khong
biet am thanh cua minh o dau ra la mot rui ro khong dang co.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

try:
    import imageio_ffmpeg

    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:  # pragma: no cover
    FFMPEG = "ffmpeg"

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio"

# name -> (seconds, peak dBFS, what it is for, Pixabay search terms)
SLOTS = {
    "bed-dark":  (10.0, -20.0, "nhac nen toi, lap lien mach 10 giay",
                  "dark ambient loop / cinematic underscore / tension drone"),
    "bed-light": (10.0, -20.0, "nhac nen sang, lap lien mach 10 giay",
                  "minimal ambient loop / soft piano loop"),
    "tick":      (0.09,  -9.0, "tieng dem nguoc, moi giay mot cai",
                  "clock tick / ui tick / click"),
    "thud":      (0.42,  -6.0, "cai gi do dap xuong va co trong luong",
                  "deep impact / cinematic thud / low hit"),
    "whoosh":    (0.50,  -8.0, "mot lop danh dau vua bay vao",
                  "swoosh / transition whoosh / ui swipe"),
    "riser":     (2.60, -10.0, "cang len truoc luc lat bai",
                  "riser / build up / tension rise"),
    "win":       (1.50,  -7.0, "ket qua thang",
                  "success chime / positive notification"),
    "loss":      (1.50,  -7.0, "ket qua thua — dung u am, dung bi tham",
                  "soft negative / muted fail / low tone"),
}


def guess(files: list[Path], slot: str) -> Path | None:
    for f in files:
        if f.stem.lower().startswith(slot.split("-")[0]) or slot in f.stem.lower():
            return f
    return None


def convert(src: Path, slot: str, seconds: float, peak_db: float, loop: bool) -> str:
    dst = OUT / f"{slot}.wav"
    backup = OUT / f"{slot}.synth.wav"
    if dst.exists() and not backup.exists():
        # Keep the synthesized original: it is the fallback that needs no licence
        # and no network, and losing it to an overwrite is not recoverable.
        shutil.copy2(dst, backup)

    fade = 0.005
    chain = [
        "aformat=sample_fmts=s16:sample_rates=44100:channel_layouts=mono",
        f"atrim=0:{seconds}",
        f"afade=t=in:st=0:d={fade}",
        f"afade=t=out:st={max(0.0, seconds - fade):.4f}:d={fade}",
        # Peak-normalise, not loudness-normalise: these are transients, and their
        # balance against the bed is set in the mix, not here.
        f"dynaudnorm=f=500:g=3" if loop else "anull",
        f"alimiter=limit={10 ** (peak_db / 20):.4f}",
    ]
    res = subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-i", str(src), "-af", ",".join(chain),
         "-c:a", "pcm_s16le", str(dst)],
        capture_output=True, text=True,
    )
    if res.returncode != 0:
        return f"LOI: {res.stderr.strip()[-160:]}"
    return f"ok -> {dst.relative_to(ROOT)}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", help="thu muc chua file da tai ve")
    ap.add_argument("--map", action="store_true", help="chi in ra file nao vao o nao")
    ap.add_argument("--apply", action="store_true", help="doi that")
    ap.add_argument("--slot", action="append", default=[],
                    help="gan tay: --slot whoosh=abc.mp3")
    a = ap.parse_args()

    folder = Path(a.folder).expanduser()
    if not folder.is_dir():
        print(f"khong thay thu muc {folder}", file=sys.stderr)
        return 2

    files = sorted(f for f in folder.iterdir()
                   if f.suffix.lower() in {".mp3", ".wav", ".ogg", ".m4a", ".flac"})
    manual = dict(s.split("=", 1) for s in a.slot)

    print(f"{len(files)} file trong {folder}\n")
    plan: dict[str, Path] = {}
    for slot, (seconds, peak, what, terms) in SLOTS.items():
        chosen = folder / manual[slot] if slot in manual else guess(files, slot)
        mark = chosen.name if chosen and chosen.exists() else "— chua co —"
        print(f"  {slot:10s} {seconds:5.2f}s  {mark}")
        print(f"             {what}")
        if not (chosen and chosen.exists()):
            print(f"             tim tren Pixabay: {terms}")
        else:
            plan[slot] = chosen

    if not a.apply:
        print("\nChay lai voi --apply de doi that.")
        return 0

    print()
    lines = [f"# Nguon am thanh\n", f"Cap nhat: {date.today()}\n",
             "| O | File goc | Nguon |", "|---|---|---|"]
    for slot, src in plan.items():
        seconds, peak, _, _ = SLOTS[slot]
        msg = convert(src, slot, seconds, peak, slot.startswith("bed"))
        print(f"  {slot:10s} {msg}")
        lines.append(f"| `{slot}.wav` | {src.name} | Pixabay (Content License) |")

    lines += ["",
              "File `*.synth.wav` la ban tong hop bang cong thuc — khong can giay phep,",
              "khong can mang. Muon quay ve thi doi ten no thanh `<o>.wav`.", ""]
    (OUT / "NGUON-AM-THANH.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"\nGhi nguon: {(OUT / 'NGUON-AM-THANH.md').relative_to(ROOT)}")
    print("Kiem lai bang: python3 scripts/check_audio.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
