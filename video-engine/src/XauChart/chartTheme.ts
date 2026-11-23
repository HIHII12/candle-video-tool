// Short-form palette: saturated enough to read at thumbnail size on a phone,
// which is why it departs from TradingView's muted desktop teal/rose.
// Lo ren: nen den am cua bep than, vang nung cho moi thu thuoc ve thuong hieu,
// than hong cho diem nhan. Nen giu xanh / do — nguoi xem doc nen bang mau truoc
// khi doc bang mat, doi mau la bat ho hoc lai — nhung ha bot do ruc neon de
// khong danh nhau voi vang.
export const TV = {
  bg: '#0f0a07',
  bgTop: '#21150c',
  up: '#2fd27f',
  down: '#ef4444',
  text: '#fff7ea',
  textDim: 'rgba(255,247,234,0.5)',
  banner: '#f5b83d',
  level: '#f5b83d',
  gold: '#f5b83d',
  goldHot: '#ffd98a',
  ember: '#ff7a1a',
  support: '#2fd27f',
  resistance: '#ef4444',
  profitFill: 'rgba(47,210,127,0.20)',
  lossFill: 'rgba(239,68,68,0.20)',
} as const;

import {DISPLAY_FONT} from '../fonts';
import {SAFE} from '../safeArea';

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
// Height was 1160, which ran the chart's own box down to y=1630 — a hundred
// pixels into the caption bar. It now stops exactly on the readable line.
export const CHART_BOX = {
  left: 26,
  // 540, not 470: the band above now carries the brand header, the BUY / SELL
  // pills and the price line, in that order, and needs the room.
  top: 540,
  // 900, not 940: at 940 the box ended at x=966, past the button column at
  // 950, and the stop / target labels printed under the like button.
  width: 900,
  height: 1920 - SAFE.bottom - 540,
} as const;

// Heavy outline keeps big text legible over candles of any colour.
export const stroke = (px: number, color = '#000') => ({
  WebkitTextStroke: `${px}px ${color}`,
  paintOrder: 'stroke fill',
} as const);
