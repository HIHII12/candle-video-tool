#!/usr/bin/env python3
"""Dung cau hinh cho video KIEN THUC — thu lon hon mot cay nen.

Vi sao co file nay: muoi ba bai hoc mau nen deu tra loi cung mot cau hoi o cung
mot co — "cay nen nay la gi". Nhung thu that su quyet dinh mot lenh thi lon hon
mot cay nen: Fibonacci, vung lenh, quet thanh khoan, doi cau truc, Vai Dau Vai,
Hai Day, va cai thi truong lam nhieu nhat — di ngang.

Bay chu de o day dung LAI dung khuon ke chuyen cua bai hoc mau nen (giai phau ->
quy tac -> vao lenh -> su that), va dung chung mot lop ve (src/Marks.tsx) mo ta
bang DU LIEU. Nen them mot chu de moi la them mot muc trong bang duoi day,
khong phai viet them mot component.

    python3 scripts/make_concept_lesson.py --topic fibonacci --seed 7 --locale vi
    python3 scripts/make_concept_lesson.py --topic sideway --locale vi
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_candle_lesson import (  # noqa: E402
    LOSS_RATE,
    Rng,
    candle,
    drift,
)

T0 = 1_700_000_000
STEP = 3600
BASE = 2000.0
# Bars of follow-through added after every setup, so the trade can resolve on
# screen instead of the video ending mid-position.
FOLLOW = 14
# Hard ceiling on the follow-through, so a leg that refuses to resolve ends the
# video honestly as "still open" rather than running to a hundred bars.
FOLLOW_MAX = 30


# --- cong cu dung chung -----------------------------------------------------

def leg(rng: Rng, start: float, bars: int, total_move: float, i0: int) -> list[dict]:
    """Mot doan gia di tu `start` toi DUNG `start + total_move` trong `bars` cay.

    Diem cuoi la CHAC CHAN, do gap ghenh o giua la ngau nhien.

    Ban dau ham nay chi la mot buoc ngau nhien co thien huong, va no khong bao
    gio toi dung cho: dung no de dung Vai Dau Vai thi 29 tren 60 seed cho ra cai
    "dau" khong cao hon hai vai — tuc la video doc quy tac cua chinh no de len
    mot cai chart vi pham quy tac do. Hinh dang la LOI KHANG DINH cua video, nen
    no phai la thu duoc dat ra, khong phai thu duoc hy vong.

    Cach lam: di bo ngau nhien nhu cu, roi keo dan lai theo ti le sao cho cay
    cuoi dong dung o dich. Ti le hoa giu nguyen nhip nhap nho, chi bo cai troi
    dat cua tong duong di.
    """
    bars = max(1, int(bars))
    # Buoc di tho: co thien huong, mot phan tu so cay keo nguoc, nhu leg that.
    steps = []
    for _ in range(bars):
        step = rng.span(0.35, 1.6)
        if rng.next() < 0.25:
            step = -step * rng.span(0.3, 0.8)
        steps.append(step)
    total = sum(steps)
    # Neu buoc di tho tinh co gan bang khong thi khong co gi de keo dan; rai deu.
    if abs(total) < 1e-6:
        steps = [1.0] * bars
        total = float(bars)
    scale = total_move / total

    end = start + total_move
    lo_c, hi_c = min(start, end), max(start, end)
    # Han cho bong nen duoc phep tho ra khoi hanh lang.
    slack = max(0.5, abs(total_move) * 0.06)

    out = []
    price = start
    for i, st in enumerate(steps):
        close = price + st * scale
        # Giu trong hanh lang [start, end].
        #
        # Chi keo dan diem CUOI thoi thi chua du: mot buoc 1.6 roi mot buoc lui
        # 0.8 van dua gia vot len cao hon dich o giua duong, va do dung la cach
        # cai "vai trai" leo cao hon "dau" — dinh cua doan nam o giua doan, chu
        # khong nam o cuoi.
        close = min(hi_c, max(lo_c, close))
        # Cay cuoi dong DUNG o dich. Viec kep hanh lang o tren lam lech tong
        # duong di, nen bao dam cua phep keo dan khong con dung nua — va mot
        # doan lech vai don vi la du de "vai phai" cham toi "dau".
        if i == bars - 1:
            close = end
        size = abs(close - price)
        top = min(hi_c + slack, max(price, close) + max(0.4, size * rng.span(0.15, 0.75)))
        bottom = max(lo_c - slack, min(price, close) - max(0.4, size * rng.span(0.15, 0.75)))
        out.append(candle(i0 + i, price, close,
                          up_wick=top - max(price, close),
                          low_wick=min(price, close) - bottom))
        price = close
    return out


def flat(rng: Rng, start: float, bars: int, width: float, i0: int) -> list[dict]:
    """Di ngang trong mot bien do — chan tren va chan duoi duoc TON TRONG.

    Khong phai nhieu ngau nhien: gia phai cham hai chan roi bat ra, vi do chinh
    la thu video dang day. Mot doan 'sideway' ma gia xuyen qua chan thi day sai.
    """
    out = []
    price = start
    lo, hi = start - width / 2, start + width / 2
    up = True
    for i in range(bars):
        goal = hi - width * rng.span(0.02, 0.16) if up else lo + width * rng.span(0.02, 0.16)
        close = price + (goal - price) * rng.span(0.45, 0.95)
        close = min(hi - width * 0.01, max(lo + width * 0.01, close))
        size = abs(close - price)
        out.append(candle(i0 + i, price, close,
                          up_wick=max(0.3, size * rng.span(0.2, 0.9)),
                          low_wick=max(0.3, size * rng.span(0.2, 0.9))))
        price = close
        if abs(price - (hi if up else lo)) < width * 0.2:
            up = not up
    return out


def stretch(candles: list[dict], i0: int, i1: int) -> tuple[float, float]:
    """Day va dinh cua mot doan."""
    part = candles[i0:i1]
    return min(c["low"] for c in part), max(c["high"] for c in part)


def renumber(candles: list[dict]) -> list[dict]:
    for i, c in enumerate(candles):
        c["time"] = T0 + i * STEP
    return candles


# --- bay chu de -------------------------------------------------------------
#
# Moi builder tra ve (candles, setup_count, marks, meta).
# `marks` la lop ve; `meta` la chu.

def build_fibonacci(rng: Rng) -> tuple[list, int, list, dict]:
    """Fibonacci thoai lui — va vi sao 0.618 la vung duoc nhac den nhieu nhat."""
    up = leg(rng, BASE, 11, 46, 0)
    swing_low = min(c["low"] for c in up)
    swing_high = max(c["high"] for c in up)
    rangev = swing_high - swing_low
    # Thoai lui ve dung vung vang roi bat len.
    pull = leg(rng, up[-1]["close"], 8, -(rangev * 0.60), 11)
    rest = leg(rng, pull[-1]["close"], 3, rangev * 0.06, 19)
    candles = renumber(up + pull + rest)
    # Below the golden pocket: if price closes under it, the retracement was not
    # a retracement.
    stop = lv618 = swing_high - rangev * 0.705 - rangev * 0.05

    def lv(r: float) -> float:
        return swing_high - rangev * r

    marks = [
        # `from: 0` on the outer levels is not decoration — the camera frames
        # whatever the marks touch, and without it the shot held only the
        # pullback while the leg the fib was drawn from sat off screen left.
        {"kind": "hline", "price": swing_high, "label": "1.0 · đỉnh", "tone": "ink",
         "from": 0, "order": 0},
        {"kind": "hline", "price": lv(0.382), "label": "0.382", "tone": "gold",
         "from": 0, "order": 1},
        {"kind": "hline", "price": lv(0.5), "label": "0.5", "tone": "gold",
         "from": 0, "order": 2},
        {"kind": "zone", "top": lv(0.618), "bottom": lv(0.705), "from": 11,
         "label": "VÙNG VÀNG", "tone": "violet", "order": 3},
        {"kind": "hline", "price": swing_low, "label": "0 · đáy", "tone": "ink",
         "from": 0, "order": 4},
    ]
    meta = {
        "name": "Fibonacci thoái lui",
        "bias": "bullish",
        "tagline": "Giá không đi thẳng — nó lùi lại lấy đà, và lùi tới đâu là đo được",
        "rule": "Kéo Fibonacci từ đáy lên đỉnh của một nhịp tăng. Vùng 0.618–0.705 là chỗ nhịp lùi thường kết thúc — vào lệnh ở đó, không vào ở đỉnh.",
        "checks": [
            "Phải có một nhịp rõ ràng để kéo — không có nhịp thì không có fib",
            "Vùng vàng 0.618–0.705, không phải một con số duy nhất",
            "Fib chỉ cho VÙNG, cây nến cho THỜI ĐIỂM",
        ],
    }
    return candles, stop, marks, meta


def build_order_block(rng: Rng) -> tuple[list, int, list, dict]:
    """Vung lenh — cay nen cuoi cung truoc cu day, va vi sao gia quay lai do."""
    down = leg(rng, BASE, 6, -18, 0)
    ob_open = down[-1]["close"]
    ob = candle(6, ob_open, ob_open - 4.0, up_wick=1.2, low_wick=1.0)
    push = leg(rng, ob["close"], 8, 40, 7)
    back = leg(rng, push[-1]["close"], 6, -(push[-1]["close"] - ob["high"]) * 0.95, 15)
    rest = leg(rng, back[-1]["close"], 2, 3, 21)
    candles = renumber(down + [ob] + push + back + rest)
    # Under the block. Through it and the block is spent.
    stop = ob["low"] - 1.0

    marks = [
        {"kind": "zone", "top": ob["high"], "bottom": ob["low"], "from": 6,
         "label": "VÙNG LỆNH", "tone": "violet", "order": 0},
        {"kind": "hline", "price": ob["high"], "label": "mép vùng", "tone": "gold",
         "from": 6, "order": 1},
    ]
    meta = {
        "name": "Vùng lệnh (Order Block)",
        "bias": "bullish",
        "tagline": "Cây nến cuối cùng trước cú đẩy — chỗ tiền lớn còn lệnh chưa khớp hết",
        "rule": "Vùng lệnh là cây nến giảm cuối cùng ngay trước một cú đẩy tăng mạnh. Giá quay lại đó vì phần lệnh mua chưa khớp hết vẫn nằm trong vùng.",
        "checks": [
            "Phải có cú đẩy MẠNH ra khỏi vùng — không mạnh thì không phải vùng lệnh",
            "Cú đẩy đó phải phá được đỉnh gần nhất",
            "Vào lệnh khi giá chạm lại mép vùng, không đuổi giữa cú đẩy",
        ],
    }
    return candles, stop, marks, meta


def build_liquidity_sweep(rng: Rng) -> tuple[list, int, list, dict]:
    """Quet thanh khoan — cay nen pha day roi dong cua nguoc lai."""
    down = leg(rng, BASE, 7, -22, 0)
    low1 = min(c["low"] for c in down)
    bounce = leg(rng, down[-1]["close"], 5, 12, 7)
    # Cay quet: thung xuong duoi day cu roi dong cua tren no.
    o = bounce[-1]["close"]
    sweep = candle(12, o, low1 + 2.4, up_wick=0.8, low_wick=(o - low1) + 3.2)
    up = leg(rng, sweep["close"], 7, 26, 13)
    candles = renumber(down + bounce + [sweep] + up)
    # Under the sweep wick — the level that was just cleared.
    stop = sweep["low"] - 0.8

    marks = [
        {"kind": "hline", "price": low1, "label": "ĐÁY CŨ",
         "tone": "down", "order": 0},
        {"kind": "zone", "top": low1, "bottom": sweep["low"], "from": 12, "to": 14,
         "label": "QUÉT", "tone": "gold", "order": 1},
    ]
    meta = {
        "name": "Quét thanh khoán",
        "bias": "bullish",
        "tagline": "Giá thủng đáy cũ rồi đóng cửa ngược lên — đó không phải phá, đó là quét",
        "rule": "Dưới một đáy rõ ràng luôn có một đống lệnh dừng lỗ. Giá thọc xuống lấy chỗ đó rồi đóng cửa ngược lên — thân nến nằm TRÊN đáy cũ mới là quét, không phải phá.",
        "checks": [
            "Bóng nến thủng đáy cũ, nhưng THÂN đóng cửa trên nó",
            "Phải quay lên ngay trong một hai cây, không lê thê",
            "Dừng lỗ đặt dưới bóng quét — chỗ vừa bị lấy sạch",
        ],
    }
    return candles, stop, marks, meta


def build_bos_choch(rng: Rng) -> tuple[list, int, list, dict]:
    """Doi cau truc — luc xu huong that su doi chieu."""
    down = leg(rng, BASE, 6, -20, 0)
    b1 = leg(rng, down[-1]["close"], 4, 9, 6)
    lower_high = max(c["high"] for c in b1)
    down2 = leg(rng, b1[-1]["close"], 5, -14, 10)
    low = min(c["low"] for c in down2)
    up = leg(rng, down2[-1]["close"], 9, 34, 15)
    candles = renumber(down + b1 + down2 + up)
    # Below the low that made the structure break meaningful.
    stop = low - 1.0

    marks = [
        {"kind": "hline", "price": lower_high, "label": "ĐỈNH THẤP HƠN",
         "tone": "blue", "solid": True, "order": 0},
        {"kind": "hline", "price": low, "label": "ĐÁY CUỐI",
         "tone": "down", "order": 1},
    ]
    meta = {
        "name": "Đổi cấu trúc (CHoCH)",
        "bias": "bullish",
        "tagline": "Xu hướng không đảo ở đáy — nó đảo lúc phá cái đỉnh thấp hơn gần nhất",
        "rule": "Xu hướng giảm là chuỗi đỉnh thấp dần. Khi giá đóng cửa TRÊN đỉnh thấp hơn gần nhất, chuỗi đó gãy — đó là điểm sớm nhất được phép nói xu hướng đã đổi.",
        "checks": [
            "Phải ĐÓNG CỬA trên đỉnh đó, bóng xuyên qua không tính",
            "Trước đó phải có chuỗi đỉnh thấp dần rõ ràng",
            "Đổi cấu trúc là tín hiệu SỚM, không phải lệnh — chờ giá lùi lại",
        ],
    }
    return candles, stop, marks, meta


def build_head_shoulders(rng: Rng) -> tuple[list, int, list, dict]:
    """Vai Dau Vai — va duong vien co moi la cai co sung."""
    # Built to explicit heights rather than to random legs.
    #
    # With random legs the head came out barely above the right shoulder, and
    # the video then read out its own rule — "the head must be clearly above
    # both shoulders" — over a chart that did not satisfy it. A lesson that
    # contradicts itself on screen is worse than no lesson: the viewer either
    # learns the wrong shape or learns not to trust the channel.
    neck_price = BASE + 14.0
    ls_target = neck_price + 15.0
    head_target = neck_price + 30.0   # twice the shoulder height, unmistakable
    rs_target = neck_price + 14.0

    up = leg(rng, BASE, 5, neck_price - BASE, 0)
    ls = leg(rng, up[-1]["close"], 3, ls_target - up[-1]["close"], 5)
    ls_high = max(c["high"] for c in ls)
    d1 = leg(rng, ls[-1]["close"], 3, neck_price - ls[-1]["close"], 8)
    neck1 = min(c["low"] for c in d1)
    head = leg(rng, d1[-1]["close"], 4, head_target - d1[-1]["close"], 11)
    head_high = max(c["high"] for c in head)
    d2 = leg(rng, head[-1]["close"], 3, neck_price - head[-1]["close"], 15)
    rs = leg(rng, d2[-1]["close"], 3, rs_target - d2[-1]["close"], 18)
    rs_high = max(c["high"] for c in rs)
    drop = leg(rng, rs[-1]["close"], 8, -30, 21)
    # The shape is the claim. If a seed ever produces one that is not a head and
    # shoulders, that is a bug to see immediately, not a video to publish.
    assert head_high > ls_high + 4 and head_high > rs_high + 4, (
        f"dau khong cao hon hai vai: {ls_high:.1f} / {head_high:.1f} / {rs_high:.1f}"
    )
    candles = renumber(up + ls + d1 + head + d2 + rs + drop)
    neck = (neck1 + min(c["low"] for c in d2)) / 2
    # Above the right shoulder: back over it and the formation has failed.
    stop = rs_high + 1.2

    marks = [
        {"kind": "path", "tone": "blue", "order": 0, "points": [
            {"index": 4, "price": up[-1]["close"]},
            {"index": 7, "price": ls_high, "label": "VAI TRÁI"},
            {"index": 10, "price": neck1},
            {"index": 14, "price": head_high, "label": "ĐẦU"},
            {"index": 17, "price": min(c["low"] for c in d2)},
            {"index": 20, "price": rs_high, "label": "VAI PHẢI"},
        ]},
        {"kind": "hline", "price": neck, "label": "ĐƯỜNG VIỀN CỔ", "tone": "gold",
         "solid": True, "order": 1},
    ]
    meta = {
        "name": "Vai Đầu Vai",
        "bias": "bearish",
        "tagline": "Ba cái đỉnh, cái giữa cao nhất — nhưng tín hiệu nằm ở đường bên dưới",
        "rule": "Vai trái, đầu cao hơn, vai phải thấp lại. Mô hình chỉ CÓ HIỆU LỰC khi giá đóng cửa dưới đường viền cổ — trước đó nó mới chỉ là ba cái đỉnh.",
        "checks": [
            "Đầu phải cao hơn hẳn hai vai",
            "Chỉ vào lệnh khi ĐÓNG CỬA dưới đường viền cổ",
            "Chốt lời bằng khoảng cách từ đầu xuống viền cổ, đo ngược xuống",
        ],
    }
    return candles, stop, marks, meta


def build_double_bottom(rng: Rng) -> tuple[list, int, list, dict]:
    """Hai Day — hai lan tu choi cung mot muc gia."""
    down = leg(rng, BASE, 6, -24, 0)
    b1 = min(c["low"] for c in down)
    up1 = leg(rng, down[-1]["close"], 4, 15, 6)
    peak = max(c["high"] for c in up1)
    down2 = leg(rng, up1[-1]["close"], 4, -(up1[-1]["close"] - b1) * 0.97, 10)
    up2 = leg(rng, down2[-1]["close"], 10, 34, 14)
    candles = renumber(down + up1 + down2 + up2)
    floor_ = (b1 + min(c["low"] for c in down2)) / 2
    # Under the pair of lows. A third low is not a double bottom.
    stop = floor_ - 1.4

    marks = [
        {"kind": "hline", "price": floor_, "label": "SÀN",
         "tone": "up", "order": 0},
        {"kind": "hline", "price": peak, "label": "ĐƯỜNG VIỀN CỔ",
         "tone": "gold", "solid": True, "order": 1},
    ]
    meta = {
        "name": "Hai Đáy",
        "bias": "bullish",
        "tagline": "Cùng một mức giá bị từ chối hai lần — lần thứ hai mới là bằng chứng",
        "rule": "Hai đáy gần bằng nhau, ở giữa là một nhịp hồi. Mô hình có hiệu lực khi giá đóng cửa trên đỉnh của nhịp hồi đó, không phải khi đáy thứ hai hình thành.",
        "checks": [
            "Hai đáy lệch nhau không quá vài phần trăm",
            "Đáy thứ hai nên có khối lượng nhỏ hơn",
            "Vào lệnh khi phá đỉnh giữa, không vào ở đáy",
        ],
    }
    return candles, stop, marks, meta


def build_sideway(rng: Rng) -> tuple[list, int, list, dict]:
    """Di ngang — thu thi truong lam NHIEU NHAT, va it ai day.

    Nhan tren chart chi con MOT TU. Ban dau chung la ca cau — "TRAN — ban o
    day, khong mua" — va ba cai nhu the trong mot khung 1080px thi de len nhau,
    de len ca nen. Cau day hoc thuoc ve khung quy tac, cho no co cho; nhan tren
    duong chi can noi duong do TEN LA GI.
    """
    lead = leg(rng, BASE, 4, 10, 0)
    box = flat(rng, lead[-1]["close"], 14, 13.0, 4)
    lo = min(c["low"] for c in box)
    hi = max(c["high"] for c in box)
    out = leg(rng, box[-1]["close"], 4, (hi - box[-1]["close"]) + 2, 18)
    after = leg(rng, out[-1]["close"], 16, 26, 22)
    candles = renumber(lead + box + out + after)
    # Back inside the box means the break did not hold.
    stop = hi - (hi - lo) * 0.30

    marks = [
        {"kind": "hline", "price": hi, "label": "TRẦN",
         "tone": "down", "from": 4, "order": 0},
        {"kind": "hline", "price": lo, "label": "SÀN",
         "tone": "up", "from": 4, "order": 1},
        {"kind": "zone", "top": hi, "bottom": lo, "from": 4, "to": 18,
         "label": "ĐI NGANG", "tone": "violet", "order": 2},
    ]
    meta = {
        "name": "Đi ngang ngắn hạn",
        "bias": "bullish",
        "tagline": "Thị trường đi ngang phần lớn thời gian — và đó là lúc cháy tài khoản",
        "rule": "Trong biên độ: mua ở SÀN, bán ở TRẦN, và KHÔNG đánh ở giữa. Chỉ đánh theo hướng phá khi giá đóng cửa ngoài biên, không phải khi bóng nến ló ra.",
        "checks": [
            "Phải có ít nhất 2 lần chạm trần và 2 lần chạm sàn",
            "Ở giữa biên là vùng CẤM — tỉ lệ lời/lỗ ở đó luôn xấu",
            "Phá biên phải ĐÓNG CỬA ngoài, bóng ló ra thường là quét",
        ],
    }
    return candles, stop, marks, meta


BUILDERS = {
    "fibonacci": build_fibonacci,
    "order-block": build_order_block,
    "liquidity-sweep": build_liquidity_sweep,
    "bos-choch": build_bos_choch,
    "head-shoulders": build_head_shoulders,
    "double-bottom": build_double_bottom,
    "sideway": build_sideway,
}

# Ban tieng Anh cua phan chu. Giu rieng thay vi dich may: mot cau day nghe cho
# nao la o cho no duoc viet bang thu tieng do, khong phai o cho no dung nghia.
EN = {
    "fibonacci": {
        "name": "Fibonacci retracement",
        "tagline": "Price does not travel in a line — it steps back, and how far is measurable",
        "rule": "Draw the fib from the low to the high of one leg. The 0.618-0.705 band is where the pullback usually ends. Buy there, not at the high.",
        "checks": ["You need one clean leg to draw from",
                   "A band, 0.618 to 0.705 — not a single number",
                   "Fib gives the ZONE. The candle gives the TIMING"],
        "marks": ["1.0 · high", "0.382", "0.5", "GOLDEN POCKET", "0 · low"],
    },
    "order-block": {
        "name": "Order block",
        "tagline": "The last candle before the push — where big money still has orders unfilled",
        "rule": "An order block is the last down candle before a strong push up. Price comes back to it because the unfilled buy orders are still sitting there.",
        "checks": ["The push out must be STRONG, or it is not an order block",
                   "That push has to break the last swing high",
                   "Enter on the retest of the edge, do not chase the push"],
        "marks": ["ORDER BLOCK", "zone edge"],
    },
    "liquidity-sweep": {
        "name": "Liquidity sweep",
        "tagline": "Price broke the low and closed back above it — that is not a break, that is a sweep",
        "rule": "Under every obvious low sits a pile of stop orders. Price dips to take them and closes back above. The BODY above the old low is what makes it a sweep and not a break.",
        "checks": ["The wick takes out the low, the BODY closes above it",
                   "It has to reverse within a bar or two",
                   "Stop goes below the sweep wick — the level just cleared"],
        "marks": ["OLD LOW", "SWEEP"],
    },
    "bos-choch": {
        "name": "Change of character",
        "tagline": "A trend does not turn at the low. It turns when the last lower high breaks",
        "rule": "A downtrend is a chain of lower highs. When price CLOSES above the most recent lower high, that chain is broken — the earliest point you are allowed to say the trend changed.",
        "checks": ["It has to CLOSE above, a wick through does not count",
                   "There must be a clear chain of lower highs first",
                   "CHoCH is an early signal, not an entry — wait for the pullback"],
        "marks": ["LOWER HIGH", "LAST LOW"],
    },
    "head-shoulders": {
        "name": "Head and shoulders",
        "tagline": "Three highs, the middle one tallest — but the signal is the line underneath",
        "rule": "Left shoulder, higher head, lower right shoulder. The pattern is only VALID once price closes below the neckline. Before that it is three highs.",
        "checks": ["The head has to be clearly above both shoulders",
                   "Only enter on a CLOSE below the neckline",
                   "Target the head-to-neckline distance, measured down"],
        "marks": ["LEFT SHOULDER", "HEAD", "RIGHT SHOULDER", "NECKLINE"],
    },
    "double-bottom": {
        "name": "Double bottom",
        "tagline": "The same price rejected twice — the second time is the evidence",
        "rule": "Two lows at roughly the same price with a bounce between them. It becomes valid when price closes above the high of that bounce, not when the second low forms.",
        "checks": ["The two lows within a few percent of each other",
                   "The second low should come on lower volume",
                   "Enter on the break of the middle high, not at the low"],
        "marks": ["FLOOR", "NECKLINE"],
    },
    "sideway": {
        "name": "The range",
        "tagline": "Markets range most of the time — and that is where accounts die",
        "rule": "In a range: buy the floor, sell the ceiling, and do NOT trade the middle. Only trade the break on a CLOSE outside the box, never on a wick poking out.",
        "checks": ["At least two touches of the ceiling and two of the floor",
                   "The middle is a no-trade zone — the R:R there is always bad",
                   "A break has to CLOSE outside. A wick out is usually a sweep"],
        "marks": ["CEILING", "FLOOR", "RANGE"],
    },
}


def build(topic: str, seed: int, locale: str) -> dict:
    rng = Rng(seed)
    candles, stop, marks, meta = BUILDERS[topic](rng)
    # The setup is whatever the builder drew; the follow-through is added below.
    # Taking setup_count from a constant was wrong: each topic needs a different
    # number of bars to state itself, and clamping to a fixed number either cut
    # the formation in half or left the trade with too few bars to resolve, so
    # every single video came out "still open".
    setup_count = len(candles)

    if locale != "vi":
        en = EN[topic]
        meta = {**meta, "name": en["name"], "tagline": en["tagline"],
                "rule": en["rule"], "checks": en["checks"]}
        # Nhan tren lop ve khop theo VI TRI, giong cach lam ben bai hoc mau nen:
        # mot mo hinh ba dinh dat ten cho dinh, mot fib dat ten cho muc gia, va
        # vi tri la khoa duy nhat ca hai cung co.
        labels = list(en["marks"])
        k = 0
        for m in marks:
            if m["kind"] == "path":
                for p in m["points"]:
                    if p.get("label") and k < len(labels):
                        p["label"] = labels[k]; k += 1
            elif m.get("label") and k < len(labels):
                m["label"] = labels[k]; k += 1

    bullish = meta["bias"] == "bullish"
    decisive = candles[setup_count - 1]
    entry = decisive["close"]
    # The stop comes from the builder, because where the stop goes IS the lesson
    # — "below the sweep wick", "above the right shoulder". A single generic
    # formula gave the liquidity-sweep video a stop almost the entire height of
    # its own setup away from entry, which is both untradeable and the opposite
    # of what its own rule text says.
    risk = max(0.8, abs(entry - stop))
    target = entry + risk * 2.0 if bullish else entry - risk * 2.0

    # Cung luat voi bai hoc mau nen: mot phan cac video PHAI thua, va ket qua
    # doc tu chuoi gia chu khong phai gan nhan. Xem make_candle_lesson.py.
    #
    # The follow-through is generated here rather than in the builders, so every
    # topic gets the same honest treatment: paced to reach whichever level it is
    # aimed at around the sixth or seventh bar, and then *read back* off the
    # series. Aiming at a level is not the same as asserting it was hit — a leg
    # aimed at target can still take out the stop on the way, and when it does,
    # the scan below reports the loss.
    # The topic is mixed into the verdict seed. Without it every topic built
    # from the same seed drew the same verdict, so a run came out seven wins or
    # seven losses in a row — which is not a 40% loss rate, it is a coin flipped
    # once and copied.
    vr = Rng(seed * 31 + 7 + sum(ord(ch) for ch in topic) * 977)
    losing = vr.next() < LOSS_RATE
    aim = stop if losing else target
    # Aimed past the level rather than at it. `drift` spends about 40% of each
    # bar's move on counter-bars, so a leg paced to land exactly on the level
    # lands just short of it — measured, every single topic finished within a
    # point of its stop and reported "still open", which is the one verdict none
    # of them had actually earned.
    per_bar = (aim - entry) * 1.7 / FOLLOW

    def scan() -> tuple[int | None, str]:
        for i in range(setup_count, len(candles)):
            c = candles[i]
            # Within one bar the order is unknowable, so the loss is assumed.
            if (c["low"] <= stop) if bullish else (c["high"] >= stop):
                return i, "SL"
            if (c["high"] >= target) if bullish else (c["low"] <= target):
                return i, "TP"
        return None, "OPEN"

    candles += drift(vr, entry, FOLLOW, per_bar, 0, setup_count)
    hit, result = scan()
    # Give a leg that fell short more room rather than declaring a verdict it
    # never printed. Capped: past this the reveal beat has too many bars to
    # replay and each one flickers by in under two frames.
    while result == "OPEN" and len(candles) - setup_count < FOLLOW_MAX:
        candles += drift(vr, candles[-1]["close"], 6, per_bar, 0, len(candles))
        hit, result = scan()
    renumber(candles)
    if hit is None:
        hit = len(candles) - 1

    return {
        "kind": "candleLesson",
        "instrument": "ILLUSTRATION",
        "topic": topic,
        "open": Rng(seed * 29 + 5).state % 3,
        "pattern": {**meta, "indices": [setup_count - 1]},
        # Khong co giai phau cay nen: chu de nay khong noi ve mot cay nen nao ca,
        # va dat nhan len mot cay bat ky chi de "co du truong" la tu lua.
        "anatomy": [],
        "marks": marks,
        "candles": candles,
        "setupCount": setup_count,
        "trade": {"entry": round(entry, 2), "stop": round(stop, 2),
                  "target": round(target, 2), "entryIndex": setup_count - 1},
        "outcome": {"result": result, "index": hit},
        "locale": locale,
        "note": ("Minh hoạ - chuỗi giá dựng lại, không phải biểu đồ thật" if locale == "vi"
                 else "Illustration - constructed price series, not a live chart"),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic", choices=sorted(BUILDERS), required=True)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--locale", choices=("en", "vi"), default="vi")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    cfg = build(a.topic, a.seed, a.locale)
    out = Path(a.out) if a.out else Path("src/data/_concept.json")
    if not out.is_absolute():
        out = Path(__file__).resolve().parents[1] / out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out}")
    print(f"  {cfg['pattern']['name']} · {len(cfg['candles'])} nen · "
          f"{len(cfg['marks'])} net ve · ket qua {cfg['outcome']['result']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
