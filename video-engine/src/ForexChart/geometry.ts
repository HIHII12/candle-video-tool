import type {Candle, ForexChartProps} from '../data/types';

// Chart drawing region inside the 1080x1920 frame.
export const CHART = {
  x: 60,
  y: 430,
  width: 960,
  height: 1180,
} as const;

export type PriceScale = {
  priceToY: (price: number) => number;
  indexToX: (index: number) => number;
  candleWidth: number;
  min: number;
  max: number;
};

// Build a price<->pixel scale that fits every candle, level and R/R price,
// with a little vertical padding so nothing touches the edges.
export const buildScale = (props: ForexChartProps): PriceScale => {
  const prices: number[] = [];
  for (const c of props.candles) {
    prices.push(c.high, c.low);
  }
  for (const l of props.levels) prices.push(l.price);
  if (props.riskReward) {
    prices.push(props.riskReward.entry, props.riskReward.stop, props.riskReward.target);
  }

  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const pad = (rawMax - rawMin) * 0.08 || 1;
  const min = rawMin - pad;
  const max = rawMax + pad;

  const priceToY = (price: number) =>
    CHART.y + (1 - (price - min) / (max - min)) * CHART.height;

  const n = props.candles.length;
  const slot = CHART.width / n;
  const candleWidth = Math.max(4, slot * 0.62);
  const indexToX = (index: number) => CHART.x + slot * (index + 0.5);

  return {priceToY, indexToX, candleWidth, min, max};
};

export const isBull = (c: Candle) => c.close >= c.open;
