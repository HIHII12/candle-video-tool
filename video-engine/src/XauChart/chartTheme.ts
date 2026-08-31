// Short-form palette: saturated enough to read at thumbnail size on a phone,
// which is why it departs from TradingView's muted desktop teal/rose.
export const TV = {
  bg: '#0a0e1a',
  bgTop: '#131a2e',
  up: '#00e05f',
  down: '#ff2b2b',
  text: '#ffffff',
  textDim: 'rgba(255,255,255,0.5)',
  banner: '#ffe000',
  level: '#ffe000',
  support: '#00e05f',
  resistance: '#ff2b2b',
  profitFill: 'rgba(0,224,95,0.22)',
  lossFill: 'rgba(255,43,43,0.22)',
} as const;

import {DISPLAY_FONT} from '../fonts';

export const FONT = DISPLAY_FONT;

// Chart canvas fills the middle band; axes are hidden so candles are the hero.
/**
 * Where the candles are drawn — with margins, deliberately.
 *
 * This used to be the full 1080 wide, flush to both frame edges, and it was the
 * single worst thing about the format on a phone. The newest candles — the ones
 * a "buy or sell" question is actually about — sat under the platform's like /
 * comment / share column, and the outermost bars were sliced by the frame edge,
 * which reads as a broken export rather than a design choice. Meanwhile 300px
 * of empty frame sat below the chart doing nothing.
 *
 * So: 26px clear of the left edge, 114px clear of the right (the button column
 * starts around 970), and the height grown into the dead band underneath. The
 * chart is 13% narrower and 18% taller, and nothing in it is cut or covered.
 */
export const CHART_BOX = {
  left: 26,
  top: 470,
  width: 940,
  height: 1160,
} as const;

// Heavy outline keeps big text legible over candles of any colour.
export const stroke = (px: number, color = '#000') => ({
  WebkitTextStroke: `${px}px ${color}`,
  paintOrder: 'stroke fill',
} as const);
