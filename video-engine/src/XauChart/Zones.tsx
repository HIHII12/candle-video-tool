import React from 'react';
import {interpolate} from 'remotion';
import type {Fibonacci, Fvg, OrderBlock} from '../data/types';
import type {Coords} from './useLightweightChart';
import {SAFE} from '../safeArea';
import {CHART_BOX, TV, FONT} from './chartTheme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/**
 * Right-hand limit for markup, in chart coordinates.
 *
 * Not the chart's own width. The platform draws its like / comment / share
 * column down the right of the frame (src/safeArea.ts), and a price label under
 * it is not clipped by us — it is covered, on every phone, which looks the same
 * as being cut off.
 */
const RIGHT_EDGE = CHART_BOX.width - SAFE.right - 14;

// Smart-money annotations. Each zone grows rightward from the candle that
// created it, the same way a trader would drag the box out on a live chart.

export const FvgBox: React.FC<{fvg: Fvg; coords: Coords; reveal: number}> = ({
  fvg,
  coords,
  reveal,
}) => {
  if (reveal <= 0) return null;

  const x0 = coords.indexToX(fvg.startIndex);
  const x1 = interpolate(reveal, [0, 1], [x0, RIGHT_EDGE]);
  const yTop = coords.priceToY(fvg.top);
  const yBottom = coords.priceToY(fvg.bottom);
  const bullish = fvg.kind === 'bullish';
  const color = bullish ? TV.up : TV.down;
  const labelOpacity = interpolate(reveal, [0.55, 1], [0, 1], clamp);

  return (
    <g>
      <rect
        x={x0}
        y={yTop}
        width={Math.max(0, x1 - x0)}
        height={Math.max(2, yBottom - yTop)}
        fill={bullish ? 'rgba(47,210,127,0.15)' : 'rgba(239,68,68,0.15)'}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="6 5"
      />
      <g opacity={labelOpacity}>
        <rect x={x0 + 6} y={Math.max(2, yTop - 34)} width={70} height={30} rx={7} fill={color} />
        <text
          x={x0 + 17}
          y={Math.max(2, yTop - 34) + 22}
          fill="#0b0705"
          fontFamily={FONT}
          fontSize={20}
          fontWeight={800}
        >
          FVG
        </text>
      </g>
    </g>
  );
};

export const OrderBlockBox: React.FC<{ob: OrderBlock; coords: Coords; reveal: number}> = ({
  ob,
  coords,
  reveal,
}) => {
  if (reveal <= 0) return null;

  const x0 = coords.indexToX(ob.index);
  const x1 = interpolate(reveal, [0, 1], [x0, RIGHT_EDGE]);
  const yTop = coords.priceToY(ob.top);
  const yBottom = coords.priceToY(ob.bottom);
  // Violet: orange sat too close to the gold fib lines to tell apart at speed.
  const color = '#8b6cff';
  const labelOpacity = interpolate(reveal, [0.55, 1], [0, 1], clamp);

  return (
    <g>
      <rect
        x={x0}
        y={yTop}
        width={Math.max(0, x1 - x0)}
        height={Math.max(2, yBottom - yTop)}
        fill="rgba(139,108,255,0.15)"
        stroke={color}
        strokeWidth={1.5}
      />
      <g opacity={labelOpacity}>
        {/* Left end, where the block was made. At the right end it sat exactly
            where the trade box prints its TP / SL label. */}
        <rect x={x0 + 4} y={yBottom + 6} width={56} height={30} rx={7} fill={color} />
        <text
          x={x0 + 16}
          y={yBottom + 28}
          fill="#100a24"
          fontFamily={FONT}
          fontSize={20}
          fontWeight={800}
        >
          OB
        </text>
      </g>
    </g>
  );
};

export const FiboLevels: React.FC<{fib: Fibonacci; coords: Coords; reveal: number}> = ({
  fib,
  coords,
  reveal,
}) => {
  if (reveal <= 0) return null;

  const x0 = coords.indexToX(fib.startIndex);
  const gold = '#ffd166';
  // Only the three ratios a retracement entry is actually taken from. All five
  // drew a ladder of lines across the chart that buried the candles.
  const levels = fib.levels.filter((l) => l.ratio === 0.5 || l.ratio === 0.618 || l.ratio === 0.786);

  // The 0.618-0.786 band is where retracement entries are usually taken, so it
  // gets a fill while the other ratios stay as plain reference lines.
  const zone = fib.levels.filter((l) => l.ratio === 0.618 || l.ratio === 0.786);
  const zoneTop = zone.length === 2 ? Math.min(...zone.map((l) => coords.priceToY(l.price))) : 0;
  const zoneBottom = zone.length === 2 ? Math.max(...zone.map((l) => coords.priceToY(l.price))) : 0;
  const zoneReveal = interpolate(reveal, [0.45, 1], [0, 1], clamp);

  return (
    <g>
      {zone.length === 2 && (
        <rect
          x={x0}
          y={zoneTop}
          width={Math.max(0, interpolate(zoneReveal, [0, 1], [x0, RIGHT_EDGE]) - x0)}
          height={Math.max(2, zoneBottom - zoneTop)}
          fill="rgba(255,209,102,0.08)"
        />
      )}

      {levels.map((l, i) => {
        // Levels draw one after another, cheapest way to look hand-drawn.
        const stagger = interpolate(
          reveal,
          [i / levels.length, (i + 1) / levels.length],
          [0, 1],
          clamp,
        );
        if (stagger <= 0) return null;
        const y = coords.priceToY(l.price);
        const emphasis = l.ratio === 0.618;

        return (
          <g key={l.ratio}>
            <line
              x1={x0}
              x2={interpolate(stagger, [0, 1], [x0, RIGHT_EDGE])}
              y1={y}
              y2={y}
              stroke={gold}
              strokeWidth={emphasis ? 2 : 1.2}
              strokeDasharray={emphasis ? undefined : '6 6'}
              opacity={emphasis ? 0.95 : 0.7}
            />
            <text
              x={x0 + 10}
              y={y - 10}
              fill={gold}
              fontFamily={FONT}
              fontSize={emphasis ? 22 : 19}
              fontWeight={800}
              opacity={interpolate(stagger, [0.6, 1], [0, 1], clamp)}
            >
              {l.ratio.toFixed(3)}
            </text>
          </g>
        );
      })}
    </g>
  );
};
