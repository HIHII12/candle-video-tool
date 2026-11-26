#!/usr/bin/env python3
"""Sinh nhac GOC cho thu vien — khong dinh Content ID vi khong co ban goc nao de doi chieu.

Vi sao lam cai nay: bai nhac tai tu YouTube ve, du hay den may, khi dang len
YouTube deu bi Content ID nhan ra. Video khong bi go, nhung tien quang cao chay
ve chu ban quyen, va vai nuoc co the bi chan. Ne nhan dien (doi cao do, doi toc
do) vua la lach he thong vua khong an thua — Content ID bat duoc tu lau.

Duong di sach duy nhat la nhac khong thuoc ve ai khac. Toan bo am thanh o day
sinh tu phep toan: sin, nhieu ngau nhien, bo loc. Khong mau, khong sample,
khong doan nao cua ai. Chu kenh so huu 100%.

Moi bai la mot vong lap LIEN MACH — tan so duoc bam vao so nguyen chu ky trong
mot vong, duoi go duoc quan vong thay vi cat, va lop nhieu duoc loc tren buffer
lap ba lan roi lay khuc giua. Khong lam ba viec do thi cho noi vong nghe "cach"
mot cai, moi 20 giay mot lan, suot 35 giay video.

    python3 scripts/sinh_nhac.py            # sinh ca 6 bai vao thu vien
    python3 scripts/sinh_nhac.py --nghe-thu # chi ghi ra /tmp de nghe truoc
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_audio import (  # noqa: E402
    RATE, add_wrap, env, lowpass, highpass, noise, normalize, sine, t_of, write,
)

import imageio_ffmpeg  # noqa: E402

GOC = Path(__file__).resolve().parent.parent
KHO = GOC / "public" / "audio" / "nhac"
DANH_SACH = KHO / "danh-sach.json"

# Cung muc voi nap_nhac.py: bai nap tu ngoai va bai tu sinh phai nam cung mot
# muc, neu khong thi doi bai la doi ca do to cua video.
MUC_DICH = -20.0

# Thang 5 not — moi quang deu thuan tai. Ba muoi lam giay nhac lap lai ma co
# mot quang nghich thi nguoi xem tat tieng truoc khi ho kip nhan ra vi sao.
NAM_NOT = [0, 2, 4, 7, 9]
BA_NOT = [0, 3, 5, 7, 10]  # the bluesy hon, cho bai co tinh "cang"


def mot_bai(root: float, bpm: float, bars: int, thang: list[int],
            seed: int, sang: float, nhip_kep: bool, be_mat: float) -> np.ndarray:
    """Dung mot vong lap lien mach tu cac tham so tren.

    root   — not goc, Hz
    sang   — 0 toi, 1 sang: quyet dinh cat loc va do cao cua lop giai dieu
    nhip_kep — co danh them nhip le giua hai phach khong (nghe gap hon)
    be_mat — luong nhieu nen, tao cam giac khong gian
    """
    beats = bars * 4
    dur = beats * 60.0 / bpm
    n = int(RATE * dur)
    rng = np.random.default_rng(seed)

    # Bam tan so vao so nguyen chu ky trong mot vong. Day la ca bi quyet cua
    # cho noi vong khong "cach".
    snap = lambda f: max(1, round(f * dur)) / dur  # noqa: E731
    out = np.zeros(n)

    # --- lop 1: nen ngan ---------------------------------------------------
    for mult, gain in ((1.0, 1.0), (1.5, 0.38), (2.0, 0.20)):
        f = snap(root * mult)
        troi = 1 + 0.0014 * np.sin(2 * np.pi * t_of(dur) / dur)
        out += gain * np.sin(2 * np.pi * f * t_of(dur) * troi)

    # --- lop 2: nhip -------------------------------------------------------
    moi_phach = n // beats
    for b in range(beats):
        manh = 1.0 if b % 4 == 0 else (0.55 if b % 2 == 0 else 0.34)
        f = snap(root * (2 + 2 * sang))
        v = sine(f, 0.32) * env(0.32, 0.004, 0.26, 2.4)
        add_wrap(out, b * moi_phach, v * manh * 0.46)
        if nhip_kep and b % 2 == 1:
            v2 = sine(snap(root * 6), 0.14) * env(0.14, 0.002, 0.12, 3.2)
            add_wrap(out, b * moi_phach + moi_phach // 2, v2 * 0.18)

    # --- lop 3: giai dieu --------------------------------------------------
    # Chon truoc bang rng roi giu nguyen: cung mot seed phai cho ra dung mot
    # bai, khong thi render lai mot video se ra nhac khac.
    so_not = beats // 2
    chuoi = [int(rng.integers(0, len(thang))) for _ in range(so_not)]
    for i, b in enumerate(chuoi):
        cao = root * (8 if sang > 0.5 else 4) * 2 ** (thang[b] / 12)
        f = snap(cao)
        d = 0.55 + 0.25 * float(rng.random())
        v = sine(f, d) * env(d, 0.004, d * 0.85, 3.0)
        # Quang tam de giai dieu day dan hon mot tieng sin tran.
        v += 0.28 * sine(snap(cao * 2), d) * env(d, 0.004, d * 0.6, 3.4)
        add_wrap(out, int(i * n / so_not), v * (0.22 + 0.10 * sang))

    # --- lop 4: khong gian -------------------------------------------------
    src = noise(dur, seed + 17)
    # Loc tren buffer lap ba lan roi lay khuc giua: bo loc mot cuc co tri nho,
    # neu loc thang thi dau vong va cuoi vong o hai trang thai khac nhau.
    air = lowpass(np.tile(src, 3), 900 + 1800 * sang)[n: 2 * n]
    out += air * be_mat

    # Mot lop cao rat nhe cho do duc, chi o bai sang.
    if sang > 0.5:
        hi = highpass(np.tile(noise(dur, seed + 41), 3), 5200)[n: 2 * n]
        out += hi * 0.012

    return normalize(out, -20)


# Sau tinh than khac nhau. Khong phai sau bien the cua mot bai: khac not goc,
# khac toc do, khac thang, khac be mat — de mot nguoi xem kenh ca tuan khong
# nghe thay cung mot thu moi lan.
BAI = [
    # ten           root   bpm  bars thang     seed sang nhip_kep be_mat
    ("tram-sau",    55.00,  84,  8, NAM_NOT,   101, 0.15, False, 0.055),
    ("day-nhip",    73.42, 112,  8, NAM_NOT,   202, 0.55, True,  0.040),
    ("sang-ro",     87.31,  96,  8, NAM_NOT,   303, 0.85, False, 0.030),
    ("lo-lung",     65.41,  76,  8, BA_NOT,    404, 0.35, False, 0.060),
    ("dut-khoat",   98.00, 104,  8, BA_NOT,    505, 0.65, True,  0.035),
    ("mo-dan",      61.74,  88,  8, NAM_NOT,   606, 0.25, False, 0.050),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--nghe-thu", action="store_true",
                    help="ghi ra /tmp/nhac-thu de nghe truoc, khong dong vao thu vien")
    a = ap.parse_args()

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    ra = Path("/tmp/nhac-thu") if a.nghe_thu else KHO
    ra.mkdir(parents=True, exist_ok=True)

    ds: list[dict] = []
    if not a.nghe_thu and DANH_SACH.exists():
        ds = json.loads(DANH_SACH.read_text(encoding="utf-8"))

    for i, (ten, root, bpm, bars, thang, seed, sang, kep, mat) in enumerate(BAI, 1):
        x = mot_bai(root, bpm, bars, thang, seed, sang, kep, mat)
        giay = len(x) / RATE
        tam = ra / f"_tam-{ten}.wav"
        write(tam, x)

        if a.nghe_thu:
            print(f"  {ten:12s} {giay:5.1f}s  {bpm:3.0f} bpm  -> {tam}")
            continue

        # Vao thu vien duoi dang mp3 da chuan muc, y het bai nap tu ngoai vao,
        # de hai nguon khong lech nhau mot dB nao.
        so = len(ds) + 1
        dich = KHO / f"nhac-{so:02d}.mp3"
        subprocess.run([
            ff, "-y", "-i", str(tam),
            "-af", f"loudnorm=I={MUC_DICH}:TP=-3:LRA=11,afade=t=in:st=0:d=0.4",
            "-ar", "48000", "-ac", "2", "-b:a", "192k", str(dich),
        ], check=True, capture_output=True)
        tam.unlink()
        ds.append({"file": dich.name, "ten": ten, "giay": round(giay, 2),
                   "goc": "tu sinh — khong dinh ban quyen"})
        print(f"  {dich.name}  {ten:12s} {giay:5.1f}s  {bpm:3.0f} bpm")

    if not a.nghe_thu:
        DANH_SACH.write_text(json.dumps(ds, ensure_ascii=False, indent=2), encoding="utf-8")
        tu_sinh = sum(1 for b in ds if "tu sinh" in b.get("goc", ""))
        print(f"\nthu vien: {len(ds)} bai ({tu_sinh} bai tu sinh, khong dinh Content ID)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
