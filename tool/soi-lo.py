#!/usr/bin/env python3
"""Soi ca lo video truoc khi dang: bo cuc · am thanh · do dai · khung den.

Bon cach mot video bi "san", moi cach mot phep do:

  bo cuc   chu nam duoi giao dien Shorts   -> video-engine/scripts/check_layout.py
  am thanh khong co tieng, hoac im lang    -> ffmpeg volumedetect
  do dai   khong phai ~35 giay             -> ffprobe
  khung den mo dau bang mot khung toi thui -> do sang khung dau

Video nao co san bi chuyen vao thu muc con "LOI-DUNG-DANG" de khong ai dang nham.

    python tool/soi-lo.py video-engine/out/batch/2026-11-24
"""
import argparse
import concurrent.futures as cf
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parents[1] / "video-engine"


def ffmpeg_bin(name):
    """ffmpeg/ffprobe tren PATH; neu khong co thi lay ban imageio-ffmpeg kem theo."""
    found = shutil.which(name)
    if found:
        return found
    if name == "ffmpeg":
        try:
            import imageio_ffmpeg
            return imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            pass
    return None


FFMPEG = ffmpeg_bin("ffmpeg")
FFPROBE = ffmpeg_bin("ffprobe")


def chay(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)


def do_dai(v):
    if FFPROBE:
        r = chay([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(v)])
        try:
            return float(r.stdout.strip())
        except ValueError:
            return 0.0
    # Khong co ffprobe: doc tu dong "Duration:" cua ffmpeg.
    r = chay([FFMPEG, "-i", str(v)])
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0


def co_tieng(v):
    r = chay([FFMPEG, "-v", "info", "-i", str(v), "-af", "volumedetect", "-f", "null", "-"])
    if "Audio:" not in r.stderr:
        return False, "khong co tieng"
    m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", r.stderr)
    if not m:
        return False, "khong do duoc am luong"
    mean = float(m.group(1))
    if mean < -45:
        return False, f"gan nhu im lang ({mean:.1f} dB)"
    return True, f"{mean:.1f} dB"


def khung_dau_den(v):
    r = chay([FFMPEG, "-v", "error", "-ss", "0.2", "-i", str(v), "-frames:v", "1",
              "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"])
    m = re.search(r"YAVG=([\d.]+)", r.stderr)
    return (float(m.group(1)) < 6) if m else False


def bo_cuc(v):
    r = chay([sys.executable, "scripts/check_layout.py", str(v.resolve())], cwd=ENGINE)
    m = re.search(r"(\d+) layout problem", r.stdout)
    return int(m.group(1)) if m else -1


def soi(v):
    loi = []
    d = do_dai(v)
    if not (34.0 <= d <= 36.0):
        loi.append(f"do dai {d:.1f}s")
    ok, ghi = co_tieng(v)
    if not ok:
        loi.append(ghi)
    if khung_dau_den(v):
        loi.append("khung mo dau den")
    n = bo_cuc(v)
    if n != 0:
        loi.append(f"bo cuc {n} loi" if n > 0 else "khong kiem duoc bo cuc")
    return v, loi


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("thu_muc")
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()
    if not FFMPEG:
        sys.exit("Khong tim thay ffmpeg. Chay lai CAI-DAT.bat.")

    src = Path(a.thu_muc)
    vids = sorted(src.glob("*.mp4"))
    if not vids:
        sys.exit(f"Khong co video nao trong {src}")
    print(f"Dang soi {len(vids)} video...\n")
    loi_dir = src / "LOI-DUNG-DANG"
    tot, xau = 0, []
    with cf.ThreadPoolExecutor(a.workers) as ex:
        for v, loi in ex.map(soi, vids):
            if loi:
                xau.append((v.name, loi))
                loi_dir.mkdir(exist_ok=True)
                for f in (v, v.with_suffix(".txt")):
                    if f.exists():
                        shutil.move(str(f), str(loi_dir / f.name))
                print(f"  LOI  {v.name}: {' · '.join(loi)}")
            else:
                tot += 1
    print(f"\n{tot}/{len(vids)} video SACH, dang duoc.")
    if xau:
        print(f"{len(xau)} video co loi da chuyen vao: {loi_dir}")
    (src / "bao-cao-soi.json").write_text(
        json.dumps({"sach": tot, "loi": [{"ten": t, "loi": l} for t, l in xau]},
                   ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
