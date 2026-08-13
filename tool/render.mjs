#!/usr/bin/env node
/**
 * One command that turns an option into an MP4.
 *
 * The GitHub Action and the Windows/macOS launchers all call this, so the
 * mapping from "which video do I want" to "which script and which composition"
 * lives in exactly one place.
 *
 *   node tool/render.mjs --format candle-lesson --pattern hammer
 *   node tool/render.mjs --format buy-or-sell-quiz --outcome TP
 *   node tool/render.mjs --list
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = join(ROOT, 'video-engine');

// Single source of truth for the daily plan too — tool/variants.mjs imports it,
// so adding a pattern in one place is enough.
import { PATTERNS } from './variants.mjs';

const FORMATS = {
  'candle-lesson': 'Teaches one candlestick pattern on a constructed series',
  'buy-or-sell-quiz': 'Real gold data, viewer picks a side, withheld candles reveal it',
  'named-setup': 'Market structure, chart formation and order block',
  'market-map': 'Forward-looking: liquidity levels, CHoCH and the plan around them',
};

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

if (args.includes('--list') || args.includes('-h') || args.includes('--help')) {
  console.log('\nFormats:');
  for (const [k, v] of Object.entries(FORMATS)) console.log(`  ${k.padEnd(18)} ${v}`);
  console.log('\nPatterns (candle-lesson only):');
  for (const p of PATTERNS) console.log(`  ${p}`);
  console.log('\nExample:\n  node tool/render.mjs --format candle-lesson --pattern hammer\n');
  process.exit(0);
}

const format = flag('format', 'candle-lesson');
const pattern = flag('pattern', 'bullish-engulfing');
const outcome = flag('outcome', 'any');

if (!(format in FORMATS)) {
  console.error(`Unknown format "${format}". Run with --list to see the options.`);
  process.exit(1);
}
if (format === 'candle-lesson' && !PATTERNS.includes(pattern)) {
  console.error(`Unknown pattern "${pattern}". Run with --list to see the options.`);
  process.exit(1);
}

const run = (cmd, cmdArgs) => {
  console.log(`\n$ ${cmd} ${cmdArgs.join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, { cwd: ENGINE, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`\nFailed: ${cmd} exited with ${r.status ?? 'a signal'}.`);
    process.exit(r.status || 1);
  }
};

if (!existsSync(join(ENGINE, 'node_modules'))) {
  console.log('First run — installing dependencies. This takes a minute.');
  run('npm', ['install']);
}

const python = process.platform === 'win32' ? 'python' : 'python3';
let composition, props, name;

if (format === 'candle-lesson') {
  run(python, ['scripts/make_candle_lesson.py', '--pattern', pattern]);
  composition = 'CandleLesson';
  props = `./src/data/lesson_${pattern}.json`;
  name = pattern;
} else if (format === 'market-map') {
  // No withheld candles here, so no outcome and no --judge: the map shows every
  // bar it has and reserves empty space on the right for the plan.
  run(python, ['scripts/make_market_map.py', '--interval', '1h', '--timeframe', 'H1',
    '--range', '3mo', '--out', 'src/data/run_map.json']);
  composition = 'MarketMap';
  props = './src/data/run_map.json';
  name = 'market-map';
} else {
  const judge = format === 'named-setup' ? 'pattern' : 'channel';
  const out = format === 'named-setup' ? 'run_lesson.json' : 'run_quiz.json';
  run(python, ['scripts/fetch_gold.py', '--outcome', outcome, '--judge', judge,
    '--range', '60d', '--out', `src/data/${out}`]);
  composition = format === 'named-setup' ? 'LessonShort' : 'XauChart';
  props = `./src/data/${out}`;
  name = `${format}-${outcome}`;
}

mkdirSync(join(ENGINE, 'out'), { recursive: true });
const target = `out/${name}.mp4`;
console.log(`\nRendering ${composition} → ${target}. Expect roughly four minutes.`);
run('npx', ['remotion', 'render', composition, target, `--props=${props}`,
    ...(process.env.REMOTION_BROWSER ? [`--browser-executable=${process.env.REMOTION_BROWSER}`] : [])]);

console.log(`\nDone. The video is at video-engine/${target}`);
