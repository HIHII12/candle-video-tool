import {DISPLAY_FONT, TEXT_FONT} from '../fonts';

/**
 * Light-ground palette for the map format.
 *
 * The two dark formats compete in a feed by shouting. A map has to be studied
 * instead — it carries five labelled bands, two markers and a plan line at once
 * — so the ground is near-white and every mark earns its contrast. The one
 * saturated colour is the blue of the plan, which is the thing the viewer is
 * meant to follow.
 */
export const MT = {
  bg: '#eceff3',
  bgTop: '#f6f8fa',
  ink: '#10161d',
  inkSoft: 'rgba(16,22,29,0.58)',
  inkFaint: 'rgba(16,22,29,0.30)',
  rule: 'rgba(16,22,29,0.14)',
  up: '#0f8a68',
  down: '#c02a4c',
  // The plan. Nothing else in the frame is allowed to use it.
  plan: '#1c5cff',
  planSoft: 'rgba(28,92,255,0.13)',
  liquidity: '#7a3df5',
  ob: '#0f6fd8',
  gap: '#e08a00',
} as const;

export const MFONT = DISPLAY_FONT;
export const MTEXT = TEXT_FONT;

// Pulled up from 430 and made taller: the header only needs ~300px, and the gap
// under it read as the chart having been dropped into the frame carelessly.
export const MAP_BOX = {
  left: 0,
  top: 320,
  width: 1080,
  height: 1200,
} as const;

export const MAP_DURATION = 2100;

/**
 * Beats. The map is built in the order a trader reads one: price first, then the
 * line it is respecting, then the levels, then what changed, then the plan.
 */
export const MB = {
  title: [0, 150] as const,
  candles: [70, 560] as const,
  trend: [600, 730] as const,
  zones: [770, 1250] as const, // bands land one at a time
  choch: [1290, 1410] as const,
  path: [1450, 1810] as const, // the plan draws into the empty space
  summary: [1850, 2100] as const,
};

export const mramp = (frame: number, range: readonly [number, number]) => {
  const [a, b] = range;
  if (frame <= a) return 0;
  if (frame >= b) return 1;
  return (frame - a) / (b - a);
};

export const mease = (t: number) => t * t * (3 - 2 * t);

/**
 * Per-zone reveal progress. Bands share one beat but land in sequence, so each
 * gets its own slice with a slight overlap — landing them all at once gives the
 * viewer five things to read simultaneously and none of them get read.
 */
export const zoneProgress = (frame: number, i: number, total: number) => {
  const [a, b] = MB.zones;
  const each = (b - a) / Math.max(1, total);
  const start = a + each * i;
  return mramp(frame, [start, start + each * 1.4] as const);
};

/** Candles on screen at a given frame. */
export const mapShownAt = (total: number, frame: number) => {
  // Opens part-drawn, for the same reason the other formats do: frame 0 used to
  // be a blank chart.
  const OPEN_AT = 0.55;
  const t = OPEN_AT + (1 - OPEN_AT) * mease(mramp(frame, MB.candles));
  return Math.max(1, Math.round(t * total));
};

export const zoneColor = (kind: 'liquidity' | 'ob' | 'gap') =>
  kind === 'liquidity' ? MT.liquidity : kind === 'ob' ? MT.ob : MT.gap;

// Narration, one line per beat, in the order the map is built.
export const MAP_STEPS: {from: number; text: string}[] = [
  {from: MB.trend[0], text: 'The line price has been respecting'},
  {from: MB.zones[0], text: 'Where the liquidity is resting'},
  {from: MB.choch[0], text: 'Where structure changed character'},
  {from: MB.path[0], text: 'The plan · not a prediction'},
];
