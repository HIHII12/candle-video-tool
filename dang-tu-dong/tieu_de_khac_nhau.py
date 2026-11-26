#!/usr/bin/env python3
"""Ep moi tieu de trong hang doi la DUY NHAT.

Vi sao can: 66 video quiz global deu mang dung mot tieu de
"Buy or sell this chart?". Dang 66 lan cung mot dong chu len mot kenh thi
YouTube doc la trung lap, va nguoi luot thay kenh nhu bi hong.

Khong duoc chua bang cach ghep TEN MAU NEN vao tieu de — voi quiz mua/ban
thi ten mau chinh la DAP AN. Nen doi cach HOI, khong doi cau tra loi.

    python3 dang-tu-dong/tieu_de_khac_nhau.py /root/giao-hang/hang-doi-GLOBAL.csv
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

# Cung mot cau hoi, 12 cach hoi. Khong cai nao lo dap an.
HOI_EN = [
    "Buy or sell this chart?",
    "Long or short here?",
    "Which side is in control?",
    "Would you take this trade?",
    "Buy, sell, or stay out?",
    "What is this candle telling you?",
    "One candle. Buy or sell?",
    "Can you call this one?",
    "Bulls or bears on this bar?",
    "Your read: up or down?",
    "Where does price go next?",
    "Read this bar before the answer",
]
DUOI_EN = [
    "No indicators",
    "Price action only",
    "One bar, one decision",
    "Read the wick",
    "5-second test",
    "Beginner check",
]
DUOI_VI = [
    "Doc nhanh",
    "Khong chi bao",
    "Chi co gia",
    "Nhin bong nen",
    "Kiem tra 5 giay",
    "Nguoi moi thu",
]
# Tieng Viet co dau — de rieng, file nay luu utf-8.
DUOI_VI = [
    "Đọc nhanh",
    "Không chỉ báo",
    "Chỉ có giá",
    "Nhìn bóng nến",
    "Kiểm tra 5 giây",
    "Người mới thử",
]


def da_dang(dong: list[dict]) -> tuple[list[dict], int]:
    """Tra ve hang doi da sua + so tieu de bi doi."""
    doi = 0

    # Buoc 1: khoi quiz mua/ban tieng Anh — thay han cach hoi.
    khoi = [d for d in dong if d.get("tieu_de") == "Buy or sell this chart?"]
    for i, d in enumerate(khoi):
        hoi = HOI_EN[i % len(HOI_EN)]
        duoi = DUOI_EN[(i // len(HOI_EN)) % len(DUOI_EN)]
        d["tieu_de"] = f"{hoi} · {duoi}" if i >= len(HOI_EN) else hoi
        doi += 1

    # Buoc 2: con trung thi them mot ve phu trung tinh.
    da_thay: set[str] = set()
    for d in dong:
        t = (d.get("tieu_de") or "").strip()
        if t not in da_thay:
            da_thay.add(t)
            continue
        pool = DUOI_EN if d.get("kenh") == "GoldFather FX" else DUOI_VI
        for duoi in pool:
            moi = f"{t} · {duoi}"
            if moi not in da_thay:
                d["tieu_de"] = moi
                da_thay.add(moi)
                doi += 1
                break
        else:  # het ve phu — danh so, van hon la de trung
            k = 2
            while f"{t} ({k})" in da_thay:
                k += 1
            d["tieu_de"] = f"{t} ({k})"
            da_thay.add(d["tieu_de"])
            doi += 1

    return dong, doi


def main() -> int:
    for duong in sys.argv[1:]:
        p = Path(duong)
        rows = list(csv.DictReader(p.open(encoding="utf-8-sig")))
        if not rows:
            print(f"{p.name}: rong"); continue
        rows, doi = da_dang(rows)
        with p.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader(); w.writerows(rows)
        rieng = len({r["tieu_de"] for r in rows})
        print(f"{p.name}: {len(rows)} dong · {rieng} tieu de rieng · doi {doi}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
