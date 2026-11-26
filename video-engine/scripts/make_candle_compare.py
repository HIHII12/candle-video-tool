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
    "hammer-vs-hanging-man": {
        "left": "hammer", "right": "hanging-man", "metric": "body",
        "en": {"title": "Same candle, opposite meaning",
               "same": "Identical shape. Long lower wick, small body on top.",
               "diff": "Look at the leg BEFORE it.",
               "left_is": "After a fall - buyers took the low back",
               "right_is": "After a rise - the same shape, at the wrong end",
               "why": "The only difference is the trend it appears in. That is the whole lesson."},
        "vi": {"title": "Cùng một cây nến, ngược nghĩa nhau",
               "same": "Hình dạng y hệt. Bóng dưới dài, thân nhỏ nằm trên.",
               "diff": "Nhìn cái nhịp TRƯỚC nó.",
               "left_is": "Sau nhịp giảm — bên mua lấy lại vùng đáy",
               "right_is": "Sau nhịp tăng — cùng hình dạng, sai đầu",
               "why": "Khác biệt duy nhất là xu hướng nó nằm trong. Đó là toàn bộ bài học."},
    },
    "hammer-vs-inverted": {
        "left": "hammer", "right": "inverted-hammer", "metric": "lower",
        "en": {"title": "Two hammers, one is weaker",
               "same": "Both after a fall. Both a small body and one long wick.",
               "diff": "Measure the lower wick.",
               "left_is": "The wick is below - buyers defended the low",
               "right_is": "The wick is above - buyers tried up there and failed",
               "why": "One shows buying AT the low. The other shows buying that got rejected."},
        "vi": {"title": "Hai cây búa, một cây yếu hơn",
               "same": "Cùng sau nhịp giảm. Cùng thân nhỏ và một bóng dài.",
               "diff": "Đo cái bóng dưới.",
               "left_is": "Bóng nằm dưới — bên mua giữ được vùng đáy",
               "right_is": "Bóng nằm trên — bên mua thử ở trên và thất bại",
               "why": "Một cái cho thấy mua NGAY tại đáy. Cái kia cho thấy mua rồi bị đẩy về."},
    },
    "harami-vs-engulfing": {
        "left": "bullish-harami", "right": "bullish-engulfing", "metric": "body",
        "en": {"title": "Inside, or over the top?",
               "same": "Two bars. A red one, then a green one. Both called reversals.",
               "diff": "Measure the second body.",
               "left_is": "Sits INSIDE the first - the fall paused",
               "right_is": "Covers the first whole - the fall was taken back",
               "why": "A pause is not a reversal. Sizing the second bar is the difference."},
        "vi": {"title": "Nằm trong, hay trùm lên?",
               "same": "Hai cây. Một đỏ, rồi một xanh. Cả hai đều bị gọi là đảo chiều.",
               "diff": "Đo cái thân cây thứ hai.",
               "left_is": "Nằm TRONG cây một — nhịp giảm chững lại",
               "right_is": "Trùm hết cây một — nhịp giảm bị lấy lại",
               "why": "Chững lại không phải đảo chiều. Đo cây thứ hai là ra."},
    },
    "piercing-vs-engulfing": {
        "left": "piercing-line", "right": "bullish-engulfing", "metric": "body",
        "en": {"title": "Half the body, or all of it?",
               "same": "A down bar, then an up bar that closes back into it.",
               "diff": "Measure how far the second closes.",
               "left_is": "Past the MIDPOINT - half the selling undone",
               "right_is": "Past the whole body - all of it undone",
               "why": "Same story, different strength. Do not treat them as the same signal."},
        "vi": {"title": "Nửa thân, hay cả thân?",
               "same": "Một cây giảm, rồi một cây tăng đóng ngược vào nó.",
               "diff": "Đo xem cây hai đóng tới đâu.",
               "left_is": "Qua ĐIỂM GIỮA — một nửa lực bán bị xoá",
               "right_is": "Qua hết thân — toàn bộ bị xoá",
               "why": "Cùng câu chuyện, khác độ mạnh. Đừng coi hai cái là một."},
    },
    "spinning-vs-doji": {
        "left": "spinning-top", "right": "doji", "metric": "body",
        "en": {"title": "A small body, or no body?",
               "same": "Long wicks both ways. Both say nobody won the session.",
               "diff": "Measure the body.",
               "left_is": "A body you can see - one side edged it",
               "right_is": "No body at all - a dead heat",
               "why": "The doji is the stronger warning. The spinning top still had a winner."},
        "vi": {"title": "Thân nhỏ, hay không có thân?",
               "same": "Bóng dài cả hai phía. Cả hai đều nói không ai thắng phiên đó.",
               "diff": "Đo cái thân.",
               "left_is": "Thân nhìn thấy được — một bên nhỉnh hơn",
               "right_is": "Không có thân — hoà tuyệt đối",
               "why": "Doji là cảnh báo mạnh hơn. Con Xoay vẫn còn một bên nhỉnh."},
    },
    "marubozu-pair": {
        "left": "bullish-marubozu", "right": "bearish-marubozu", "metric": "direction",
        "en": {"title": "Which side ran the whole session?",
               "same": "All body, no wicks. One side held from open to close.",
               "diff": "Read the bar.",
               "left_is": "Opened at the low, closed at the high",
               "right_is": "Opened at the high, closed at the low",
               "why": "Its opposite end becomes the level. Get the direction wrong and so is the stop."},
        "vi": {"title": "Bên nào cầm cả phiên?",
               "same": "Toàn thân, không bóng. Một bên giữ từ mở đến đóng.",
               "diff": "Đọc cả cây nến.",
               "left_is": "Mở tại đáy, đóng tại đỉnh",
               "right_is": "Mở tại đỉnh, đóng tại đáy",
               "why": "Đầu ngược lại của nó thành mức giá. Sai chiều thì sai luôn dừng lỗ."},
    },
    "soldiers-vs-crows": {
        "left": "three-white-soldiers", "right": "three-black-crows", "metric": "direction",
        "en": {"title": "Three bars, which way?",
               "same": "Three long bars in a row, small wicks, one direction.",
               "diff": "Read the bar.",
               "left_is": "Three higher closes - buyers held for three sessions",
               "right_is": "Three lower closes - sellers held for three sessions",
               "why": "By the third bar most of the move is spent. Enter on the pullback either way."},
        "vi": {"title": "Ba cây, đi hướng nào?",
               "same": "Ba cây dài liên tiếp, bóng nhỏ, cùng một chiều.",
               "diff": "Đọc cả cây nến.",
               "left_is": "Ba lần đóng cao hơn — bên mua giữ ba phiên",
               "right_is": "Ba lần đóng thấp hơn — bên bán giữ ba phiên",
               "why": "Tới cây ba là hết phần lớn con sóng. Chiều nào cũng vào ở nhịp lùi."},
    },
    "star-vs-doji-star": {
        "left": "morning-star", "right": "morning-doji-star", "metric": "body",
        "en": {"title": "Which morning star is stronger?",
               "same": "Three bars. Down, small middle, up. Same name on most charts.",
               "diff": "Measure the middle body.",
               "left_is": "A small body - one side still edged it",
               "right_is": "A doji - a complete standstill before the turn",
               "why": "The flatter the middle bar, the cleaner the handover. That is why the doji version is graded higher."},
        "vi": {"title": "Sao Mai nào mạnh hơn?",
               "same": "Ba cây. Giảm, giữa nhỏ, tăng. Trên chart đa số gọi chung một tên.",
               "diff": "Đo cái thân cây giữa.",
               "left_is": "Thân nhỏ — một bên vẫn còn nhỉnh",
               "right_is": "Doji — đứng hẳn lại trước khi quay đầu",
               "why": "Cây giữa càng phẳng, cú chuyển giao càng sạch. Vì thế bản doji được đánh giá cao hơn."},
    },
    "belt-vs-marubozu": {
        "left": "bullish-belt-hold", "right": "bullish-marubozu", "metric": "upper",
        "en": {"title": "One clean end, or two?",
               "same": "A long up bar that opens at its low. Both look like total control.",
               "diff": "Measure the upper wick.",
               "left_is": "There is one - the push met something at the top",
               "right_is": "There is none - it closed on its high",
               "why": "The wick is where the buying stopped. No wick means it never did."},
        "vi": {"title": "Một đầu sạch, hay hai đầu?",
               "same": "Một cây tăng dài mở tại đáy. Cả hai nhìn như kiểm soát tuyệt đối.",
               "diff": "Đo cái bóng trên.",
               "left_is": "Có bóng — cú đẩy gặp thứ gì đó ở trên",
               "right_is": "Không có bóng — nó đóng ngay tại đỉnh",
               "why": "Cái bóng là chỗ lực mua dừng lại. Không bóng nghĩa là nó không hề dừng."},
    },
    "doji-vs-gravestone": {
        "left": "doji",
        "right": "gravestone-doji",
        "metric": "upper",
        "en": {
            "title": "Not every doji is the same doji",
            "same": "Both have almost no body. Both get called 'a doji'.",
            "diff": "Measure the upper wick.",
            "left_is": "Wicks both ways — the session went nowhere",
            "right_is": "The wick is the whole bar — price was pushed up and sent back",
            "why": "One is indecision. The other is a rejection, and it has a direction.",
        },
        "vi": {
            "title": "Không phải Doji nào cũng như nhau",
            "same": "Cả hai gần như không có thân. Cả hai đều bị gọi là 'doji'.",
            "diff": "Đo cái bóng trên.",
            "left_is": "Bóng cả hai phía — cả phiên đi không tới đâu",
            "right_is": "Bóng chiếm cả cây nến — giá bị đẩy lên rồi trả về",
            "why": "Một cái là do dự. Cái kia là từ chối, và nó có hướng.",
        },
    },
    "doji-vs-dragonfly": {
        "left": "doji",
        "right": "dragonfly-doji",
        "metric": "lower",
        "en": {
            "title": "Two dojis, one direction",
            "same": "No body on either. Same name on most charts.",
            "diff": "Measure the lower wick.",
            "left_is": "Short wicks both ways — nobody committed",
            "right_is": "The wick is the whole bar — price was sold down and bought straight back",
            "why": "The first says wait. The second says buyers turned up, and where.",
        },
        "vi": {
            "title": "Hai cây Doji, một cái có hướng",
            "same": "Cả hai đều không có thân. Trên chart đa số gọi chung một tên.",
            "diff": "Đo cái bóng dưới.",
            "left_is": "Bóng ngắn cả hai phía — không bên nào dứt khoát",
            "right_is": "Bóng chiếm cả cây nến — giá bị bán xuống rồi mua ngược lên ngay",
            "why": "Cái đầu bảo chờ. Cái sau chỉ ra bên mua đã vào, và vào ở đâu.",
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
