#!/usr/bin/env python3
"""Sinh cau hinh cho video "Bao nhieu lot?".

Moi video la mot tinh huong khac: so du khac, % rui ro khac, stop khac. Cac con
so deu chon sao cho dap an ra mot muc lot NGUOI THAT hay dung — 0.01 den 1.00 —
chu khong phai 7.3 lot voi tai khoan 500 do.

Stop do bang DO-LA GIA CHAY, khong dung "pip". Mot pip vang la $0.01 voi san
nay, $0.10 voi san kia. Day quan ly von ma lech mot con so khong thi nguoi xem
vao lenh gap muoi lan — nen o day khong dung don vi mo ho do.

    python3 scripts/make_lot_quiz.py --seed 7 --locale vi --out src/data/_run/lot.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

# Muc tai khoan that ma nguoi moi hay co. Khong co $100.000 — kenh nay noi voi
# nguoi dang hoc, va mot vi du ho khong bao gio gap thi ho khong hoc duoc gi.
SO_DU = [500, 1000, 2000, 3000, 5000, 10000]
RUI_RO = [1, 1.5, 2, 3]
# Khoang cach stop tinh bang do-la gia vang. $3 den $15 la vung that cho
# lenh intraday tren XAU — hep hon la bi quet, rong hon la khong con la intraday.
STOP = [3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--locale", default="vi")
    ap.add_argument("--pair", default="XAU/USD")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    s = a.seed
    so_du = SO_DU[s % len(SO_DU)]
    rui_ro = RUI_RO[(s // 6) % len(RUI_RO)]
    stop = STOP[(s // 3) % len(STOP)]

    tien_rui = so_du * rui_ro / 100
    moi_lot = stop * 100
    lot = int((tien_rui / moi_lot) / 0.01) * 0.01

    # Dap an 0.00 lot la mot video vo nghia: no bao nguoi xem "tai khoan nay
    # khong vao duoc lenh nay", dung ve ky thuat nhung khong day duoc gi.
    # Noi stop lai cho toi khi ra mot con so vao duoc.
    while lot < 0.01 and stop > STOP[0]:
        stop = STOP[max(0, STOP.index(stop) - 1)]
        moi_lot = stop * 100
        lot = int((tien_rui / moi_lot) / 0.01) * 0.01
    if lot < 0.01:
        # Tai khoan qua nho cho moi muc stop — nang % rui ro len muc cao nhat
        # con hop ly thay vi de video ra so 0.
        rui_ro = 3
        tien_rui = so_du * rui_ro / 100
        lot = int((tien_rui / moi_lot) / 0.01) * 0.01

    cfg = {
        "kind": "lotQuiz",
        "locale": a.locale,
        "pair": a.pair,
        "soDu": so_du,
        "ruiRo": rui_ro,
        "stopDo": stop,
        "ozMotLot": 100,
        "buocLot": 0.01,
        "brandMark": None,
        "nhac": None,
    }
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  so du ${so_du} · rui ro {rui_ro}% · stop ${stop:.2f} -> {lot:.2f} lot")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
