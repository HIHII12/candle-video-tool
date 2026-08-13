import type {CandleLessonProps} from '../data/types';
import {TEXT_FONT} from '../fonts';

/**
 * Restrained palette. The quiz format shouts because it competes in a feed;
 * a lesson has to stay readable while carrying text, so fills are thin, strokes
 * are hairlines and only one accent colour is allowed to draw the eye.
 */
export const CT = {
  bg: '#0d1117',
  bgTop: '#141a22',
  panel: 'rgba(255,255,255,0.045)',
  panelLine: 'rgba(255,255,255,0.10)',
  up: '#2ebd85',
  down: '#e2465e',
  ink: '#e6edf3',
  inkSoft: 'rgba(230,237,243,0.62)',
  inkFaint: 'rgba(230,237,243,0.30)',
  accent: '#f0b429',
  scrim: 'rgba(13,17,23,0.72)',
} as const;

// Weight carries the hierarchy, so this needs the real family with its real
// weights rather than a fallback the browser has to fake.
export const CFONT = TEXT_FONT;

export const CHART = {
  left: 0,
  top: 520,
  width: 1080,
  height: 900,
} as const;

export const CANDLE_DURATION = 2100;

export const CB = {
  title: [0, 170] as const,
  context: [70, 470] as const, // approach leg streams in
  patternIn: [500, 620] as const, // the pattern lands, one bar at a time
  focus: [660, 780] as const, // spotlight + zoom toward the pattern
  anatomy: [810, 1030] as const, // name the parts
  rule: [1060, 1320] as const, // the rule, with its checklist
  zoomOut: [1360, 1470] as const, // pull back and place the trade
  // The reveal used to finish at 1830, which left the last 4.5 seconds — and in
  // practice closer to 9, since the follow-through candles arrive early — with a
  // completely frozen chart. A third of a short-form video holding still is the
  // clearest "nobody edited this" signal there is, so the candles now keep
  // arriving until just before the end and the verdict lands over them.
  reveal: [1500, 1870] as const,
  // Overlaps the reveal deliberately: the recap starts building while the last
  // candles are still landing, so there is no frame where both are idle.
  result: [1840, 2100] as const,
};

export const cramp = (frame: number, range: readonly [number, number]) => {
  const [a, b] = range;
  if (frame <= a) return 0;
  if (frame >= b) return 1;
  return (frame - a) / (b - a);
};

// Smoothstep. Linear ramps on a zoom read as mechanical; easing both ends is
// what makes the camera move feel deliberate.
export const ease = (t: number) => t * t * (3 - 2 * t);

const patternStart = (props: CandleLessonProps) => props.pattern.indices[0];

/** Candles on screen at a given frame. */
export const shownAt = (props: CandleLessonProps, frame: number) => {
  const start = patternStart(props);
  const patternLen = props.pattern.indices.length;
  const total = props.candles.length;

  if (frame < CB.patternIn[0]) {
    // Opens with most of the approach leg already on screen. Streaming in from a
    // single candle meant frame 0 — the one frame that decides whether anyone
    // watches — was an empty chart, and the first second was spent drawing what
    // is only context anyway.
    const OPEN_AT = 0.55;
    return Math.max(1, Math.round((OPEN_AT + (1 - OPEN_AT) * cramp(frame, CB.context)) * start));
  }
  if (frame < CB.reveal[0]) {
    return start + Math.max(1, Math.round(cramp(frame, CB.patternIn) * patternLen));
  }
  const last = Math.min(props.outcome.index ?? total - 1, total - 1);
  const span = Math.max(0, last - (props.setupCount - 1));
  return Math.min(total, props.setupCount + Math.round(cramp(frame, CB.reveal) * span));
};

const pad = (prices: number[], factor: number) => {
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const p = (hi - lo) * factor || 1;
  return {minValue: lo - p, maxValue: hi + p};
};

const lerpWindow = (
  a: {minValue: number; maxValue: number},
  b: {minValue: number; maxValue: number},
  t: number,
) => ({
  minValue: a.minValue + (b.minValue - a.minValue) * t,
  maxValue: a.maxValue + (b.maxValue - a.maxValue) * t,
});

/**
 * Vertical window, animated as a camera: wide on the approach, tight on the
 * pattern while it is being explained, wide again for the follow-through.
 * Zooming the price scale rather than scaling the canvas keeps candles crisp.
 */
export const windowAt = (props: CandleLessonProps, frame: number) => {
  const start = patternStart(props);
  const setup = props.candles.slice(0, props.setupCount);
  const patternCandles = props.pattern.indices.map((i) => props.candles[i]);

  const wide = pad(
    [...setup.flatMap((c) => [c.high, c.low]), props.trade.stop],
    0.1,
  );
  const near = pad(patternCandles.flatMap((c) => [c.high, c.low]), 0.5);
  // Only as far as the video actually plays. Padding for candles past the
  // outcome squashes everything the viewer does see into a narrower band.
  const shownEnd = Math.min(props.outcome.index ?? props.candles.length - 1, props.candles.length - 1);
  const full = pad(
    [
      ...props.candles.slice(0, shownEnd + 1).flatMap((c) => [c.high, c.low]),
      props.trade.stop,
      props.trade.target,
    ],
    0.08,
  );

  if (frame < CB.focus[0]) return wide;
  if (frame < CB.zoomOut[0]) {
    return lerpWindow(wide, near, ease(cramp(frame, CB.focus)));
  }
  return lerpWindow(near, full, ease(cramp(frame, CB.zoomOut)));
};

/** Last candle the video ever shows — slots past it are dead width. */
const lastShown = (props: CandleLessonProps) =>
  Math.min(props.outcome.index ?? props.candles.length - 1, props.candles.length - 1);

/**
 * Horizontal window, animated as the other half of the same camera.
 *
 * Reserving a slot for every candle up front meant the setup filled barely half
 * the frame and the pattern being explained was a sliver in a lot of empty
 * space. Moving both axes together is the difference between a chart that looks
 * framed and one that looks like a screenshot of the wrong region: the setup
 * fills the width, the camera pushes in on the pattern to explain it, then pulls
 * back to show the follow-through.
 */
export const hWindowAt = (props: CandleLessonProps, frame: number) => {
  const idx = props.pattern.indices;
  const first = idx[0];
  const last = idx[idx.length - 1];

  // Setup only. The withheld candles get no width until the reveal needs them.
  const wide = {from: -0.6, to: props.setupCount - 0.4};
  // Pattern plus a few bars of context, so it reads as part of a chart.
  const near = {from: first - 4.5, to: last + 4.5};
  const full = {from: -0.6, to: lastShown(props) + 0.6};

  const lerp = (a: typeof wide, b: typeof wide, t: number) => ({
    from: a.from + (b.from - a.from) * t,
    to: a.to + (b.to - a.to) * t,
  });

  if (frame < CB.focus[0]) return wide;
  if (frame < CB.zoomOut[0]) return lerp(wide, near, ease(cramp(frame, CB.focus)));
  return lerp(near, full, ease(cramp(frame, CB.zoomOut)));
};

/** Index range the spotlight keeps lit while the pattern is discussed. */
export const focusRange = (props: CandleLessonProps) => ({
  from: props.pattern.indices[0] - 1,
  to: props.pattern.indices[props.pattern.indices.length - 1] + 1,
});
