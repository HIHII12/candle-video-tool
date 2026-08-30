#!/usr/bin/env python3
"""Dung cau hinh cho video SO SANH hai mau nen de nham.

Vi sao them format nay: bon format cu deu tra loi cung mot cau — "day la cai
gi". Khong cai nao tra loi cau ma nguoi moi hoc thuc su hoi, la "hai cai nay
nhin y het nhau, lam sao phan biet". Do la cau hoi lam nguoi ta vao lenh sai,
va no can hai cai chart canh nhau moi tra loi duoc.

Moi cap deu la cap NHAM THAT, khong phai hai cai ngau nhien ghep lai:
mot phep do duy nhat tach chung ra, va phep do do la thu duy nhat video noi.

    python3 scripts/make_candle_compare.py --pair hammer-vs-dragonfly --seed 7
    python3 scripts/make_candle_compare.py --pair hammer-vs-dragonfly --locale vi
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_candle_lesson import BUILDERS, Rng, make  # noqa: E402

# Moi cap: hai mau, phep do tach chung, va cau chot.
#
# `metric` la thu duoc ve len ca hai cay nen cung luc — do la toan bo lap luan
# cua video. `en`/`vi` la cach goi phep do do bang chu.
PAIRS = {
    "hammer-vs-dragonfly": {
        "left": "hammer",
        "right": "dragonfly-doji",
        "metric": "body",
        "en": {
            "title": "Hammer or Dragonfly?",
            "same": "Same long lower wick. Same rejection.",
            "diff": "Measure the body.",
            "left_is": "A body you can see — buyers closed away from the low",
            "right_is": "Almost no body — open and close met at the top",
            "why": "One says buyers took control. The other says nobody did.",
        },
        "vi": {
            "title": "Nến Búa hay Doji Chuồn Chuồn?",
            "same": "Cùng một cái bóng dưới dài. Cùng một cú từ chối.",
            "diff": "Đo cái thân nến.",
            "left_is": "Thân nhìn thấy được — bên mua đóng cửa cách xa đáy",
            "right_is": "Gần như không có thân — giá mở và đóng gặp nhau ở đỉnh",
            "why": "Một cái nói bên mua đã cầm trịch. Cái kia nói không ai cả.",
        },
    },
    "star-vs-gravestone": {
        "left": "shooting-star",
        "right": "gravestone-doji",
        "metric": "body",
        "en": {
            "title": "Shooting Star or Gravestone?",
            "same": "Same long upper wick. Same rejection at the high.",
            "diff": "Measure the body.",
            "left_is": "A body you can see — sellers closed away from the high",
            "right_is": "Almost no body — open and close met at the bottom",
            "why": "One says sellers took control. The other says nobody did.",
        },
        "vi": {
            "title": "Sao Băng hay Doji Bia Mộ?",
            "same": "Cùng một cái bóng trên dài. Cùng một cú từ chối ở đỉnh.",
            "diff": "Đo cái thân nến.",
            "left_is": "Thân nhìn thấy được — bên bán đóng cửa cách xa đỉnh",
            "right_is": "Gần như không có thân — giá mở và đóng gặp nhau ở đáy",
            "why": "Một cái nói bên bán đã cầm trịch. Cái kia nói không ai cả.",
        },
    },
    "morning-vs-evening": {
        "left": "morning-star",
        "right": "evening-star",
        "metric": "direction",
        "en": {
            "title": "Morning Star or Evening Star?",
            "same": "Three bars. Big, small, big. Identical shape.",
            "diff": "Read the leg that came before.",
            "left_is": "Arrives after a down leg — it turns price up",
            "right_is": "Arrives after an up leg — it turns price down",
            "why": "The shape is the same. The context is the whole signal.",
        },
        "vi": {
            "title": "Sao Mai hay Sao Hôm?",
            "same": "Ba cây nến. To, nhỏ, to. Hình y hệt nhau.",
            "diff": "Đọc nhịp giá đi trước nó.",
            "left_is": "Đến sau một nhịp giảm — nó bẻ giá lên",
            "right_is": "Đến sau một nhịp tăng — nó bẻ giá xuống",
            "why": "Hình thì giống. Bối cảnh mới là toàn bộ tín hiệu.",
        },
    },
    "engulfing-pair": {
        "left": "bullish-engulfing",
        "right": "bearish-engulfing",
        "metric": "direction",
        "en": {
            "title": "Which engulfing is this?",
            "same": "One bar swallowing the last one. Same mechanic.",
            "diff": "Read which body did the swallowing.",
            "left_is": "A green body over a red one — after a down leg",
            "right_is": "A red body over a green one — after an up leg",
            "why": "Trading the wrong one is trading the exact opposite side.",
        },
        "vi": {
            "title": "Nhấn chìm nào đây?",
            "same": "Một cây nuốt trọn cây trước. Cùng một cơ chế.",
            "diff": "Đọc xem thân nào nuốt thân nào.",
            "left_is": "Thân xanh trùm thân đỏ — sau một nhịp giảm",
            "right_is": "Thân đỏ trùm thân xanh — sau một nhịp tăng",
            "why": "Đọc nhầm cái này là vào lệnh ngược hẳn phe.",
        },
    },
    "tweezer-pair": {
        "left": "tweezer-bottom",
        "right": "tweezer-top",
        "metric": "direction",
        "en": {
            "title": "Tweezer top or bottom?",
            "same": "Two bars stopping at the same price. Twice refused.",
            "diff": "Read which end they stopped at.",
            "left_is": "Two matching lows — a floor",
            "right_is": "Two matching highs — a ceiling",
            "why": "Same refusal, opposite side of the trade.",
        },
        "vi": {
            "title": "Đỉnh nhíp hay đáy nhíp?",
            "same": "Hai cây dừng ở đúng một giá. Hai lần bị từ chối.",
            "diff": "Đọc xem chúng dừng ở đầu nào.",
            "left_is": "Hai cái đáy trùng nhau — một cái sàn",
            "right_is": "Hai cái đỉnh trùng nhau — một cái trần",
            "why": "Cùng một cú từ chối, ngược hẳn phe vào lệnh.",
        },
    },
    "doji-vs-marubozu": {
        "left": "doji",
        "right": "marubozu",
        "metric": "body",
        "en": {
            "title": "The two extremes",
            "same": "Both are one bar. Both look decisive on a screenshot.",
            "diff": "Measure body against range.",
            "left_is": "Body under 5% of the range — nobody won the session",
            "right_is": "Body is nearly the whole range — one side owned it",
            "why": "These are the ends of the same scale. Everything else sits between.",
        },
        "vi": {
            "title": "Hai thái cực",
            "same": "Đều là một cây nến. Chụp màn hình lên đều trông dứt khoát.",
            "diff": "Đo thân so với biên độ.",
            "left_is": "Thân dưới 5% biên độ — không ai thắng phiên đó",
            "right_is": "Thân gần bằng cả biên độ — một bên cầm trịch",
            "why": "Đây là hai đầu của cùng một thước. Mọi thứ khác nằm ở giữa.",
        },
    },
}


def side(name: str, seed: int, locale: str) -> dict:
    """One half of the comparison: the pattern and just enough around it."""
    cfg = make(name, seed, locale)
    idx = cfg["pattern"]["indices"]
    # Only the approach leg and the pattern. The follow-through is what the
    # single-pattern format is for; here the shape itself is the whole subject,
    # and trailing bars would just make each chart smaller.
    end = idx[-1] + 1
    return {
        "name": cfg["pattern"]["name"],
        "bias": cfg["pattern"]["bias"],
        "candles": cfg["candles"][:end],
        "indices": idx,
    }


def build(pair: str, seed: int, locale: str) -> dict:
    spec = PAIRS[pair]
    copy = spec[locale if locale in spec else "en"]
    return {
        "kind": "candleCompare",
        "locale": locale,
        "pair": pair,
        "metric": spec["metric"],
        "title": copy["title"],
        "same": copy["same"],
        "diff": copy["diff"],
        "why": copy["why"],
        "left": {**side(spec["left"], seed, locale), "verdict": copy["left_is"]},
        "right": {**side(spec["right"], seed * 3 + 11, locale), "verdict": copy["right_is"]},
        "note": ("Minh hoạ - chuỗi giá dựng lại, không phải biểu đồ thật"
                 if locale == "vi"
                 else "Illustration - constructed price series, not a live chart"),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pair", choices=sorted(PAIRS), required=True)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--locale", choices=("en", "vi"), default="en")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    cfg = build(a.pair, a.seed, a.locale)
    out = Path(a.out) if a.out else Path(__file__).resolve().parents[1] / "src/data/_compare.json"
    if not out.is_absolute():
        out = Path(__file__).resolve().parents[1] / out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out}")
    print(f"  {cfg['title']}")
    print(f"  trai : {cfg['left']['name']} ({len(cfg['left']['candles'])} nen)")
    print(f"  phai : {cfg['right']['name']} ({len(cfg['right']['candles'])} nen)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
