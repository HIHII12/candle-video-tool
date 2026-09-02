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
  'inverted-hammer', 'hanging-man', 'bullish-harami', 'bearish-harami',
  'piercing-line', 'dark-cloud-cover', 'three-white-soldiers',
  'three-black-crows', 'spinning-top', 'bullish-belt-hold', 'bearish-belt-hold',
  'morning-doji-star', 'evening-doji-star', 'rising-three', 'falling-three',
  'bullish-kicker', 'bearish-kicker', 'bullish-marubozu', 'bearish-marubozu',
  'long-legged-doji',
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

// The six pairs make_candle_compare.py knows. Kept in step with PAIRS there by
// hand rather than shelled out for: the plan has to be printable by --dry-run
// without running python, and six strings is not worth a subprocess.
export const COMPARE_PAIRS = [
  'hammer-vs-dragonfly', 'star-vs-gravestone', 'morning-vs-evening',
  'engulfing-pair', 'tweezer-pair', 'doji-vs-marubozu',
  'doji-vs-gravestone', 'doji-vs-dragonfly',
  'hammer-vs-hanging-man', 'hammer-vs-inverted', 'harami-vs-engulfing',
  'piercing-vs-engulfing', 'spinning-vs-doji', 'marubozu-pair',
  'soldiers-vs-crows', 'star-vs-doji-star', 'belt-vs-marubozu',
];

/**
 * A run of side-by-side comparisons.
 *
 * The fifth format, and the second one that needs no network — which is what
 * makes it worth having. Everything else that can be generated offline is the
 * candle lesson, so an offline catalogue was one format wearing thirteen hats.
 * This one is generated the same way and answers a different question, so a
 * mixed run stops being a single format with variety bolted on.
 *
 * Six pairs, re-seeded per round, same rotation logic as candlePlan.
 */
export function comparePlan(isoDate, count = 12, locale = 'en') {
  const day = dayIndex(isoDate);
  const jobs = [];
  for (let n = 0; n < count; n += 1) {
    const pair = COMPARE_PAIRS[n % COMPARE_PAIRS.length];
    const round = Math.floor(n / COMPARE_PAIRS.length) + 1;
    jobs.push({
      id: `${locale}-compare-${pair}-v${String(round).padStart(2, '0')}`,
      locale,
      format: 'candle-compare',
      pair,
      seed: day * 1000 + n * 53 + 7,
      label: `${pair.replace(/-/g, ' ')} · ${round}`,
    });
  }
  return jobs;
}

// The seven concepts this tool teaches beyond the single candle. Kept in step
// with BUILDERS in make_concept_lesson.py by hand, for the same reason as
// COMPARE_PAIRS: --dry-run has to print a plan without shelling out to python.
export const CONCEPTS = [
  'fibonacci', 'order-block', 'liquidity-sweep', 'bos-choch',
  'head-shoulders', 'double-bottom', 'sideway',
];

/**
 * A run of concept lessons — the knowledge that is bigger than one candle.
 *
 * Thirteen candlestick patterns is a vocabulary, not an education. What decides
 * a trade is where the pullback ends, where the unfilled orders sit, when the
 * trend actually turned, and what to do when price is going nowhere — and none
 * of that fits inside a single bar. Same storyboard, same honesty about losses,
 * same no-network requirement.
 */
export function conceptPlan(isoDate, count = 14, locale = 'vi') {
  const day = dayIndex(isoDate);
  const jobs = [];
  for (let n = 0; n < count; n += 1) {
    const topic = CONCEPTS[n % CONCEPTS.length];
    const round = Math.floor(n / CONCEPTS.length) + 1;
    jobs.push({
      id: `${locale}-concept-${topic}-v${String(round).padStart(2, '0')}`,
      locale,
      format: 'concept-lesson',
      topic,
      seed: day * 1000 + n * 71 + 13,
      label: `${topic.replace(/-/g, ' ')} · ${round}`,
    });
  }
  return jobs;
}

// Instruments and timeframes the offline map generator knows. Five by three is
// fifteen distinct headers before the seed even changes the price series, which
// is what makes a fifty-map run fifty different maps rather than six repeated.
export const MAP_PAIRS = ['XAU/USD', 'XAG/USD', 'WTI/USD', 'EUR/USD', 'BTC/USD'];
export const MAP_TFS = ['H1', 'H4', 'D1'];

/**
 * A run of market maps, built offline.
 *
 * The daily map on real prices is `planFor` + a network; this is the catalogue
 * version. Everything on it except the price series is still measured — zones,
 * order blocks, gaps, change of character, the plan — because the generator
 * hands a constructed series to the same reader the live one uses. The video
 * says so on screen.
 */
export function mapPlan(isoDate, count = 50, locale = 'vi') {
  const day = dayIndex(isoDate);
  const jobs = [];
  for (let n = 0; n < count; n += 1) {
    const pair = MAP_PAIRS[n % MAP_PAIRS.length];
    const tf = MAP_TFS[Math.floor(n / MAP_PAIRS.length) % MAP_TFS.length];
    const round = Math.floor(n / (MAP_PAIRS.length * MAP_TFS.length)) + 1;
    jobs.push({
      id: `${locale}-map-${pair.split('/')[0].toLowerCase()}-${tf}-v${String(round).padStart(2, '0')}`,
      locale,
      format: 'map-offline',
      pair,
      timeframe: tf,
      seed: day * 1000 + n * 89 + 17,
      label: `${pair} ${tf} · ${round}`,
    });
  }
  return jobs;
}

/**
 * The candlestick-anatomy catalogue: every content once, then a second take.
 *
 * The plain candlePlan cycles thirteen patterns, so a hundred videos is each
 * pattern eight times over. What was asked for is different: a hundred videos
 * built from FIFTY distinct contents, each with two versions to choose between
 * — two takes of one idea, not two ideas.
 *
 * Fifty contents exist now: thirty-three patterns and seventeen comparisons.
 * Version 1 of everything is laid down first, then version 2, so a run that is
 * cut short still covers every content once rather than half of them twice.
 * The two versions of a content differ by seed — different approach leg,
 * different follow-through, different outcome — and, for the lessons, by
 * opening style, so they do not read as the same video twice.
 */
export function anatomyPlan(isoDate, count = 100, locale = 'vi') {
  const day = dayIndex(isoDate);
  const contents = [
    ...PATTERNS.map((pattern) => ({kind: 'lesson', key: pattern})),
    ...COMPARE_PAIRS.map((pair) => ({kind: 'compare', key: pair})),
  ];

  const jobs = [];
  for (let ver = 1; ver <= 2; ver += 1) {
    contents.forEach((c, i) => {
      // Seeds far apart in seed space, so version 2 is a different drawing
      // rather than a neighbouring one.
      const seed = day * 1000 + i * 37 + ver * 5501;
      jobs.push(
        c.kind === 'lesson'
          ? {
              id: `${locale}-nen-${c.key}-v${ver}`,
              locale,
              format: 'candle-lesson',
              pattern: c.key,
              seed,
              label: `${c.key.replace(/-/g, ' ')} · ver ${ver}`,
            }
          : {
              id: `${locale}-sosanh-${c.key}-v${ver}`,
              locale,
              format: 'candle-compare',
              pair: c.key,
              seed,
              label: `so sánh ${c.key.replace(/-/g, ' ')} · ver ${ver}`,
            },
      );
    });
  }
  return jobs.slice(0, count);
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
  // A quarter of the run, capped so a short run still gets one and a long run
  // does not become a comparison channel. Round-robin over six pairs means past
  // about eighteen it starts repeating pairs, which is the point at which more
  // of them stops adding variety.
  const compare = comparePlan(isoDate, Math.min(21, Math.max(1, Math.round(count / 5))), locale);
  const concept = conceptPlan(isoDate, Math.min(21, Math.max(1, Math.round(count / 5))), locale);
  const guests = [];
  // Interleaved with each other first, so trimming does not eat one whole
  // format off the tail — the mistake planFor already had to fix once.
  for (let i = 0; ; i += 1) {
    const before = guests.length;
    if (replay[i]) guests.push(replay[i]);
    if (compare[i]) guests.push(compare[i]);
    if (concept[i]) guests.push(concept[i]);
    if (guests.length === before) break;
  }
  // Never more than three fifths of the run, so the format that can be freshly
  // generated is always in it. Without the cap a twenty-video mix came out with
  // twenty-eight guests available and zero candle lessons — the trim took the
  // whole tail, which is the same failure planFor was already fixed for.
  guests.length = Math.min(guests.length, Math.max(1, Math.round(count * 0.72)));
  const candles = candlePlan(isoDate, Math.max(0, count - guests.length), locale);
  if (!guests.length) return candles.slice(0, count);

  const every = Math.max(1, Math.round(candles.length / guests.length));
  const out = [];
  let r = 0;
  candles.forEach((job, i) => {
    out.push(job);
    if (r < guests.length && (i + 1) % every === 0) out.push(guests[r++]);
  });
  while (r < guests.length) out.push(guests[r++]);
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
