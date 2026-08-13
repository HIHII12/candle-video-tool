/**
 * The day's content plan.
 *
 * Thirty distinct videos a day is a combinatorics problem, not a "write more
 * formats" problem. Three formats crossed with instruments, timeframes and
 * patterns already exceeds thirty, so the job here is to pick a stable,
 * non-repeating slice for a given date.
 *
 * The date seeds everything, so the same date always produces the same plan —
 * a re-run resumes rather than making different videos.
 */

// Thirteen patterns, six used per day, so the rotation takes over two weeks to
// repeat rather than resetting every day.
export const PATTERNS = [
  'bullish-engulfing', 'bearish-engulfing', 'hammer', 'shooting-star',
  'morning-star', 'evening-star', 'doji', 'dragonfly-doji', 'gravestone-doji',
  'marubozu', 'pin-bar', 'tweezer-bottom', 'tweezer-top',
];

// Yahoo symbols that carry enough intraday history to scan.
export const INSTRUMENTS = [
  { symbol: 'GC=F', pair: 'GC=F Gold Futures proxy', slug: 'xau' },
  { symbol: 'SI=F', pair: 'XAG/USD', slug: 'xag' },
  { symbol: 'CL=F', pair: 'WTI/USD', slug: 'wti' },
];

// Yahoo caps intraday history; 60d is the safe window for all of these.
export const TIMEFRAMES = [
  { interval: '15m', label: '15m' },
  { interval: '30m', label: '30m' },
  { interval: '1h', label: '1H' },
  { interval: '5m', label: '5m' },
];

/** Days since epoch — a stable integer that advances once per day. */
export const dayIndex = (isoDate) => Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);

/**
 * Build the plan for one date.
 *
 * Rotation offsets by the day index so consecutive days do not open with the
 * same instrument or the same pattern, and the constructed lessons get a fresh
 * seed so their price series differs from yesterday's.
 */
export function planFor(isoDate, count = 30) {
  const day = dayIndex(isoDate);
  // One bucket per format. They are interleaved rather than concatenated: with a
  // single flat list, trimming to thirty cut from the tail, and a day's plan came
  // out with eleven quizzes and not one named setup. Diversity has to survive the
  // trim, so the trim takes from every format evenly.
  const candle = [];
  const maps = [];
  const quiz = [];
  const setups = [];

  // Candlestick lessons: one per pattern, re-seeded daily.
  PATTERNS.forEach((pattern, i) => {
    const p = PATTERNS[(i + day) % PATTERNS.length];
    candle.push({
      id: `candle-${p}`,
      format: 'candle-lesson',
      pattern: p,
      seed: day * 100 + i,
      label: p.replace(/-/g, ' '),
    });
  });

  // Market maps: one per instrument, on the higher timeframes where liquidity
  // levels are worth marking. A 5m map would be noise.
  INSTRUMENTS.forEach((inst, ii) => {
    const rotated = INSTRUMENTS[(ii + day) % INSTRUMENTS.length];
    for (const tf of [
      {interval: '1h', label: 'H1'},
      {interval: '1d', label: 'D1'},
    ]) {
      maps.push({
        id: `market-map-${rotated.slug}-${tf.label}`,
        format: 'market-map',
        symbol: rotated.symbol,
        pair: rotated.pair,
        interval: tf.interval,
        timeframe: tf.label,
        label: `${rotated.pair} ${tf.label} map`,
      });
    }
  });

  // Real-data formats across instrument x timeframe.
  for (const [format, bucket] of [
    ['buy-or-sell-quiz', quiz],
    ['named-setup', setups],
  ]) {
    INSTRUMENTS.forEach((inst, ii) => {
      TIMEFRAMES.forEach((tf) => {
        const rotated = INSTRUMENTS[(ii + day) % INSTRUMENTS.length];
        bucket.push({
          id: `${format}-${rotated.slug}-${tf.label}`,
          format,
          symbol: rotated.symbol,
          pair: rotated.pair,
          interval: tf.interval,
          timeframe: tf.label,
          // Publish the honest mix. Forcing a win is a demo-only switch.
          outcome: 'any',
          label: `${rotated.pair} ${tf.label}`,
        });
      });
    });
  }

  // Round-robin the buckets, so trimming to any count keeps the mix balanced and
  // a rendering failure in one format cannot wipe out a whole day's variety.
  const buckets = [candle, quiz, setups, maps];
  const jobs = [];
  for (let i = 0; jobs.length < count; i++) {
    const before = jobs.length;
    for (const b of buckets) if (b[i]) jobs.push(b[i]);
    if (jobs.length === before) break; // every bucket exhausted
  }

  // Deduplicate by id, keep order, then trim to the requested count.
  const seen = new Set();
  return jobs.filter((j) => !seen.has(j.id) && seen.add(j.id)).slice(0, count);
}
