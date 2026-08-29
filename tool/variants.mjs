import {readdirSync} from 'node:fs';

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
 * Everything the repo already holds real market data for.
 *
 * The three formats that are not the candle lesson need a live feed to build a
 * config — and on a machine that cannot reach one, that used to mean they simply
 * could not be made, so a hundred-video run came out a hundred of one format.
 * But the configs already fetched are checked into src/data, prices and all.
 * Rendering straight from those needs no network and no regeneration, and it is
 * the only way to get the other three formats out of a machine that is offline.
 *
 * The data is as old as the config: fine for teaching a setup, wrong for
 * anything that claims to be today's chart. The caller decides which that is.
 */
export function replayPlan(dataDir, locale = 'en') {
  const KINDS = [
    {prefix: 'batch_buy-or-sell-quiz-', format: 'buy-or-sell-quiz', composition: 'XauChart'},
    {prefix: 'batch_named-setup-', format: 'named-setup', composition: 'LessonShort'},
    {prefix: 'batch_market-map-', format: 'market-map', composition: 'MarketMap'},
  ];
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json')).sort();
  const buckets = KINDS.map(({prefix, format, composition}) =>
    files
      .filter((f) => f.startsWith(prefix))
      .map((file) => ({
        id: `${locale}-${file.replace(/^batch_|\.json$/g, '')}`,
        format,
        composition,
        replay: `src/data/${file}`,
        locale,
        label: file.replace(/^batch_|\.json$/g, '').replace(/-/g, ' '),
      })),
  );

  // Round-robin, so trimming to any count keeps all three formats in the mix.
  const jobs = [];
  for (let i = 0; ; i += 1) {
    const before = jobs.length;
    for (const b of buckets) if (b[i]) jobs.push(b[i]);
    if (jobs.length === before) break;
  }
  return jobs;
}

/**
 * A run of candlestick lessons only — as many as asked for.
 *
 * The daily plan gives thirteen of these, because a day is thirteen of these.
 * A back catalogue is a different job: it wants a hundred at once, and the three
 * other formats cannot supply it because they need live market data and a
 * machine behind a blocked network has none. This format needs nothing but a
 * seed, so it is the one that can fill a catalogue offline.
 *
 * Every job gets its own seed, so the same pattern comes back with a different
 * approach leg, a different pattern candle and a different follow-through rather
 * than the same video with a new number on it.
 */
export function candlePlan(isoDate, count = 100, locale = 'en') {
  const day = dayIndex(isoDate);
  const jobs = [];
  for (let n = 0; n < count; n += 1) {
    const pattern = PATTERNS[n % PATTERNS.length];
    const round = Math.floor(n / PATTERNS.length) + 1;
    jobs.push({
      // The locale is part of the id, so the two tracks can be built for the
      // same date into the same folder without one overwriting the other.
      id: `${locale}-candle-${pattern}-v${String(round).padStart(2, '0')}`,
      locale,
      format: 'candle-lesson',
      pattern,
      // Coprime step so consecutive rounds of the same pattern are far apart in
      // seed space rather than adjacent integers.
      seed: day * 1000 + n * 37 + 11,
      label: `${pattern.replace(/-/g, ' ')} · ${round}`,
    });
  }
  return jobs;
}

/**
 * A mixed catalogue: every format the machine can build without a network.
 *
 * The candle lesson is the only one that can be *generated* offline, so a plain
 * count of a hundred came out a hundred of one thing — which is what it looks
 * like when it is unzipped, whatever the notes said. The other three do not need
 * generating: the configs already fetched are checked into src/data, and
 * replaying those is the difference between one format and four.
 *
 * That caps them at however many configs exist — 23 today. Everything past that
 * is candle lessons, and the two are interleaved so the mix shows up in the
 * first few files rather than being buried at the end.
 */
export function mixedPlan(isoDate, count, locale, dataDir) {
  const replay = replayPlan(dataDir, locale);
  const candles = candlePlan(isoDate, Math.max(0, count - replay.length), locale);
  if (!replay.length) return candles.slice(0, count);

  const every = Math.max(1, Math.round(candles.length / replay.length));
  const out = [];
  let r = 0;
  candles.forEach((job, i) => {
    out.push(job);
    if (r < replay.length && (i + 1) % every === 0) out.push(replay[r++]);
  });
  while (r < replay.length) out.push(replay[r++]);
  return out.slice(0, count);
}

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
