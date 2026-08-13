import React from 'react';
import {interpolate} from 'remotion';
import type {ForexChartProps} from '../data/types';
import type {Coords} from './useLightweightChart';
import {CHART_BOX, TV, FONT} from './chartTheme';

// Chart annotations drawn on top of the lightweight-charts canvas. The chart
// engine owns the candles; these are the "trader marking up the screen" bits.

export const LevelLine: React.FC<{
  price: number;
  label: string;
  kind: 'support' | 'resistance';
  coords: Coords;
  progress: number;
}> = ({price, label, kind, coords, progress}) => {
  if (progress <= 0) return null;
  const y = coords.priceToY(price);
  const color = kind === 'support' ? TV.support : TV.resistance;
  const endX = interpolate(progress, [0, 1], [0, CHART_BOX.width - 120]);
  const labelOpacity = interpolate(progress, [0.65, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <g>
      <line
        x1={0}
        x2={endX}
        y1={y}
        y2={y}
        stroke={color}
        strokeWidth={6}
        strokeDasharray="22 14"
      />
      <g opacity={labelOpacity}>
        <rect x={16} y={y - 56} width={310} height={46} rx={9} fill={color} />
        <text
          x={34}
          y={y - 21}
          fill="#06110d"
          fontFamily={FONT}
          fontSize={32}
          fontWeight={900}
        >
          {label} {price.toFixed(1)}
        </text>
      </g>
    </g>
  );
};

export const PositionBox: React.FC<{
  rr: NonNullable<ForexChartProps['riskReward']>;
  coords: Coords;
  reveal: number;
}> = ({rr, coords, reveal}) => {
  if (reveal <= 0) return null;

  const xStart = coords.indexToX(rr.entryIndex);
  const xEnd = interpolate(reveal, [0, 1], [xStart, CHART_BOX.width - 120]);
  const width = Math.max(0, xEnd - xStart);

  const yEntry = coords.priceToY(rr.entry);
  const yStop = coords.priceToY(rr.stop);
  const yTarget = coords.priceToY(rr.target);

  const ratio =
    Math.abs(rr.target - rr.entry) / Math.max(1e-6, Math.abs(rr.stop - rr.entry));
  const labelOpacity = interpolate(reveal, [0.7, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <g>
      <rect
        x={xStart}
        y={Math.min(yEntry, yTarget)}
        width={width}
        height={Math.abs(yTarget - yEntry)}
        fill={TV.profitFill}
      />
      <rect
        x={xStart}
        y={Math.min(yEntry, yStop)}
        width={width}
        height={Math.abs(yStop - yEntry)}
        fill={TV.lossFill}
      />
      <line x1={xStart} x2={xEnd} y1={yTarget} y2={yTarget} stroke={TV.up} strokeWidth={4} />
      <line x1={xStart} x2={xEnd} y1={yStop} y2={yStop} stroke={TV.down} strokeWidth={4} />
      <line
        x1={xStart}
        x2={xEnd}
        y1={yEntry}
        y2={yEntry}
        stroke={TV.text}
        strokeWidth={2}
        strokeDasharray="7 7"
      />

      <g opacity={labelOpacity} fontFamily={FONT}>
        <text x={xStart + 12} y={yTarget - 12} fill={TV.up} fontSize={34} fontWeight={900}>
          TP {rr.target.toFixed(1)}
        </text>
        <text x={xStart + 12} y={yStop + 30} fill={TV.down} fontSize={34} fontWeight={900}>
          SL {rr.stop.toFixed(1)}
        </text>
        <rect
          x={xStart + 12}
          y={yEntry + 14}
          width={230}
          height={54}
          rx={8}
          fill="rgba(12,13,16,0.85)"
        />
        <text x={xStart + 26} y={yEntry + 44} fill={TV.text} fontSize={36} fontWeight={900}>
          R:R 1:{ratio.toFixed(1)}
        </text>
      </g>
    </g>
  );
};

export const Cursor: React.FC<{x: number; y: number; opacity: number; pressed: boolean}> = ({
  x,
  y,
  opacity,
  pressed,
}) => (
  <g transform={`translate(${x}, ${y})`} opacity={opacity}>
    {pressed && <circle cx={0} cy={0} r={24} fill="rgba(255,214,10,0.28)" />}
    <path
      d="M0 0 L0 29 L8 21.5 L13.5 33 L18.5 31 L13 19.5 L23 19.5 Z"
      fill="#ffffff"
      stroke="#0c0d10"
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </g>
);
