import React from 'react';
import {interpolate} from 'remotion';
import type {CompareSide} from '../data/types';
import {useLightweightChart} from '../XauChart/useLightweightChart';
import {ChartEdges} from '../ChartEdges';
import {extentOf, insetPrice, lerpPrice, ramp, smoothed, visibleCandles} from '../camera';
import {KLAYER, KT} from './theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * One chart of the pair, plus the bracket that measures it.
 *
 * The two panes are deliberately identical in every respect except the data:
 * same size, same window padding, same bracket. A comparison where one side is
 * drawn even slightly larger is not a comparison — the eye reads the difference
 * in presentation as a difference in the thing.
 */
export const Pane: React.FC<{
  side: CompareSide;
  box: {left: number; top: number; width: number; height: number};
  frame: number;
  /**
   * How much of this pane's series has arrived at frame `f`, 0-1.
   *
   * A function rather than a number because the camera reads it at several
   * earlier frames to smooth itself, and it cannot keep state between frames.
   */
  drawAt: (f: number) => number;
  /** How far the measurement bracket has been drawn, 0-1. */
  measure: number;
  /**
   * How far the pane has pushed in on the pattern at frame `f`, 0-1.
   *
   * Runs from the moment the top chart is drawn to the last frame. Without it
   * the two panes were finished at fifteen seconds and held perfectly still for
   * the remaining fourteen while only text faded in and out — measured, and it
   * is the longest dead stretch any format in this tool has had. It is also the
   * right move on its own terms: the beat is "look closer", so the camera looks
   * closer.
   */
  zoomAt: (f: number) => number;
  /**
   * Shared vertical scale, as a fraction of price — the larger of the two sides'.
   *
   * Without it each pane auto-scaled to its own data, and that quietly destroyed
   * the format: a hammer with a 0.4% body and a doji with a 0.02% body were both
   * stretched to fill their pane, so the two bodies came out roughly the same
   * height on screen while the video said "measure the body". A comparison whose
   * two axes differ is not a comparison. Both panes are given the same
   * price-fraction height now, each centred on its own data, so a body twice the
   * size is drawn twice the size.
   */
  relSpan: number;
  /**
   * How far the last beat has closed on the pattern candle itself, 0-1.
   *
   * The push-in that runs from the top chart onward is continuous, and by the
   * final seconds it has slowed to about a third of a pixel a frame — measured,
   * that reads as a still picture, and the last six seconds of the first build
   * were flagged as dead. So the closing beat gets a move of its own instead of
   * the tail of an earlier one: both panes close onto the candle being argued
   * about, which is also what the words are doing at that moment.
   */
  focusAt: (f: number) => number;
  /** The shared height of that final framing, as a fraction of price. */
  focusSpan: number;
  metric: 'body' | 'direction';
  label: string;
}> = ({side, box, frame, drawAt, measure, zoomAt, relSpan, focusAt, focusSpan, metric, label}) => {
  const total = side.candles.length;
  const last = side.indices[side.indices.length - 1];
  const first = side.indices[0];

  /**
   * Close on the pattern, not on the whole leg.
   *
   * The first build framed all eighteen bars, and it defeated the format: the
   * two candles being compared came out about twelve pixels wide at the right
   * edge of each pane, which is exactly the size at which they look identical —
   * the thing the video exists to disprove. Eight slots puts the pattern at
   * roughly two thirds across and leaves room on the right for the bracket.
   */
  const LEAD = 5.5;
  const TRAIL = 2.5;

  /**
   * Where the camera sits at frame `f` — and it never sits still.
   *
   * The first build fixed the logical range for the whole draw and let candles
   * pop into it one at a time. Measured, that read as fourteen and a half
   * seconds of frozen picture: a single candle appearing changes about one
   * block in a hundred and forty-four, which is below anything a viewer
   * registers as movement. So the right edge tracks the newest bar instead. The
   * chart pans continuously the entire time it is filling, every bar on screen
   * moves every frame, and the draw reads as a live tape rather than a slideshow.
   */
  const camAt = (f: number) => {
    const d = Math.max(0.001, drawAt(f));
    const z = zoomAt(f);
    // Closes from eight slots to about three and a half, so the pattern candle
    // ends the video filling the pane rather than sitting in it.
    const lead = LEAD - (LEAD - 2.4) * z;
    const trail = TRAIL - (TRAIL - 2.4) * z;
    /**
     * Never fewer than five and a half slots across.
     *
     * Most of these pairs are single-candle patterns, so `last - first` is zero
     * and the span is whatever lead and trail add up to. Pushed to three slots
     * that put a 190-pixel-wide body next to a two-pixel wick, which is not what
     * a candle looks like — the proportion is the thing being taught here, and
     * at that zoom it was wrong on screen. The floor keeps bodies and wicks in
     * the ratio a real chart draws them at.
     */
    const span = Math.max(5.5, last - first + lead + trail);
    // Candles arrive within that window rather than across the whole series, so
    // the approach is still drawn but at a size where the shapes read.
    const raw = first - LEAD + (last + 1 - (first - LEAD)) * d;
    const shown = Math.min(total, Math.max(1, raw));
    const to = shown - 1 + trail;
    return {shown, from: to - span, to};
  };

  const cam = camAt(frame);

  // Framed on the bars actually under the camera, averaged over the last third
  // of a second. Taken raw it stepped every time a tall wick crossed the left
  // edge; the trail rounds that into a glide. Both panes run the same function
  // on the same clock, so they stay at comparable scales throughout.
  const key = side.candles[last];
  const keyMid = (key.high + key.low) / 2;

  const window = smoothed(
    frame,
    (f) => {
      const c = camAt(f);
      const bars = visibleCandles(side.candles, c.shown).slice(Math.max(0, Math.round(c.from)));
      // Generous vertical padding: these panes are 470px tall and the patterns
      // being compared are the long-wick ones, so the tip of a wick is the
      // single most important pixel in the frame and it was landing in the fade.
      const wide = insetPrice(extentOf(bars.length ? bars : side.candles, [], 0.14), box, {
        top: 12,
        bottom: 12,
        left: 24,
        right: 20,
      });
      // The closing framing, shared between the panes so they stay comparable
      // right to the last frame: same height in percent of price, each centred
      // on its own candle.
      const need = Math.abs(keyMid) * focusSpan;
      const tight = {minValue: keyMid - need / 2, maxValue: keyMid + need / 2};
      return lerpPrice(wide, tight, focusAt(f));
    },
    lerpPrice,
    20,
    5,
  );

  // Widen to the shared scale if this side's own range is the smaller one. Only
  // ever widens, so the padding computed above is kept and never eaten into.
  const mid = (window.minValue + window.maxValue) / 2;
  const need = Math.abs(mid) * relSpan;
  const scaled =
    window.maxValue - window.minValue >= need
      ? window
      : {minValue: mid - need / 2, maxValue: mid + need / 2};

  const {containerRef, coords} = useLightweightChart(
    side,
    cam.shown,
    scaled,
    {bg: KT.bg, up: KT.up, down: KT.down, box},
    {from: cam.from, to: cam.to},
  );

  const bodyTop = Math.max(key.open, key.close);
  const bodyBottom = Math.min(key.open, key.close);

  return (
    <>
      <div
        ref={containerRef}
        style={{position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height}}
      />
      <ChartEdges box={box} bg={KT.bg} zIndex={KLAYER.chart + 5} top={8} bottom={8} solid={6} side={56} />

      {coords && measure > 0 && (
        <svg
          width={box.width}
          height={box.height}
          style={{position: 'absolute', left: box.left, top: box.top, pointerEvents: 'none', zIndex: KLAYER.marks}}
        >
          {(() => {
            const x = coords.indexToX(side.indices[side.indices.length - 1]);
            // The body for the body comparison; the whole bar for the direction
            // one, where what is being pointed at is the bar itself, not a part.
            const [lo, hi] =
              metric === 'body' ? [bodyBottom, bodyTop] : [key.low, key.high];
            const yLo = coords.priceToY(lo);
            const yHi = coords.priceToY(hi);
            const top = Math.min(yLo, yHi);
            const height = Math.abs(yLo - yHi);
            const grow = interpolate(measure, [0, 0.65], [0, 1], clamp);
            /**
             * Clear of the body, then clamped clear of the pane's right edge.
             *
             * A fixed 30px offset was measured from the candle's centre, and once
             * the camera pushed in the bodies grew to about 190px wide — so the
             * bracket and its label were drawn on top of the very body they were
             * measuring. The offset is derived from the slot width now, so it
             * stays outside the candle at any zoom.
             */
            const slot = Math.abs(coords.logicalToX(1) - coords.logicalToX(0)) || 60;
            const bx = Math.min(x + slot * 0.42 + 16, box.width - 250);
            return (
              <g opacity={interpolate(measure, [0, 0.25], [0, 1], clamp)}>
                <path
                  d={`M${bx - 10},${top} L${bx},${top} L${bx},${top + height * grow} L${bx - 10},${
                    top + height * grow
                  }`}
                  fill="none"
                  stroke={KT.measure}
                  strokeWidth={3}
                />
                <text
                  x={bx + 16}
                  y={top + height / 2 + 10}
                  fill={KT.measure}
                  fontSize={29}
                  fontWeight={700}
                  opacity={interpolate(measure, [0.55, 0.9], [0, 1], clamp)}
                >
                  {label}
                </text>
              </g>
            );
          })()}
        </svg>
      )}
    </>
  );
};

export const paneRamp = ramp;
