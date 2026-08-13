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
}


def make(name: str, seed: int) -> dict:
    candles, setup_count, indices, meta, anatomy = BUILDERS[name](Rng(seed))

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

    # The follow-through is constructed to reach the target; find where.
    hit = None
    for i in range(setup_count, len(candles)):
        c = candles[i]
        if (bullish and c["high"] >= target) or (not bullish and c["low"] <= target):
            hit = i
            break
    if hit is None:
        # Keep the claim truthful: if the drift fell short, say it stayed open
        # rather than asserting a target that never printed.
        hit = len(candles) - 1
        result = "OPEN"
    else:
        result = "TP"

    return {
        "kind": "candleLesson",
        "instrument": "ILLUSTRATION",
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
        "note": "Illustration - constructed price series, not a live chart",
        # Filled in by --stats. Absent means the video simply omits that beat,
        # which keeps this generator usable with no network.
        "stats": None,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pattern", choices=sorted(BUILDERS), default="bullish-engulfing")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default=None)
    ap.add_argument("--stats", action="store_true",
                    help="measure how this pattern actually performed on real data")
    ap.add_argument("--stats-symbol", default="GC=F")
    ap.add_argument("--stats-pair", default="XAU/USD")
    ap.add_argument("--stats-interval", default="15m")
    ap.add_argument("--stats-range", default="60d")
    args = ap.parse_args()

    cfg = make(args.pattern, args.seed)

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
