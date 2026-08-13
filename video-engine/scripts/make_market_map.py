#!/usr/bin/env python3
"""Build a daily market map: the levels that matter and the plan around them.

The other three formats look backwards — here is a setup, here is what happened.
This one looks forward: it marks where liquidity is resting, where structure
last changed character, and sketches the path price would take if the bias
plays out. That makes it the only format whose forward line is not a fact, so
it is labelled as a plan throughout and the video never claims it resolved.

Everything except the projected path is measured from the candles:

  BSL / SSL   resting liquidity above the last swing high / below the last low,
              i.e. where stops are parked
  OB          the last opposing candle before a displacement leg
  GAP         an unfilled fair value gap
  CHoCH       a swing that broke the prior swing against the prevailing leg

The path itself is derived, not invented: it walks to the nearest untapped zone
against the bias first (the liquidity grab), then to the zones the bias targets.

    python3 scripts/make_market_map.py --symbol GC=F --interval 1h --out src/data/map.json
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_gold import (  # noqa: E402
    detect_fvg,
    fetch_candles,
    zigzag,
)


def span_of(candles: list[dict]) -> float:
    return max(c["high"] for c in candles) - min(c["low"] for c in candles)


def real_imbalances(candles: list[dict], limit: int = 2) -> list[dict]:
    """Fair value gaps, minus the ones that are only the calendar.

    A weekend or session break leaves a hole between two candles that satisfies
    the three-candle FVG test perfectly, and on 1h gold those holes are the
    biggest "gaps" on the chart — so an unfiltered scan labels a Friday close as
    an imbalance. It is not one: no liquidity was skipped, the market was shut.
    Calling it an order-flow imbalance on screen would be a plain false claim,
    so a gap is only kept when its three candles are actually consecutive.
    """
    # Tighter than the tolerance used for replay windows. There, six times the
    # median spacing correctly allows gold's routine daily pause. Here the claim
    # on screen is specifically "price skipped this range", so the three candles
    # have to be genuinely back to back.
    spacings = sorted((b["time"] - a["time"]) // 60 for a, b in zip(candles, candles[1:]))
    tol = int(spacings[len(spacings) // 2] * 1.5) if spacings else 90
    keep = []
    for g in detect_fvg(candles, limit=limit * 4):
        i = g["startIndex"]  # third candle of the pattern
        if i < 2:
            continue
        trio = candles[i - 2 : i + 1]
        spacing = [
            (trio[k + 1]["time"] - trio[k]["time"]) // 60 for k in range(len(trio) - 1)
        ]
        if max(spacing) > tol:
            continue
        keep.append(g)
    return keep[:limit]


def displacement_blocks(candles: list[dict], limit: int = 2) -> list[dict]:
    """Order blocks: the last opposing candle before a strong directional leg.

    A leg counts as displacement when one candle's body is far larger than the
    recent average, which is the practical read of "the market moved with
    intent" rather than drifted.
    """
    bodies = [abs(c["close"] - c["open"]) for c in candles]
    if not bodies:
        return []
    avg = sum(bodies) / len(bodies)
    found = []

    for i in range(2, len(candles)):
        c = candles[i]
        body = abs(c["close"] - c["open"])
        if body < avg * 2.2:
            continue
        up = c["close"] > c["open"]
        # Walk back to the most recent candle of the opposite colour.
        for j in range(i - 1, max(-1, i - 5), -1):
            p = candles[j]
            p_up = p["close"] > p["open"]
            if p_up != up:
                found.append(
                    {
                        "top": round(max(p["open"], p["close"]), 2),
                        "bottom": round(min(p["open"], p["close"]), 2),
                        "index": j,
                        "kind": "bullish" if up else "bearish",
                        "strength": round(body, 2),
                    }
                )
                break

    # Keep the strongest, then restore chronological order.
    found.sort(key=lambda b: b["strength"], reverse=True)
    keep = sorted(found[:limit], key=lambda b: b["index"])
    return [{k: v for k, v in b.items() if k != "strength"} for b in keep]


def choch_points(zz: list[dict]) -> list[dict]:
    """Swings that broke the previous same-type swing against the prevailing leg.

    A change of character is the first sign the trend is no longer in control:
    in a downtrend, a swing high that takes out the prior swing high.
    """
    out = []
    for i in range(2, len(zz)):
        cur, prev_same = zz[i], zz[i - 2]
        if cur["type"] == "H" and cur["price"] > prev_same["price"]:
            # Only interesting if the leg into it was down.
            if zz[i - 1]["price"] < prev_same["price"]:
                out.append({"index": cur["index"], "price": cur["price"], "dir": "bullish"})
        elif cur["type"] == "L" and cur["price"] < prev_same["price"]:
            if zz[i - 1]["price"] > prev_same["price"]:
                out.append({"index": cur["index"], "price": cur["price"], "dir": "bearish"})
    # Two markers is the clutter ceiling on a phone; the most recent matter most.
    return out[-2:]


def liquidity_zones(candles: list[dict], zz: list[dict]) -> list[dict]:
    """Resting liquidity above the last swing high and below the last swing low."""
    sp = span_of(candles)
    band = sp * 0.012  # thin band; these are lines with thickness, not areas
    highs = [p for p in zz if p["type"] == "H"]
    lows = [p for p in zz if p["type"] == "L"]
    zones = []

    if highs:
        top = max(highs, key=lambda p: p["price"])
        zones.append(
            {
                "label": "BSL",
                "note": "buy-side liquidity",
                "kind": "liquidity",
                "side": "buy",
                "top": round(top["price"] + band, 2),
                "bottom": round(top["price"], 2),
                "index": top["index"],
            }
        )
    if lows:
        bot = min(lows, key=lambda p: p["price"])
        zones.append(
            {
                "label": "SSL",
                "note": "sell-side liquidity",
                "kind": "liquidity",
                "side": "sell",
                "top": round(bot["price"], 2),
                "bottom": round(bot["price"] - band, 2),
                "index": bot["index"],
            }
        )
    return zones


def build_zones(candles: list[dict], zz: list[dict]) -> list[dict]:
    """Every labelled band on the map, deduplicated and ordered top to bottom."""
    zones = liquidity_zones(candles, zz)

    for g in real_imbalances(candles, limit=2):
        zones.append(
            {
                "label": "GAP",
                "note": "unfilled imbalance",
                "kind": "gap",
                "side": "buy" if g["kind"] == "bullish" else "sell",
                "top": g["top"],
                "bottom": g["bottom"],
                "index": g["startIndex"],
            }
        )

    for b in displacement_blocks(candles, limit=2):
        zones.append(
            {
                "label": "OB",
                "note": "order block",
                "kind": "ob",
                "side": "buy" if b["kind"] == "bullish" else "sell",
                "top": b["top"],
                "bottom": b["bottom"],
                "index": b["index"],
            }
        )

    # Two bands covering nearly the same prices read as one smudge with two
    # labels fighting over it. Comparing midpoints missed this: two gaps can sit
    # 5 points apart at the centre and still overlap over 80% of their height.
    # So the test is actual overlap, against the shorter of the pair.
    sp = span_of(candles)
    rank = {"liquidity": 0, "ob": 1, "gap": 2}
    kept: list[dict] = []

    def overlaps(a: dict, b: dict) -> bool:
        shared = min(a["top"], b["top"]) - max(a["bottom"], b["bottom"])
        if shared <= 0:
            return False
        shorter = min(a["top"] - a["bottom"], b["top"] - b["bottom"])
        # A hair-thin liquidity band has almost no height, so guard the divisor
        # with a floor tied to the chart's own scale.
        return shared > max(shorter, sp * 0.01) * 0.5

    for z in sorted(zones, key=lambda z: rank[z["kind"]]):
        if any(overlaps(z, k) for k in kept):
            continue
        kept.append(z)

    return merge_adjacent(sorted(kept, key=lambda z: -z["top"]), sp)


def merge_adjacent(zones: list[dict], sp: float) -> list[dict]:
    """Fuse same-kind bands that sit close enough to read as one.

    On silver this showed up as two fair value gaps a few cents apart: they do not
    overlap, so the overlap test kept both, but on screen the two tan fills met
    and became a single block wearing two GAP labels. Traders would treat that
    area as one zone anyway, so the drawing should too.
    """
    out: list[dict] = []
    for z in zones:
        prev = out[-1] if out else None
        if (
            prev
            and prev["kind"] == z["kind"]
            # 3.5% of the chart's price span is roughly 40px at render height —
            # below that the eye reads one band, whatever the numbers say.
            and prev["bottom"] - z["top"] < sp * 0.035
        ):
            prev["top"] = max(prev["top"], z["top"])
            prev["bottom"] = min(prev["bottom"], z["bottom"])
            prev["index"] = min(prev["index"], z["index"])
            continue
        out.append(dict(z))
    return out


def trendline(zz: list[dict], bias: str) -> dict | None:
    """A line through the last two swings that the prevailing leg respects."""
    want = "H" if bias == "bearish" else "L"
    pts = [p for p in zz if p["type"] == want]
    if len(pts) < 2:
        return None
    a, b = pts[-2], pts[-1]
    if b["index"] <= a["index"]:
        return None
    return {
        "from": {"index": a["index"], "price": a["price"]},
        "to": {"index": b["index"], "price": b["price"]},
    }


def read_bias(zz: list[dict]) -> str:
    """Bearish while the last two highs are falling, bullish while lows are rising."""
    highs = [p["price"] for p in zz if p["type"] == "H"][-2:]
    lows = [p["price"] for p in zz if p["type"] == "L"][-2:]
    score = 0
    if len(highs) == 2:
        score += 1 if highs[1] > highs[0] else -1
    if len(lows) == 2:
        score += 1 if lows[1] > lows[0] else -1
    return "bullish" if score >= 0 else "bearish"


def projected_path(candles: list[dict], zones: list[dict], bias: str, steps: int) -> list[dict]:
    """The plan, as waypoints extending past the last candle.

    Deliberately not a forecast of fact: it walks the zones in the order the
    bias implies — first a sweep against the bias to take the resting liquidity,
    then a move through the zones the bias targets. The video labels it a plan
    and never reports it as an outcome.
    """
    last = len(candles) - 1
    price = candles[-1]["close"]
    mid = lambda z: round((z["top"] + z["bottom"]) / 2, 2)  # noqa: E731

    above = [z for z in zones if mid(z) > price]
    below = [z for z in zones if mid(z) < price]
    nearest_above = min(above, key=lambda z: mid(z) - price) if above else None
    nearest_below = min(below, key=lambda z: price - mid(z)) if below else None

    if bias == "bearish":
        sweep, target = nearest_above, (below[-1] if below else None)
    else:
        sweep, target = nearest_below, (above[0] if above else None)

    stops = [z for z in (sweep, target) if z is not None]
    if not stops:
        return []

    # Spread the waypoints across the projected window, stopping short of its
    # end. Dividing the space evenly put the final waypoint against the frame
    # edge with its label half off screen; leaving a margin keeps the label and
    # its arrowhead inside the chart.
    out = [{"index": last, "price": round(price, 2), "label": None}]
    reach = len(stops) + 0.5
    for n, z in enumerate(stops, start=1):
        out.append(
            {
                "index": last + round(steps * n / reach),
                "price": mid(z),
                "label": z["label"],
            }
        )
    return out


def build(candles: list[dict], pair: str, timeframe: str, bars: int, project: int) -> dict:
    window = candles[-bars:]
    zz = zigzag(window, lookback=2)
    if len(zz) < 3:
        raise SystemExit("not enough structure in this window to draw a map")

    bias = read_bias(zz)
    zones = build_zones(window, zz)
    if not zones:
        raise SystemExit("no zones found in this window")

    return {
        "kind": "marketMap",
        "pair": pair,
        "timeframe": timeframe,
        "bias": bias,
        "candles": window,
        "zones": zones,
        "choch": choch_points(zz),
        "trendline": trendline(zz, bias),
        "path": projected_path(window, zones, bias, project),
        "projectBars": project,
        "lastPrice": window[-1]["close"],
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--symbol", default="GC=F", help="Yahoo symbol (GC=F = COMEX gold)")
    ap.add_argument("--pair", default="XAU/USD")
    ap.add_argument("--timeframe", default="H1", help="label drawn in the header")
    ap.add_argument("--interval", default="1h")
    ap.add_argument("--range", dest="rng", default="3mo")
    ap.add_argument("--bars", type=int, default=64, help="candles on the map")
    # The plan needs real room. At 16 bars against 70 candles it occupied under a
    # fifth of the width and its waypoint labels collided with the zone pills.
    ap.add_argument("--project", type=int, default=30, help="bars of empty space for the plan")
    ap.add_argument("--out", default="src/data/map.json")
    args = ap.parse_args()

    candles = fetch_candles(args.symbol, args.interval, args.rng)
    if len(candles) < args.bars:
        raise SystemExit(f"only {len(candles)} candles returned, need {args.bars}")

    cfg = build(candles, args.pair, args.timeframe, args.bars, args.project)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(cfg, indent=2))

    print(f"{args.pair} {args.timeframe}: bias {cfg['bias']}, {len(cfg['zones'])} zones, "
          f"{len(cfg['choch'])} CHoCH, {len(cfg['path'])} waypoints -> {out}")
    for z in cfg["zones"]:
        print(f"  {z['label']:4} {z['bottom']:>10.2f} - {z['top']:<10.2f} {z['note']}")


if __name__ == "__main__":
    main()
