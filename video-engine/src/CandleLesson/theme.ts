import type {CandleLessonProps} from '../data/types';
import {TEXT_FONT} from '../fonts';
import {SAFE} from '../safeArea';
import {
  clamp01,
  ease,
  extentOf,
  insetLogical,
  insetPrice,
  lerpLogical,
  lerpPrice,
  ramp,
  smoothed,
  visibleCandles,
  type LogicalWindow,
  type PriceWindow,
} from '../camera';

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

/**
 * Vertical bands, declared once.
 *
 * The old layout put the chart at y 520–1420 in a 1920-tall frame: a 500px
 * header for three lines of text, and 500px below the chart holding one line of
 * small print. A quarter of a phone screen doing nothing is the single loudest
 * "nobody laid this out" signal a short can send, and it was on every frame.
 *
 * These bands are exhaustive and non-overlapping by construction, and the chart
 * gets the share that matches what the viewer came for.
 */
export const LAYOUT = {
  headerTop: 78,
  /** Where the chart element sits. Candles may be inset further, never wider. */
  chart: {left: 0, top: 322, width: 1080, height: 1136},
  /** Captions and the verdict live here; the chart is inset out of the way. */
  captionTop: 1470,
  /** Nothing the viewer must read may sit below this line. */
  readableBottom: 1920 - SAFE.bottom,
  /** Small print is allowed below it — required to be present, not prominent. */
  disclaimerY: 1858,
} as const;

// Kept for the components that still import CHART by name.
export const CHART = LAYOUT.chart;

/**
 * Paint order.
 *
 * lightweight-charts draws into a canvas that paints over any sibling with no
 * stacking context of its own, so "later in the JSX" is not enough. Every
 * element that has to sit above the chart says so with one of these, because
 * the failure mode is silent: the element renders, is painted over, and only
 * the part of it that happens to fall outside the chart box is ever seen.
 */
export const LAYER = {
  chart: 0,
  /** Annotations drawn in chart coordinates. */
  marks: 10,
  /** Text and panels drawn in frame coordinates. */
  overlay: 20,
  /** Subtitles sit above everything; an unreadable subtitle is worse than none. */
  subtitle: 40,
} as const;

export const CANDLE_DURATION = 2100;

export const CB = {
  title: [0, 150] as const,
  context: [30, 470] as const, // approach leg streams in
  patternIn: [470, 650] as const, // the pattern lands, one bar at a time
  focus: [670, 800] as const, // spotlight + zoom toward the pattern
  anatomy: [820, 1040] as const, // name the parts
  rule: [1060, 1340] as const, // the rule, with its checklist
  zoomOut: [1380, 1500] as const, // pull back and place the trade
  // Runs to within forty frames of the end. The follow-through used to finish
  // at 1870 and the last four seconds were a frozen chart under a frozen panel —
  // a third of the video holding perfectly still, which is the clearest "nobody
  // edited this" signal a short can give. Spread across the whole reveal each
  // bar takes about a second to form, so something is always moving.
  reveal: [1500, 2060] as const,
  // Overlaps the reveal deliberately: the recap starts building while the last
  // candles are still landing, so there is no frame where both are idle.
  result: [1840, 2100] as const,
};

export const cramp = (frame: number, range: readonly [number, number]) =>
  ramp(frame, range[0], range[1]);

export {ease};

const patternStart = (props: CandleLessonProps) => props.pattern.indices[0];

/**
 * How far into the slow push-in a frame is.
 *
 * Runs from the moment the camera arrives on the pattern to the moment it leaves,
 * so the move is continuous across the anatomy and rule beats rather than
 * restarting at each one.
 */
const drift = (frame: number) => ramp(frame, CB.focus[1], CB.zoomOut[0]);

/**
 * How far in the close-up is allowed to go.
 *
 * The close-up frames the pattern's own price range, which is fine until the
 * pattern barely has one. A doji's body is a few cents, so padding *its* range
 * produced a window a few cents tall — the neighbouring bars became hundreds of
 * pixels of solid colour running straight off both edges, and the frame check
 * called it exactly that. The magnification is capped against the window the
 * camera was already tracking, so a flat pattern gets a close-up of its
 * surroundings instead of a wall.
 */
const MAX_ZOOM = 3.2;

const capZoom = (near: PriceWindow, track: PriceWindow): PriceWindow => {
  const floor = (track.maxValue - track.minValue) / MAX_ZOOM;
  const span = near.maxValue - near.minValue;
  if (span >= floor) return near;
  const mid = (near.minValue + near.maxValue) / 2;
  return {minValue: mid - floor / 2, maxValue: mid + floor / 2};
};

/**
 * Squeeze a window toward its centre, with a touch of pan.
 *
 * The size of the move is set by what it has to beat, not by taste: at 7% over
 * eight seconds the shift is under a pixel between sampled frames and the
 * automated check still called it a frozen chart — correctly, because a viewer
 * cannot see it either. 16% with a slight downward pan is a slow push that reads
 * as a camera move, and it is still gentle enough not to compete with the labels
 * being drawn over it.
 */
const PUSH = 0.16;
const PAN = 0.03;

const tighten = (w: PriceWindow, t: number): PriceWindow => {
  const span = w.maxValue - w.minValue;
  const mid = (w.minValue + w.maxValue) / 2 - span * PAN * t;
  const k = 1 - PUSH * t;
  return {minValue: mid - (span / 2) * k, maxValue: mid + (span / 2) * k};
};

const tightenLogical = (w: LogicalWindow, t: number): LogicalWindow => {
  const span = w.to - w.from;
  const mid = (w.from + w.to) / 2 + span * PAN * t;
  const k = 1 - PUSH * t;
  return {from: mid - (span / 2) * k, to: mid + (span / 2) * k};
};

/** Last candle the video ever shows — slots past it are dead width. */
const lastShown = (props: CandleLessonProps) =>
  Math.min(props.outcome.index ?? props.candles.length - 1, props.candles.length - 1);

/**
 * Candles on screen at a given frame — fractional, so the newest one is caught
 * mid-formation rather than appearing whole between two frames.
 */
export const shownAt = (props: CandleLessonProps, frame: number): number => {
  const start = patternStart(props);
  const patternLen = props.pattern.indices.length;

  if (frame < CB.patternIn[0]) {
    // Opens with most of the approach leg already on screen. Streaming in from a
    // single candle meant frame 0 — the one frame that decides whether anyone
    // watches — was an empty chart, and the first second was spent drawing what
    // is only context anyway.
    const OPEN_AT = 0.55;
    return Math.max(1, (OPEN_AT + (1 - OPEN_AT) * cramp(frame, CB.context)) * start);
  }
  if (frame < CB.reveal[0]) {
    // Not `max(1, …)`. That floor meant a one-candle pattern — the hammer, the
    // shooting star, every doji — appeared whole on the first frame of its own
    // beat and then nothing moved for three seconds. The pattern candle is the
    // subject of the video; watching it print its wick and pull back is the shot,
    // and the floor was skipping it.
    return start + Math.max(0.02, cramp(frame, CB.patternIn) * patternLen);
  }
  const last = lastShown(props);
  const span = Math.max(0, last + 1 - props.setupCount);
  return Math.min(props.candles.length, props.setupCount + cramp(frame, CB.reveal) * span);
};

/** Whole candles on screen, for anything that needs a count rather than a phase. */
export const closedAt = (props: CandleLessonProps, frame: number) =>
  Math.max(1, Math.min(props.candles.length, Math.floor(shownAt(props, frame))));

/**
 * How much of the chart box each beat hands over to something else.
 *
 * Returned as insets rather than by resizing the chart element: resizing makes
 * lightweight-charts re-lay-out mid-video and every candle slides sideways.
 * Padding the *scale* moves nothing but the numbers.
 */
const insetsAt = (frame: number) => {
  // The rule panel is the tallest thing that ever covers the chart.
  const panel = clamp01(
    Math.min(ramp(frame, CB.rule[0] - 40, CB.rule[0] + 10), 1 - ramp(frame, CB.zoomOut[0] - 40, CB.zoomOut[0])),
  );
  // The verdict and the statistics own the bottom from the reveal onward.
  const caption = Math.max(ramp(frame, CB.reveal[0] - 30, CB.reveal[0] + 20), 0);
  return {
    top: 26,
    bottom: 40 + 300 * ease(panel) + 150 * ease(caption),
    left: 26,
    // Clear of the platform's own button column, so a wick never sits under it.
    right: SAFE.right - 20,
  };
};

/**
 * Vertical window. Tracks the candles that are actually on screen, then leans
 * in on the pattern while it is being explained and back out for the trade.
 *
 * Tracking is what the old fixed window got wrong: framing for bars that have
 * not arrived leaves the drawn ones squashed into a corner of their own chart.
 */
const priceTargetAt = (props: CandleLessonProps, frame: number): PriceWindow => {
  const vis = visibleCandles(props.candles, shownAt(props, frame));
  const track = extentOf(vis, [], 0.09);
  // The bars the lesson is about, plus every price a mark names — a Fibonacci
  // grid's outer levels and a range's ceiling are part of the subject, and a
  // window fitted only to the candles cropped them off the top of the frame.
  const sub = subjectRange(props);
  const subjectCandles = props.candles.slice(
    Math.max(0, Math.floor(sub.from)),
    Math.min(props.candles.length, Math.ceil(sub.to) + 1),
  );
  const markPrices: number[] = [];
  for (const m of props.marks ?? []) {
    if (m.kind === 'hline') markPrices.push(m.price);
    else if (m.kind === 'zone') markPrices.push(m.top, m.bottom);
    else for (const p of m.points) markPrices.push(p.price);
  }
  const wide = (props.marks?.length ?? 0) > 0;
  const near = capZoom(
    extentOf(subjectCandles.length ? subjectCandles : props.candles, markPrices, wide ? 0.16 : 0.55),
    track,
  );

  if (frame < CB.focus[0]) return track;
  if (frame < CB.zoomOut[0]) {
    // A slow push-in across the explaining beats. Without it the chart is
    // perfectly still for the eight seconds that name the parts and state the
    // rule — the frame checker reads three separate freezes there, and so does a
    // viewer, as "this is a slideshow".
    return lerpPrice(track, tighten(near, drift(frame)), ease(cramp(frame, CB.focus)));
  }
  // Once the levels are drawn they are part of the subject and must fit.
  const withTrade = extentOf(vis, [props.trade.stop, props.trade.target], 0.1);
  return lerpPrice(near, withTrade, ease(cramp(frame, CB.zoomOut)));
};

export const windowAt = (props: CandleLessonProps, frame: number): PriceWindow =>
  insetPrice(
    smoothed(frame, (f) => priceTargetAt(props, f), lerpPrice),
    LAYOUT.chart,
    insetsAt(frame),
  );

/**
 * Horizontal window, the other half of the same camera. Bars keep a workable
 * minimum width by scrolling once the series outgrows the frame, which is what
 * a chart does; reserving a slot per candle from frame zero is what a static
 * screenshot does.
 */
const MAX_BARS = 30;

/**
 * The index range the lesson is actually about.
 *
 * For a candlestick lesson that is one bar, and the camera closes right in on
 * it. For a concept lesson it is the whole drawing — a head and shoulders spans
 * twenty bars, a range fourteen — and closing in on the last bar of it framed
 * one candle while the formation being explained sat off screen. So the subject
 * is whatever the marks touch, and the camera frames that.
 */
export const subjectRange = (props: CandleLessonProps) => {
  const idx = props.pattern.indices;
  let from = idx[0];
  let to = idx[idx.length - 1];
  for (const m of props.marks ?? []) {
    if (m.kind === 'zone') {
      from = Math.min(from, m.from);
      to = Math.max(to, m.to ?? to);
    } else if (m.kind === 'path') {
      for (const p of m.points) {
        from = Math.min(from, p.index);
        to = Math.max(to, p.index);
      }
    } else if (m.from !== undefined) {
      from = Math.min(from, m.from);
    }
  }
  return {from, to};
};

const logicalTargetAt = (props: CandleLessonProps, frame: number): LogicalWindow => {
  const shown = shownAt(props, frame);
  const sub = subjectRange(props);
  const wide = (props.marks?.length ?? 0) > 0;
  const track = {
    from: Math.max(-0.7, shown - (wide ? MAX_BARS + 14 : MAX_BARS)),
    to: shown + 0.7,
  };
  // A drawing needs room around it to read as a drawing; a single candle needs
  // to be filled. Same camera, two different subjects.
  const pad = wide ? 2.2 : 3.5;
  const near = {from: sub.from - pad, to: sub.to + pad};

  if (frame < CB.focus[0]) return track;
  if (frame < CB.zoomOut[0]) {
    return lerpLogical(track, tightenLogical(near, drift(frame)), ease(cramp(frame, CB.focus)));
  }
  return lerpLogical(tightenLogical(near, 1), track, ease(cramp(frame, CB.zoomOut)));
};

export const hWindowAt = (props: CandleLessonProps, frame: number): LogicalWindow =>
  insetLogical(
    smoothed(frame, (f) => logicalTargetAt(props, f), lerpLogical),
    LAYOUT.chart,
    insetsAt(frame),
  );

/** Index range the spotlight keeps lit while the pattern is discussed. */
export const focusRange = (props: CandleLessonProps) => {
  const sub = subjectRange(props);
  return {from: sub.from - 1, to: sub.to + 1};
};
