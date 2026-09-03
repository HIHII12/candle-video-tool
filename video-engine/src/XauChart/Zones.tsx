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
        fill={bullish ? 'rgba(0,224,95,0.26)' : 'rgba(255,43,43,0.26)'}
        stroke={color}
        strokeWidth={3}
        strokeDasharray="10 8"
      />
      <g opacity={labelOpacity}>
        <rect x={x0 + 8} y={yTop - 46} width={116} height={40} rx={8} fill={color} />
        <text
          x={x0 + 22}
          y={yTop - 17}
          fill="#06110d"
          fontFamily={FONT}
          fontSize={28}
          fontWeight={900}
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
        fill="rgba(139,108,255,0.22)"
        stroke={color}
        strokeWidth={3}
      />
      <g opacity={labelOpacity}>
        <rect x={x1 - 108} y={yBottom + 8} width={100} height={40} rx={8} fill={color} />
        <text
          x={x1 - 94}
          y={yBottom + 37}
          fill="#100a24"
          fontFamily={FONT}
          fontSize={28}
          fontWeight={900}
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
          fill="rgba(255,209,102,0.11)"
        />
      )}

      {fib.levels.map((l, i) => {
        // Levels draw one after another, cheapest way to look hand-drawn.
        const stagger = interpolate(
          reveal,
          [i / fib.levels.length, (i + 1) / fib.levels.length],
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
              strokeWidth={emphasis ? 4 : 2}
              strokeDasharray={emphasis ? undefined : '8 8'}
              opacity={emphasis ? 1 : 0.72}
            />
            <text
              x={x0 + 10}
              y={y - 10}
              fill={gold}
              fontFamily={FONT}
              fontSize={emphasis ? 30 : 24}
              fontWeight={900}
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
