#!/usr/bin/env python3
"""Nap mot ban nhac vao thu vien de engine dung khi render.

Vi sao phai co buoc nap chu khong tha thang file vao thu muc:

  * Moi bai tai ve mot muc to nho khac nhau. Bai nay -8 LUFS, bai kia -22.
    Tha nguyen vao thi video nay nhac dinh tai, video kia nghe nhu khong co
    nhac — cung mot kenh. Nap thi chuan hoa het ve cung mot muc.
  * Remotion chay trong trinh duyet, no KHONG doc duoc danh sach file trong
    thu muc luc render. Phai co mot file danh-sach.json liet ke san.

    python3 scripts/nap_nhac.py duong/dan/bai.mp3 --ten "chill-trap"
    python3 scripts/nap_nhac.py --xem          # xem thu vien dang co gi
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

GOC = Path(__file__).resolve().parent.parent
KHO = GOC / "public" / "audio" / "nhac"
DANH_SACH = KHO / "danh-sach.json"

# Nhac nen phai nam DUOI tieng hieu ung (tick luc nen dong, riser truoc khi lo
# dap an). Cue dinh khoang -9 dBFS, nen nhac chuan ve -20 LUFS de con cho cho
# chung noi len tren. Muc tuyet doi cua ca video duoc dat lai mot lan o cuoi
# day chuyen boi chuan_am_luong.py, nen o day chi can dung TY LE.
MUC_DICH = -20.0


def doc_danh_sach() -> list[dict]:
    if DANH_SACH.exists():
        return json.loads(DANH_SACH.read_text(encoding="utf-8"))
    return []


def ghi_danh_sach(ds: list[dict]) -> None:
    KHO.mkdir(parents=True, exist_ok=True)
    DANH_SACH.write_text(json.dumps(ds, ensure_ascii=False, indent=2), encoding="utf-8")


def do_dai(ff: str, f: Path) -> float:
    r = subprocess.run(
        [ff, "-i", str(f), "-f", "null", "-"], capture_output=True, text=True
    )
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    if not m:
        return 0.0
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("nguon", nargs="?", help="file nhac muon nap")
    ap.add_argument("--ten", default="", help="ten ngan de nhan ra bai (khong dau)")
    ap.add_argument("--xem", action="store_true", help="chi xem thu vien, khong nap")
    a = ap.parse_args()

    ds = doc_danh_sach()

    if a.xem or not a.nguon:
        if not ds:
            print("thu vien trong. Nap bai dau tien:")
            print("  python3 scripts/nap_nhac.py duong/dan/bai.mp3 --ten ten-bai")
            return 0
        print(f"thu vien co {len(ds)} bai:")
        for b in ds:
            print(f"  {b['file']:22s}  {b['ten']:20s}  {b['giay']:.1f}s")
        return 0

    nguon = Path(a.nguon)
    if not nguon.exists():
        print(f"khong thay file: {nguon}")
        return 1

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    KHO.mkdir(parents=True, exist_ok=True)

    so = len(ds) + 1
    ten = a.ten or re.sub(r"[^a-z0-9-]+", "-", nguon.stem.lower()).strip("-")[:28] or f"bai-{so}"
    ra = KHO / f"nhac-{so:02d}.mp3"

    # Chuan hoa hai lan (loudnorm two-pass) de muc ra dung that, khong phai uoc.
    # Mot lan thi ffmpeg doan theo doan dau bai, sai vai dB voi bai co intro nho.
    do = subprocess.run(
        [ff, "-i", str(nguon), "-af", f"loudnorm=I={MUC_DICH}:TP=-3:LRA=11:print_format=json",
         "-f", "null", "-"], capture_output=True, text=True)
    j = re.search(r"\{[^{]*input_i[^}]*\}", do.stderr, re.S)
    if not j:
        print("khong do duoc do to cua file — file co hong khong?")
        return 1
    d = json.loads(j.group(0))

    subprocess.run([
        ff, "-y", "-i", str(nguon),
        "-af",
        f"loudnorm=I={MUC_DICH}:TP=-3:LRA=11:"
        f"measured_I={d['input_i']}:measured_TP={d['input_tp']}:"
        f"measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:"
        f"offset={d['target_offset']}:linear=true,"
        # Vao va ra em dan: bai nhac bi cat cut o dau video nghe nhu loi file.
        "afade=t=in:st=0:d=0.6",
        "-ar", "48000", "-ac", "2", "-b:a", "192k",
        str(ra),
    ], check=True, capture_output=True)

    giay = do_dai(ff, ra)
    ds.append({"file": ra.name, "ten": ten, "giay": round(giay, 2),
               "goc_lufs": round(float(d["input_i"]), 1)})
    ghi_danh_sach(ds)

    print(f"da nap: {ra.name}  ·  {ten}  ·  {giay:.1f}s  ·  {d['input_i']} -> {MUC_DICH} LUFS")
    print(f"thu vien gio co {len(ds)} bai — engine se xoay vong theo seed cua tung video")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
