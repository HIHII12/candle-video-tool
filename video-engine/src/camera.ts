import type {Candle} from './data/types';

/**
 * The camera: what is on screen, and how the chart is framed around it.
 *
 * Why this file exists. Before it, each format pinned its price window to the
 * extent of *all* the candles it would eventually show, from frame zero. The
 * arithmetic was right and the result was wrong: the first eight seconds drew
 * ten candles inside a window sized for eighteen, so the series hugged the top
 * of the box with a third of the frame empty underneath, and the same again to
 * the right. A chart framed for bars that have not arrived yet does not read as
 * "anticipation" — it reads as a screenshot of the wrong region.
 *
 * So the window tracks what is actually visible. Two problems come with that,
 * and both are solved here rather than in each format:
 *
 *   1. A new candle's high/low would step the window discontinuously, and a
 *      window that steps makes the whole chart twitch. Fixed by never showing a
 *      candle discontinuously: the newest bar *forms*, its extremes growing from
 *      the open, so the extent it contributes is continuous by construction.
 *
 *   2. Remotion renders every frame from scratch, so there is no previous frame
 *      to ease from. Any smoothing has to be a pure function of the frame
 *      number. `smoothed` gets that by averaging the target over a short trail
 *      of earlier frames — cheap, deterministic, and it gives the camera the
 *      slight lag that makes a move look driven rather than snapped.
 */

export type Box = {left: number; top: number; width: number; height: number};
export type PriceWindow = {minValue: number; maxValue: number};
export type LogicalWindow = {from: number; to: number};

/** Pixels of the chart box that must stay clear of candles on each side. */
export type Insets = {top?: number; bottom?: number; left?: number; right?: number};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smoothstep: linear ramps read as mechanical, easing both ends reads as deliberate. */
export const ease = (t: number) => t * t * (3 - 2 * t);

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

export const ramp = (frame: number, from: number, to: number) =>
  to <= from ? (frame >= to ? 1 : 0) : clamp01((frame - from) / (to - from));

/**
 * A bar part-way through its own session.
 *
 * OHLC does not record the order the extremes were hit, so the path has to be
 * reconstructed. The convention here is the one replay tools use: an up bar digs
 * to its low first, a down bar spikes to its high first, then both travel to the
 * other extreme and settle at the close. It is a reconstruction, not tick data,
 * and nothing downstream is allowed to present it as a measurement — but it is
 * the shape a trader recognises, and the alternative (bars appearing whole, one
 * per N frames) is the flicker this whole file exists to remove.
 *
 * Segment durations are proportional to distance travelled, so the price moves
 * at a constant speed instead of lurching between waypoints.
 */
export const formingCandle = (candle: Candle, t: number): Candle => {
  const p = clamp01(t);
  if (p >= 1) return candle;

  const up = candle.close >= candle.open;
  const first = up ? candle.low : candle.high;
  const second = up ? candle.high : candle.low;
  const legs = [
    Math.abs(first - candle.open),
    Math.abs(second - first),
    Math.abs(candle.close - second),
  ];
  const total = legs[0] + legs[1] + legs[2];

  // A doji with no range at all: nothing to travel, so hold the open.
  if (total <= 0) {
    return {...candle, high: candle.open, low: candle.open, close: candle.open};
  }

  const stops = [0, legs[0] / total, (legs[0] + legs[1]) / total, 1];
  const points = [candle.open, first, second, candle.close];

  let price = candle.close;
  for (let i = 0; i < 3; i += 1) {
    if (p <= stops[i + 1] || i === 2) {
      const span = stops[i + 1] - stops[i];
      price = lerp(points[i], points[i + 1], span <= 0 ? 1 : (p - stops[i]) / span);
      break;
    }
  }

  // Extremes are what the bar has actually reached so far, not what it will.
  let high = Math.max(candle.open, price);
  let low = Math.min(candle.open, price);
  for (let i = 1; i < 4; i += 1) {
    if (stops[i] <= p) {
      high = Math.max(high, points[i]);
      low = Math.min(low, points[i]);
    }
  }

  return {...candle, high, low, close: price};
};

/**
 * The candles a frame draws: whole bars, then the one still forming.
 *
 * `shown` is fractional on purpose — its integer part counts finished bars and
 * its fraction is how far the newest one has got.
 */
export const visibleCandles = (candles: Candle[], shown: number): Candle[] => {
  const n = candles.length;
  const whole = Math.max(0, Math.min(n, Math.floor(shown)));
  const out = candles.slice(0, whole);
  const frac = shown - whole;
  if (whole < n && frac > 0.001) out.push(formingCandle(candles[whole], frac));
  return out;
};

/** How many bars a frame has on screen, forming bar included as a fraction. */
export const shownCount = (shown: number, total: number) =>
  Math.max(1, Math.min(total, Math.ceil(shown - 0.001)));

/**
 * Grow a price range so the candles land inside the box *minus* the insets.
 *
 * The alternative — shrinking the chart element whenever a panel opens — makes
 * lightweight-charts re-lay-out mid-video, which moves every candle sideways.
 * Padding the range instead moves nothing but the scale.
 */
export const insetPrice = (w: PriceWindow, box: Box, insets: Insets): PriceWindow => {
  const top = insets.top ?? 0;
  const bottom = insets.bottom ?? 0;
  const usable = box.height - top - bottom;
  if (usable <= 40) return w; // Nothing sane to do; leave the window alone.
  const span = (w.maxValue - w.minValue) * (box.height / usable);
  return {
    minValue: w.minValue - (bottom / box.height) * span,
    maxValue: w.maxValue + (top / box.height) * span,
  };
};

/** The same trick horizontally, in candle-index space. */
export const insetLogical = (w: LogicalWindow, box: Box, insets: Insets): LogicalWindow => {
  const left = insets.left ?? 0;
  const right = insets.right ?? 0;
  const usable = box.width - left - right;
  if (usable <= 40) return w;
  const span = (w.to - w.from) * (box.width / usable);
  return {
    from: w.from - (left / box.width) * span,
    to: w.to + (right / box.width) * span,
  };
};

/** Price extent of a set of candles, with a fraction of the span as breathing room. */
export const extentOf = (candles: Candle[], extra: number[] = [], padFactor = 0.08): PriceWindow => {
  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  const lo = Math.min(...lows, ...extra);
  const hi = Math.max(...highs, ...extra);
  const pad = (hi - lo) * padFactor || Math.max(1e-6, Math.abs(hi) * 0.001);
  return {minValue: lo - pad, maxValue: hi + pad};
};

export const lerpPrice = (a: PriceWindow, b: PriceWindow, t: number): PriceWindow => ({
  minValue: lerp(a.minValue, b.minValue, t),
  maxValue: lerp(a.maxValue, b.maxValue, t),
});

export const lerpLogical = (a: LogicalWindow, b: LogicalWindow, t: number): LogicalWindow => ({
  from: lerp(a.from, b.from, t),
  to: lerp(a.to, b.to, t),
});

/**
 * Average a frame-indexed value over a short trail of earlier frames.
 *
 * This is the whole reason the camera glides. It cannot hold state between
 * frames, so it borrows the recent past instead: the mean over the last `trail`
 * frames lags the target slightly and rounds off any corner in it. Sampling is
 * coarse (`samples` points, not every frame) because the target is already
 * smooth and the cost is paid on every one of 2100 frames.
 */
export const smoothed = <T>(
  frame: number,
  at: (f: number) => T,
  blend: (a: T, b: T, t: number) => T,
  trail = 16,
  samples = 6,
): T => {
  let acc = at(frame);
  let weight = 1;
  for (let i = 1; i <= samples; i += 1) {
    const f = Math.max(0, frame - (trail * i) / samples);
    // Earlier samples count for less, so the camera lags without dragging.
    const w = 1 - i / (samples + 1);
    weight += w;
    acc = blend(acc, at(f), w / weight);
  }
  return acc;
};

/**
 * A slow push-in across a whole composition.
 *
 * The candle lesson has its own camera; these three do not. Their price window
 * is computed once and never moves, so once the candles have finished arriving
 * the chart is a still image with labels fading onto it — nine seconds of it on
 * the market map, which the frame check reads as a dead video and so does a
 * viewer. This is the same move the lesson makes, factored out: squeeze the
 * window toward its centre over the run, eased so it reads as a camera rather
 * than a slider.
 *
 * Vertical only. The horizontal window on these formats reserves space for
 * projections and markup, and moving it slides every band and label sideways.
 *
 * `amount` is the fraction closed in by the end. 0.12 is roughly the least that
 * still registers as movement between sampled frames; much more and it competes
 * with the markup being drawn over it.
 */
export const slowPush = (
  w: PriceWindow,
  t: number,
  amount = 0.12,
  /**
   * Vertical pan, as a fraction of the span, on top of the zoom.
   *
   * A zoom alone was not enough on the light-background formats and the reason
   * is geometric: zooming moves a point in proportion to its distance from the
   * centre, so everything near the middle of the chart — which is most of it —
   * barely moves at all. A pan moves every pixel by the same amount. Measured on
   * the market map, the zoom shifted the frame about a tenth of a pixel between
   * sampled frames and a pan of the same size shifted it nearly two.
   */
  drift = 0,
): PriceWindow => {
  const span = w.maxValue - w.minValue;
  const mid = (w.minValue + w.maxValue) / 2 + span * drift * clamp01(t);
  // Linear, deliberately. Smoothstep was the obvious choice and it was wrong
  // here: it is flat at both ends, so the first and last seconds of the video
  // got almost no movement at all — and on the market map that is exactly where
  // the chart is otherwise stillest. A push that has to run for the whole
  // duration has to move at the start too, and over thirty-five seconds the
  // constant rate is slow enough that nothing reads as mechanical.
  const k = 1 - amount * clamp01(t);
  return {minValue: mid - (span / 2) * k, maxValue: mid + (span / 2) * k};
};
