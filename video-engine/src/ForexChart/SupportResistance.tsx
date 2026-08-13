import React from 'react';
import {interpolate} from 'remotion';
import type {Level} from '../data/types';
import type {PriceScale} from './geometry';
import {CHART} from './geometry';
import {THEME, FONT} from './theme';

// A horizontal dashed level line that draws itself left-to-right.
export const SupportResistance: React.FC<{
  level: Level;
  scale: PriceScale;
  drawProgress: number; // 0..1
}> = ({level, scale, drawProgress}) => {
  const y = scale.priceToY(level.price);
  const color = level.kind === 'support' ? THEME.support : THEME.resistance;
  const endX = interpolate(drawProgress, [0, 1], [CHART.x, CHART.x + CHART.width]);
  const labelOpacity = interpolate(drawProgress, [0.7, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <g>
      <line
        x1={CHART.x}
        x2={endX}
        y1={y}
        y2={y}
        stroke={color}
        strokeWidth={3}
        strokeDasharray="14 10"
      />
      <g opacity={labelOpacity}>
        <rect
          x={CHART.x + CHART.width - 190}
          y={y - 34}
          width={180}
          height={30}
          rx={6}
          fill={color}
        />
        <text
          x={CHART.x + CHART.width - 100}
          y={y - 13}
          fill="#08111a"
          fontFamily={FONT}
          fontSize={20}
          fontWeight={700}
          textAnchor="middle"
        >
          {level.label} {Math.round(level.price)}
        </text>
      </g>
    </g>
  );
};
