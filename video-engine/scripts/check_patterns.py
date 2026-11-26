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
from make_candle_lesson import BUILDERS, VI, Rng, make  # noqa: E402


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

    # --- Hai muoi mau bo sung ------------------------------------------------
    #
    # Khong co doan nay thi 20 mau moi di qua ham check ma khong bi kiem gi ca,
    # va "0 vi pham" chi co nghia la "khong ai hoi", chu khong phai "dung".

    if name == "inverted-hammer":
        if upper < 2 * body:
            bad.append(f"upper wick {upper/body:.1f}x body, claim >= 2x")
        if lower > 0.10 * body:
            bad.append(f"lower wick {lower/body*100:.0f}% of body, claim < 10%")
    if name == "hanging-man":
        if lower < 2 * body:
            bad.append(f"lower wick {lower/body:.1f}x body, claim >= 2x")
        # The shape is a hammer's; the up leg before it is what makes the name.
        lead = candles[max(0, idx[0] - 8):idx[0]]
        if lead and lead[-1]["close"] <= lead[0]["open"]:
            bad.append("no up leg before it - that would be a hammer")
    if name == "inverted-hammer":
        lead = candles[max(0, idx[0] - 8):idx[0]]
        if lead and lead[-1]["close"] >= lead[0]["open"]:
            bad.append("no down leg before it")

    if name in ("bullish-harami", "bearish-harami"):
        big, small = candles[idx[0]], candles[idx[1]]
        b_lo, b_hi = min(big["open"], big["close"]), max(big["open"], big["close"])
        s_lo, s_hi = min(small["open"], small["close"]), max(small["open"], small["close"])
        if not (s_lo > b_lo and s_hi < b_hi):
            bad.append("the second body is not inside the first")
        if abs(small["close"] - small["open"]) > 0.6 * abs(big["close"] - big["open"]):
            bad.append("the second body is not clearly smaller")
        up_first = big["close"] > big["open"]
        if name == "bullish-harami" and up_first:
            bad.append("first bar should be the down one")
        if name == "bearish-harami" and not up_first:
            bad.append("first bar should be the up one")

    if name in ("piercing-line", "dark-cloud-cover"):
        one, two = candles[idx[0]], candles[idx[1]]
        mid = (one["open"] + one["close"]) / 2
        if name == "piercing-line":
            if two["open"] >= one["low"]:
                bad.append("the second bar does not open below the first bar's low")
            if two["close"] <= mid:
                bad.append("close did not reach past the midpoint")
            if two["close"] >= max(one["open"], one["close"]):
                bad.append("closed past the whole body - that is an engulfing")
        else:
            if two["open"] <= one["high"]:
                bad.append("the second bar does not open above the first bar's high")
            if two["close"] >= mid:
                bad.append("close did not reach past the midpoint")
            if two["close"] <= min(one["open"], one["close"]):
                bad.append("closed past the whole body - that is an engulfing")

    if name in ("three-white-soldiers", "three-black-crows"):
        bars = [candles[i] for i in idx]
        up = name.startswith("three-white")
        for k in range(1, 3):
            if up and bars[k]["close"] <= bars[k - 1]["close"]:
                bad.append(f"bar {k+1} does not close higher")
            if not up and bars[k]["close"] >= bars[k - 1]["close"]:
                bad.append(f"bar {k+1} does not close lower")
        for k, b in enumerate(bars):
            bb = abs(b["close"] - b["open"])
            w = (b["high"] - max(b["open"], b["close"])) if up else (min(b["open"], b["close"]) - b["low"])
            if w > 0.35 * bb:
                bad.append(f"bar {k+1} wick {w/bb*100:.0f}% of body, claim small")

    if name == "spinning-top":
        if upper < body or lower < body:
            bad.append("both wicks must be longer than the body")
        if body > 0.30 * rng:
            bad.append(f"body {body/rng*100:.0f}% of range, claim small")

    if name in ("bullish-belt-hold", "bearish-belt-hold"):
        w = lower if name.startswith("bullish") else upper
        if w > 0.05 * body:
            bad.append(f"the open-end wick is {w/body*100:.0f}% of body, claim ~none")
        if name == "bullish-belt-hold" and key["close"] <= key["open"]:
            bad.append("should be an up bar")
        if name == "bearish-belt-hold" and key["close"] >= key["open"]:
            bad.append("should be a down bar")

    if name in ("morning-doji-star", "evening-doji-star"):
        one, mid, three = (candles[i] for i in idx)
        mb = abs(mid["close"] - mid["open"])
        mr = mid["high"] - mid["low"]
        if mr > 0 and mb > 0.06 * mr:
            bad.append(f"middle bar body {mb/mr*100:.0f}% of its range, claim a doji")
        m1 = (one["open"] + one["close"]) / 2
        if name == "morning-doji-star" and three["close"] <= m1:
            bad.append("third bar does not close past the midpoint of the first")
        if name == "evening-doji-star" and three["close"] >= m1:
            bad.append("third bar does not close past the midpoint of the first")

    if name in ("rising-three", "falling-three"):
        big = candles[idx[0]]
        last = candles[idx[1]]
        inner = candles[idx[0] + 1:idx[1]]
        for k, c in enumerate(inner):
            if c["high"] > big["high"] + 1e-9 or c["low"] < big["low"] - 1e-9:
                bad.append(f"inner bar {k+1} leaves the first bar's range")
        if name == "rising-three" and last["close"] <= big["high"]:
            bad.append("last bar does not close above the first bar's high")
        if name == "falling-three" and last["close"] >= big["low"]:
            bad.append("last bar does not close below the first bar's low")

    if name in ("bullish-kicker", "bearish-kicker"):
        one, two = candles[idx[0]], candles[idx[1]]
        if name == "bullish-kicker":
            if two["open"] <= one["open"]:
                bad.append("no gap above the previous open")
            if two["low"] < one["open"]:
                bad.append("traded back into the gap")
        else:
            if two["open"] >= one["open"]:
                bad.append("no gap below the previous open")
            if two["high"] > one["open"]:
                bad.append("traded back into the gap")

    if name in ("bullish-marubozu", "bearish-marubozu"):
        if upper > 0.03 * body or lower > 0.03 * body:
            bad.append(f"wicks {max(upper,lower)/body*100:.1f}% of body, claim < 3%")
        if name == "bullish-marubozu" and key["close"] <= key["open"]:
            bad.append("should be an up bar")
        if name == "bearish-marubozu" and key["close"] >= key["open"]:
            bad.append("should be a down bar")

    if name == "long-legged-doji":
        if rng > 0 and body > 0.05 * rng:
            bad.append(f"body {body/rng*100:.1f}% of range, claim a doji")
        if upper < 0.30 * rng or lower < 0.30 * rng:
            bad.append("both wicks must be long - that is what makes it long-legged")

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


def check_vietnamese() -> list[str]:
    """Every pattern must have a Vietnamese entry, and it must fit its shape.

    The Vietnam track falls back to English silently when an entry is missing —
    the worst way for it to fail, because the video renders, passes every frame
    check, and ships with one English headline in the middle of a Vietnamese
    batch. A pattern added later would do exactly that, so it is caught here.
    """
    bad = []
    for name in sorted(BUILDERS):
        vi = VI.get(name)
        if not vi:
            bad.append(f"{name}: khong co ban tieng Viet")
            continue
        en = make(name, seed=7)
        for field in ("name", "rule"):
            if not vi.get(field, "").strip():
                bad.append(f"{name}: thieu '{field}' tieng Viet")
        if len(vi.get("checks", [])) != len(en["pattern"]["checks"]):
            bad.append(f"{name}: {len(vi.get('checks', []))} dieu kien tieng Viet, "
                       f"ban goc co {len(en['pattern']['checks'])}")
        if len(vi.get("anatomy", [])) != len(en["anatomy"]):
            bad.append(f"{name}: {len(vi.get('anatomy', []))} nhan bo phan tieng Viet, "
                       f"ban goc co {len(en['anatomy'])}")
        if len(vi.get("taglines", [])) < 2:
            bad.append(f"{name}: can it nhat 2 tagline tieng Viet de khong bi lap")
        got = make(name, seed=7, locale="vi")["pattern"]["name"]
        if got != vi["name"]:
            bad.append(f"{name}: sinh ra ten '{got}', mong doi '{vi['name']}'")
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

    vi_bad = check_vietnamese()
    if vi_bad:
        print("\nBan tieng Viet:")
        for line in vi_bad:
            print(f"  - {line}")
        failures += len(vi_bad)
    else:
        print(f"\nBan tieng Viet: du ca {len(BUILDERS)} mau nen")

    print(f"\n{len(BUILDERS)} patterns checked, {failures} violation(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
