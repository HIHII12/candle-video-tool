import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import type {Candle} from '../data/types';
import type {PriceScale} from './geometry';
import {isBull} from './geometry';
import {THEME} from './theme';

// One candle. `appear` is a 0..1 progress that grows the candle from its
// open price outward, so the series looks like it is being drawn live.
export const Candlestick: React.FC<{
  candle: Candle;
  index: number;
  scale: PriceScale;
  frame: number;
  appearFrame: number;
}> = ({candle, index, scale, frame, appearFrame}) => {
  const {fps} = useVideoConfig();
  const local = frame - appearFrame;
  if (local < 0) return null;

  const grow = spring({frame: local, fps, config: {damping: 200}, durationInFrames: 10});

  const x = scale.indexToX(index);
  const bull = isBull(candle);
  const color = bull ? THEME.bull : THEME.bear;

  const yOpen = scale.priceToY(candle.open);
  const yClose = scale.priceToY(candle.close);
  const yHigh = scale.priceToY(candle.high);
  const yLow = scale.priceToY(candle.low);

  // Body grows from the open price toward the close price.
  const bodyTopFull = Math.min(yOpen, yClose);
  const bodyBottomFull = Math.max(yOpen, yClose);
  const bodyH = Math.max(2, (bodyBottomFull - bodyTopFull) * grow);
  const bodyTop = bull ? yOpen - bodyH : yOpen;

  // Wick grows from the body outward.
  const wickTop = interpolate(grow, [0, 1], [yOpen, yHigh]);
  const wickBottom = interpolate(grow, [0, 1], [yOpen, yLow]);

  const w = scale.candleWidth;

  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={wickTop}
        y2={wickBottom}
        stroke={color}
        strokeWidth={Math.max(1.5, w * 0.14)}
      />
      <rect
        x={x - w / 2}
        y={bodyTop}
        width={w}
        height={bodyH}
        rx={2}
        fill={color}
      />
    </g>
  );
};
