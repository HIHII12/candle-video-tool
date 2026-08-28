#!/usr/bin/env python3
"""Check every generated pattern against the rule its own video states.

This exists because the hammer once shipped with an upper wick at 27% of the
body under a caption asserting "under 5%". The data was wrong, not the caption,
and nothing caught it. Drawing a shape while claiming a rule it does not satisfy
is the one defect that makes the whole channel untrustworthy, so it gets a test.

    python3 scripts/check_patterns.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_candle_lesson import BUILDERS, Rng, make  # noqa: E402


def parts(c):
    body = abs(c["close"] - c["open"])
    upper = c["high"] - max(c["open"], c["close"])
    lower = min(c["open"], c["close"]) - c["low"]
    return body, upper, lower, c["high"] - c["low"]


def ohlc_sane(candles: list[dict]) -> list[str]:
    """Every bar must be a bar.

    The renderer reconstructs a part-formed candle from OHLC (src/camera.ts), and
    that reconstruction assumes high and low really do bound the open and the
    close. A generator that ever emitted a bar where they did not would produce a
    forming candle that jumps outside its own range — visible as a flicker, and
    impossible to trace back from the video. Cheap to assert here instead.
    """
    bad = []
    for i, c in enumerate(candles):
        top, bottom = max(c["open"], c["close"]), min(c["open"], c["close"])
        if c["high"] < top - 1e-9:
            bad.append(f"bar {i}: high {c['high']} below body top {top}")
        if c["low"] > bottom + 1e-9:
            bad.append(f"bar {i}: low {c['low']} above body bottom {bottom}")
        if c["high"] < c["low"]:
            bad.append(f"bar {i}: high below low")
        if i and c["time"] <= candles[i - 1]["time"]:
            bad.append(f"bar {i}: time not increasing")
    return bad[:3]


def check(name: str, cfg: dict) -> list[str]:
    """Return a list of violations; empty means the drawing matches the claim."""
    bad = ohlc_sane(cfg["candles"])
    idx = cfg["pattern"]["indices"]
    candles = cfg["candles"]
    key = candles[idx[-1]]
    body, upper, lower, rng = parts(key)

    def near(a, b, tol):
        return abs(a - b) <= tol

    if name in ("hammer", "pin-bar", "dragonfly-doji"):
        if lower <= upper:
            bad.append("long wick should be the lower one")
    if name in ("shooting-star", "gravestone-doji"):
        if upper <= lower:
            bad.append("long wick should be the upper one")

    if name == "hammer":
        if lower < 2 * body:
            bad.append(f"lower wick {lower/body:.1f}x body, claim >= 2x")
        if upper > 0.05 * body:
            bad.append(f"upper wick {upper/body*100:.0f}% of body, claim < 5%")
    if name == "shooting-star":
        if upper < 2 * body:
            bad.append(f"upper wick {upper/body:.1f}x body, claim >= 2x")
        if lower > 0.05 * body:
            bad.append(f"lower wick {lower/body*100:.0f}% of body, claim < 5%")

    if name == "doji" and body > 0.05 * rng:
        bad.append(f"body {body/rng*100:.1f}% of range, claim < 5%")

    if name in ("dragonfly-doji", "gravestone-doji") and body > 0.06 * rng:
        bad.append(f"body {body/rng*100:.1f}% of range, should be a sliver")

    if name == "marubozu":
        if upper > 0.05 * body or lower > 0.05 * body:
            bad.append(f"wicks {max(upper,lower)/body*100:.0f}% of body, claim < 5%")

    if name == "pin-bar":
        wick = max(upper, lower)
        if wick < 0.70 * rng:
            bad.append(f"wick {wick/rng*100:.0f}% of range, claim > 70%")

    if name in ("bullish-engulfing", "bearish-engulfing"):
        prev, cur = candles[idx[0]], candles[idx[1]]
        p_lo, p_hi = min(prev["open"], prev["close"]), max(prev["open"], prev["close"])
        c_lo, c_hi = min(cur["open"], cur["close"]), max(cur["open"], cur["close"])
        if not (c_lo <= p_lo and c_hi >= p_hi):
            bad.append("body does not fully engulf the previous body")

    if name in ("tweezer-bottom", "tweezer-top"):
        a, b = candles[idx[0]], candles[idx[1]]
        tol = max(0.02 * (a["high"] - a["low"]), 0.01)
        field = "low" if name.endswith("bottom") else "high"
        if not near(a[field], b[field], tol):
            bad.append(f"the two {field}s differ by {abs(a[field]-b[field]):.2f}")

    if name in ("morning-star", "evening-star"):
        one, mid, three = (candles[i] for i in idx)
        b1, b_mid = abs(one["close"] - one["open"]), abs(mid["close"] - mid["open"])
        if b_mid > 0.5 * b1:
            bad.append(f"middle body {b_mid/b1*100:.0f}% of bar 1, should be small")
        lo1, hi1 = min(one["open"], one["close"]), max(one["open"], one["close"])
        if not (lo1 <= three["close"] <= hi1):
            bad.append("bar 3 does not close inside bar 1's body")

    # Every video also asserts a reward:risk and an outcome; both must hold.
    t = cfg["trade"]
    risk = abs(t["stop"] - t["entry"])
    if risk <= 0:
        bad.append("stop sits on the wrong side of entry")
    result = cfg["outcome"]["result"]
    if result not in ("TP", "SL", "OPEN"):
        bad.append(f"unexpected outcome {result}")
    else:
        # The verdict has to be a reading of the drawn series, not a label put on
        # it. Re-scan the follow-through here: whichever level printed first is
        # the answer, and it must be the one the video is about to announce.
        bullish = cfg["pattern"]["bias"] == "bullish"
        first, at = "OPEN", None
        for i in range(cfg["setupCount"], len(candles)):
            c = candles[i]
            stop_hit = c["low"] <= t["stop"] if bullish else c["high"] >= t["stop"]
            target_hit = c["high"] >= t["target"] if bullish else c["low"] <= t["target"]
            if stop_hit:
                first, at = "SL", i
                break
            if target_hit:
                first, at = "TP", i
                break
        if first != result:
            bad.append(f"outcome says {result} but the series prints {first} first")
        if at is not None and cfg["outcome"]["index"] != at:
            bad.append(f"outcome index {cfg['outcome']['index']}, series resolves at {at}")

    return bad


def main() -> None:
    failures = 0
    for name in sorted(BUILDERS):
        cfg = make(name, seed=7)
        problems = check(name, cfg)
        mark = "ok  " if not problems else "FAIL"
        print(f"{mark} {name}")
        for p in problems:
            print(f"       - {p}")
        failures += len(problems)

    print(f"\n{len(BUILDERS)} patterns checked, {failures} violation(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
