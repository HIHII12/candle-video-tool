import React from 'react';
import {interpolate} from 'remotion';
import type {OrderBlock, Pattern, RiskReward, SwingPoint} from '../data/types';
import type {Coords} from '../XauChart/useLightweightChart';
import {SAFE} from '../safeArea';
import {strings, type Locale} from '../i18n';
import {LESSON_BOX, LFONT, LT} from './theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/**
 * Right-hand limit for markup, in chart coordinates.
 *
 * Not the chart's own width. The platform draws its like / comment / share
 * column down the right of the frame (src/safeArea.ts), and a price label under
 * it is not clipped by us — it is covered, on every phone, which looks the same
 * as being cut off.
 */
const RIGHT = LESSON_BOX.width - SAFE.right - 14;

/**
 * The zigzag structure path, drawn on with a dash offset so it looks like a
 * pen stroke rather than a shape appearing.
 */
export const ZigZag: React.FC<{
  structure: SwingPoint[];
  coords: Coords;
  progress: number;
}> = ({structure, coords, progress}) => {
  if (progress <= 0 || structure.length < 2) return null;

  const pts = structure.map((s) => ({x: coords.indexToX(s.index), y: coords.priceToY(s.price)}));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  // A clip window sweeping left to right reveals the stroke. Animating
  // strokeDashoffset instead would fight the dash pattern the line needs.
  const clipId = 'zigzag-clip';

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={progress * LESSON_BOX.width} height={LESSON_BOX.height} />
        </clipPath>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={LT.structure}
        strokeWidth={5}
        strokeDasharray="16 12"
        strokeLinecap="round"
        clipPath={`url(#${clipId})`}
      />
    </g>
  );
};

/** Shoulder / Head / Bottom callouts on the formation's defining points. */
export const PatternLabels: React.FC<{
  locale?: Locale;
  pattern: Pattern;
  coords: Coords;
  progress: number;
}> = ({pattern, coords, progress, locale}) => {
  if (progress <= 0) return null;
  const bullish = pattern.bias === 'bullish';

  return (
    <g>
      {pattern.points.map((pt, i) => {
        // Labels land one after another so the eye follows the shape.
        const step = interpolate(
          progress,
          [i / pattern.points.length, (i + 0.8) / pattern.points.length],
          [0, 1],
          clamp,
        );
        if (step <= 0) return null;

        const x = coords.indexToX(pt.index);
        const y = coords.priceToY(pt.price);
        // Bullish formations sit at lows, so their labels hang below. The
        // offset is generous because the stop sits on the right shoulder by
        // construction, and a tight label collided with the SL row.
        const dy = bullish ? 92 : -92;
        const label = strings(locale).term(pt.label);
        const width = label.length * 19 + 26;

        return (
          <g key={`${pt.index}-${pt.label}`} opacity={step}>
            <circle cx={x} cy={y} r={9} fill={LT.ink} />
            <rect
              x={x - width / 2}
              y={y + dy - 30}
              width={width}
              height={42}
              rx={8}
              fill={LT.ink}
            />
            <text
              x={x}
              y={y + dy}
              fill="#fff"
              fontFamily={LFONT}
              fontSize={26}
              fontWeight={900}
              textAnchor="middle"
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

/** The trigger line the formation breaks to confirm. */
export const Neckline: React.FC<{
  price: number;
  coords: Coords;
  progress: number;
  locale?: Locale;
}> = ({
  price,
  coords,
  progress,
  locale,
}) => {
  if (progress <= 0) return null;
  const y = coords.priceToY(price);

  return (
    <g>
      <line
        x1={0}
        x2={interpolate(progress, [0, 1], [0, RIGHT])}
        y1={y}
        y2={y}
        stroke={LT.ink}
        strokeWidth={5}
        strokeDasharray="18 12"
      />
      {(() => {
        // Width from the text, not a constant. At a fixed 252px the Vietnamese
        // term ran past the pill and came out as "ĐƯỜNG VIỀN C" — the kind of
        // clipping that only appears once the words change length.
        const label = `${strings(locale).term('NECKLINE')} ${price.toFixed(1)}`;
        return (
          <g opacity={interpolate(progress, [0.6, 1], [0, 1], clamp)}>
            <rect x={16} y={y - 54} width={label.length * 15 + 32} height={44} rx={8} fill={LT.ink} />
            <text x={32} y={y - 22} fill="#fff" fontFamily={LFONT} fontSize={28} fontWeight={900}>
              {label}
            </text>
          </g>
        );
      })()}
    </g>
  );
};

/** Entry zone drawn on the order block candle. */
export const EntryZone: React.FC<{
  ob: OrderBlock;
  coords: Coords;
  progress: number;
  locale?: Locale;
}> = ({
  ob,
  coords,
  progress,
  locale,
}) => {
  if (progress <= 0) return null;
  const x0 = coords.indexToX(ob.index);
  const x1 = interpolate(progress, [0, 1], [x0, RIGHT]);
  const yTop = coords.priceToY(ob.top);
  const yBottom = coords.priceToY(ob.bottom);

  return (
    <g>
      <rect
        x={x0}
        y={yTop}
        width={Math.max(0, x1 - x0)}
        height={Math.max(3, yBottom - yTop)}
        fill="rgba(107,77,255,0.20)"
        stroke={LT.ob}
        strokeWidth={4}
      />
      <g opacity={interpolate(progress, [0.55, 1], [0, 1], clamp)}>
        <rect x={x1 - 250} y={yBottom + 10} width={240} height={44} rx={8} fill={LT.ob} />
        <text
          x={x1 - 236}
          y={yBottom + 42}
          fill="#fff"
          fontFamily={LFONT}
          fontSize={27}
          fontWeight={900}
        >
          {strings(locale).term('ORDER BLOCK')}
        </text>
      </g>
    </g>
  );
};

/** Stop and measured-move target, light-theme variant. */
export const TradeZone: React.FC<{
  trade: RiskReward;
  side: 'LONG' | 'SHORT';
  coords: Coords;
  progress: number;
}> = ({trade, side, coords, progress}) => {
  if (progress <= 0) return null;

  const x0 = coords.indexToX(trade.entryIndex);
  const x1 = interpolate(progress, [0, 1], [x0, RIGHT]);
  const w = Math.max(0, x1 - x0);
  const yEntry = coords.priceToY(trade.entry);
  const yStop = coords.priceToY(trade.stop);
  const yTarget = coords.priceToY(trade.target);
  const ratio =
    Math.abs(trade.target - trade.entry) / Math.max(1e-6, Math.abs(trade.stop - trade.entry));
  const labels = interpolate(progress, [0.6, 1], [0, 1], clamp);

  return (
    <g>
      <rect
        x={x0}
        y={Math.min(yEntry, yTarget)}
        width={w}
        height={Math.abs(yTarget - yEntry)}
        fill={LT.profit}
      />
      <rect
        x={x0}
        y={Math.min(yEntry, yStop)}
        width={w}
        height={Math.abs(yStop - yEntry)}
        fill={LT.loss}
      />
      <line x1={x0} x2={x1} y1={yTarget} y2={yTarget} stroke={LT.up} strokeWidth={4} />
      <line x1={x0} x2={x1} y1={yStop} y2={yStop} stroke={LT.down} strokeWidth={4} />

      <g opacity={labels} fontFamily={LFONT} fontWeight={900}>
        <text x={x1 - 14} y={yTarget - 14} fill={LT.up} fontSize={32} textAnchor="end">
          TP {trade.target.toFixed(1)}
        </text>
        <text x={x1 - 14} y={yStop + 36} fill={LT.down} fontSize={32} textAnchor="end">
          SL {trade.stop.toFixed(1)}
        </text>
        {(() => {
          // Pulled back inside the readable area when the zone starts late: the
          // pill is a fixed width anchored to the zone's left edge, so a setup
          // that resolves near the right of the chart pushed it off frame.
          const text = `${side} · R:R 1:${ratio.toFixed(1)}`;
          const width = text.length * 17 + 32;
          const boxX = Math.min(x0 + 12, RIGHT - width);
          return (
            <>
              <rect x={boxX} y={yEntry + 12} width={width} height={50} rx={9} fill={LT.ink} />
              <text x={boxX + 16} y={yEntry + 47} fill="#fff" fontSize={31}>
                {text}
              </text>
            </>
          );
        })()}
      </g>
    </g>
  );
};
