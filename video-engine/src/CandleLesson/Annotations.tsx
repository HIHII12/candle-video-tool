import React from 'react';
import {interpolate} from 'remotion';
import type {Anatomy, Candle, CandleLessonProps, RiskReward} from '../data/types';
import type {Coords} from '../XauChart/useLightweightChart';
import {SAFE} from '../safeArea';
import {strings, type Locale} from '../i18n';
import {CHART, CFONT, CT, cramp} from './theme';

/** Right-hand limit for anything the viewer has to read. */
const READ_RIGHT = CHART.width - SAFE.right;
/** Keep labels off the exact top and bottom edges of the chart box. */
const clampY = (y: number) => Math.max(30, Math.min(CHART.height - 26, y));

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Dims everything outside the pattern instead of highlighting the pattern.
 * Two scrims are cheaper than compositing a glow, and darkening the
 * surroundings is what actually directs the eye.
 */
export const Spotlight: React.FC<{
  coords: Coords;
  from: number;
  to: number;
  opacity: number;
}> = ({coords, from, to, opacity}) => {
  if (opacity <= 0) return null;
  const xa = coords.indexToX(Math.max(0, from));
  const xb = coords.indexToX(to);
  const edge = 26;
  const feather = 90;

  const leftWidth = Math.max(0, xa - edge);
  const rightStart = xb + edge;
  const rightWidth = Math.max(0, CHART.width - rightStart);

  return (
    <g opacity={opacity}>
      <defs>
        <linearGradient id="spot-l" gradientUnits="userSpaceOnUse" x1={0} x2={leftWidth} y1={0} y2={0}>
          <stop offset="0" stopColor={CT.scrim} stopOpacity={1} />
          <stop offset={Math.max(0, 1 - feather / Math.max(1, leftWidth))} stopColor={CT.scrim} stopOpacity={1} />
          <stop offset="1" stopColor={CT.scrim} stopOpacity={0} />
        </linearGradient>
        <linearGradient
          id="spot-r"
          gradientUnits="userSpaceOnUse"
          x1={rightStart}
          x2={rightStart + rightWidth}
          y1={0}
          y2={0}
        >
          <stop offset="0" stopColor={CT.scrim} stopOpacity={0} />
          <stop offset={Math.min(1, feather / Math.max(1, rightWidth))} stopColor={CT.scrim} stopOpacity={1} />
          <stop offset="1" stopColor={CT.scrim} stopOpacity={1} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={leftWidth} height={CHART.height} fill="url(#spot-l)" />
      <rect x={rightStart} y={0} width={rightWidth} height={CHART.height} fill="url(#spot-r)" />
    </g>
  );
};

const partExtent = (candle: Candle, part: Anatomy['part']) => {
  const bodyTop = Math.max(candle.open, candle.close);
  const bodyBottom = Math.min(candle.open, candle.close);
  if (part === 'body') return [bodyBottom, bodyTop] as const;
  if (part === 'upperWick') return [bodyTop, candle.high] as const;
  return [candle.low, bodyBottom] as const;
};

/**
 * Names the parts of the decisive candle: a hairline bracket marking the
 * extent, a leader out to a label. Labels are pushed apart vertically so a
 * doji — whose three parts nearly coincide — stays readable.
 */
export const AnatomyLabels: React.FC<{
  props: CandleLessonProps;
  coords: Coords;
  progress: number;
  opacity: number;
}> = ({props, coords, progress, opacity}) => {
  if (progress <= 0 || opacity <= 0) return null;

  const items = props.anatomy.map((a) => {
    const candle = props.candles[a.index];
    const [lo, hi] = partExtent(candle, a.part);
    const yLo = coords.priceToY(lo);
    const yHi = coords.priceToY(hi);
    return {
      a,
      x: coords.indexToX(a.index),
      yTop: Math.min(yLo, yHi),
      yBottom: Math.max(yLo, yHi),
      mid: (yLo + yHi) / 2,
    };
  });

  /**
   * Which side the labels go on.
   *
   * They were always placed to the right of the candle, which is fine until the
   * pattern is one of the last bars on screen — then the leader lines ran into
   * the Shorts button column and the text ran off the frame. Deciding per video
   * costs one comparison and removes a whole class of clipped label.
   */
  const anchorX = items.length ? items[0].x : 0;
  const LABEL_RUN = 330;
  const toLeft = anchorX + LABEL_RUN > READ_RIGHT;

  // Resolve label collisions top-down with a minimum gap.
  const GAP = 74;
  const sorted = [...items].sort((p, q) => p.mid - q.mid);
  let previous = -Infinity;
  const labelY = new Map<Anatomy, number>();
  for (const item of sorted) {
    const y = Math.max(item.mid, previous + GAP);
    labelY.set(item.a, y);
    previous = y;
  }

  return (
    <g opacity={opacity}>
      {items.map((item, i) => {
        const step = interpolate(
          progress,
          [i / items.length, (i + 0.75) / items.length],
          [0, 1],
          clamp,
        );
        if (step <= 0) return null;

        const bracketX = item.x + (toLeft ? -34 : 34);
        const ly = clampY(labelY.get(item.a) ?? item.mid);
        const labelX = bracketX + (toLeft ? -58 : 58);
        const grow = interpolate(step, [0, 0.6], [0, 1], clamp);

        return (
          <g key={`${item.a.index}-${item.a.part}`} opacity={step}>
            {/* extent bracket */}
            <path
              d={`M${bracketX + (toLeft ? 9 : -9)},${item.yTop} L${bracketX},${item.yTop} L${bracketX},${
                item.yTop + (item.yBottom - item.yTop) * grow
              } L${bracketX + (toLeft ? 9 : -9)},${item.yTop + (item.yBottom - item.yTop) * grow}`}
              fill="none"
              stroke={CT.accent}
              strokeWidth={2}
            />
            {/* leader */}
            <line
              x1={bracketX}
              x2={labelX + (toLeft ? 8 : -8)}
              y1={item.mid}
              y2={ly}
              stroke={CT.accent}
              strokeWidth={1.5}
              opacity={0.75}
            />
            <text
              x={labelX}
              y={ly + 9}
              fill={CT.ink}
              fontFamily={CFONT}
              fontSize={30}
              fontWeight={600}
              textAnchor={toLeft ? 'end' : 'start'}
            >
              {item.a.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

/** Entry, stop and target as hairlines with a whisper of fill. */
export const TradeLevels: React.FC<{
  trade: RiskReward;
  bias: 'bullish' | 'bearish';
  coords: Coords;
  progress: number;
  locale?: Locale;
}> = ({trade, bias, coords, progress, locale}) => {
  if (progress <= 0) return null;
  const t = strings(locale);

  const x0 = coords.indexToX(trade.entryIndex);
  // Stopping at width - 28 put the Target and Stop figures under the platform's
  // like/comment column, where they are covered on every phone rather than read.
  const x1 = interpolate(progress, [0, 1], [x0, READ_RIGHT - 14]);
  const w = Math.max(0, x1 - x0);
  const yEntry = coords.priceToY(trade.entry);
  const yStop = coords.priceToY(trade.stop);
  const yTarget = coords.priceToY(trade.target);
  const labels = interpolate(progress, [0.55, 1], [0, 1], clamp);
  const ratio =
    Math.abs(trade.target - trade.entry) / Math.max(1e-6, Math.abs(trade.stop - trade.entry));

  const row = (y: number, color: string, text: string, dy: number) => (
    <g opacity={labels}>
      <text
        x={x1 - 10}
        y={clampY(y + dy)}
        fill={color}
        fontFamily={CFONT}
        fontSize={28}
        fontWeight={700}
        textAnchor="end"
      >
        {text}
      </text>
    </g>
  );

  return (
    <g>
      <rect
        x={x0}
        y={Math.min(yEntry, yTarget)}
        width={w}
        height={Math.abs(yTarget - yEntry)}
        fill="rgba(46,189,133,0.10)"
      />
      <rect
        x={x0}
        y={Math.min(yEntry, yStop)}
        width={w}
        height={Math.abs(yStop - yEntry)}
        fill="rgba(226,70,94,0.10)"
      />
      <line x1={x0} x2={x1} y1={yTarget} y2={yTarget} stroke={CT.up} strokeWidth={2} />
      <line x1={x0} x2={x1} y1={yStop} y2={yStop} stroke={CT.down} strokeWidth={2} />
      <line
        x1={x0}
        x2={x1}
        y1={yEntry}
        y2={yEntry}
        stroke={CT.inkFaint}
        strokeWidth={1.5}
        strokeDasharray="6 7"
      />
      {row(yTarget, CT.up, t.target(trade.target.toFixed(2)), -12)}
      {row(yStop, CT.down, t.stop(trade.stop.toFixed(2)), 30)}
      {row(yEntry, CT.inkSoft, t.entry(ratio.toFixed(0)), -12)}
    </g>
  );
};
