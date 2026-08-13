import {DISPLAY_FONT} from '../fonts';

// Light theme, mirroring the reference channel: white page, TradingView's
// light-mode candle colours, black structure lines. The contrast inverts, so
// text strokes are white here rather than black.
export const LT = {
  bg: '#ffffff',
  up: '#0f8a68',
  down: '#b0123c',
  ink: '#0b0f14',
  inkSoft: 'rgba(11,15,20,0.55)',
  highlight: '#ffe57a',
  structure: '#0b0f14',
  ob: '#6b4dff',
  profit: 'rgba(15,138,104,0.16)',
  loss: 'rgba(176,18,60,0.16)',
} as const;

// Weight carries the hierarchy here too; a faked bold reads as sloppy at 1080px.
export const LFONT = DISPLAY_FONT;

export const LESSON_BOX = {
  left: 0,
  top: 470,
  width: 1080,
  height: 1000,
} as const;

// 35 seconds at 60fps. One concept per beat, in the order a trader would
// build the chart up: structure, formation, trigger, entry zone, then the trade.
export const LESSON_DURATION = 2100;

export const LSB = {
  title: [0, 190] as const,
  replay: [60, 560] as const,
  structure: [600, 800] as const, // zigzag path
  labels: [820, 950] as const, // shoulder / head naming
  neckline: [980, 1090] as const,
  ob: [1120, 1250] as const, // entry zone
  trade: [1280, 1420] as const, // stop + measured-move target
  reveal: [1470, 1830] as const,
  result: [1870, 2100] as const,
};

export const lramp = (frame: number, range: readonly [number, number]) => {
  const [a, b] = range;
  if (frame <= a) return 0;
  if (frame >= b) return 1;
  return (frame - a) / (b - a);
};

// Steps narrated at the bottom of the frame, one per markup beat.
export const STEPS: {from: number; text: string}[] = [
  {from: LSB.structure[0], text: '1 · Map the market structure'},
  {from: LSB.labels[0], text: '2 · Name the formation'},
  {from: LSB.neckline[0], text: '3 · Mark the neckline trigger'},
  {from: LSB.ob[0], text: '4 · Order block = entry zone'},
  {from: LSB.trade[0], text: '5 · Stop beyond the shoulder, target the measured move'},
  {from: LSB.reveal[0], text: 'What happened next?'},
];
