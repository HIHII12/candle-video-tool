import React from 'react';
import {interpolate} from 'remotion';
import type {Coords} from './XauChart/useLightweightChart';
import {pillWidth} from './textWidth';

/**
 * The drawing layer: horizontal levels, zones, and paths, described as data.
 *
 * Every concept this tool teaches past the single candle — a Fibonacci
 * retracement, an order block, a head and shoulders, a range — is one of three
 * shapes with a label on it. Written as React per concept, each new lesson
 * would be a new component, a new set of offsets, and a new chance to put a
 * label off the edge of the frame. Written as data, a new lesson is an entry in
 * a Python table and this file never changes.
 *
 * The clamping rules live here once, which is the point: a label is kept inside
 * the box, sized from its own text, and pushed off a neighbour it would sit on.
 */

export type Mark =
  | {
      kind: 'hline';
      price: number;
      label: string;
      /** Candle index the line starts at; defaults to the left edge. */
      from?: number;
      /** 0-1 within the beat, so several lines can arrive in order. */
      order?: number;
      tone?: Tone;
      /** Dashed by default; solid for the one line that matters most. */
      solid?: boolean;
    }
  | {
      kind: 'zone';
      top: number;
      bottom: number;
      from: number;
      to?: number;
      label: string;
      order?: number;
      tone?: Tone;
    }
  | {
      kind: 'path';
      points: {index: number; price: number; label?: string}[];
      order?: number;
      tone?: Tone;
    };

export type Tone = 'gold' | 'violet' | 'up' | 'down' | 'ink' | 'blue';

export type MarkTheme = {
  gold: string;
  violet: string;
  up: string;
  down: string;
  ink: string;
  blue: string;
  /** Text drawn inside a filled pill. */
  onFill: string;
};

const stagger = (progress: number, order = 0, count = 1) => {
  // Each mark gets its own slice of the beat, so a five-line Fibonacci grid
  // draws top to bottom instead of appearing all at once as a wall.
  const span = 1 / Math.max(1, count);
  const start = order * span;
  return interpolate(progress, [start, start + span * 0.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

export const Marks: React.FC<{
  marks: Mark[];
  coords: Coords;
  box: {width: number; height: number};
  progress: number;
  opacity?: number;
  theme: MarkTheme;
  font: string;
}> = ({marks, coords, box, progress, opacity = 1, theme, font}) => {
  if (progress <= 0 || opacity <= 0) return null;
  const count = marks.length;
  const colorOf = (t: Tone = 'gold') => theme[t];

  // Labels are placed top-down and remember what they have already used, so two
  // levels a few pixels apart do not print their names on top of each other —
  // which is exactly what a Fibonacci grid does at the 0.5 and 0.618 lines.
  const used: {y: number; x0: number; x1: number}[] = [];
  const place = (y: number, x0: number, w: number) => {
    let out = y;
    for (let i = 0; i < 14; i += 1) {
      const clash = used.find(
        (u) => Math.abs(u.y - out) < 42 && x0 < u.x1 && x0 + w > u.x0,
      );
      if (!clash) break;
      out = clash.y + 44;
    }
    used.push({y: out, x0, x1: x0 + w});
    return out;
  };

  return (
    <g opacity={opacity}>
      {marks.map((m, i) => {
        const t = stagger(progress, m.order ?? i, count);
        if (t <= 0) return null;
        const color = colorOf(m.tone);

        if (m.kind === 'hline') {
          const y = coords.priceToY(m.price);
          const x0 = m.from === undefined ? 0 : Math.max(0, coords.indexToX(m.from) - 10);
          const x1 = interpolate(t, [0, 1], [x0, box.width - 18]);
          const w = pillWidth(m.label, 27, 14);
          // Right-aligned against the drawn end of the line, then pulled back
          // inside the box. A level near the right of the chart used to print
          // its name past the frame edge.
          const bx = Math.min(Math.max(x0 + 6, x1 - w - 8), box.width - w - 8);
          const by = place(y - 40, bx, w);
          return (
            <g key={i}>
              <line
                x1={x0}
                x2={x1}
                y1={y}
                y2={y}
                stroke={color}
                strokeWidth={m.solid ? 5 : 4}
                strokeDasharray={m.solid ? undefined : '18 12'}
                opacity={0.95}
              />
              <g opacity={interpolate(t, [0.55, 1], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}>
                <rect x={bx} y={by} width={w} height={38} rx={7} fill={color} />
                <text
                  x={bx + 14}
                  y={by + 28}
                  fill={theme.onFill}
                  fontFamily={font}
                  fontSize={27}
                  fontWeight={900}
                >
                  {m.label}
                </text>
              </g>
            </g>
          );
        }

        if (m.kind === 'zone') {
          const yTop = coords.priceToY(m.top);
          const yBottom = coords.priceToY(m.bottom);
          const x0 = coords.indexToX(m.from);
          const end = m.to === undefined ? box.width - 18 : coords.indexToX(m.to);
          const x1 = interpolate(t, [0, 1], [x0, end]);
          const w = pillWidth(m.label, 27, 14);
          const bx = Math.min(x0 + 8, box.width - w - 8);
          const by = place(Math.min(yTop, yBottom) - 44, bx, w);
          return (
            <g key={i}>
              <rect
                x={x0}
                y={Math.min(yTop, yBottom)}
                width={Math.max(0, x1 - x0)}
                height={Math.max(3, Math.abs(yBottom - yTop))}
                fill={color}
                fillOpacity={0.2}
                stroke={color}
                strokeWidth={3}
              />
              <g opacity={interpolate(t, [0.5, 1], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}>
                <rect x={bx} y={by} width={w} height={38} rx={7} fill={color} />
                <text
                  x={bx + 14}
                  y={by + 28}
                  fill={theme.onFill}
                  fontFamily={font}
                  fontSize={27}
                  fontWeight={900}
                >
                  {m.label}
                </text>
              </g>
            </g>
          );
        }

        // path — the swing skeleton of a chart formation.
        const pts = m.points.map((p) => ({
          x: coords.indexToX(p.index),
          y: coords.priceToY(p.price),
          label: p.label,
        }));
        const shown = 1 + (pts.length - 1) * t;
        const drawn = pts.slice(0, Math.ceil(shown));
        if (drawn.length > 1) {
          const last = drawn[drawn.length - 1];
          const prev = drawn[drawn.length - 2];
          const f = shown - Math.floor(shown) || 1;
          drawn[drawn.length - 1] = {
            ...last,
            x: prev.x + (last.x - prev.x) * f,
            y: prev.y + (last.y - prev.y) * f,
          };
        }
        return (
          <g key={i}>
            <polyline
              points={drawn.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={5}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.9}
            />
            {pts.map((p, j) => {
              const on = j < shown;
              if (!on || !p.label) return null;
              const w = pillWidth(p.label, 26, 13);
              // Above the swing high, below the swing low: the label never
              // covers the price action it is naming.
              const above = j === 0 || p.y <= pts[Math.max(0, j - 1)].y;
              const bx = Math.min(Math.max(6, p.x - w / 2), box.width - w - 6);
              const by = place(above ? p.y - 56 : p.y + 22, bx, w);
              return (
                <g key={j}>
                  <circle cx={p.x} cy={p.y} r={8} fill={color} />
                  <rect x={bx} y={by} width={w} height={36} rx={7} fill={color} />
                  <text
                    x={bx + 13}
                    y={by + 27}
                    fill={theme.onFill}
                    fontFamily={font}
                    fontSize={26}
                    fontWeight={900}
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
};
