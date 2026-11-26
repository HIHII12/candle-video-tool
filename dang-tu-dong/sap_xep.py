#!/usr/bin/env python3
"""Gom video dang nam rai theo NGAY thanh thu muc theo LOAI, de khoi lan.

Van de: day chuyen luu video theo ngay chay (out/batch/2026-09-10/...), rat hop
ly cho may nhung vo dung voi nguoi dang bai — mot thu muc co ca nen, ca so sanh,
ca market map, ca hai thu tieng. Muon dang mot tuan toan bai so sanh thi phai
boi tay qua sau thu muc.

Cach lam: DUNG LIEN KET CUNG (hard link), khong copy. File chi ton dung mot cho
tren o dia du xuat hien o hai duong dan — 600 MB video khong bien thanh 1,2 GB.
Xoa ben nay khong lam mat ben kia.

    python3 dang-tu-dong/sap_xep.py
    python3 dang-tu-dong/sap_xep.py --ra ~/giao-hang/da-phan-loai
"""

from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

GOC = Path(__file__).resolve().parent.parent
BATCH = GOC / "video-engine" / "out" / "batch"

# Nhan ra loai tu TEN FILE, vi ten file la thu duy nhat con lai sau khi video
# roi khoi day chuyen. Thu tu quan trong: mau khop truoc thang truoc.
LOAI = [
    (r"(^|-)quiz-vs-", "quiz-so-sanh", "Quiz: cai nao la mau X (TREN/DUOI)"),
    (r"(^|-)quiz-", "quiz-mua-ban", "Quiz: mua hay ban"),
    (r"(^|-)lot-", "khoi-luong-lenh", "Bao nhieu lot"),
    (r"(^|-)(sosanh|compare)-", "so-sanh", "So sanh hai mau de nham"),
    (r"(^|-)map-", "market-map", "Ban do thi truong"),
    (r"(^|-)(nen|candle)-", "giai-phau-nen", "Giai phau tung mau nen"),
    (r"(^|-)(concept|kienthuc)-", "khai-niem", "Fibonacci, SMC, dau vai, sideway"),
    (r"(^|-)(setup|replay)-", "setup-co-ten", "Di lai mot setup that"),
]


def doan_tieng(mp4: Path) -> str:
    """Tieng gi — doc tu file .txt di kem, khong doan theo ten file.

    Cac lo dau tien dat ten khong co tien to ngon ngu (candle-hammer-v01.mp4),
    nen suy tu ten se xep nham het chung sang mot ben. File .txt di kem thi
    luon co nhan: "TIEU DE" cho tieng Viet, "TITLE" cho tieng Anh. Doc no la
    doc bang chung, khong phai doan.
    """
    if mp4.name.startswith("vi-"):
        return "viet"
    if mp4.name.startswith("en-"):
        return "global"
    txt = mp4.with_suffix(".txt")
    if txt.exists():
        dau = txt.read_text(encoding="utf-8", errors="ignore")[:400]
        if "TIÊU ĐỀ" in dau or "MÔ TẢ" in dau:
            return "viet"
        if "TITLE" in dau or "DESCRIPTION" in dau:
            return "global"
    return "chua-ro"


def phan_loai(ten: str) -> tuple[str, str]:
    for mau, thu_muc, mo_ta in LOAI:
        if re.search(mau, ten):
            return thu_muc, mo_ta
    return "khac", "chua phan loai"


def doc_loai_bo() -> tuple[set[str], str]:
    """Ten cac video bi loai, va thu muc lo duy nhat duoc phep di qua.

    Chan theo TEN FILE chu khong theo duong dan: cung mot video hong nam o nam
    sau thu muc lo khac nhau (lo goc, lo -nhac, cac lan chay lai), va liet ke
    tung duong dan thi chac chan sot — da sot that, bay cai lot nguoc vao bang
    hang doi sau khi tuong da chan het.

    Ban render lai bang code hien tai cung TRUNG TEN voi ban hong, nen phai co
    mot lo duoc mien tru; moi ban khac cung ten deu bi bo.
    """
    f = Path(__file__).resolve().parent / "loai-bo.txt"
    if not f.exists():
        return set(), ""
    ten, dung_lo = set(), ""
    for d in f.read_text(encoding="utf-8").splitlines():
        d = d.strip()
        if d.startswith("# DUNG_LO:"):
            dung_lo = d.split(":", 1)[1].strip()
        elif d and not d.startswith("#"):
            ten.add(d)
    return ten, dung_lo


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ra", default=str(Path.home() / "giao-hang" / "da-phan-loai"))
    ap.add_argument("--chi-co-nhac", action="store_true",
                    help="chi lay ban da tron nhac (thu muc -nhac)")
    a = ap.parse_args()

    ra = Path(a.ra)
    loai_bo, dung_lo = doc_loai_bo()
    da_loai = 0
    dem: dict[tuple[str, str], int] = {}
    mo_ta_cua: dict[str, str] = {}

    for lo in sorted(BATCH.iterdir()):
        if not lo.is_dir() or lo.name == "nghe-thu":
            continue
        co_nhac = lo.name.endswith("-nhac")
        # Lo goc da co ban -nhac thi bo qua ban goc: dang ban khong nhac la mat
        # cong tron nhac.
        if not co_nhac and (BATCH / f"{lo.name}-nhac").exists():
            continue
        if a.chi_co_nhac and not co_nhac:
            continue

        for mp4 in sorted(lo.glob("*.mp4")):
            if mp4.name in loai_bo and lo.name.replace("-nhac", "") != dung_lo:
                da_loai += 1
                continue
            ten = mp4.name
            tieng = doan_tieng(mp4)
            thu_muc, mo_ta = phan_loai(ten)
            mo_ta_cua[thu_muc] = mo_ta
            dich_lo = ra / tieng / thu_muc
            dich_lo.mkdir(parents=True, exist_ok=True)

            # Hai lo khac ngay co the chua file TRUNG TEN (vi-candle-hammer-v01
            # nam ca o 2026-08-31 lan 2026-09-11). Gom phang vao mot thu muc thi
            # cai sau dung cai truoc. Truoc day no bi bo qua im lang va bo dem
            # van cong — bao 324 trong khi o dia chi co 179.
            # Gio them ngay cua lo vao ten khi va cham, giu ca hai.
            ten_goc = mp4.stem
            if (dich_lo / mp4.name).exists():
                ngay = lo.name.replace("-nhac", "")
                ten_goc = f"{mp4.stem}__{ngay}"

            for f in (mp4, mp4.with_suffix(".txt")):
                if not f.exists():
                    continue
                dich = dich_lo / f"{ten_goc}{f.suffix}"
                if dich.exists():
                    continue
                try:
                    os.link(f, dich)
                except OSError:
                    # Khac o dia thi khong lien ket cung duoc — chep han.
                    import shutil
                    shutil.copy2(f, dich)
            dem[(tieng, thu_muc)] = dem.get((tieng, thu_muc), 0) + 1

    print(f"Da sap xep vao: {ra}\n")
    tong = 0
    for tieng in ("viet", "global", "chua-ro"):
        muc = {k[1]: v for k, v in dem.items() if k[0] == tieng}
        if not muc:
            continue
        print(f"  {tieng.upper()}")
        for thu_muc in sorted(muc, key=lambda x: -muc[x]):
            print(f"    {muc[thu_muc]:4d}  {thu_muc:18s} {mo_ta_cua.get(thu_muc,'')}")
            tong += muc[thu_muc]
        print()
    print(f"  tong {tong} video")
    if da_loai:
        print(f"  (da bo qua {da_loai} ban bi loai — xem dang-tu-dong/loai-bo.txt)")
    print("\n  (lien ket cung — khong ton them dung luong o dia)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
