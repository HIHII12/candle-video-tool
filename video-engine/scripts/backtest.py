#!/usr/bin/env python3
"""Measure how a pattern has actually performed, over every occurrence in real data.

This is the depth the videos were missing. Showing one hammer that worked teaches
nothing — it is survivorship bias with a chart attached, and a viewer who trades
it and loses has been misled by us. Every claim in these videos is supposed to be
measured rather than asserted, and "this pattern is a reversal signal" was the
one claim still being asserted.

So: find every occurrence of the pattern in real history, apply the same entry,
stop and target the video teaches, walk forward candle by candle, and count. The
number that comes out is the number, whatever it is. A 41% hit rate is a better
video than a cherry-picked winner, because it is the thing the viewer cannot get
anywhere else — and it is genuinely surprising, which is what holds attention.

Rules kept deliberately mechanical so the result is reproducible:

  entry   close of the signal candle
  stop    beyond the pattern's extreme, plus a small buffer
  target  entry +/- 2x the risk distance
  resolve first barrier touched, scanning forward; a candle that OPENS beyond a
          barrier gapped it rather than traded through it, and is discarded —
          the same rule the scenario picker uses, for the same reason

    python3 scripts/backtest.py --pattern hammer --symbol GC=F --interval 15m
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_gold import fetch_candles  # noqa: E402

# How far forward a trade is allowed to stay open before it is called unresolved.
MAX_BARS_OPEN = 60


def parts(c: dict) -> tuple[float, float, float, float]:
    body = abs(c["close"] - c["open"])
    upper = c["high"] - max(c["open"], c["close"])
    lower = min(c["open"], c["close"]) - c["low"]
    return body, upper, lower, c["high"] - c["low"]


def trend_before(candles: list[dict], i: int, bars: int = 6) -> str:
    """Direction of the leg leading into candle i."""
    if i < bars:
        return "flat"
    a, b = candles[i - bars]["close"], candles[i - 1]["close"]
    span = max(c["high"] for c in candles[i - bars : i]) - min(
        c["low"] for c in candles[i - bars : i]
    )
    if span <= 0:
        return "flat"
    change = (b - a) / span
    return "down" if change < -0.3 else "up" if change > 0.3 else "flat"


# --- pattern detectors, mirroring the rules the videos state ----------------

def is_hammer(c: dict, avg_body: float) -> bool:
    body, upper, lower, rng = parts(c)
    return rng > 0 and body > 0 and lower >= 2 * body and upper <= 0.35 * body


def is_shooting_star(c: dict, avg_body: float) -> bool:
    body, upper, lower, rng = parts(c)
    return rng > 0 and body > 0 and upper >= 2 * body and lower <= 0.35 * body


def is_doji(c: dict, avg_body: float) -> bool:
    body, _, _, rng = parts(c)
    return rng > 0 and body <= 0.08 * rng


def is_marubozu(c: dict, avg_body: float) -> bool:
    body, upper, lower, rng = parts(c)
    return body > avg_body and rng > 0 and upper <= 0.06 * body and lower <= 0.06 * body


def is_pin_bar(c: dict, avg_body: float) -> bool:
    body, upper, lower, rng = parts(c)
    return rng > 0 and max(upper, lower) >= 0.66 * rng


def engulfing(candles: list[dict], i: int, bull: bool) -> bool:
    if i < 1:
        return False
    p, c = candles[i - 1], candles[i]
    p_up, c_up = p["close"] > p["open"], c["close"] > c["open"]
    if c_up != bull or p_up == bull:
        return False
    return min(c["open"], c["close"]) <= min(p["open"], p["close"]) and max(
        c["open"], c["close"]
    ) >= max(p["open"], p["close"])


def star(candles: list[dict], i: int, morning: bool) -> bool:
    if i < 2:
        return False
    one, mid, three = candles[i - 2], candles[i - 1], candles[i]
    b1 = abs(one["close"] - one["open"])
    bm = abs(mid["close"] - mid["open"])
    if b1 <= 0 or bm > 0.5 * b1:
        return False
    if morning and not (one["close"] < one["open"] and three["close"] > three["open"]):
        return False
    if not morning and not (one["close"] > one["open"] and three["close"] < three["open"]):
        return False
    lo, hi = min(one["open"], one["close"]), max(one["open"], one["close"])
    return lo <= three["close"] <= hi


def tweezer(candles: list[dict], i: int, bottom: bool) -> bool:
    if i < 1:
        return False
    a, b = candles[i - 1], candles[i]
    field = "low" if bottom else "high"
    tol = max(0.15 * (a["high"] - a["low"]), 1e-9)
    return abs(a[field] - b[field]) <= tol


# name -> (detector, bias, needs this trend before it to be valid)
PATTERNS: dict[str, tuple] = {
    "hammer": (lambda cs, i, ab: is_hammer(cs[i], ab), "bullish", "down"),
    "shooting-star": (lambda cs, i, ab: is_shooting_star(cs[i], ab), "bearish", "up"),
    "doji": (lambda cs, i, ab: is_doji(cs[i], ab), "bullish", None),
    "dragonfly-doji": (
        lambda cs, i, ab: is_doji(cs[i], ab) and parts(cs[i])[2] > 3 * parts(cs[i])[1],
        "bullish",
        "down",
    ),
    "gravestone-doji": (
        lambda cs, i, ab: is_doji(cs[i], ab) and parts(cs[i])[1] > 3 * parts(cs[i])[2],
        "bearish",
        "up",
    ),
    "marubozu": (
        lambda cs, i, ab: is_marubozu(cs[i], ab),
        "bullish",
        None,
    ),
    "pin-bar": (lambda cs, i, ab: is_pin_bar(cs[i], ab), "bullish", None),
    "bullish-engulfing": (lambda cs, i, ab: engulfing(cs, i, True), "bullish", "down"),
    "bearish-engulfing": (lambda cs, i, ab: engulfing(cs, i, False), "bearish", "up"),
    "morning-star": (lambda cs, i, ab: star(cs, i, True), "bullish", "down"),
    "evening-star": (lambda cs, i, ab: star(cs, i, False), "bearish", "up"),
    "tweezer-bottom": (lambda cs, i, ab: tweezer(cs, i, True), "bullish", "down"),
    "tweezer-top": (lambda cs, i, ab: tweezer(cs, i, False), "bearish", "up"),
}


def resolve(candles: list[dict], i: int, entry: float, stop: float, target: float,
            long: bool) -> str:
    """Which barrier the forward candles reached first."""
    for c in candles[i + 1 : i + 1 + MAX_BARS_OPEN]:
        # A bar that opens beyond a barrier jumped it rather than traded through
        # it. Counting that as a hit would inflate the statistic with moves that
        # never actually offered the fill.
        if long:
            if c["open"] <= stop or c["open"] >= target:
                return "gapped"
            if c["low"] <= stop:
                return "loss"
            if c["high"] >= target:
                return "win"
        else:
            if c["open"] >= stop or c["open"] <= target:
                return "gapped"
            if c["high"] >= stop:
                return "loss"
            if c["low"] <= target:
                return "win"
    return "open"


def backtest(candles: list[dict], pattern: str, rr: float = 2.0) -> dict:
    if pattern not in PATTERNS:
        raise SystemExit(f"unknown pattern {pattern}; known: {', '.join(sorted(PATTERNS))}")
    detect, bias, want_trend = PATTERNS[pattern]
    long = bias == "bullish"

    bodies = [abs(c["close"] - c["open"]) for c in candles]
    avg_body = sum(bodies) / max(1, len(bodies))

    wins = losses = gapped = still_open = 0
    for i in range(6, len(candles) - 1):
        if not detect(candles, i, avg_body):
            continue
        if want_trend and trend_before(candles, i) != want_trend:
            continue

        c = candles[i]
        entry = c["close"]
        # Stop beyond the signal candle's extreme, with a small buffer so a
        # one-tick poke does not count as a stop-out.
        if long:
            stop = c["low"] - (c["high"] - c["low"]) * 0.05
        else:
            stop = c["high"] + (c["high"] - c["low"]) * 0.05
        risk = abs(entry - stop)
        if risk <= 0:
            continue
        target = entry + rr * risk if long else entry - rr * risk

        outcome = resolve(candles, i, entry, stop, target, long)
        if outcome == "win":
            wins += 1
        elif outcome == "loss":
            losses += 1
        elif outcome == "gapped":
            gapped += 1
        else:
            still_open += 1

    settled = wins + losses
    return {
        "pattern": pattern,
        "bias": bias,
        "rewardRisk": rr,
        "occurrences": settled + still_open + gapped,
        "settled": settled,
        "wins": wins,
        "losses": losses,
        "gapped": gapped,
        "unresolved": still_open,
        # None rather than 0 when nothing settled: a rate computed from no
        # samples is not a rate, and must never be printed as one.
        "hitRate": round(100 * wins / settled) if settled else None,
        # Expectancy in R. This is the number that actually matters and the one
        # nobody quotes, because at 1:2 a 40% hit rate is still profitable.
        "expectancyR": round((wins * rr - losses) / settled, 2) if settled else None,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pattern", required=True)
    ap.add_argument("--symbol", default="GC=F")
    ap.add_argument("--pair", default="XAU/USD")
    ap.add_argument("--interval", default="15m")
    ap.add_argument("--range", dest="rng", default="60d")
    ap.add_argument("--rr", type=float, default=2.0)
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    candles = fetch_candles(args.symbol, args.interval, args.rng)
    stats = backtest(candles, args.pattern, args.rr)
    stats.update({
        "pair": args.pair,
        "timeframe": args.interval,
        "barsScanned": len(candles),
        "windowLabel": args.rng,
    })

    print(f"{args.pattern} on {args.pair} {args.interval}, {len(candles)} bars ({args.rng})")
    print(f"  occurrences   {stats['occurrences']}")
    print(f"  settled       {stats['settled']}  (win {stats['wins']} / loss {stats['losses']})")
    print(f"  skipped       {stats['gapped']} gapped, {stats['unresolved']} still open")
    if stats["hitRate"] is None:
        print("  not enough settled trades to quote a rate")
    else:
        print(f"  hit rate      {stats['hitRate']}% at 1:{args.rr:g}")
        print(f"  expectancy    {stats['expectancyR']:+.2f}R per trade")

    if args.out:
        Path(args.out).write_text(json.dumps(stats, indent=2))
        print(f"\n-> {args.out}")


if __name__ == "__main__":
    main()
