#!/usr/bin/env python3
"""Build a purpose-designed candlestick-pattern lesson.

Unlike fetch_gold.py this uses no market data. Real charts are the wrong tool
for teaching what a pattern *is*: the textbook shape rarely appears cleanly, and
the surrounding noise distracts from the one thing the viewer should look at.
So the series here is constructed — a clean approach trend, the pattern in
textbook proportions, and the follow-through the rule predicts.

Because it is constructed, the video must label it an illustration. It shows
what the rule looks like, not evidence the rule pays.

Prices are dimensionless and centred near 2000 so they read like gold without
claiming to be a quote.

Thresholds quoted on screen follow the two mainstream implementations rather
than blog folklore: TradingView's built-in pattern script uses body <= 5% of the
bar range for a doji and a 2x shadow-to-body factor for hammer and shooting
star, and Bulkowski gives the hammer as a lower shadow two to three times the
body. Note these are not interchangeable with the "wick >= 2/3 of total range"
figure quoted for pin bars, which is normalised against a different denominator.

    python3 scripts/make_candle_lesson.py --pattern bullish-engulfing
"""

import argparse
import json
from pathlib import Path

STEP = 900  # 15-minute spacing, purely cosmetic
T0 = 1_700_000_000


class Rng:
    """Small deterministic LCG. Keeps every render of a pattern identical."""

    def __init__(self, seed: int) -> None:
        self.state = seed & 0xFFFFFFFF

    def next(self) -> float:
        self.state = (1103515245 * self.state + 12345) & 0x7FFFFFFF
        return self.state / 0x7FFFFFFF

    def span(self, lo: float, hi: float) -> float:
        return lo + (hi - lo) * self.next()


def candle(index: int, open_: float, close: float, up_wick: float, low_wick: float) -> dict:
    top = max(open_, close) + up_wick
    bottom = min(open_, close) - low_wick
    return {
        "time": T0 + index * STEP,
        "open": round(open_, 2),
        "high": round(top, 2),
        "low": round(bottom, 2),
        "close": round(close, 2),
    }


def drift(rng: Rng, start: float, count: float, per_bar: float, body: float,
          start_index: int) -> list[dict]:
    """A believable approach leg: steady bias, uneven bodies and wicks."""
    out = []
    price = start
    for i in range(int(count)):
        move = per_bar * rng.span(0.35, 1.6)
        # Roughly one bar in four pulls against the trend, as real legs do.
        if rng.next() < 0.25:
            move = -move * rng.span(0.3, 0.8)
        open_ = price
        close = price + move
        size = abs(close - open_)
        out.append(
            candle(
                start_index + i,
                open_,
                close,
                up_wick=max(0.4, size * rng.span(0.15, 0.75)),
                low_wick=max(0.4, size * rng.span(0.15, 0.75)),
            )
        )
        price = close
    return out


# Each builder returns (candles, anatomy, pattern meta). `anatomy` names the
# parts of the decisive candle so the viewer learns the vocabulary.

def bullish_engulfing(rng: Rng):
    ctx = drift(rng, 2040.0, 16, -3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    small = candle(i, price, price - 4.0, 1.4, 1.6)
    # The engulfing candle opens below the prior close and shuts above its open.
    big = candle(i + 1, small["close"] - 1.2, small["open"] + 6.5, 2.2, 2.0)
    body_low, body_high = big["open"], big["close"]

    follow = drift(rng, big["close"], 16, 3.6, 0, i + 2)
    return (
        ctx + [small, big] + follow,
        i + 2,
        [i, i + 1],
        {
            "name": "Bullish Engulfing",
            "tagline": "Sellers lose control in one bar",
            "bias": "bullish",
            "rule": "A green body that completely swallows the previous red body — "
                    "buyers erased a whole session of selling.",
            "checks": [
                "Comes after a clear down leg",
                "Opens at or below the prior close",
                "Closes above the prior open",
            ],
            "bodyLow": round(body_low, 2),
            "bodyHigh": round(body_high, 2),
        },
        [
            {"index": i + 1, "part": "body", "label": "Real body"},
            {"index": i + 1, "part": "upperWick", "label": "Upper wick"},
            {"index": i + 1, "part": "lowerWick", "label": "Lower wick"},
        ],
    )


def bearish_engulfing(rng: Rng):
    ctx = drift(rng, 1960.0, 16, 3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    small = candle(i, price, price + 4.0, 1.6, 1.4)
    big = candle(i + 1, small["close"] + 1.2, small["open"] - 6.5, 2.0, 2.2)

    follow = drift(rng, big["close"], 16, -3.6, 0, i + 2)
    return (
        ctx + [small, big] + follow,
        i + 2,
        [i, i + 1],
        {
            "name": "Bearish Engulfing",
            "tagline": "Buyers lose control in one bar",
            "bias": "bearish",
            "rule": "A red body that completely swallows the previous green body — "
                    "sellers erased a whole session of buying.",
            "checks": [
                "Comes after a clear up leg",
                "Opens at or above the prior close",
                "Closes below the prior open",
            ],
            "bodyLow": round(big["close"], 2),
            "bodyHigh": round(big["open"], 2),
        },
        [
            {"index": i + 1, "part": "body", "label": "Real body"},
            {"index": i + 1, "part": "upperWick", "label": "Upper wick"},
            {"index": i + 1, "part": "lowerWick", "label": "Lower wick"},
        ],
    )


def hammer(rng: Rng):
    ctx = drift(rng, 2050.0, 17, -3.4, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    # Textbook proportions: lower wick at least twice the body, upper wick tiny.
    body = 2.6
    open_ = price - 0.6
    close = open_ + body
    h = candle(i, open_, close, up_wick=body * 0.04, low_wick=body * 2.8)

    follow = drift(rng, h["close"], 17, 3.4, 0, i + 1)
    return (
        ctx + [h] + follow,
        i + 1,
        [i],
        {
            "name": "Hammer",
            "tagline": "Price got rejected from the lows",
            "bias": "bullish",
            "rule": "A long lower wick with a small body on top. Sellers pushed price "
                    "down, buyers took it all back before the close.",
            "checks": [
                "Lower wick at least 2x the body",
                "Upper wick under 5% of the body",
                "Only valid after a down leg",
            ],
            "bodyLow": round(min(open_, close), 2),
            "bodyHigh": round(max(open_, close), 2),
            "wickRatio": round(body * 2.8 / body, 1),
        },
        [
            {"index": i, "part": "body", "label": "Small body"},
            {"index": i, "part": "lowerWick", "label": "Long lower wick"},
            {"index": i, "part": "upperWick", "label": "Almost no upper wick"},
        ],
    )


def shooting_star(rng: Rng):
    ctx = drift(rng, 1950.0, 17, 3.4, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    body = 2.6
    open_ = price + 0.6
    close = open_ - body
    s = candle(i, open_, close, up_wick=body * 2.8, low_wick=body * 0.04)

    follow = drift(rng, s["close"], 17, -3.4, 0, i + 1)
    return (
        ctx + [s] + follow,
        i + 1,
        [i],
        {
            "name": "Shooting Star",
            "tagline": "Price got rejected from the highs",
            "bias": "bearish",
            "rule": "A long upper wick with a small body underneath. Buyers pushed "
                    "price up, sellers took it all back before the close.",
            "checks": [
                "Upper wick at least 2x the body",
                "Lower wick under 5% of the body",
                "Only valid after an up leg",
            ],
            "bodyLow": round(min(open_, close), 2),
            "bodyHigh": round(max(open_, close), 2),
            "wickRatio": round(body * 2.8 / body, 1),
        },
        [
            {"index": i, "part": "body", "label": "Small body"},
            {"index": i, "part": "upperWick", "label": "Long upper wick"},
            {"index": i, "part": "lowerWick", "label": "Almost no lower wick"},
        ],
    )


def morning_star(rng: Rng):
    ctx = drift(rng, 2045.0, 15, -3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    first = candle(i, price, price - 6.5, 1.2, 1.4)
    # The middle bar stalls with a small body — the moment of indecision.
    second = candle(i + 1, first["close"] - 1.0, first["close"] - 1.8, 1.6, 2.4)
    third = candle(i + 2, second["close"] + 0.5, first["open"] - 0.5, 2.0, 1.4)

    follow = drift(rng, third["close"], 14, 3.6, 0, i + 3)
    return (
        ctx + [first, second, third] + follow,
        i + 3,
        [i, i + 1, i + 2],
        {
            "name": "Morning Star",
            "tagline": "Three bars that turn a trend",
            "bias": "bullish",
            "rule": "A big red bar, then a small indecisive bar, then a big green bar "
                    "that recovers most of the first. Selling stalled, then reversed.",
            "checks": [
                "Bar 1 is a strong red candle",
                "Bar 2 has a small body — momentum stalls",
                "Bar 3 closes back inside bar 1's body",
            ],
            "bodyLow": round(third["open"], 2),
            "bodyHigh": round(third["close"], 2),
        },
        [
            {"index": i + 1, "part": "body", "label": "Indecision"},
            {"index": i + 2, "part": "body", "label": "Reversal bar"},
        ],
    )


def doji(rng: Rng):
    ctx = drift(rng, 1990.0, 17, 2.8, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    # Open and close nearly equal; the range is all wick.
    d = candle(i, price, price + 0.25, up_wick=4.6, low_wick=4.4)

    follow = drift(rng, d["close"], 17, -2.4, 0, i + 1)
    return (
        ctx + [d] + follow,
        i + 1,
        [i],
        {
            "name": "Doji",
            "tagline": "Neither side won",
            "bias": "bearish",
            "rule": "Open and close land in the same place. Price travelled in both "
                    "directions and settled where it started — momentum has paused.",
            "checks": [
                "Body under 5% of the bar's range",
                "Wicks on both sides",
                "Means pause, not reversal - wait for the next bar",
            ],
            "bodyLow": round(min(d["open"], d["close"]), 2),
            "bodyHigh": round(max(d["open"], d["close"]), 2),
        },
        [
            {"index": i, "part": "body", "label": "Body is tiny"},
            {"index": i, "part": "upperWick", "label": "Upper wick"},
            {"index": i, "part": "lowerWick", "label": "Lower wick"},
        ],
    )


def marubozu(rng: Rng):
    """Very long body, almost no wick either end — one side owned the session."""
    ctx = drift(rng, 1980.0, 17, 2.4, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    body = 11.0
    m = candle(i, price, price + body, up_wick=body * 0.03, low_wick=body * 0.03)
    follow = drift(rng, m["close"], 17, 3.2, 0, i + 1)
    return (
        ctx + [m] + follow, i + 1, [i],
        {
            "name": "Bullish Marubozu",
            "tagline": "One side owned the whole session",
            "bias": "bullish",
            "rule": "A long body with practically no wicks. Price opened at one end, "
                    "closed at the other, and never looked back.",
            "checks": [
                "Body far longer than the recent average",
                "Both wicks under 5% of the body",
                "Confirms the trend rather than reversing it",
            ],
            "bodyLow": round(m["open"], 2), "bodyHigh": round(m["close"], 2),
        },
        [
            {"index": i, "part": "body", "label": "Body is the whole range"},
            {"index": i, "part": "upperWick", "label": "Barely any wick"},
        ],
    )


def dragonfly_doji(rng: Rng):
    """Open and close together at the top, one long wick beneath."""
    ctx = drift(rng, 2045.0, 17, -3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    d = candle(i, price, price + 0.2, up_wick=0.3, low_wick=9.5)
    follow = drift(rng, d["close"], 17, 3.2, 0, i + 1)
    return (
        ctx + [d] + follow, i + 1, [i],
        {
            "name": "Dragonfly Doji",
            "tagline": "Sellers pushed, and lost all of it",
            "bias": "bullish",
            "rule": "Open and close land together at the top of the range, with a long "
                    "wick below. Everything the sellers gained was taken back.",
            "checks": [
                "Body is a sliver near the high",
                "Long lower wick, effectively no upper wick",
                "Read it at support, not mid-range",
            ],
            "bodyLow": round(min(d["open"], d["close"]), 2),
            "bodyHigh": round(max(d["open"], d["close"]), 2),
        },
        [
            {"index": i, "part": "body", "label": "Body sits at the top"},
            {"index": i, "part": "lowerWick", "label": "All the range is below"},
        ],
    )


def gravestone_doji(rng: Rng):
    """The mirror: body at the bottom, one long wick above."""
    ctx = drift(rng, 1955.0, 17, 3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    d = candle(i, price, price - 0.2, up_wick=9.5, low_wick=0.3)
    follow = drift(rng, d["close"], 17, -3.2, 0, i + 1)
    return (
        ctx + [d] + follow, i + 1, [i],
        {
            "name": "Gravestone Doji",
            "tagline": "Buyers pushed, and lost all of it",
            "bias": "bearish",
            "rule": "Open and close land together at the bottom of the range, with a "
                    "long wick above. The whole advance was given back.",
            "checks": [
                "Body is a sliver near the low",
                "Long upper wick, effectively no lower wick",
                "Read it at resistance, not mid-range",
            ],
            "bodyLow": round(min(d["open"], d["close"]), 2),
            "bodyHigh": round(max(d["open"], d["close"]), 2),
        },
        [
            {"index": i, "part": "body", "label": "Body sits at the bottom"},
            {"index": i, "part": "upperWick", "label": "All the range is above"},
        ],
    )


def pin_bar(rng: Rng):
    """A wick that spears through a level and gets rejected.

    Measured against total range rather than body — that is the convention this
    pattern is quoted with, and it is a different denominator from the hammer's
    shadow-to-body ratio.
    """
    ctx = drift(rng, 2040.0, 17, -3.0, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    body = 2.2
    wick = 9.0            # wick / total range = 9 / (9 + 2.2 + 0.4) ~ 78%
    p_bar = candle(i, price - 0.4, price - 0.4 + body, up_wick=0.4, low_wick=wick)
    follow = drift(rng, p_bar["close"], 17, 3.2, 0, i + 1)
    return (
        ctx + [p_bar] + follow, i + 1, [i],
        {
            "name": "Pin Bar",
            "tagline": "The level was tested and refused",
            "bias": "bullish",
            "rule": "A single wick spears through a level and price closes back on the "
                    "other side. The move through was rejected, not accepted.",
            "checks": [
                "Wick is more than 70% of the whole range",
                "Wick pokes past a level the rest of the bars respect",
                "Body closes back inside the range",
            ],
            "bodyLow": round(p_bar["open"], 2), "bodyHigh": round(p_bar["close"], 2),
        },
        [
            {"index": i, "part": "lowerWick", "label": "Wick pierces the level"},
            {"index": i, "part": "body", "label": "Close comes back"},
        ],
    )


def tweezer_bottom(rng: Rng):
    """Two bars refusing the same low."""
    ctx = drift(rng, 2042.0, 16, -3.0, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    low_level = price - 6.0
    first = candle(i, price, price - 4.6, 1.2, (price - 4.6) - low_level)
    second = candle(i + 1, first["close"], first["close"] + 5.2, 1.4,
                    first["close"] - low_level)
    follow = drift(rng, second["close"], 16, 3.2, 0, i + 2)
    return (
        ctx + [first, second] + follow, i + 2, [i, i + 1],
        {
            "name": "Tweezer Bottom",
            "tagline": "Two bars, one floor",
            "bias": "bullish",
            "rule": "Two consecutive bars reach the same low and both fail to break it. "
                    "The second refusal is what makes the level worth marking.",
            "checks": [
                "Both lows land at effectively the same price",
                "The second bar closes back upward",
                "Comes after a down leg",
            ],
            "bodyLow": round(second["open"], 2), "bodyHigh": round(second["close"], 2),
        },
        [
            {"index": i, "part": "lowerWick", "label": "First refusal"},
            {"index": i + 1, "part": "lowerWick", "label": "Same low again"},
        ],
    )


def tweezer_top(rng: Rng):
    """The mirror: two bars refusing the same high."""
    ctx = drift(rng, 1958.0, 16, 3.0, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    high_level = price + 6.0
    first = candle(i, price, price + 4.6, high_level - (price + 4.6), 1.2)
    second = candle(i + 1, first["close"], first["close"] - 5.2,
                    high_level - first["close"], 1.4)
    follow = drift(rng, second["close"], 16, -3.2, 0, i + 2)
    return (
        ctx + [first, second] + follow, i + 2, [i, i + 1],
        {
            "name": "Tweezer Top",
            "tagline": "Two bars, one ceiling",
            "bias": "bearish",
            "rule": "Two consecutive bars reach the same high and both fail to break it. "
                    "The second refusal is what makes the level worth marking.",
            "checks": [
                "Both highs land at effectively the same price",
                "The second bar closes back downward",
                "Comes after an up leg",
            ],
            "bodyLow": round(second["close"], 2), "bodyHigh": round(second["open"], 2),
        },
        [
            {"index": i, "part": "upperWick", "label": "First refusal"},
            {"index": i + 1, "part": "upperWick", "label": "Same high again"},
        ],
    )


def evening_star(rng: Rng):
    """Three bars that turn an advance."""
    ctx = drift(rng, 1955.0, 15, 3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)

    first = candle(i, price, price + 6.5, 1.4, 1.2)
    second = candle(i + 1, first["close"] + 1.0, first["close"] + 1.8, 2.4, 1.6)
    third = candle(i + 2, second["close"] - 0.5, first["open"] + 0.5, 1.4, 2.0)
    follow = drift(rng, third["close"], 14, -3.6, 0, i + 3)
    return (
        ctx + [first, second, third] + follow, i + 3, [i, i + 1, i + 2],
        {
            "name": "Evening Star",
            "tagline": "Three bars that end a run",
            "bias": "bearish",
            "rule": "A strong green bar, then a small indecisive one, then a red bar "
                    "that gives back most of the first. Buying stalled, then reversed.",
            "checks": [
                "Bar 1 is a strong green candle",
                "Bar 2 has a small body — momentum stalls",
                "Bar 3 closes back inside bar 1's body",
            ],
            "bodyLow": round(third["close"], 2), "bodyHigh": round(third["open"], 2),
        },
        [
            {"index": i + 1, "part": "body", "label": "Indecision"},
            {"index": i + 2, "part": "body", "label": "Reversal bar"},
        ],
    )


# --- Hai muoi mau nen bo sung -------------------------------------------------
#
# Vi sao them: mot luot 100 video tren 13 mau la moi mau quay lai tam lan. Anh
# yeu cau moi content toi da HAI phien ban, nen 100 video can khoang 50 content.
# Day la 20 mau nen that, moi cai mot hinh dang rieng va mot quy tac rieng —
# khong phai doi ten cua cai da co.


def inverted_hammer(rng: Rng):
    ctx = drift(rng, 2050.0, 17, -3.4, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    body = 2.4
    open_ = price - 0.4
    close = open_ + body
    c = candle(i, open_, close, up_wick=body * 2.9, low_wick=body * 0.05)
    follow = drift(rng, c["close"], 17, 3.2, 0, i + 1)
    return (ctx + [c] + follow, i + 1, [i],
            {"name": "Inverted Hammer", "bias": "bullish",
             "tagline": "A push up that failed, at the bottom of a fall",
             "rule": "A long upper wick with a small body underneath, after a down leg. "
                     "Buyers tried and were pushed back, but they tried at all - which they had not been doing.",
             "checks": ["Upper wick at least 2x the body",
                        "Lower wick under 10% of the body",
                        "Needs a confirming close above it - it is the weaker of the two hammers"],
             "bodyLow": round(min(open_, close), 2), "bodyHigh": round(max(open_, close), 2),
             "wickRatio": 2.9},
            [{"index": i, "part": "body", "label": "Small body, low"},
             {"index": i, "part": "upperWick", "label": "Long upper wick"},
             {"index": i, "part": "lowerWick", "label": "Almost no lower wick"}])


def hanging_man(rng: Rng):
    ctx = drift(rng, 2000.0, 17, 3.4, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    body = 2.4
    open_ = price + 0.5
    close = open_ - body
    c = candle(i, open_, close, up_wick=body * 0.06, low_wick=body * 2.8)
    follow = drift(rng, c["close"], 17, -3.3, 0, i + 1)
    return (ctx + [c] + follow, i + 1, [i],
            {"name": "Hanging Man", "bias": "bearish",
             "tagline": "The same shape as a hammer - at the top instead",
             "rule": "A long lower wick under a small body, after an UP leg. Identical to a "
                     "hammer in shape; the trend it appears in is the whole difference.",
             "checks": ["Lower wick at least 2x the body",
                        "Must come after an up leg - after a down leg it is a hammer",
                        "Wait for a lower close to confirm"],
             "bodyLow": round(min(open_, close), 2), "bodyHigh": round(max(open_, close), 2),
             "wickRatio": 2.8},
            [{"index": i, "part": "body", "label": "Small body, high"},
             {"index": i, "part": "lowerWick", "label": "Long lower wick"},
             {"index": i, "part": "upperWick", "label": "Almost no upper wick"}])


def bullish_harami(rng: Rng):
    ctx = drift(rng, 2050.0, 16, -3.6, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    big = candle(i, price + 5.2, price - 0.6, up_wick=0.7, low_wick=0.9)
    o = price + 1.0
    small = candle(i + 1, o, o + 1.9, up_wick=0.6, low_wick=0.5)
    follow = drift(rng, small["close"], 16, 3.3, 0, i + 2)
    return (ctx + [big, small] + follow, i + 2, [i, i + 1],
            {"name": "Bullish Harami", "bias": "bullish",
             "tagline": "A big red bar, then a small green one entirely inside it",
             "rule": "A large down candle, then a small up candle whose body sits completely "
                     "inside the previous body. The selling did not continue - that is the signal.",
             "checks": ["The second body inside the first, high and low",
                        "The first candle clearly large",
                        "It says the fall PAUSED, not that it reversed"],
             "bodyLow": round(min(o, o + 1.9), 2), "bodyHigh": round(max(o, o + 1.9), 2),
             "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "Big red body"},
             {"index": i + 1, "part": "body", "label": "Small body inside it"}])


def bearish_harami(rng: Rng):
    ctx = drift(rng, 2000.0, 16, 3.6, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    big = candle(i, price - 5.2, price + 0.6, up_wick=0.9, low_wick=0.7)
    o = price - 1.0
    small = candle(i + 1, o, o - 1.9, up_wick=0.5, low_wick=0.6)
    follow = drift(rng, small["close"], 16, -3.3, 0, i + 2)
    return (ctx + [big, small] + follow, i + 2, [i, i + 1],
            {"name": "Bearish Harami", "bias": "bearish",
             "tagline": "A big green bar, then a small red one entirely inside it",
             "rule": "A large up candle, then a small down candle whose body sits completely "
                     "inside the previous body. The buying did not continue.",
             "checks": ["The second body inside the first, high and low",
                        "The first candle clearly large",
                        "It says the rise PAUSED, not that it reversed"],
             "bodyLow": round(min(o, o - 1.9), 2), "bodyHigh": round(max(o, o - 1.9), 2),
             "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "Big green body"},
             {"index": i + 1, "part": "body", "label": "Small body inside it"}])


def piercing_line(rng: Rng):
    ctx = drift(rng, 2050.0, 16, -3.6, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    red = candle(i, price + 4.4, price - 0.4, up_wick=0.6, low_wick=0.8)
    mid = (red["open"] + red["close"]) / 2
    o = red["close"] - 0.9
    green = candle(i + 1, o, mid + 0.7, up_wick=0.7, low_wick=0.6)
    follow = drift(rng, green["close"], 16, 3.3, 0, i + 2)
    return (ctx + [red, green] + follow, i + 2, [i, i + 1],
            {"name": "Piercing Line", "bias": "bullish",
             "tagline": "Opened lower, closed back above the halfway mark",
             "rule": "A down candle, then an up candle that opens BELOW its low and closes "
                     "back above the midpoint of its body. Half the selling undone in one session.",
             "checks": ["The second opens below the first candle's low",
                        "It closes above the MIDPOINT of the first body",
                        "Close past the midpoint - past the whole body is an engulfing"],
             "bodyLow": round(o, 2), "bodyHigh": round(mid + 0.7, 2), "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "The down bar"},
             {"index": i + 1, "part": "body", "label": "Closes past its middle"}])


def dark_cloud_cover(rng: Rng):
    ctx = drift(rng, 2000.0, 16, 3.6, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    green = candle(i, price - 4.4, price + 0.4, up_wick=0.8, low_wick=0.6)
    mid = (green["open"] + green["close"]) / 2
    o = green["close"] + 0.9
    red = candle(i + 1, o, mid - 0.7, up_wick=0.6, low_wick=0.7)
    follow = drift(rng, red["close"], 16, -3.3, 0, i + 2)
    return (ctx + [green, red] + follow, i + 2, [i, i + 1],
            {"name": "Dark Cloud Cover", "bias": "bearish",
             "tagline": "Opened higher, closed back under the halfway mark",
             "rule": "An up candle, then a down candle that opens ABOVE its high and closes "
                     "back under the midpoint of its body. Half the buying undone in one session.",
             "checks": ["The second opens above the first candle's high",
                        "It closes below the MIDPOINT of the first body",
                        "Past the whole body and it is a bearish engulfing instead"],
             "bodyLow": round(mid - 0.7, 2), "bodyHigh": round(o, 2), "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "The up bar"},
             {"index": i + 1, "part": "body", "label": "Closes past its middle"}])


def three_white_soldiers(rng: Rng):
    ctx = drift(rng, 2050.0, 14, -3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    bars = []
    o = price - 0.4
    for k in range(3):
        c = candle(i + k, o, o + 3.0, up_wick=0.4, low_wick=0.35)
        bars.append(c)
        o = c["close"] - 0.9
    follow = drift(rng, bars[-1]["close"], 15, 2.6, 0, i + 3)
    return (ctx + bars + follow, i + 3, [i, i + 1, i + 2],
            {"name": "Three White Soldiers", "bias": "bullish",
             "tagline": "Three strong closes in a row, each above the last",
             "rule": "Three long up candles, each opening inside the previous body and closing "
                     "above its high, with small wicks. Buying that holds for three sessions, not one.",
             "checks": ["Each close above the previous close",
                        "Small upper wicks - a long one says the push is tiring",
                        "Do not chase the third: enter on the pullback"],
             "bodyLow": round(bars[0]["open"], 2), "bodyHigh": round(bars[-1]["close"], 2),
             "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "Bar 1"},
             {"index": i + 1, "part": "body", "label": "Bar 2, higher close"},
             {"index": i + 2, "part": "body", "label": "Bar 3, higher again"}])


def three_black_crows(rng: Rng):
    ctx = drift(rng, 2000.0, 14, 3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    bars = []
    o = price + 0.4
    for k in range(3):
        c = candle(i + k, o, o - 3.0, up_wick=0.35, low_wick=0.4)
        bars.append(c)
        o = c["close"] + 0.9
    follow = drift(rng, bars[-1]["close"], 15, -2.6, 0, i + 3)
    return (ctx + bars + follow, i + 3, [i, i + 1, i + 2],
            {"name": "Three Black Crows", "bias": "bearish",
             "tagline": "Three weak closes in a row, each below the last",
             "rule": "Three long down candles, each opening inside the previous body and closing "
                     "below its low, with small wicks. Selling that holds for three sessions.",
             "checks": ["Each close below the previous close",
                        "Small lower wicks",
                        "By the third bar much of the move is gone - wait for the pullback"],
             "bodyLow": round(bars[-1]["close"], 2), "bodyHigh": round(bars[0]["open"], 2),
             "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "Bar 1"},
             {"index": i + 1, "part": "body", "label": "Bar 2, lower close"},
             {"index": i + 2, "part": "body", "label": "Bar 3, lower again"}])


def spinning_top(rng: Rng):
    ctx = drift(rng, 2030.0, 17, 1.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    body = 0.9
    c = candle(i, price - body / 2, price + body / 2, up_wick=body * 2.4, low_wick=body * 2.4)
    follow = drift(rng, c["close"], 17, 2.4, 0, i + 1)
    return (ctx + [c] + follow, i + 1, [i],
            {"name": "Spinning Top", "bias": "bullish",
             "tagline": "Long wicks both ways, a small body in the middle - nobody won",
             "rule": "A small body with long wicks on BOTH sides. Price went up and down and "
                     "finished where it started. It is not a signal, it is a warning that the trend has stopped.",
             "checks": ["Both wicks longer than the body",
                        "The body near the middle of the bar",
                        "Do not trade it alone - it says WAIT, not buy or sell"],
             "bodyLow": round(price - body / 2, 2), "bodyHigh": round(price + body / 2, 2),
             "wickRatio": 2.4},
            [{"index": i, "part": "body", "label": "Small body"},
             {"index": i, "part": "upperWick", "label": "Long upper wick"},
             {"index": i, "part": "lowerWick", "label": "Long lower wick"}])


def bullish_belt_hold(rng: Rng):
    ctx = drift(rng, 2050.0, 17, -3.4, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    o = price - 2.6
    c = candle(i, o, o + 5.4, up_wick=0.9, low_wick=0.02)
    follow = drift(rng, c["close"], 17, 3.1, 0, i + 1)
    return (ctx + [c] + follow, i + 1, [i],
            {"name": "Bullish Belt Hold", "bias": "bullish",
             "tagline": "Opened at the low and never went back",
             "rule": "A long up candle that opens ON its low - no lower wick at all - and closes "
                     "near its high. Buyers were there from the first tick of the session.",
             "checks": ["No lower wick, or almost none",
                        "The body long relative to recent bars",
                        "Strongest when it opens with a gap down"],
             "bodyLow": round(o, 2), "bodyHigh": round(o + 5.4, 2), "wickRatio": 1.0},
            [{"index": i, "part": "lowerWick", "label": "Opens at the low"},
             {"index": i, "part": "body", "label": "Long body"}])


def bearish_belt_hold(rng: Rng):
    ctx = drift(rng, 2000.0, 17, 3.4, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    o = price + 2.6
    c = candle(i, o, o - 5.4, up_wick=0.02, low_wick=0.9)
    follow = drift(rng, c["close"], 17, -3.1, 0, i + 1)
    return (ctx + [c] + follow, i + 1, [i],
            {"name": "Bearish Belt Hold", "bias": "bearish",
             "tagline": "Opened at the high and never went back",
             "rule": "A long down candle that opens ON its high - no upper wick - and closes near "
                     "its low. Sellers were there from the first tick.",
             "checks": ["No upper wick, or almost none",
                        "The body long relative to recent bars",
                        "Strongest when it opens with a gap up"],
             "bodyLow": round(o - 5.4, 2), "bodyHigh": round(o, 2), "wickRatio": 1.0},
            [{"index": i, "part": "upperWick", "label": "Opens at the high"},
             {"index": i, "part": "body", "label": "Long body"}])


def morning_doji_star(rng: Rng):
    ctx = drift(rng, 2050.0, 15, -3.6, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    red = candle(i, price + 4.0, price, up_wick=0.6, low_wick=0.7)
    d = price - 1.6
    # Body under 5% of the bar's range, which is what "doji" claims. At 0.12
    # against wicks of 0.85 it measured 6% and the checker was right to say so.
    star = candle(i + 1, d, d + 0.05, up_wick=1.15, low_wick=1.2)
    green = candle(i + 2, d + 0.4, price + 2.8, up_wick=0.7, low_wick=0.5)
    follow = drift(rng, green["close"], 15, 3.1, 0, i + 3)
    return (ctx + [red, star, green] + follow, i + 3, [i, i + 1, i + 2],
            {"name": "Morning Doji Star", "bias": "bullish",
             "tagline": "A morning star whose middle bar has no body at all",
             "rule": "Three bars: a strong down candle, a DOJI that gaps below it, then an up "
                     "candle closing well into the first body. The doji middle makes it the stronger version.",
             "checks": ["The middle bar a real doji - open and close within a few percent",
                        "It should gap away from the first bar",
                        "The third closes above the midpoint of the first"],
             "bodyLow": round(d, 2), "bodyHigh": round(price + 2.8, 2), "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "Heavy selling"},
             {"index": i + 1, "part": "body", "label": "Doji - nobody in control"},
             {"index": i + 2, "part": "body", "label": "Buyers take it back"}])


def evening_doji_star(rng: Rng):
    ctx = drift(rng, 2000.0, 15, 3.6, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    green = candle(i, price - 4.0, price, up_wick=0.7, low_wick=0.6)
    d = price + 1.6
    star = candle(i + 1, d, d - 0.05, up_wick=1.2, low_wick=1.15)
    red = candle(i + 2, d - 0.4, price - 2.8, up_wick=0.5, low_wick=0.7)
    follow = drift(rng, red["close"], 15, -3.1, 0, i + 3)
    return (ctx + [green, star, red] + follow, i + 3, [i, i + 1, i + 2],
            {"name": "Evening Doji Star", "bias": "bearish",
             "tagline": "An evening star whose middle bar has no body at all",
             "rule": "Three bars: a strong up candle, a DOJI that gaps above it, then a down "
                     "candle closing well into the first body.",
             "checks": ["The middle bar a real doji",
                        "It should gap away from the first bar",
                        "The third closes below the midpoint of the first"],
             "bodyLow": round(price - 2.8, 2), "bodyHigh": round(d, 2), "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "Heavy buying"},
             {"index": i + 1, "part": "body", "label": "Doji - nobody in control"},
             {"index": i + 2, "part": "body", "label": "Sellers take it back"}])


def rising_three(rng: Rng):
    ctx = drift(rng, 2000.0, 13, 3.0, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    big = candle(i, price, price + 5.6, up_wick=0.4, low_wick=0.4)
    top = big["close"]
    small = []
    o = top - 0.6
    for k in range(3):
        c = candle(i + 1 + k, o, o - 1.0, up_wick=0.35, low_wick=0.4)
        small.append(c)
        o = c["close"] + 0.2
    last = candle(i + 4, small[-1]["close"], top + 1.9, up_wick=0.5, low_wick=0.4)
    follow = drift(rng, last["close"], 14, 2.6, 0, i + 5)
    return (ctx + [big] + small + [last] + follow, i + 5, [i, i + 4],
            {"name": "Rising Three Methods", "bias": "bullish",
             "tagline": "A big green bar, three small red ones, then a bigger green one",
             "rule": "One long up candle, then three small down candles that stay INSIDE its range, "
                     "then an up candle closing above the first one's high. A pause, not a reversal.",
             "checks": ["The three small bars stay inside the first bar's range",
                        "The last bar closes above the first bar's high",
                        "It is a CONTINUATION - trade with the trend, not against it"],
             "bodyLow": round(price, 2), "bodyHigh": round(top + 1.9, 2), "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "The long bar"},
             {"index": i + 4, "part": "body", "label": "Breaks its high"}])


def falling_three(rng: Rng):
    ctx = drift(rng, 2050.0, 13, -3.0, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    big = candle(i, price, price - 5.6, up_wick=0.4, low_wick=0.4)
    bot = big["close"]
    small = []
    o = bot + 0.6
    for k in range(3):
        c = candle(i + 1 + k, o, o + 1.0, up_wick=0.4, low_wick=0.35)
        small.append(c)
        o = c["close"] - 0.2
    last = candle(i + 4, small[-1]["close"], bot - 1.9, up_wick=0.4, low_wick=0.5)
    follow = drift(rng, last["close"], 14, -2.6, 0, i + 5)
    return (ctx + [big] + small + [last] + follow, i + 5, [i, i + 4],
            {"name": "Falling Three Methods", "bias": "bearish",
             "tagline": "A big red bar, three small green ones, then a bigger red one",
             "rule": "One long down candle, then three small up candles that stay INSIDE its range, "
                     "then a down candle closing below the first one's low. A pause, not a reversal.",
             "checks": ["The three small bars stay inside the first bar's range",
                        "The last bar closes below the first bar's low",
                        "It is a CONTINUATION - the three green bars are the trap"],
             "bodyLow": round(bot - 1.9, 2), "bodyHigh": round(price, 2), "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "The long bar"},
             {"index": i + 4, "part": "body", "label": "Breaks its low"}])


def bullish_kicker(rng: Rng):
    ctx = drift(rng, 2050.0, 17, -3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    red = candle(i, price + 2.6, price, up_wick=0.5, low_wick=0.6)
    o = red["open"] + 1.8
    green = candle(i + 1, o, o + 5.0, up_wick=0.5, low_wick=0.02)
    follow = drift(rng, green["close"], 16, 3.0, 0, i + 2)
    return (ctx + [red, green] + follow, i + 2, [i, i + 1],
            {"name": "Bullish Kicker", "bias": "bullish",
             "tagline": "Gapped straight over the last bar and never looked back",
             "rule": "A down candle, then an up candle that GAPS above the previous OPEN and never "
                     "trades back into it. The strongest reversal shape there is - and the rarest.",
             "checks": ["A real gap above the previous candle's open",
                        "No lower wick filling the gap",
                        "Usually news-driven - do not expect a pullback to enter"],
             "bodyLow": round(o, 2), "bodyHigh": round(o + 5.0, 2), "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "The down bar"},
             {"index": i + 1, "part": "body", "label": "Gaps clean over it"}])


def bearish_kicker(rng: Rng):
    ctx = drift(rng, 2000.0, 17, 3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    green = candle(i, price - 2.6, price, up_wick=0.6, low_wick=0.5)
    o = green["open"] - 1.8
    red = candle(i + 1, o, o - 5.0, up_wick=0.02, low_wick=0.5)
    follow = drift(rng, red["close"], 16, -3.0, 0, i + 2)
    return (ctx + [green, red] + follow, i + 2, [i, i + 1],
            {"name": "Bearish Kicker", "bias": "bearish",
             "tagline": "Gapped straight under the last bar and never looked back",
             "rule": "An up candle, then a down candle that GAPS below the previous OPEN and never "
                     "trades back into it.",
             "checks": ["A real gap below the previous candle's open",
                        "No upper wick filling the gap",
                        "Usually news-driven - the gap does not get filled"],
             "bodyLow": round(o - 5.0, 2), "bodyHigh": round(o, 2), "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "The up bar"},
             {"index": i + 1, "part": "body", "label": "Gaps clean under it"}])


def bullish_marubozu(rng: Rng):
    ctx = drift(rng, 2040.0, 17, -1.6, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    o = price - 0.3
    c = candle(i, o, o + 6.0, up_wick=0.03, low_wick=0.03)
    follow = drift(rng, c["close"], 17, 3.0, 0, i + 1)
    return (ctx + [c] + follow, i + 1, [i],
            {"name": "Bullish Marubozu", "bias": "bullish",
             "tagline": "All body, no wicks - one side ran the whole session",
             "rule": "A long up candle with almost no wick at either end: it opened at its low and "
                     "closed at its high. Buyers held control from the first tick to the last.",
             "checks": ["Wicks under 3% of the body at BOTH ends",
                        "The body long against recent bars",
                        "Its low becomes the level to defend"],
             "bodyLow": round(o, 2), "bodyHigh": round(o + 6.0, 2), "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "All body"},
             {"index": i, "part": "lowerWick", "label": "Opens at the low"},
             {"index": i, "part": "upperWick", "label": "Closes at the high"}])


def bearish_marubozu(rng: Rng):
    ctx = drift(rng, 2010.0, 17, 1.6, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    o = price + 0.3
    c = candle(i, o, o - 6.0, up_wick=0.03, low_wick=0.03)
    follow = drift(rng, c["close"], 17, -3.0, 0, i + 1)
    return (ctx + [c] + follow, i + 1, [i],
            {"name": "Bearish Marubozu", "bias": "bearish",
             "tagline": "All body, no wicks - sellers ran the whole session",
             "rule": "A long down candle with almost no wick at either end: it opened at its high "
                     "and closed at its low. Sellers held control from open to close.",
             "checks": ["Wicks under 3% of the body at BOTH ends",
                        "The body long against recent bars",
                        "Its high becomes the level sellers defend"],
             "bodyLow": round(o - 6.0, 2), "bodyHigh": round(o, 2), "wickRatio": 1.0},
            [{"index": i, "part": "body", "label": "All body"},
             {"index": i, "part": "upperWick", "label": "Opens at the high"},
             {"index": i, "part": "lowerWick", "label": "Closes at the low"}])


def long_legged_doji(rng: Rng):
    ctx = drift(rng, 2000.0, 17, 3.2, 0, 0)
    price = ctx[-1]["close"]
    i = len(ctx)
    c = candle(i, price, price + 0.10, up_wick=4.2, low_wick=4.4)
    follow = drift(rng, c["close"], 17, -2.8, 0, i + 1)
    return (ctx + [c] + follow, i + 1, [i],
            {"name": "Long-Legged Doji", "bias": "bearish",
             "tagline": "A huge range, and price finished exactly where it opened",
             "rule": "No body at all, with long wicks BOTH ways. The session covered a wide range "
                     "and settled at its open: maximum activity, zero result. After a long trend, that matters.",
             "checks": ["Open and close within a few percent of each other",
                        "Both wicks long - a wide range, not a quiet bar",
                        "It marks indecision AT a level, so the level is the trade"],
             "bodyLow": round(price, 2), "bodyHigh": round(price + 0.10, 2), "wickRatio": 4.2},
            [{"index": i, "part": "body", "label": "No body"},
             {"index": i, "part": "upperWick", "label": "Long upper wick"},
             {"index": i, "part": "lowerWick", "label": "Long lower wick"}])


BUILDERS = {
    "bullish-engulfing": bullish_engulfing,
    "bearish-engulfing": bearish_engulfing,
    "hammer": hammer,
    "shooting-star": shooting_star,
    "morning-star": morning_star,
    "doji": doji,
    "marubozu": marubozu,
    "dragonfly-doji": dragonfly_doji,
    "gravestone-doji": gravestone_doji,
    "pin-bar": pin_bar,
    "tweezer-bottom": tweezer_bottom,
    "tweezer-top": tweezer_top,
    "evening-star": evening_star,
    "inverted-hammer": inverted_hammer,
    "hanging-man": hanging_man,
    "bullish-harami": bullish_harami,
    "bearish-harami": bearish_harami,
    "piercing-line": piercing_line,
    "dark-cloud-cover": dark_cloud_cover,
    "three-white-soldiers": three_white_soldiers,
    "three-black-crows": three_black_crows,
    "spinning-top": spinning_top,
    "bullish-belt-hold": bullish_belt_hold,
    "bearish-belt-hold": bearish_belt_hold,
    "morning-doji-star": morning_doji_star,
    "evening-doji-star": evening_doji_star,
    "rising-three": rising_three,
    "falling-three": falling_three,
    "bullish-kicker": bullish_kicker,
    "bearish-kicker": bearish_kicker,
    "bullish-marubozu": bullish_marubozu,
    "bearish-marubozu": bearish_marubozu,
    "long-legged-doji": long_legged_doji,
}


# How often the constructed follow-through goes against the trade.
#
# It used to be never. Every builder ended with a drift running the pattern's own
# way, and `make` only had to find which bar crossed the target — so every one of
# these videos, on every pattern, showed the rule working. A channel whose
# textbook examples win 100% of the time is teaching survivorship bias with a
# chart attached, and it is the same defect the reality-check beat exists to
# correct, reproduced in the illustration itself.
#
# The rate is not a measurement and is not presented as one. It is close to what
# the measured hit rates come back as, and it exists so the series contains
# losses at all. What the loser teaches is the point of the whole format: the
# pattern was valid, every check passed, and the trade still lost. That is what a
# trigger is, as opposed to a system.
# --------------------------------------------------------------------------
# Ban tieng Viet.
#
# Khong phai ban dich. Ten mau nen dung dung ten ma dan trade Viet goi nhau
# hang ngay — "Sao Mai", "Nhan Chim Tang", "Day Nhip" — chu khong phai ten dich
# tu tu dien; con nhung cai da thanh ten rieng trong nghe (Doji, Pin Bar,
# Marubozu) thi giu nguyen, vi dich chung ra moi la thu khong ai noi.
#
# Cac dong "checks" giu nguyen cach doc so lieu, vi do la cho khong duoc phep
# dich thoang: "2x than nen" phai van la 2x.
# --------------------------------------------------------------------------
VI = {
    "inverted-hammer": {
        "name": "Búa Ngược",
        "taglines": ["Một cú đẩy lên thất bại — nhưng là ở đáy",
                     "Bên mua thua, nhưng ít ra họ đã thử"],
        "rule": "Bóng trên dài, thân nhỏ nằm dưới, xuất hiện sau nhịp giảm. Bên mua thử "
                "và bị đẩy về — nhưng họ đã thử, điều mà trước đó họ không làm.",
        "checks": ["Bóng trên ít nhất gấp 2 lần thân",
                   "Bóng dưới dưới 10% thân",
                   "Cần một cây xác nhận đóng trên nó — đây là cây yếu hơn Nến Búa"],
        "anatomy": ["Thân nhỏ, nằm dưới", "Bóng trên dài", "Gần như không có bóng dưới"],
    },
    "hanging-man": {
        "name": "Người Treo Cổ",
        "taglines": ["Hình dạng y hệt Nến Búa — nhưng nằm ở đỉnh",
                     "Cùng một cây nến, khác một xu hướng"],
        "rule": "Bóng dưới dài dưới một thân nhỏ, xuất hiện sau nhịp TĂNG. Hình dạng giống "
                "hệt Nến Búa; cái xu hướng nó nằm trong mới là toàn bộ khác biệt.",
        "checks": ["Bóng dưới ít nhất gấp 2 lần thân",
                   "Phải sau nhịp tăng — sau nhịp giảm thì nó là Nến Búa",
                   "Chờ một cây đóng thấp hơn để xác nhận"],
        "anatomy": ["Thân nhỏ, nằm trên", "Bóng dưới dài", "Gần như không có bóng trên"],
    },
    "bullish-harami": {
        "name": "Harami Tăng",
        "taglines": ["Một cây đỏ to, rồi một cây xanh nhỏ nằm gọn bên trong",
                     "Đà bán không đi tiếp được nữa"],
        "rule": "Một cây giảm lớn, rồi một cây tăng nhỏ có thân nằm HOÀN TOÀN bên trong thân "
                "cây trước. Việc bán không tiếp diễn — đó mới là tín hiệu.",
        "checks": ["Thân cây hai nằm trong thân cây một, cả trên lẫn dưới",
                   "Cây một phải rõ ràng là cây lớn",
                   "Nó nói nhịp giảm ĐANG DỪNG, không nói đã đảo chiều"],
        "anatomy": ["Thân đỏ to", "Thân nhỏ nằm trong"],
    },
    "bearish-harami": {
        "name": "Harami Giảm",
        "taglines": ["Một cây xanh to, rồi một cây đỏ nhỏ nằm gọn bên trong",
                     "Đà mua không đi tiếp được nữa"],
        "rule": "Một cây tăng lớn, rồi một cây giảm nhỏ có thân nằm HOÀN TOÀN bên trong thân "
                "cây trước. Việc mua không tiếp diễn.",
        "checks": ["Thân cây hai nằm trong thân cây một, cả trên lẫn dưới",
                   "Cây một phải rõ ràng là cây lớn",
                   "Nó nói nhịp tăng ĐANG DỪNG, không nói đã đảo chiều"],
        "anatomy": ["Thân xanh to", "Thân nhỏ nằm trong"],
    },
    "piercing-line": {
        "name": "Đường Xuyên Thấu",
        "taglines": ["Mở thấp hơn, đóng lại trên điểm giữa",
                     "Một nửa lực bán bị xoá trong đúng một phiên"],
        "rule": "Một cây giảm, rồi một cây tăng mở cửa DƯỚI đáy nó và đóng cửa lại trên điểm "
                "giữa thân nó. Một nửa lực bán bị lấy lại trong một phiên.",
        "checks": ["Cây hai mở dưới đáy cây một",
                   "Nó đóng trên ĐIỂM GIỮA thân cây một",
                   "Chỉ cần qua điểm giữa — qua hết thân thì đó là Nhấn Chìm"],
        "anatomy": ["Cây giảm", "Đóng qua điểm giữa của nó"],
    },
    "dark-cloud-cover": {
        "name": "Mây Đen Che Phủ",
        "taglines": ["Mở cao hơn, đóng lại dưới điểm giữa",
                     "Một nửa lực mua bị xoá trong đúng một phiên"],
        "rule": "Một cây tăng, rồi một cây giảm mở cửa TRÊN đỉnh nó và đóng cửa lại dưới điểm "
                "giữa thân nó.",
        "checks": ["Cây hai mở trên đỉnh cây một",
                   "Nó đóng dưới ĐIỂM GIỮA thân cây một",
                   "Qua hết thân thì đó là Nhấn Chìm Giảm, không phải mây đen"],
        "anatomy": ["Cây tăng", "Đóng qua điểm giữa của nó"],
    },
    "three-white-soldiers": {
        "name": "Ba Chàng Lính Trắng",
        "taglines": ["Ba phiên đóng cửa mạnh liên tiếp, cây sau cao hơn cây trước",
                     "Lực mua giữ được ba phiên, không phải một"],
        "rule": "Ba cây tăng dài, mỗi cây mở trong thân cây trước và đóng trên đỉnh nó, bóng "
                "nến nhỏ. Lực mua giữ được ba phiên liền.",
        "checks": ["Mỗi cây đóng cao hơn cây trước",
                   "Bóng trên nhỏ — bóng dài nghĩa là đà đang đuối",
                   "Đừng đuổi cây thứ ba: vào lệnh khi giá lùi lại"],
        "anatomy": ["Cây 1", "Cây 2, đóng cao hơn", "Cây 3, cao hơn nữa"],
    },
    "three-black-crows": {
        "name": "Ba Con Quạ Đen",
        "taglines": ["Ba phiên đóng cửa yếu liên tiếp, cây sau thấp hơn cây trước",
                     "Lực bán giữ được ba phiên, không phải một"],
        "rule": "Ba cây giảm dài, mỗi cây mở trong thân cây trước và đóng dưới đáy nó, bóng "
                "nến nhỏ. Lực bán giữ được ba phiên liền.",
        "checks": ["Mỗi cây đóng thấp hơn cây trước",
                   "Bóng dưới nhỏ",
                   "Tới cây thứ ba là mất phần lớn con sóng — chờ nhịp hồi"],
        "anatomy": ["Cây 1", "Cây 2, đóng thấp hơn", "Cây 3, thấp hơn nữa"],
    },
    "spinning-top": {
        "name": "Con Xoay",
        "taglines": ["Bóng dài cả hai phía, thân nhỏ ở giữa — không ai thắng",
                     "Giá đi lên rồi đi xuống và về đúng chỗ cũ"],
        "rule": "Thân nhỏ với bóng dài ở CẢ HAI phía. Giá đi lên rồi đi xuống và kết thúc ở "
                "chỗ nó bắt đầu. Đây không phải tín hiệu, đây là cảnh báo xu hướng đã dừng.",
        "checks": ["Cả hai bóng đều dài hơn thân",
                   "Thân nằm gần giữa cây nến",
                   "Đừng vào lệnh chỉ vì nó — nó nói CHỜ, không nói mua hay bán"],
        "anatomy": ["Thân nhỏ", "Bóng trên dài", "Bóng dưới dài"],
    },
    "bullish-belt-hold": {
        "name": "Đai Giữ Tăng",
        "taglines": ["Mở ngay tại đáy và không bao giờ quay lại",
                     "Bên mua có mặt từ tick đầu tiên của phiên"],
        "rule": "Một cây tăng dài mở cửa NGAY TẠI đáy — không có bóng dưới — và đóng gần đỉnh. "
                "Bên mua có mặt từ tick đầu tiên của phiên.",
        "checks": ["Không có bóng dưới, hoặc gần như không",
                   "Thân dài so với các cây gần đó",
                   "Mạnh nhất khi nó mở cửa nhảy giá xuống"],
        "anatomy": ["Mở ngay tại đáy", "Thân dài"],
    },
    "bearish-belt-hold": {
        "name": "Đai Giữ Giảm",
        "taglines": ["Mở ngay tại đỉnh và không bao giờ quay lại",
                     "Bên bán có mặt từ tick đầu tiên của phiên"],
        "rule": "Một cây giảm dài mở cửa NGAY TẠI đỉnh — không có bóng trên — và đóng gần đáy. "
                "Bên bán có mặt từ tick đầu tiên.",
        "checks": ["Không có bóng trên, hoặc gần như không",
                   "Thân dài so với các cây gần đó",
                   "Mạnh nhất khi nó mở cửa nhảy giá lên"],
        "anatomy": ["Mở ngay tại đỉnh", "Thân dài"],
    },
    "morning-doji-star": {
        "name": "Sao Mai Doji",
        "taglines": ["Sao Mai mà cây giữa không có thân nào cả",
                     "Bản mạnh hơn của Sao Mai"],
        "rule": "Ba cây: một cây giảm mạnh, một DOJI nhảy giá xuống dưới nó, rồi một cây tăng "
                "đóng sâu vào thân cây đầu. Cây giữa là doji khiến nó là bản mạnh hơn.",
        "checks": ["Cây giữa phải là doji thật — mở và đóng chênh vài phần trăm",
                   "Nó nên nhảy giá tách khỏi cây đầu",
                   "Cây ba đóng trên điểm giữa cây một"],
        "anatomy": ["Bán mạnh", "Doji — không ai cầm trịch", "Bên mua lấy lại"],
    },
    "evening-doji-star": {
        "name": "Sao Hôm Doji",
        "taglines": ["Sao Hôm mà cây giữa không có thân nào cả",
                     "Bản mạnh hơn của Sao Hôm"],
        "rule": "Ba cây: một cây tăng mạnh, một DOJI nhảy giá lên trên nó, rồi một cây giảm "
                "đóng sâu vào thân cây đầu.",
        "checks": ["Cây giữa phải là doji thật",
                   "Nó nên nhảy giá tách khỏi cây đầu",
                   "Cây ba đóng dưới điểm giữa cây một"],
        "anatomy": ["Mua mạnh", "Doji — không ai cầm trịch", "Bên bán lấy lại"],
    },
    "rising-three": {
        "name": "Tăng Ba Bước",
        "taglines": ["Một cây xanh to, ba cây đỏ nhỏ, rồi một cây xanh to hơn",
                     "Một nhịp nghỉ, không phải một cú đảo chiều"],
        "rule": "Một cây tăng dài, rồi ba cây giảm nhỏ nằm TRONG biên độ của nó, rồi một cây "
                "tăng đóng trên đỉnh cây đầu. Một nhịp nghỉ, không phải đảo chiều.",
        "checks": ["Ba cây nhỏ nằm trong biên độ cây đầu",
                   "Cây cuối đóng trên đỉnh cây đầu",
                   "Đây là mẫu TIẾP DIỄN — đánh theo xu hướng, không đánh ngược"],
        "anatomy": ["Cây dài", "Phá đỉnh của nó"],
    },
    "falling-three": {
        "name": "Giảm Ba Bước",
        "taglines": ["Một cây đỏ to, ba cây xanh nhỏ, rồi một cây đỏ to hơn",
                     "Ba cây xanh ở giữa chính là cái bẫy"],
        "rule": "Một cây giảm dài, rồi ba cây tăng nhỏ nằm TRONG biên độ của nó, rồi một cây "
                "giảm đóng dưới đáy cây đầu. Một nhịp nghỉ, không phải đảo chiều.",
        "checks": ["Ba cây nhỏ nằm trong biên độ cây đầu",
                   "Cây cuối đóng dưới đáy cây đầu",
                   "Đây là mẫu TIẾP DIỄN — ba cây xanh chính là cái bẫy"],
        "anatomy": ["Cây dài", "Phá đáy của nó"],
    },
    "bullish-kicker": {
        "name": "Cú Đá Tăng",
        "taglines": ["Nhảy thẳng qua cây trước và không ngoảnh lại",
                     "Mẫu đảo chiều mạnh nhất, và hiếm nhất"],
        "rule": "Một cây giảm, rồi một cây tăng NHẢY GIÁ lên trên giá MỞ của cây trước và không "
                "bao giờ quay lại vùng đó. Mẫu đảo chiều mạnh nhất — và hiếm nhất.",
        "checks": ["Phải có khoảng nhảy giá thật trên giá mở cây trước",
                   "Không có bóng dưới lấp khoảng nhảy đó",
                   "Thường do tin tức — đừng chờ giá lùi lại để vào"],
        "anatomy": ["Cây giảm", "Nhảy sạch qua nó"],
    },
    "bearish-kicker": {
        "name": "Cú Đá Giảm",
        "taglines": ["Nhảy thẳng xuống dưới cây trước và không ngoảnh lại",
                     "Khoảng nhảy giá này thường không được lấp"],
        "rule": "Một cây tăng, rồi một cây giảm NHẢY GIÁ xuống dưới giá MỞ của cây trước và "
                "không bao giờ quay lại vùng đó.",
        "checks": ["Phải có khoảng nhảy giá thật dưới giá mở cây trước",
                   "Không có bóng trên lấp khoảng nhảy đó",
                   "Thường do tin tức — khoảng nhảy không được lấp"],
        "anatomy": ["Cây tăng", "Nhảy sạch dưới nó"],
    },
    "bullish-marubozu": {
        "name": "Marubozu Tăng",
        "taglines": ["Toàn thân, không bóng — một bên cầm cả phiên",
                     "Mở tại đáy, đóng tại đỉnh"],
        "rule": "Một cây tăng dài gần như không có bóng ở cả hai đầu: nó mở tại đáy và đóng tại "
                "đỉnh. Bên mua cầm trịch từ tick đầu đến tick cuối.",
        "checks": ["Bóng dưới 3% thân ở CẢ HAI đầu",
                   "Thân dài so với các cây gần đó",
                   "Cái đáy của nó thành mức giá phải giữ"],
        "anatomy": ["Toàn thân", "Mở tại đáy", "Đóng tại đỉnh"],
    },
    "bearish-marubozu": {
        "name": "Marubozu Giảm",
        "taglines": ["Toàn thân, không bóng — bên bán cầm cả phiên",
                     "Mở tại đỉnh, đóng tại đáy"],
        "rule": "Một cây giảm dài gần như không có bóng ở cả hai đầu: nó mở tại đỉnh và đóng "
                "tại đáy. Bên bán cầm trịch từ mở đến đóng.",
        "checks": ["Bóng dưới 3% thân ở CẢ HAI đầu",
                   "Thân dài so với các cây gần đó",
                   "Cái đỉnh của nó thành mức bên bán bảo vệ"],
        "anatomy": ["Toàn thân", "Mở tại đỉnh", "Đóng tại đáy"],
    },
    "long-legged-doji": {
        "name": "Doji Chân Dài",
        "taglines": ["Biên độ rộng, mà giá đóng đúng chỗ nó mở",
                     "Hoạt động tối đa, kết quả bằng không"],
        "rule": "Không có thân, bóng dài CẢ HAI phía. Phiên đi một biên độ rộng rồi về đúng giá "
                "mở: hoạt động tối đa, kết quả bằng không. Sau một xu hướng dài, điều đó có nghĩa.",
        "checks": ["Giá mở và đóng chênh nhau vài phần trăm",
                   "Cả hai bóng đều dài — biên độ rộng, không phải cây lặng",
                   "Nó đánh dấu do dự TẠI một mức giá, nên mức giá đó mới là kèo"],
        "anatomy": ["Không có thân", "Bóng trên dài", "Bóng dưới dài"],
    },
    "hammer": {
        "name": "Nến Búa",
        "taglines": ["Giá bị từ chối ở vùng đáy",
                     "Bên bán cầm được, rồi trả lại sạch",
                     "Một cái đuôi dài xuống đáy mà không mang về được gì"],
        "rule": "Bóng dưới dài, thân nhỏ nằm trên. Bên bán đạp giá xuống, "
                "bên mua lấy lại toàn bộ trước khi nến đóng.",
        "checks": ["Bóng dưới ít nhất gấp 2 lần thân",
                   "Bóng trên dưới 5% thân nến",
                   "Chỉ có giá trị sau một nhịp giảm"],
        "anatomy": ["Thân nhỏ", "Bóng dưới dài", "Gần như không có bóng trên"],
    },
    "shooting-star": {
        "name": "Sao Băng",
        "taglines": ["Giá bị từ chối ở vùng đỉnh",
                     "Bên mua cầm được, rồi trả lại sạch",
                     "Một cái đuôi dài lên đỉnh mà không mang về được gì"],
        "rule": "Bóng trên dài, thân nhỏ nằm dưới. Bên mua kéo giá lên, "
                "bên bán lấy lại toàn bộ trước khi nến đóng.",
        "checks": ["Bóng trên ít nhất gấp 2 lần thân",
                   "Bóng dưới dưới 5% thân nến",
                   "Chỉ có giá trị sau một nhịp tăng"],
        "anatomy": ["Thân nhỏ", "Bóng trên dài", "Gần như không có bóng dưới"],
    },
    "bullish-engulfing": {
        "name": "Nhấn Chìm Tăng",
        "taglines": ["Bên bán mất quyền kiểm soát trong một cây nến",
                     "Một cây nến nuốt trọn cây trước đó",
                     "Cả phiên bán hôm trước bị xoá sạch"],
        "rule": "Một thân xanh trùm hết thân đỏ liền trước — bên mua xoá sạch "
                "cả phiên bán trong đúng một cây nến.",
        "checks": ["Đi sau một nhịp giảm rõ ràng",
                   "Mở cửa bằng hoặc thấp hơn giá đóng cây trước",
                   "Đóng cửa cao hơn giá mở cây trước"],
        "anatomy": ["Thân nến", "Bóng trên", "Bóng dưới"],
    },
    "bearish-engulfing": {
        "name": "Nhấn Chìm Giảm",
        "taglines": ["Bên mua mất quyền kiểm soát trong một cây nến",
                     "Một cây nến nuốt trọn cây trước đó",
                     "Cả phiên mua hôm trước bị xoá sạch"],
        "rule": "Một thân đỏ trùm hết thân xanh liền trước — bên bán xoá sạch "
                "cả phiên mua trong đúng một cây nến.",
        "checks": ["Đi sau một nhịp tăng rõ ràng",
                   "Mở cửa bằng hoặc cao hơn giá đóng cây trước",
                   "Đóng cửa thấp hơn giá mở cây trước"],
        "anatomy": ["Thân nến", "Bóng trên", "Bóng dưới"],
    },
    "morning-star": {
        "name": "Sao Mai",
        "taglines": ["Ba cây nến bẻ một xu hướng",
                     "Giảm, chững, tăng — và thứ tự đó mới là tín hiệu",
                     "Một cú đảo chiều cần ba cây nến, không phải một"],
        "rule": "Một cây đỏ mạnh, rồi một cây thân nhỏ do dự, rồi một cây xanh "
                "lấy lại phần lớn cây đầu. Đà bán chững lại rồi đảo chiều.",
        "checks": ["Cây 1 là nến đỏ mạnh",
                   "Cây 2 thân nhỏ — đà giảm chững lại",
                   "Cây 3 đóng vào trong thân cây 1"],
        "anatomy": ["Nến do dự", "Nến đảo chiều"],
    },
    "evening-star": {
        "name": "Sao Hôm",
        "taglines": ["Ba cây nến kết thúc một nhịp chạy",
                     "Tăng, chững, giảm — và thứ tự đó mới là tín hiệu",
                     "Một cái đỉnh cần ba cây nến, không phải một"],
        "rule": "Một cây xanh mạnh, rồi một cây thân nhỏ do dự, rồi một cây đỏ "
                "trả lại phần lớn cây đầu. Đà mua chững lại rồi đảo chiều.",
        "checks": ["Cây 1 là nến xanh mạnh",
                   "Cây 2 thân nhỏ — đà tăng chững lại",
                   "Cây 3 đóng vào trong thân cây 1"],
        "anatomy": ["Nến do dự", "Nến đảo chiều"],
    },
    "doji": {
        "name": "Doji",
        "taglines": ["Không bên nào thắng",
                     "Giá mở và giá đóng về đúng một chỗ",
                     "Cả một phiên, và không ai lấy được đất"],
        "rule": "Giá mở và giá đóng về đúng một chỗ. Giá đi cả hai hướng rồi "
                "quay lại điểm xuất phát — đó là thế giằng co, không phải tín hiệu.",
        "checks": ["Thân dưới 5% biên độ cây nến",
                   "Có bóng ở cả hai phía",
                   "Nghĩa là tạm dừng, không phải đảo chiều — chờ cây kế tiếp"],
        "anatomy": ["Thân rất nhỏ", "Bóng trên", "Bóng dưới"],
    },
    "dragonfly-doji": {
        "name": "Doji Chuồn Chuồn",
        "taglines": ["Bên bán đẩy được, rồi mất sạch",
                     "Xuống hết đường, rồi về hết đường",
                     "Vùng đáy đã bị thử và bị từ chối"],
        "rule": "Giá mở và giá đóng gặp nhau ở sát đỉnh cây nến, bên dưới là "
                "một cái bóng dài. Bên bán đẩy được cả phiên rồi mất sạch.",
        "checks": ["Thân mỏng như một vạch, nằm sát đỉnh",
                   "Bóng dưới dài, gần như không có bóng trên",
                   "Chỉ đọc ở vùng hỗ trợ, không đọc giữa biên"],
        "anatomy": ["Thân nằm sát đỉnh", "Toàn bộ biên độ nằm dưới"],
    },
    "gravestone-doji": {
        "name": "Doji Bia Mộ",
        "taglines": ["Bên mua đẩy được, rồi mất sạch",
                     "Lên hết đường, rồi về hết đường",
                     "Vùng đỉnh đã bị thử và bị từ chối"],
        "rule": "Giá mở và giá đóng gặp nhau ở sát đáy cây nến, bên trên là "
                "một cái bóng dài. Bên mua đẩy được cả phiên rồi mất sạch.",
        "checks": ["Thân mỏng như một vạch, nằm sát đáy",
                   "Bóng trên dài, gần như không có bóng dưới",
                   "Chỉ đọc ở vùng kháng cự, không đọc giữa biên"],
        "anatomy": ["Thân nằm sát đáy", "Toàn bộ biên độ nằm trên"],
    },
    "marubozu": {
        "name": "Marubozu Tăng",
        "taglines": ["Một bên cầm trịch cả phiên",
                     "Không bóng, không tranh cãi",
                     "Mở ở một đầu, đóng ở đầu kia"],
        "rule": "Thân dài, gần như không có bóng. Giá mở ở một đầu, đóng ở đầu "
                "kia, và không ngoái lại. Đây là nến xác nhận đà, không phải đảo chiều.",
        "checks": ["Thân dài hơn hẳn mức trung bình gần đây",
                   "Cả hai bóng dưới 5% thân nến",
                   "Xác nhận xu hướng chứ không bẻ xu hướng"],
        "anatomy": ["Thân chiếm trọn biên độ", "Gần như không có bóng"],
    },
    "pin-bar": {
        "name": "Pin Bar",
        "taglines": ["Vùng giá đã bị thử và bị từ chối",
                     "Chọc thủng rồi bị kéo ngược về ngay",
                     "Cái bóng nến mới là toàn bộ câu chuyện"],
        "rule": "Một cái bóng đâm xuyên qua vùng giá rồi giá đóng ngược về phía "
                "bên kia. Cú xuyên đó bị từ chối, không được chấp nhận.",
        "checks": ["Bóng chiếm hơn 70% toàn bộ biên độ",
                   "Bóng chọc qua vùng mà các nến khác đều tôn trọng",
                   "Thân đóng lại vào trong biên độ"],
        "anatomy": ["Bóng xuyên qua vùng giá", "Giá đóng quay về"],
    },
    "tweezer-bottom": {
        "name": "Đáy Nhíp",
        "taglines": ["Hai cây nến, một cái sàn",
                     "Hai lần xuống đúng một đáy, hai lần bị từ chối",
                     "Hai cây nến dừng ở đúng một mức giá"],
        "rule": "Hai cây nến liền nhau chạm đúng một đáy và cả hai đều không "
                "phá nổi. Lần từ chối thứ hai mới là thứ làm vùng đó đáng đánh dấu.",
        "checks": ["Hai đáy về gần như đúng một mức giá",
                   "Cây thứ hai đóng ngược lên",
                   "Đi sau một nhịp giảm"],
        "anatomy": ["Lần từ chối thứ nhất", "Lại đúng cái đáy đó"],
    },
    "tweezer-top": {
        "name": "Đỉnh Nhíp",
        "taglines": ["Hai cây nến, một cái trần",
                     "Hai lần lên đúng một đỉnh, hai lần bị từ chối",
                     "Hai cây nến dừng ở đúng một mức giá"],
        "rule": "Hai cây nến liền nhau chạm đúng một đỉnh và cả hai đều không "
                "phá nổi. Lần từ chối thứ hai mới là thứ làm vùng đó đáng đánh dấu.",
        "checks": ["Hai đỉnh về gần như đúng một mức giá",
                   "Cây thứ hai đóng ngược xuống",
                   "Đi sau một nhịp tăng"],
        "anatomy": ["Lần từ chối thứ nhất", "Lại đúng cái đỉnh đó"],
    },
}

VI_NOTE = "Minh hoạ - chuỗi giá dựng lại, không phải biểu đồ thật"

LOSS_RATE = 0.4

# Alternative taglines, chosen by seed.
#
# A hundred videos come from thirteen patterns, so each pattern comes round about
# eight times. With one fixed line per pattern, eight of those videos open with
# the same sentence under the same title — which is what a channel looks like
# when nobody wrote it. The builders keep their own line; these sit alongside it,
# and they are written to say a different true thing about the same shape rather
# than to reword the first one.
TAGLINES = {
    "bullish-engulfing": ["One bar takes back the whole of the last one",
                          "Yesterday's selling, erased in a session"],
    "bearish-engulfing": ["One bar swallows the last one whole",
                          "Yesterday's buying, erased in a session"],
    "hammer": ["Sellers had it, and gave every bit of it back",
               "A long tail into the low with nothing to show for it"],
    "shooting-star": ["Buyers had it, and gave every bit of it back",
                      "A long tail into the high with nothing to show for it"],
    "morning-star": ["Down, pause, up — and the order is the signal",
                     "A turn takes three bars, not one"],
    "evening-star": ["Up, pause, down — and the order is the signal",
                     "A top takes three bars, not one"],
    "doji": ["Open and close in the same place",
             "A whole session, and no ground taken"],
    "dragonfly-doji": ["All the way down, and all the way back",
                       "The low was tested and refused"],
    "gravestone-doji": ["All the way up, and all the way back",
                        "The high was tested and refused"],
    "marubozu": ["No wicks, no argument",
                 "Open at one end, close at the other"],
    "pin-bar": ["Poked through the level and pulled straight back",
                "The wick is the whole story"],
    "tweezer-bottom": ["Twice into the same low, twice refused",
                       "Two bars that stop at the same price"],
    "tweezer-top": ["Twice into the same high, twice refused",
                    "Two bars that stop at the same price"],
}


def make(name: str, seed: int, locale: str = "en") -> dict:
    candles, setup_count, indices, meta, anatomy = BUILDERS[name](Rng(seed))

    # The builder's own line stays in the rotation as the first option.
    options = [meta["tagline"], *TAGLINES.get(name, [])]
    meta = {**meta, "tagline": options[Rng(seed * 17 + 3).state % len(options)]}

    if locale == "vi":
        vi = VI.get(name)
        if vi:
            # Anatomy labels are matched by position, not by (index, part): a
            # three-bar pattern names bars, a one-bar pattern names parts of a
            # bar, and position is the only key both shapes share.
            anatomy = [{**a, "label": vi["anatomy"][i]} if i < len(vi["anatomy"]) else a
                       for i, a in enumerate(anatomy)]
            meta = {
                **meta,
                "name": vi["name"],
                "tagline": vi["taglines"][Rng(seed * 17 + 3).state % len(vi["taglines"])],
                "rule": vi["rule"],
                "checks": vi["checks"],
            }

    decisive = candles[indices[-1]]
    bullish = meta["bias"] == "bullish"

    # Textbook placement: stop just past the pattern's extreme, target a
    # multiple of that risk so the reward is stated rather than implied.
    if bullish:
        entry = decisive["close"]
        stop = min(c["low"] for c in (candles[i] for i in indices)) - 0.6
    else:
        entry = decisive["close"]
        stop = max(c["high"] for c in (candles[i] for i in indices)) + 0.6
    risk = abs(entry - stop)
    target = entry + risk * 2.0 if bullish else entry - risk * 2.0

    # Decide, from the seed, whether this instance is one that works.
    verdict_rng = Rng(seed * 31 + 7)
    losing = verdict_rng.next() < LOSS_RATE

    if losing:
        # Rebuild the follow-through against the trade. Paced to take out the
        # stop around the fifth or sixth bar: sooner and the pattern looks like
        # a drawing error, later and the video ends before the stop prints.
        span = len(candles) - setup_count
        per_bar = (risk / 5.0) * (-1 if bullish else 1)
        candles[setup_count:] = drift(
            verdict_rng, decisive["close"], span, per_bar, 0, setup_count
        )

    # Find whichever level printed first. Scanning for both is what makes the
    # verdict a reading of the series rather than an assertion about it.
    hit, result = None, "OPEN"
    for i in range(setup_count, len(candles)):
        c = candles[i]
        target_hit = c["high"] >= target if bullish else c["low"] <= target
        stop_hit = c["low"] <= stop if bullish else c["high"] >= stop
        # Within one bar the order is unknowable, so the loss is assumed. Any
        # other choice flatters the result on exactly the bars that decide it.
        if stop_hit:
            hit, result = i, "SL"
            break
        if target_hit:
            hit, result = i, "TP"
            break
    if hit is None:
        # Keep the claim truthful: if the drift fell short, say it stayed open
        # rather than asserting a level that never printed.
        hit = len(candles) - 1

    return {
        "kind": "candleLesson",
        "instrument": "ILLUSTRATION",
        # Which of the three openings this video uses.
        #
        # A hundred videos that all open badge -> name -> tagline read as one
        # batch, to a viewer and to a feed, however different the words are.
        # Three openings from the same three pieces of text: no new copy to
        # write and nothing that can go stale, and the first second stops being
        # identical. Seeded, so a given video always opens the same way.
        "open": Rng(seed * 29 + 5).state % 3,
        "pattern": {**meta, "indices": indices},
        "anatomy": anatomy,
        "candles": candles,
        "setupCount": setup_count,
        "trade": {
            "entry": round(entry, 2),
            "stop": round(stop, 2),
            "target": round(target, 2),
            "entryIndex": indices[-1],
        },
        "outcome": {"result": result, "index": hit},
        "locale": locale,
        "note": VI_NOTE if locale == "vi"
        else "Illustration - constructed price series, not a live chart",
        # Filled in by --stats. Absent means the video simply omits that beat,
        # which keeps this generator usable with no network.
        "stats": None,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pattern", choices=sorted(BUILDERS), default="bullish-engulfing")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default=None)
    ap.add_argument("--locale", choices=("en", "vi"), default="en",
                    help="ngon ngu cua chu tren video")
    ap.add_argument("--stats", action="store_true",
                    help="measure how this pattern actually performed on real data")
    ap.add_argument("--stats-symbol", default="GC=F")
    ap.add_argument("--stats-pair", default="GC=F Gold Futures proxy")
    ap.add_argument("--stats-interval", default="15m")
    ap.add_argument("--stats-range", default="60d")
    args = ap.parse_args()

    cfg = make(args.pattern, args.seed, args.locale)

    # The illustration teaches the rule; the statistic says whether the rule pays.
    # Network failure must never fail the build: this generator is the one format
    # that works with no internet, and that property is worth more than the beat.
    if args.stats:
        try:
            from backtest import PATTERNS, backtest
            from fetch_gold import fetch_candles

            if args.pattern not in PATTERNS:
                print(f"  no detector for {args.pattern}, skipping stats")
            else:
                real = fetch_candles(args.stats_symbol, args.stats_interval, args.stats_range)
                st = backtest(real, args.pattern)
                # A rate computed from a handful of trades is noise dressed as
                # evidence. Below this the beat is dropped rather than shown.
                if st["settled"] >= 15:
                    st.update({"pair": args.stats_pair, "timeframe": args.stats_interval,
                               "windowLabel": args.stats_range})
                    cfg["stats"] = st
                    print(f"  stats: {st['wins']}W/{st['losses']}L "
                          f"({st['hitRate']}%), {st['expectancyR']:+.2f}R")
                else:
                    print(f"  only {st['settled']} settled trades, too few to quote")
        except Exception as err:  # noqa: BLE001
            print(f"  stats unavailable ({err}); continuing without them")
    out = args.out or str(
        Path(__file__).resolve().parents[1] / "src" / "data" / f"lesson_{args.pattern}.json"
    )
    Path(out).write_text(json.dumps(cfg, indent=2))

    t = cfg["trade"]
    rr = abs(t["target"] - t["entry"]) / max(1e-9, abs(t["stop"] - t["entry"]))
    print(f"wrote {out}")
    print(f"  {cfg['pattern']['name']} ({cfg['pattern']['bias']}) — "
          f"{len(cfg['candles'])} candles, pattern at {cfg['pattern']['indices']}")
    print(f"  entry {t['entry']} | SL {t['stop']} | TP {t['target']} | R:R 1:{rr:.1f}")
    print(f"  outcome {cfg['outcome']['result']} at index {cfg['outcome']['index']}")


if __name__ == "__main__":
    main()
