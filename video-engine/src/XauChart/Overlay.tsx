import React from 'react';
import {strings, type Locale} from '../i18n';
import {interpolate} from 'remotion';
import type {ForexChartProps} from '../data/types';
import type {Coords} from './useLightweightChart';
import {CHART_BOX, TV, FONT} from './chartTheme';
import {pillWidth} from '../textWidth';

// Chart annotations drawn on top of the lightweight-charts canvas. The chart
// engine owns the candles; these are the "trader marking up the screen" bits.

export const LevelLine: React.FC<{
  price: number;
  label: string;
  locale?: Locale;
  kind: 'support' | 'resistance';
  coords: Coords;
  progress: number;
}> = ({price, label, kind, coords, progress, locale}) => {
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
        strokeWidth={2.5}
        strokeDasharray="14 9"
        strokeLinecap="round"
      />
      {(() => {
        // Sized from the text, not from a constant. At a fixed 310 the
        // Vietnamese "Kháng cự 4151.5" ran past the end of its own pill, and
        // since the text is dark and the pill is the only thing behind it, the
        // overflowing characters landed on the chart background and vanished.
        const text = `${strings(locale).term(label)} ${price.toFixed(1)}`;
        const w = pillWidth(text, 25, 14);
        // Above the line, unless that would put it off the top of the chart —
        // the canvas clips nothing, but the header band sits right there.
        const top = y - 46 < 6 ? y + 8 : y - 46;
        return (
          <g opacity={labelOpacity}>
            <rect x={14} y={top} width={w} height={38} rx={8} fill={color} />
            <text
              x={28}
              y={top + 27}
              fill="#0b0705"
              fontFamily={FONT}
              fontSize={25}
              fontWeight={800}
            >
              {text}
            </text>
          </g>
        );
      })()}
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
  // Widest label is the R:R plate at 230px; keep it inside the box.
  const labelX = Math.min(xStart + 10, CHART_BOX.width - 200);

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
      <line x1={xStart} x2={xEnd} y1={yTarget} y2={yTarget} stroke={TV.up} strokeWidth={2.5} />
      <line x1={xStart} x2={xEnd} y1={yStop} y2={yStop} stroke={TV.down} strokeWidth={2.5} />
      <line
        x1={xStart}
        x2={xEnd}
        y1={yEntry}
        y2={yEntry}
        stroke={TV.text}
        strokeWidth={1.4}
        strokeDasharray="5 6"
        opacity={0.8}
      />

      <g opacity={labelOpacity} fontFamily={FONT}>
        {/* Labels start at the entry bar and run right, so an entry near the
            newest candle pushed "SL 2220.0" past the box and under the like
            button. Pulled left until the widest label fits. */}
        {/* Outside the box, beyond its line: inside, the label landed on the
            candles and on any zone drawn in the same price range. */}
        <text x={labelX} y={yTarget > yEntry ? yTarget + 30 : yTarget - 10} fill={TV.up} fontSize={27} fontWeight={800} stroke="#0f0a07" strokeWidth={6} paintOrder="stroke" strokeLinejoin="round">
          TP {rr.target.toFixed(1)}
        </text>
        <text x={labelX} y={yStop > yEntry ? yStop + 30 : yStop - 10} fill={TV.down} fontSize={27} fontWeight={800} stroke="#0f0a07" strokeWidth={6} paintOrder="stroke" strokeLinejoin="round">
          SL {rr.stop.toFixed(1)}
        </text>
        <rect
          x={labelX}
          y={yEntry + 10}
          width={176}
          height={42}
          rx={8}
          fill="rgba(15,10,7,0.88)"
          stroke="rgba(255,247,234,0.25)"
          strokeWidth={1}
        />
        <text x={labelX + 14} y={yEntry + 40} fill={TV.text} fontSize={27} fontWeight={800}>
          R:R 1:{ratio.toFixed(1)}
        </text>
      </g>
    </g>
  );
};
