#!/usr/bin/env python3
"""Bao nhieu ban do thi truong cung duoc, khong can mang.

Vi sao co file nay: `make_market_map.py` doc gia that tu Yahoo — do la cach
dung cho ban do HANG NGAY, va tren may co mang thi cu dung no. Nhung repo chi
co san 6 config da fetch, ma 50 video tu 6 config la moi cai lap 8 lan — dung
cai loi "mot kieu content" da mac mot lan roi.

Cai duy nhat dung lai o day la CHUOI GIA. Toan bo phan doc ban do — vung thanh
khoan, order block, khoang nhay gia chua lap, diem doi tinh chat, duong xu
huong, va ke hoach — van chay bang dung ham do luong cua make_market_map.py
tren chuoi do. Nen ban do van la mot phep DO, chi la do tren mot thi truong
dung lai. Video ghi ro dieu do.

    python3 scripts/make_map_offline.py --seed 7 --pair XAU/USD --timeframe H1
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_market_map import build  # noqa: E402
from make_candle_lesson import Rng  # noqa: E402

STEP = {"H1": 3600, "H4": 14400, "D1": 86400}
T0 = 1_700_000_000

# Tung san pham co bien do rieng. Mot chuoi vang dao dong 0,1% mot cay thi khong
# ai nhin ra la vang, va mot chuoi dau dao dong 2% mot cay thi khong ai nhin ra
# la chart.
INSTRUMENTS = {
    "XAU/USD": {"base": 2380.0, "vol": 0.0042},
    "XAG/USD": {"base": 30.5, "vol": 0.0075},
    "WTI/USD": {"base": 78.4, "vol": 0.0090},
    "EUR/USD": {"base": 1.0850, "vol": 0.0022},
    "BTC/USD": {"base": 64500.0, "vol": 0.0110},
}


def series(rng: Rng, base: float, vol: float, bars: int, step: int) -> list[dict]:
    """Mot chuoi gia co CAU TRUC, khong phai nhieu ngau nhien.

    Ban do can bon thu de doc duoc: nhung doan chay co huong, nhung doan di
    ngang giua chung, vai cay day manh (chinh no de lai order block), va vai
    khoang nhay gia chua lap. Mot buoc ngau nhien thuan tuy khong de lai cai
    nao trong bon — no cho ra mot dam nen khong co gi de danh dau, va ham
    build() se bao 'khong tim thay vung nao'.
    """
    out: list[dict] = []
    price = base
    i = 0
    while i < bars:
        roll = rng.next()
        if roll < 0.34:
            kind, n = "trend", int(rng.span(6, 11))
            drift = vol * rng.span(0.55, 1.15) * (1 if rng.next() < 0.5 else -1)
        elif roll < 0.62:
            kind, n = "range", int(rng.span(6, 12))
            drift = 0.0
        else:
            # Cu day: 2-3 cay lon cung chieu. Day la thu tao ra order block va
            # khoang nhay gia — hai thu ban do song bang.
            kind, n = "push", int(rng.span(2, 4))
            drift = vol * rng.span(1.5, 2.4) * (1 if rng.next() < 0.5 else -1)

        for _ in range(min(n, bars - i)):
            body = price * vol * rng.span(0.25, 1.1)
            move = price * drift + body * (rng.span(-1, 1) if kind != "push" else rng.span(0.2, 1))
            if kind == "range":
                # Keo ve giua bien, nen doan di ngang thuc su di ngang.
                move += (base - price) * 0.04
            # Tran cho mot cay nen. Khong co no, mot doan "push" cong don ra
            # nhung cay dai bang mot phan ba khung hinh — thi truong that khong
            # in ra nhung cay nhu the, va mot cay nhu the nuot het cho cua ca
            # phan con lai cua bieu do.
            cap = price * vol * 3.2
            move = max(-cap, min(cap, move))
            open_ = price
            close = price + move
            size = abs(close - open_)
            wick = max(price * vol * 0.12, size * rng.span(0.2, 0.9))
            out.append({
                "time": T0 + i * step,
                "open": round(open_, 4),
                "high": round(max(open_, close) + wick * rng.span(0.3, 1.0), 4),
                "low": round(min(open_, close) - wick * rng.span(0.3, 1.0), 4),
                "close": round(close, 4),
            })
            price = close
            i += 1
    return out


def make(seed: int, pair: str, timeframe: str, bars: int, project: int) -> dict:
    spec = INSTRUMENTS[pair]
    step = STEP.get(timeframe, 3600)
    # build() tu bao loi khi chuoi khong du cau truc de ve. Doi seed va thu lai
    # thay vi ha tieu chuan: mot ban do khong co vung nao la mot video khong co
    # gi de noi.
    last = None
    for attempt in range(24):
        rng = Rng(seed * 7919 + attempt * 104729)
        candles = series(rng, spec["base"], spec["vol"], bars + 40, step)
        try:
            cfg = build(candles, pair, timeframe, bars, project)
        except SystemExit as err:
            last = err
            continue
        if len(cfg["zones"]) >= 3 and len(cfg["path"]) >= 2:
            cfg["note"] = "map-offline"
            return cfg
        last = SystemExit("qua it vung")
    raise SystemExit(f"khong dung duoc ban do sau 24 lan thu: {last}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--pair", default="XAU/USD", choices=sorted(INSTRUMENTS))
    ap.add_argument("--timeframe", default="H1", choices=sorted(STEP))
    ap.add_argument("--bars", type=int, default=64)
    ap.add_argument("--project", type=int, default=30)
    ap.add_argument("--locale", choices=("en", "vi"), default="vi")
    ap.add_argument("--out", default="src/data/_map.json")
    a = ap.parse_args()

    cfg = make(a.seed, a.pair, a.timeframe, a.bars, a.project)
    cfg["locale"] = a.locale
    out = Path(a.out)
    if not out.is_absolute():
        out = Path(__file__).resolve().parents[1] / out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out}")
    print(f"  {cfg['pair']} {cfg['timeframe']} · thien huong {cfg['bias']} · "
          f"{len(cfg['zones'])} vung · {len(cfg['choch'])} CHoCH · "
          f"{len(cfg['path'])} diem ke hoach")
    return 0


if __name__ == "__main__":
    sys.exit(main())
