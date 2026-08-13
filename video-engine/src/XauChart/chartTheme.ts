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
export const CHART_BOX = {
  left: 0,
  top: 540,
  width: 1080,
  height: 980,
} as const;

// Heavy outline keeps big text legible over candles of any colour.
export const stroke = (px: number, color = '#000') => ({
  WebkitTextStroke: `${px}px ${color}`,
  paintOrder: 'stroke fill',
} as const);
