#!/usr/bin/env python3
"""Fetch COMEX Gold Futures proxy candles and emit Remotion config JSON.

Data source: Yahoo Finance COMEX gold futures (GC=F). Free, no API key.
Note: Yahoo's GC=F is a COMEX Gold Futures proxy. It must not be labelled as
XAUUSD spot data in rendered output.

The video hides the last stretch of candles and replays them as a reveal, so
this script also decides *which* historical moment to feature: it scans
backwards for the most recent setup whose trade actually resolved (hit take
profit or stop loss). The analysis only ever reads the setup window, never the
withheld candles, so the reveal is genuine rather than staged.

Support/resistance come from pure swing-point math — exact, free and instant.
Only the on-screen copy needs a language model.
"""

import argparse
import json
import urllib.request
from pathlib import Path

YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
UA = "Mozilla/5.0 (compatible; forex-video-engine/0.1)"


def fetch_candles(symbol: str, interval: str, rng: str) -> list[dict]:
    url = f"{YAHOO.format(symbol=symbol)}?interval={interval}&range={rng}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.load(resp)

    error = payload.get("chart", {}).get("error")
    if error:
        raise SystemExit(f"Yahoo returned an error for {symbol}: {error}")

    result = payload["chart"]["result"][0]
    stamps = result["timestamp"]
    q = result["indicators"]["quote"][0]

    candles = []
    for i, ts in enumerate(stamps):
        o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
        if None in (o, h, l, c):
            continue  # Yahoo emits nulls for gaps/holidays
        candles.append(
            {
                "time": int(ts),
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
            }
        )
    return candles


def swing_points(candles: list[dict], lookback: int = 3):
    """A swing high is a candle whose high exceeds `lookback` neighbours each side."""
    highs, lows = [], []
    for i in range(lookback, len(candles) - lookback):
        window = candles[i - lookback : i + lookback + 1]
        if candles[i]["high"] == max(c["high"] for c in window):
            highs.append((i, candles[i]["high"]))
        if candles[i]["low"] == min(c["low"] for c in window):
            lows.append((i, candles[i]["low"]))
    return highs, lows


def pick_levels(candles: list[dict]):
    """Pick the dominant channel the price is trading inside.

    The nearest swing is often only a tick away from price, which reads as
    noise on screen. The most *prominent* swings frame the move instead, so
    resistance is the highest swing high and support the lowest swing low.
    """
    highs, lows = swing_points(candles)

    resistance = max((p for _, p in highs), default=max(c["high"] for c in candles))
    support = min((p for _, p in lows), default=min(c["low"] for c in candles))

    if resistance - support < 1e-6:
        resistance = max(c["high"] for c in candles)
        support = min(c["low"] for c in candles)

    return round(resistance, 2), round(support, 2)


def detect_fvg(candles: list[dict], limit: int = 2) -> list[dict]:
    """Fair Value Gaps: a three-candle imbalance price skipped over.

    Bullish when candle i-1's high sits below candle i+1's low, so no trading
    happened in between; bearish is the mirror.

    A gap is dropped once price has *fully* traded back across it, which is the
    usual convention — merely tagging the edge leaves it live. Requiring an
    untouched gap instead found nothing at all on 15m gold, since a continuous
    market revisits almost every imbalance sooner or later.
    """
    found = []
    for i in range(1, len(candles) - 1):
        prev, nxt = candles[i - 1], candles[i + 1]
        if prev["high"] < nxt["low"]:
            gap = {"kind": "bullish", "bottom": prev["high"], "top": nxt["low"], "startIndex": i + 1}
        elif prev["low"] > nxt["high"]:
            gap = {"kind": "bearish", "bottom": nxt["high"], "top": prev["low"], "startIndex": i + 1}
        else:
            continue

        size = gap["top"] - gap["bottom"]
        if size <= 0:
            continue

        # Ignore specks: a gap thinner than this is noise on a phone screen.
        span = max(c["high"] for c in candles) - min(c["low"] for c in candles)
        if size < span * 0.02:
            continue

        # Dropped only when a later candle fully covers the gap.
        later = candles[i + 2 :]
        if any(c["low"] <= gap["bottom"] and c["high"] >= gap["top"] for c in later):
            continue

        gap["size"] = round(size, 2)
        found.append(gap)

    # Biggest imbalances read best on a phone; two is the clutter ceiling.
    found.sort(key=lambda g: g["size"], reverse=True)
    return [
        {k: v for k, v in g.items() if k != "size"}
        for g in sorted(found[:limit], key=lambda g: g["startIndex"])
    ]


def detect_order_block(candles: list[dict], fvgs: list[dict]) -> dict | None:
    """The last opposing candle before the move that created an imbalance.

    Anchoring the block to an FVG keeps this honest: institutional-order
    narratives are unfalsifiable, but "the last down candle before price
    displaced up and left a gap" is a mechanical, checkable definition.
    """
    if not fvgs:
        return None
    fvg = fvgs[-1]
    want_bearish_candle = fvg["kind"] == "bullish"

    for i in range(fvg["startIndex"] - 2, -1, -1):
        c = candles[i]
        is_bearish = c["close"] < c["open"]
        if is_bearish == want_bearish_candle:
            return {
                "kind": "bullish" if want_bearish_candle else "bearish",
                "top": round(max(c["open"], c["close"]), 2),
                "bottom": round(min(c["open"], c["close"]), 2),
                "index": i,
            }
    return None


def fibonacci(candles: list[dict]) -> dict | None:
    """Retracement levels over the dominant swing leg of the window.

    Direction follows whichever extreme came last: a high after a low means the
    leg ran up, so the retracement is measured downward from that high.
    """
    highs, lows = swing_points(candles)
    if not highs or not lows:
        return None

    hi_index, hi = max(highs, key=lambda p: p[1])
    lo_index, lo = min(lows, key=lambda p: p[1])
    if hi - lo <= 0:
        return None

    direction = "up" if hi_index > lo_index else "down"
    ratios = [0.236, 0.382, 0.5, 0.618, 0.786]
    levels = [
        {
            "ratio": r,
            # Measured back from the end of the leg toward its origin.
            "price": round(hi - (hi - lo) * r if direction == "up" else lo + (hi - lo) * r, 2),
        }
        for r in ratios
    ]
    return {
        "high": round(hi, 2),
        "low": round(lo, 2),
        "direction": direction,
        "levels": levels,
        "startIndex": min(hi_index, lo_index),
    }


def zigzag(candles: list[dict], lookback: int = 2) -> list[dict]:
    """Alternating high/low path through the swings — the market structure line.

    Raw swing detection emits runs of same-type points; each run collapses to
    its extreme so the result strictly alternates H, L, H, L and can be drawn
    as one polyline.
    """
    highs, lows = swing_points(candles, lookback)
    pts = [(i, p, "H") for i, p in highs] + [(i, p, "L") for i, p in lows]
    pts.sort(key=lambda t: t[0])

    out: list[tuple] = []
    for pt in pts:
        if out and out[-1][2] == pt[2]:
            steeper = pt[1] > out[-1][1] if pt[2] == "H" else pt[1] < out[-1][1]
            if steeper:
                out[-1] = pt
        else:
            out.append(pt)
    return [{"index": i, "price": round(p, 2), "type": t} for i, p, t in out]


def detect_pattern(zz: list[dict]) -> dict | None:
    """Name the classical formation the structure just printed.

    Head and shoulders is checked first because it needs five points and is the
    stronger story; double top/bottom is the three-point fallback so a video
    always has a formation to teach. Shoulders must match within a tolerance
    scaled to the window's range — an absolute tolerance would pass on gold and
    fail on an index.
    """
    if len(zz) < 3:
        return None
    span = max(p["price"] for p in zz) - min(p["price"] for p in zz)
    if span <= 0:
        return None
    tol = span * 0.18

    def build(name, bias, pts, labels, neckline):
        return {
            "name": name,
            "bias": bias,
            "neckline": round(neckline, 2),
            "points": [
                {"index": p["index"], "price": p["price"], "label": lb}
                for p, lb in zip(pts, labels)
            ],
        }

    # Five-point formations, most recent first.
    for start in range(len(zz) - 5, -1, -1):
        seg = zz[start : start + 5]
        kinds = "".join(p["type"] for p in seg)
        ls, n1, head, n2, rs = seg
        shoulders_match = abs(ls["price"] - rs["price"]) <= tol

        if kinds == "LHLHL" and shoulders_match:
            if head["price"] < ls["price"] and head["price"] < rs["price"]:
                return build(
                    "Inverse Head & Shoulders", "bullish",
                    [ls, head, rs], ["Shoulder", "Head", "Shoulder"],
                    max(n1["price"], n2["price"]),
                )
        if kinds == "HLHLH" and shoulders_match:
            if head["price"] > ls["price"] and head["price"] > rs["price"]:
                return build(
                    "Head & Shoulders", "bearish",
                    [ls, head, rs], ["Shoulder", "Head", "Shoulder"],
                    min(n1["price"], n2["price"]),
                )

    # Three-point fallback.
    for start in range(len(zz) - 3, -1, -1):
        seg = zz[start : start + 3]
        kinds = "".join(p["type"] for p in seg)
        a, mid, b = seg
        if abs(a["price"] - b["price"]) > tol:
            continue
        if kinds == "LHL":
            return build("Double Bottom", "bullish", [a, b], ["Bottom 1", "Bottom 2"],
                         mid["price"])
        if kinds == "HLH":
            return build("Double Top", "bearish", [a, b], ["Top 1", "Top 2"],
                         mid["price"])
    return None


def pattern_trade(pattern: dict | None, setup: int) -> dict | None:
    """Textbook trade for the formation, so the lesson stays self-consistent.

    The channel-position trade used by the quiz video can disagree with the
    formation (a bearish head and shoulders while price sits near support wants
    to be long), which would teach two contradictory things at once. This one
    follows the classical rules instead: enter on the neckline, stop beyond the
    right shoulder, and target the measured move — the head-to-neckline
    distance projected from the neckline.
    """
    if not pattern:
        return None

    neckline = pattern["neckline"]
    prices = [p["price"] for p in pattern["points"]]
    bullish = pattern["bias"] == "bullish"

    # For head-and-shoulders the extreme point is the head; for a double
    # top/bottom both points sit at the same extreme, so either works.
    extreme = min(prices) if bullish else max(prices)
    measured = abs(neckline - extreme)
    shoulder = pattern["points"][-1]["price"]

    if bullish:
        stop = min(shoulder, extreme + measured * 0.15)
        target = neckline + measured
    else:
        stop = max(shoulder, extreme - measured * 0.15)
        target = neckline - measured

    return {
        "entry": round(neckline, 2),
        "stop": round(stop, 2),
        "target": round(target, 2),
        "entryIndex": setup - 1,
    }


def resolve_outcome(future: list[dict], rr: dict, side: str, offset: int) -> dict:
    """Walk the withheld candles and see which barrier price touched first.

    When a single candle straddles both levels the result is scored as SL:
    intrabar order is unknowable, so we take the pessimistic reading.
    """
    for i, c in enumerate(future):
        hit_tp = c["high"] >= rr["target"] if side == "LONG" else c["low"] <= rr["target"]
        hit_sl = c["low"] <= rr["stop"] if side == "LONG" else c["high"] >= rr["stop"]

        # A bar that *opens* beyond the barrier jumped it rather than traded
        # through it. On screen that reads as the candles never reaching the
        # line, so the scenario is unusable however true the data is.
        gapped_tp = c["open"] >= rr["target"] if side == "LONG" else c["open"] <= rr["target"]
        gapped_sl = c["open"] <= rr["stop"] if side == "LONG" else c["open"] >= rr["stop"]
        if (hit_tp and gapped_tp) or (hit_sl and gapped_sl):
            return {"result": "GAPPED", "index": offset + i}

        if hit_sl:
            return {"result": "SL", "index": offset + i}
        if hit_tp:
            return {"result": "TP", "index": offset + i}
    return {"result": "OPEN", "index": None}


def auto_gap_tolerance(candles: list[dict]) -> int:
    """Six times the usual bar spacing.

    A fixed ninety minutes was tuned on 15m gold and rejected every window on
    1h bars, where the routine session break is far longer. Deriving the
    tolerance from the median spacing makes the rule travel across timeframes.
    """
    gaps = sorted((b["time"] - a["time"]) // 60 for a, b in zip(candles, candles[1:]))
    if not gaps:
        return 90
    median = gaps[len(gaps) // 2]
    return max(90, int(median * 6))


def is_contiguous(window: list[dict], max_gap_min: int) -> bool:
    """Reject windows that straddle a session or weekend break.

    Slicing by array index silently stitches Friday's close onto Sunday's open.
    Price then gaps across the chart in one bar and can clear a target without
    ever trading through it, which looks fabricated even though the data is
    real. Gold futures pause about an hour a day, so the default tolerance
    allows that and nothing longer.
    """
    for a, b in zip(window, window[1:]):
        if (b["time"] - a["time"]) > max_gap_min * 60:
            return False
    return True


def build_scenario(candles: list[dict], end: int, setup: int, future: int,
                   max_gap_min: int = 90) -> dict | None:
    """Assemble one candidate scenario whose setup window ends at `end`.

    Everything here reads candles[end-setup:end] only. The slice from `end`
    onwards is passed to resolve_outcome untouched.
    """
    setup_candles = candles[end - setup : end]
    future_candles = candles[end : end + future]
    if len(setup_candles) < setup or len(future_candles) < future:
        return None
    if not is_contiguous(setup_candles + future_candles, max_gap_min):
        return None

    resistance, support = pick_levels(setup_candles)
    band = resistance - support
    if band <= 0:
        return None

    entry = setup_candles[-1]["close"]
    position = (entry - support) / band

    # Price that has already broken out of the channel has no fade setup left:
    # the stop would land on the wrong side of entry and produce a nonsense
    # reward:risk (a 0.3-dollar stop reading as 1:159).
    if not 0.08 <= position <= 0.92:
        return None

    # Direction comes from where price sits inside the channel, not from the
    # overall drift. Fading the far barrier (e.g. shorting while sitting on
    # support) produces a tiny reward against a huge stop — an unsellable setup.
    if position < 0.5:
        side = "LONG"
        rr = {
            "entry": entry,
            "stop": round(support - band * 0.12, 2),
            "target": resistance,
            "entryIndex": setup - 1,
        }
    else:
        side = "SHORT"
        rr = {
            "entry": entry,
            "stop": round(resistance + band * 0.12, 2),
            "target": support,
            "entryIndex": setup - 1,
        }

    # A stop must sit on the losing side of entry, far enough away to be real.
    risk_distance = rr["stop"] - entry if side == "SHORT" else entry - rr["stop"]
    if risk_distance < band * 0.08:
        return None

    structure = zigzag(setup_candles)
    pattern = detect_pattern(structure)
    fvgs = detect_fvg(setup_candles)
    order_block = detect_order_block(setup_candles, fvgs)
    fibo = fibonacci(setup_candles)

    outcome = resolve_outcome(future_candles, rr, side, offset=setup)

    # The lesson video trades the formation rather than the channel, so it needs
    # its own trade and its own honest outcome.
    p_trade = pattern_trade(pattern, setup)
    p_side = None
    p_outcome = {"result": "OPEN", "index": None}
    if p_trade and pattern:
        p_side = "LONG" if pattern["bias"] == "bullish" else "SHORT"
        risk = abs(p_trade["stop"] - p_trade["entry"])
        reward = abs(p_trade["target"] - p_trade["entry"])
        if risk <= 0 or reward <= 0:
            p_trade = None
        else:
            p_outcome = resolve_outcome(future_candles, p_trade, p_side, offset=setup)

    # The quiz answer is what the market actually did, judged at the moment the
    # reveal stops — independent of whether our setup's side was right.
    reveal_end = (
        len(future_candles) - 1
        if outcome["index"] is None
        else outcome["index"] - setup
    )
    answer = "BUY" if future_candles[reveal_end]["close"] > entry else "SELL"

    first = setup_candles[0]["close"]
    pct = (entry - first) / first * 100
    direction = "up" if entry >= first else "down"
    reward = abs(rr["target"] - entry)
    risk = abs(rr["stop"] - entry)
    ratio = reward / risk if risk else 0.0

    return {
        "pair": "GC=F Gold Futures proxy",
        "timeframe": "15m",
        # Placeholder copy; a cheap LLM can overwrite title/hook later.
        # The hook must never leak the outcome — that is the whole point.
        "title": f"{side} {entry:.0f} · R:R 1:{ratio:.1f}",
        "hook": f"Gold {direction} {abs(pct):.2f}% - does this setup hit TP or SL?",
        "side": side,
        "answer": answer,
        "candles": setup_candles + future_candles,
        "setupCount": setup,
        "levels": [
            {"price": resistance, "label": "Resistance", "kind": "resistance"},
            {"price": support, "label": "Support", "kind": "support"},
        ],
        "riskReward": rr,
        "structure": structure,
        "pattern": pattern,
        "patternTrade": p_trade,
        "patternSide": p_side,
        "patternOutcome": p_outcome,
        "fvgs": fvgs,
        "orderBlock": order_block,
        "fibonacci": fibo,
        "outcome": outcome,
    }


def find_scenario(candles: list[dict], setup: int, future: int, min_rr: float,
                  want: str = "any", judge: str = "channel",
                  max_gap_min: int = 90) -> dict:
    """Most recent setup that both resolves and offers a sellable risk/reward.

    Scanning backwards keeps the featured moment as fresh as possible while
    guaranteeing the video ends on a definite TP or SL rather than a shrug.

    `want` can pin the result to "TP" or "SL" — useful for demos, where a
    winning example is easier to follow. `judge` picks which trade is measured:
    "channel" for the quiz video's trade, "pattern" for the lesson's.
    Note this is cherry-picking by construction; a live channel should publish
    the honest mix, or the win rate on screen stops meaning anything.
    """
    # Resolving on the first revealed candle gives the viewer no time to wonder,
    # so require the payoff to land at least part-way through the reveal.
    earliest_payoff = setup + max(4, int(future * 0.35))

    fallback = None
    best, best_score = None, -1
    for end in range(len(candles) - future, setup - 1, -1):
        sc = build_scenario(candles, end, setup, future, max_gap_min)
        if sc is None:
            continue
        rr = sc["riskReward"] if judge == "channel" else sc["patternTrade"]
        oc = sc["outcome"] if judge == "channel" else sc["patternOutcome"]
        if rr is None:
            continue
        ratio = abs(rr["target"] - rr["entry"]) / max(1e-9, abs(rr["stop"] - rr["entry"]))
        if oc["result"] in ("OPEN", "GAPPED"):
            continue
        if want != "any" and oc["result"] != want:
            continue
        if oc["index"] < earliest_payoff:
            continue
        if ratio < min_rr:
            if fallback is None:
                fallback = sc
            continue
        score = (2 if sc["pattern"] else 0) + (1 if sc["fvgs"] else 0)
        if score > best_score:
            best_score, best = score, sc
        if score == 3:
            return sc  # most recent scenario with both
    if best is not None:
        return best
    if fallback is None:
        raise SystemExit("No resolved setup found — try a longer --range.")
    return fallback


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--symbol", default="GC=F", help="Yahoo symbol (GC=F = COMEX gold)")
    ap.add_argument("--pair", default="GC=F Gold Futures proxy")
    ap.add_argument("--timeframe", default="15m")
    ap.add_argument("--interval", default="15m")
    ap.add_argument("--range", dest="rng", default="1mo")
    ap.add_argument("--setup", type=int, default=42, help="candles shown for analysis")
    ap.add_argument("--future", type=int, default=22, help="candles withheld for the reveal")
    ap.add_argument("--min-rr", type=float, default=1.5, help="minimum reward:risk to feature")
    ap.add_argument("--outcome", choices=["any", "TP", "SL"], default="any",
                    help="pin the featured result (demos usually want TP)")
    ap.add_argument("--judge", choices=["channel", "pattern"], default="channel",
                    help="which trade --outcome applies to: quiz video or lesson video")
    ap.add_argument("--max-gap-min", type=int, default=0,
                    help="reject windows with a longer time gap; 0 derives it from the data")
    ap.add_argument(
        "--out",
        default=str(Path(__file__).resolve().parents[1] / "src" / "data" / "config.json"),
    )
    args = ap.parse_args()

    candles = fetch_candles(args.symbol, args.interval, args.rng)
    if len(candles) < args.setup + args.future:
        raise SystemExit(f"Only got {len(candles)} candles — widen --range.")

    max_gap = args.max_gap_min or auto_gap_tolerance(candles)
    cfg = find_scenario(candles, args.setup, args.future, args.min_rr,
                        want=args.outcome, judge=args.judge,
                        max_gap_min=max_gap)
    cfg["pair"] = args.pair
    cfg["timeframe"] = args.timeframe
    Path(args.out).write_text(json.dumps(cfg, indent=2, ensure_ascii=False))

    rr = cfg["riskReward"]
    hidden = len(cfg["candles"]) - cfg["setupCount"]
    ratio = abs(rr["target"] - rr["entry"]) / max(1e-9, abs(rr["stop"] - rr["entry"]))
    print(f"wrote {args.out}")
    print(f"  {cfg['pair']} {cfg['timeframe']} — {cfg['setupCount']} setup + {hidden} hidden")
    print(f"  support/resistance : {cfg['levels'][1]['price']} / {cfg['levels'][0]['price']}")
    print(f"  {cfg['side']} entry {rr['entry']} | SL {rr['stop']} | TP {rr['target']}"
          f" | R:R 1:{ratio:.1f}")
    print(f"  OUTCOME  : {cfg['outcome']['result']} at index {cfg['outcome']['index']}")
    print(f"  FVG      : {len(cfg['fvgs'])} unfilled "
          f"{[g['kind'] for g in cfg['fvgs']]}")
    ob = cfg["orderBlock"]
    print(f"  OB       : {ob['kind'] + ' ' + str(ob['bottom']) + '-' + str(ob['top']) if ob else 'none'}")
    fib = cfg["fibonacci"]
    print(f"  Fib      : {fib['direction'] + ' leg ' + str(fib['low']) + '->' + str(fib['high']) if fib else 'none'}"
          f"{'  0.618 @ ' + str(fib['levels'][3]['price']) if fib else ''}")
    pat = cfg["pattern"]
    print(f"  Pattern  : {pat['name'] + ' (' + pat['bias'] + '), neckline ' + str(pat['neckline']) if pat else 'none'}")
    print(f"  Structure: {len(cfg['structure'])} swing points")
    pt = cfg["patternTrade"]
    if pt:
        pr = abs(pt["target"] - pt["entry"]) / max(1e-9, abs(pt["stop"] - pt["entry"]))
        print(f"  PatTrade : {cfg['patternSide']} entry {pt['entry']} | SL {pt['stop']} "
              f"| TP {pt['target']} | R:R 1:{pr:.1f} -> {cfg['patternOutcome']['result']}")
    print(f"  hook     : {cfg['hook']}")


if __name__ == "__main__":
    main()
