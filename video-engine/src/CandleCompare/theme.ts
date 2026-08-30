import {SAFE} from '../safeArea';
import {ramp} from '../camera';

/**
 * The comparison format.
 *
 * Two charts, one above the other, and a single measurement drawn on both at
 * the same moment. Everything about the layout follows from that: the two panes
 * have to be the same size or the eye reads one as more important, and the band
 * that names the difference has to sit between them, where the comparison is
 * actually happening.
 */
export const KT = {
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
  /** The measurement being compared — one colour, used nowhere else. */
  measure: '#5eb3ff',
} as const;

const PANE_H = 470;

export const KLAYOUT = {
  headerTop: 78,
  /** Top pane. */
  a: {left: 0, top: 330, width: 1080, height: PANE_H},
  /** Bottom pane, the same size to the pixel. */
  b: {left: 0, top: 880, width: 1080, height: PANE_H},
  /** Between the panes: where the difference is named. */
  seamTop: 330 + PANE_H + 18,
  /** Under both: the verdict. */
  verdictTop: 1400,
  readableBottom: 1920 - SAFE.bottom,
  disclaimerY: 1862,
} as const;

export const KLAYER = {chart: 0, marks: 10, overlay: 20} as const;

export const COMPARE_DURATION = 2100;

export const KB = {
  title: [0, 150] as const,
  /** The top chart draws in. */
  drawA: [110, 520] as const,
  /** Then the bottom one, so they are read in order rather than at once. */
  drawB: [520, 900] as const,
  /** "These look the same" — both lit, nothing measured yet. */
  same: [930, 1180] as const,
  /** The one measurement, drawn on both at the same instant. */
  diff: [1210, 1560] as const,
  /** What each one turns out to be. */
  verdict: [1600, 1900] as const,
  /** Why getting it wrong costs something. */
  why: [1900, 2100] as const,
};

export const kramp = (frame: number, range: readonly [number, number]) =>
  ramp(frame, range[0], range[1]);
