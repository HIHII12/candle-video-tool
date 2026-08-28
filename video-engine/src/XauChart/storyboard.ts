import type {ForexChartProps} from '../data/types';

// 35 seconds at 60fps. The viewer is asked to commit to BUY or SELL early, so
// every later beat is them waiting to find out whether they were right.
export const DURATION = 2100;

// Markup is layered in the order a trader would actually build it: structure
// first, then the imbalance, then where to enter, then the trade itself.
export const SB = {
  replay: [40, 520] as const, // setup candles stream in
  level: [550, 660] as const, // support / resistance
  fvg: [700, 820] as const, // fair value gap + order block
  fibo: [860, 990] as const, // retracement levels
  box: [1030, 1170] as const, // position tool + R:R
  countdown: [1210, 1400] as const, // 3 . 2 . 1 think time
  answer: 1410, // market's verdict lands
  reveal: [1430, 1830] as const, // withheld candles play out
  result: [1870, 2100] as const, // verdict strip + subscribe
};

export const ramp = (frame: number, range: readonly [number, number]) => {
  const [a, b] = range;
  if (frame <= a) return 0;
  if (frame >= b) return 1;
  return (frame - a) / (b - a);
};

// Index of the last candle the reveal plays, i.e. where the trade resolved.
export const lastRevealIndex = (props: ForexChartProps) => {
  const total = props.candles.length;
  return props.outcome.index === null
    ? total - 1
    : Math.min(props.outcome.index, total - 1);
};

/**
 * How many candles are on screen at a given frame — fractional.
 *
 * The fraction is how far the newest bar has formed. Rounding it, as this used
 * to, meant a bar appeared whole between two frames: the chart gained a full
 * candle in one sixtieth of a second, over and over, and both the replay and the
 * reveal read as a flip-book. See src/camera.ts.
 */
export const shownFloatAt = (props: ForexChartProps, frame: number) => {
  const total = props.candles.length;
  const setup = props.setupCount;
  const revealSpan = Math.max(0, lastRevealIndex(props) - (setup - 1));

  if (frame < SB.reveal[0]) {
    // Opens with most of the setup already drawn. Streaming in from one candle
    // meant frame 0 was a near-empty chart — the single frame that decides
    // whether the video gets watched at all.
    const OPEN_AT = 0.55;
    return Math.max(1, (OPEN_AT + (1 - OPEN_AT) * ramp(frame, SB.replay)) * setup);
  }
  return Math.min(total, setup + ramp(frame, SB.reveal) * revealSpan);
};

/** The same thing as a count, for anything that indexes into the series. */
export const shownAt = (props: ForexChartProps, frame: number) =>
  Math.max(1, Math.min(props.candles.length, Math.ceil(shownFloatAt(props, frame) - 0.001)));

// The reveal stops on the candle that resolves the trade, so the payoff always
// lands on the last frame of the reveal beat.
export const RESOLUTION_FRAME = SB.reveal[1];
