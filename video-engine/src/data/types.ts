// Data contract between the Python pipeline and the Remotion renderer.
// The Python script emits a config.json matching this shape; the video reads it.

import type {Locale} from '../i18n';

export type Candle = {
  // Unix seconds or any monotonic index — only ordering matters for X layout.
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Level = {
  price: number;
  // Human label drawn next to the line, e.g. "Support", "Resistance".
  label: string;
  // "support" | "resistance" drives the color.
  kind: 'support' | 'resistance';
};

export type RiskReward = {
  entry: number;
  stop: number; // stop-loss price
  target: number; // take-profit price
  // Index into `candles` where the trade is entered (box starts here).
  entryIndex: number;
};

/** A three-candle imbalance price skipped over. */
export type Fvg = {
  kind: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  startIndex: number;
};

/** Last opposing candle before the displacement that left an imbalance. */
export type OrderBlock = {
  kind: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  index: number;
};

export type Fibonacci = {
  high: number;
  low: number;
  direction: 'up' | 'down';
  levels: {ratio: number; price: number}[];
  startIndex: number;
};

/** One alternating high/low of the market-structure path. */
export type SwingPoint = {
  index: number;
  price: number;
  type: 'H' | 'L';
};

/** A named classical formation printed by the structure. */
export type Pattern = {
  name: string;
  bias: 'bullish' | 'bearish';
  neckline: number;
  points: {index: number; price: number; label: string}[];
};

export type Outcome = {
  // Which barrier the hidden candles reached first.
  result: 'TP' | 'SL' | 'OPEN';
  // Index into `candles` where it resolved, or null if still open.
  index: number | null;
};

export type ForexChartProps = {
  pair: string; // e.g. "BTC/USDT"
  /** Which track this video belongs to; absent means the global one. */
  locale?: Locale;
  /** Corner mark, from public/brand. Absent means the video carries none. */
  brandMark?: string | null;
  timeframe: string; // e.g. "15m"
  title: string; // headline caption drawn on screen
  hook: string; // first-seconds teaser question
  side: 'LONG' | 'SHORT';
  // What price actually did over the withheld candles — the quiz answer.
  answer: 'BUY' | 'SELL';
  candles: Candle[];
  // Candles [0, setupCount) are the analysis window shown up front; the rest
  // are withheld and replayed at the end to reveal how the trade resolved.
  setupCount: number;
  levels: Level[];
  riskReward: RiskReward | null;
  structure: SwingPoint[];
  pattern: Pattern | null;
  // Textbook trade for the formation, used by the lesson video. It can differ
  // from riskReward, which trades the channel instead.
  patternTrade: RiskReward | null;
  patternSide: 'LONG' | 'SHORT' | null;
  patternOutcome: Outcome;
  fvgs: Fvg[];
  orderBlock: OrderBlock | null;
  fibonacci: Fibonacci | null;
  outcome: Outcome;
};

// --- Daily market map ------------------------------------------------------
// The forward-looking format. The other three ask "what happened next"; this one
// marks where liquidity is resting and sketches the plan around it. Its `path`
// is the only line in the project that is not measured from data, so it is
// labelled a plan on screen and never reported as an outcome.

export type MapZone = {
  label: 'BSL' | 'SSL' | 'OB' | 'GAP';
  note: string;
  kind: 'liquidity' | 'ob' | 'gap';
  side: 'buy' | 'sell';
  top: number;
  bottom: number;
  index: number;
};

export type ChochPoint = {
  index: number;
  price: number;
  dir: 'bullish' | 'bearish';
};

export type MapWaypoint = {
  // May exceed the last candle index: the plan extends into empty space.
  index: number;
  price: number;
  label: string | null;
};

export type MarketMapProps = {
  kind: 'marketMap';
  /** Which track this video belongs to; absent means the global one. */
  locale?: Locale;
  /** Corner mark, from public/brand. Absent means the video carries none. */
  brandMark?: string | null;
  pair: string;
  timeframe: string;
  bias: 'bullish' | 'bearish';
  candles: Candle[];
  zones: MapZone[];
  choch: ChochPoint[];
  trendline: {from: {index: number; price: number}; to: {index: number; price: number}} | null;
  path: MapWaypoint[];
  // Bars of empty space reserved to the right of the last candle.
  projectBars: number;
  lastPrice: number;
};

// --- Candlestick-pattern lesson -------------------------------------------
// Separate shape from ForexChartProps: this series is constructed to teach a
// pattern, so it carries anatomy annotations and no market provenance.

export type AnatomyPart = 'body' | 'upperWick' | 'lowerWick';

export type Anatomy = {
  index: number;
  part: AnatomyPart;
  label: string;
};

export type CandlePattern = {
  name: string;
  tagline: string;
  bias: 'bullish' | 'bearish';
  rule: string;
  checks: string[];
  indices: number[];
  bodyLow: number;
  bodyHigh: number;
  wickRatio?: number;
};

/**
 * How the pattern actually performed across every occurrence in real history.
 *
 * Null when it could not be measured — no network, or too few settled trades to
 * quote a rate from. The video drops the beat rather than showing a number it
 * cannot stand behind.
 */
export type PatternStats = {
  pattern: string;
  pair: string;
  timeframe: string;
  windowLabel: string;
  occurrences: number;
  settled: number;
  wins: number;
  losses: number;
  rewardRisk: number;
  hitRate: number;
  expectancyR: number;
};

export type CandleLessonProps = {
  kind: 'candleLesson';
  instrument: string;
  /**
   * Which track this video belongs to. Absent means the global one, so every
   * config written before the Vietnam track existed still means what it did.
   */
  locale?: Locale;
  /** Corner mark, from public/brand. Absent means the video carries none. */
  brandMark?: string | null;
  pattern: CandlePattern;
  anatomy: Anatomy[];
  candles: Candle[];
  setupCount: number;
  trade: RiskReward;
  outcome: Outcome;
  note: string;
  stats: PatternStats | null;
  /**
   * Narration, when it was generated. `voiceId` names a pair of files under
   * public/voice; `voiceMarks` is what is said when. Null throughout means the
   * video simply has no narration, which is a complete video.
   */
  voiceId?: string | null;
  voiceMarks?: {text: string; startFrame: number; endFrame: number}[] | null;
};
