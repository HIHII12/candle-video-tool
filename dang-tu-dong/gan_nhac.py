#!/usr/bin/env python3
"""Tron mot ban nhac vao hang loat video da render xong.

Vi sao khong render lai: 300 video render lai mat gan mot ngay may chay. Tron
nhac vao file da xong mat vai giay moi cai, va ket qua nghe y het — vi phan
hinh khong dong gi ca.

Nhac cu (nen tong hop + tieng hieu ung cat theo nhip) duoc GIU LAI, chi ha
xuong duoi. Bo han no di la mat luon tieng "tách" khi nen dong va tieng riser
truoc khi lo dap an — nhung tieng do cat theo storyboard, khong ban nhac nao
thay duoc.

    python3 dang-tu-dong/gan_nhac.py nhac/bai-cua-anh.mp3 \
        video-engine/out/batch/2026-09-10 --loc en-quiz

Muon nghe thu truoc khi chay ca lo:

    python3 dang-tu-dong/gan_nhac.py nhac/bai-cua-anh.mp3 <thu-muc> --thu 3
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg


def tron(ff: str, video: Path, nhac: Path, ra: Path,
         muc_nhac: float, muc_cu: float) -> None:
    subprocess.run([
        ff, "-y", "-i", str(video), "-stream_loop", "-1", "-i", str(nhac),
        "-filter_complex",
        # Nhac moi lap lai cho du do dai video roi cat dung bang video;
        # -shortest mot minh khong du vi stream_loop lam nhac dai vo han.
        f"[1:a]volume={muc_nhac},afade=t=in:st=0:d=1.2[nhac];"
        f"[0:a]volume={muc_cu}[cu];"
        f"[cu][nhac]amix=inputs=2:duration=first:dropout_transition=0,"
        # Chuan lai muc sau khi tron, neu khong hai nguon cong lai se vuot dinh.
        f"loudnorm=I=-14:TP=-1.5:LRA=11[ra]",
        "-map", "0:v", "-map", "[ra]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
        str(ra),
    ], check=True, capture_output=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("nhac", help="file mp3/wav cua anh")
    ap.add_argument("thu_muc", help="thu muc chua .mp4")
    ap.add_argument("--loc", default="", help="chi lam file co chuoi nay trong ten")
    ap.add_argument("--muc-nhac", type=float, default=0.55,
                    help="to nho cua nhac moi (0.55 = duoi giong noi, tren nen cu)")
    ap.add_argument("--muc-cu", type=float, default=0.75,
                    help="giu lai bao nhieu phan nhac/tieng hieu ung cu")
    ap.add_argument("--thu", type=int, default=0,
                    help="chi lam N video dau roi dung, de nghe thu")
    a = ap.parse_args()

    nhac, thu_muc = Path(a.nhac), Path(a.thu_muc)
    if not nhac.exists():
        print(f"khong thay file nhac: {nhac}")
        return 1

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    vids = sorted(p for p in thu_muc.glob("*.mp4") if a.loc in p.name)
    if a.thu:
        vids = vids[: a.thu]
        # Ban thu khong duoc de len ban goc: nghe khong thich thi phai con
        # duong lui, ma video goc thi khong sinh lai duoc trong vai giay.
        ra_thu = thu_muc.parent / "nghe-thu"
        ra_thu.mkdir(exist_ok=True)

    if not vids:
        print(f"khong co video nao khop '{a.loc}' trong {thu_muc}")
        return 1

    for i, v in enumerate(vids, 1):
        if a.thu:
            dich = ra_thu / v.name
            tron(ff, v, nhac, dich, a.muc_nhac, a.muc_cu)
        else:
            tam = v.with_suffix(".tam.mp4")
            tron(ff, v, nhac, tam, a.muc_nhac, a.muc_cu)
            shutil.move(str(tam), str(v))
            dich = v
        print(f"[{i}/{len(vids)}] {dich.name}", flush=True)

    if a.thu:
        print(f"\nNghe thu o: {ra_thu}")
        print("Nghe ung thi chay lai KHONG co --thu de ap cho ca lo.")
    else:
        print(f"\nxong {len(vids)} video")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
