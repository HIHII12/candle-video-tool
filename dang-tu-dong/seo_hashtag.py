#!/usr/bin/env python3
"""Doi ten kenh + bo hashtag toi uu tim kiem cho hang doi.

Vi sao doi hashtag: bo cu (#nennhatban #hoctrade ...) chi noi video NOI VE GI,
khong noi nguoi xem DANG TIM GI. Nguoi tim vang go "xauusd" hoac "gold", khong
go "nennhatban". YouTube chi hien BA hashtag dau tien phia tren tieu de — nen
ba cai dau phai la ba tu dang tien nhat, con lai xep sau.

Them mot dong khoa o cuoi mo ta: YouTube doc dong dau va cuoi mo ta manh hon
phan giua. Mot dong, khong nhoi tu — nhoi tu thi bi phat.

    python3 dang-tu-dong/seo_hashtag.py /root/giao-hang/hang-doi-VIET.csv
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

# Ba cai dau la ba cai hien len man hinh. Cai cuoi la thuong hieu — de nguoi
# xem go ten kenh ra dung kenh.
HASHTAG = {
    "Van Thang Trading":
        "#xauusd #vang #nennhatban #priceaction #hoctrade #forex #trading #vanthangtrading",
    "GoldFather FX":
        "#xauusd #gold #candlestick #priceaction #forex #trading #daytrading #goldfatherfx",
}

DONG_KHOA = {
    "Van Thang Trading": "XAUUSD · vàng · price action · đọc nến — Van Thang Trading",
    "GoldFather FX": "XAUUSD · gold · price action · candlestick reading — GoldFather FX",
}

DOI_TEN = {"Van Thang Invest": "Van Thang Trading"}


def main() -> int:
    for duong in sys.argv[1:]:
        p = Path(duong)
        rows = list(csv.DictReader(p.open(encoding="utf-8-sig")))
        for r in rows:
            r["kenh"] = DOI_TEN.get(r["kenh"], r["kenh"])
            kenh = r["kenh"]
            r["hashtag"] = HASHTAG[kenh]
            khoa = DONG_KHOA[kenh]
            mo = r["mo_ta"].rstrip()
            # Chay lai nhieu lan cung khong dan hai dong khoa chong len nhau.
            if not mo.endswith(khoa):
                mo = f"{mo}\n\n{khoa}"
            r["mo_ta"] = mo
        with p.open("w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader(); w.writerows(rows)
        kenh = rows[0]["kenh"]
        print(f"{p.name}: {len(rows)} dong · kenh = {kenh} · {p.stat().st_size} byte")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
