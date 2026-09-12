import {SAFE} from '../safeArea';
import {TEXT_FONT} from '../fonts';

export const LFONT = TEXT_FONT;

export const LT = {
  bg: '#0b1219',
  bgTop: '#111b25',
  panel: '#16212c',
  ink: '#e8eef5',
  inkSoft: '#8fa0b0',
  accent: '#e0b13c',
  up: '#28c07e',
  down: '#e8574c',
  line: '#26333f',
} as const;

export const LDURATION = 2100;

/**
 * Beats.
 *
 * The answer lands at frame 860 — fourteen seconds into thirty-five, inside the
 * first half. Every other format on this channel holds its payoff until second
 * thirty, which is backwards for a feed ranked on whether people finish: a
 * viewer who has already been paid stays for the working, a viewer still
 * waiting scrolls. The explanation is what fills the back half here, not the
 * suspense.
 */
export const LB = {
  hook: [0, 120] as const,
  /** The three inputs arrive one at a time, so each is actually read. */
  soDu: [120, 240] as const,
  ruiRo: [230, 350] as const,
  stop: [340, 470] as const,
  /** The question. */
  hoi: [480, 560] as const,
  /** Three, two, one. */
  dem: [570, 860] as const,
  /** The answer. */
  dap: [860, 980] as const,
  /** Three lines of working, one at a time. */
  buoc: [940, 1520] as const,
  /** What the wrong size would have cost. */
  gia: [1500, 1880] as const,
  /** Broker specs differ — said last, and said plainly. */
  luu: [1890, 2100] as const,
} as const;

export const LLAYOUT = {
  headerTop: 90,
  /** The three inputs sit here as a stack of rows. */
  soTop: 380,
  /** The answer, dead centre — it is the thing the video exists to deliver. */
  dapTop: 880,
  /** Working, under the answer. */
  buocTop: 1180,
  /** Bang gia chay — nam sau chu, lam nen dong cho ca video. */
  giaTop: 668,
  giaCao: 196,
  readableBottom: 1920 - SAFE.bottom,
  disclaimerY: 1862,
} as const;

export const LLAYER = {base: 0, overlay: 20} as const;

export const lramp = (frame: number, range: readonly [number, number]) => {
  const [a, b] = range;
  if (frame <= a) return 0;
  if (frame >= b) return 1;
  return (frame - a) / (b - a);
};
