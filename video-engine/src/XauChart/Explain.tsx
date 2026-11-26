import React from 'react';
import {interpolate} from 'remotion';
import type {ExplainStep, ForexChartProps} from '../data/types';
import type {Coords} from './useLightweightChart';
import {SAFE} from '../safeArea';
import {CHART_BOX, TV, FONT} from './chartTheme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
type Loc = 'vi' | 'en';

const stepAt = (windows: [number, number][], frame: number) => {
  for (let i = windows.length - 1; i >= 0; i--) if (frame >= windows[i][0]) return i;
  return -1;
};

const accent = (step: ExplainStep, props: ForexChartProps) => {
  const k = step.focus.kind;
  if (k === 'verdict') return props.outcome.result === 'TP' ? TV.up : props.outcome.result === 'SL' ? TV.down : TV.gold;
  if (k === 'level') return props.side === 'LONG' ? TV.support : TV.resistance;
  if (k === 'ob') return '#a48bff';
  if (k === 'fvg') return props.side === 'LONG' ? TV.up : TV.down;
  return TV.gold;
};

/**
 * The card that walks through the setup. It takes the band between the brand
 * header and the chart — the pills and the price line have done their job by
 * now and step aside — so nothing on the chart is covered while it reads.
 */
export const ExplainCard: React.FC<{
  props: ForexChartProps;
  frame: number;
  windows: [number, number][];
}> = ({props, frame, windows}) => {
  const steps = props.explain?.steps ?? [];
  const i = stepAt(windows, frame);
  if (i < 0 || !steps.length) return null;
  const loc: Loc = props.locale === 'en' ? 'en' : 'vi';
  const step = steps[i];
  const [s0] = windows[i];
  // Never fully blank between cards: a fully empty card for a few frames reads as a flicker.
  const enter = interpolate(frame, [s0, s0 + 10], [0.2, 1], clamp);
  const cardIn = interpolate(frame, [windows[0][0], windows[0][0] + 16], [0, 1], clamp);
  const color = accent(step, props);
  const head = step.head[loc];
  const headSize = Math.min(58, Math.floor(1240 / Math.max(14, head.length)));

  return (
    <div
      style={{
        position: 'absolute',
        top: SAFE.top + 104,
        left: 36,
        right: SAFE.right - 10,
        zIndex: 50,
        opacity: cardIn,
        transform: `translateY(${interpolate(cardIn, [0, 1], [-18, 0])}px)`,
        background: 'linear-gradient(180deg, rgba(33,21,12,0.97) 0%, rgba(18,12,8,0.97) 100%)',
        border: '1.5px solid rgba(245,184,61,0.38)',
        borderRadius: 22,
        padding: '18px 26px 20px 30px',
        fontFamily: FONT,
        boxShadow: '0 14px 40px rgba(0,0,0,0.55)',
        overflow: 'hidden',
      }}
    >
      {/* Accent bar in the colour of what is lit on the chart, so the eye can
          match the card to the mark without reading. */}
      <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, background: color}} />
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <span style={{fontSize: 25, fontWeight: 800, letterSpacing: 2, color: TV.gold}}>
          {loc === 'vi' ? 'GIẢI MÃ SETUP' : 'SETUP BREAKDOWN'}
          <span style={{color: 'rgba(255,247,234,0.55)'}}> · {step.tag[loc]}</span>
        </span>
        <span style={{display: 'flex', gap: 8}}>
          {steps.map((_, k) => (
            <span
              key={k}
              style={{
                width: k === i ? 26 : 10,
                height: 10,
                borderRadius: 5,
                background: k <= i ? TV.gold : 'rgba(255,247,234,0.22)',
              }}
            />
          ))}
        </span>
      </div>
      <div
        style={{
          opacity: enter,
          transform: `translateX(${interpolate(enter, [0, 1], [26, 0])}px)`,
        }}
      >
        <div
          style={{
            marginTop: 8,
            fontSize: headSize,
            fontWeight: 900,
            color,
            whiteSpace: 'nowrap',
            lineHeight: 1.12,
          }}
        >
          {head}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 32,
            fontWeight: 600,
            color: TV.text,
            lineHeight: 1.3,
          }}
        >
          {step.detail[loc]}
        </div>
      </div>
    </div>
  );
};

/**
 * Dims the chart except for the thing the current card is talking about, and
 * re-draws that thing bright on top. Drawn inside the overlay SVG, so it shares
 * the chart's coordinates.
 */
export const Spotlight: React.FC<{
  props: ForexChartProps;
  frame: number;
  windows: [number, number][];
  coords: Coords;
}> = ({props, frame, windows, coords}) => {
  const steps = props.explain?.steps ?? [];
  const i = stepAt(windows, frame);
  if (i < 0 || !steps.length) return null;
  const step = steps[i];
  const f = step.focus;
  const W = CHART_BOX.width;
  const H = CHART_BOX.height;
  const [s0] = windows[i];
  const local = frame - s0;
  const draw = interpolate(local, [0, 22], [0, 1], clamp);
  const tintIn = interpolate(frame, [windows[0][0], windows[0][0] + 18], [0, 1], clamp);
  // No darkening. Dimming the chart put a hard-edged black sheet over the
  // candles, and anything near the edge of a lit area sat half in shadow —
  // which reads as a rendering fault, not as emphasis. The focus is carried by
  // a soft tint of the card's colour under the thing being discussed, plus the
  // glowing redraw of it on top. Every candle stays fully visible.
  const halo = f.kind === 'none' || f.kind === 'plan' ? 0 : 0.12 * tintIn * interpolate(local, [0, 14], [0, 1], clamp);
  const color = accent(step, props);
  const rr = props.riskReward;
  const y = (p: number) => coords.priceToY(p);
  const x = (k: number) => coords.indexToX(k);
  const pulse = 0.5 + 0.5 * Math.sin(local * 0.16);

  const holes: React.ReactNode[] = [];
  const marks: React.ReactNode[] = [];

  if (f.kind === 'level' || f.kind === 'fibo') {
    const yy = y(f.price);
    const x0 = f.kind === 'fibo' && props.fibonacci ? x(props.fibonacci.startIndex) - 10 : 0;
    holes.push(<rect key="h" x={x0} y={yy - 16} width={W - x0} height={32} rx={10} />);
    marks.push(
      <line key="m" x1={x0} x2={x0 + (W - 40 - x0) * draw} y1={yy} y2={yy} stroke={color} strokeWidth={4} filter="url(#exGlow)" />,
    );
    if (f.kind === 'fibo') {
      marks.push(
        <text key="t" x={W - 44} y={yy - 10} textAnchor="end" fill={color} fontFamily={FONT} fontSize={24} fontWeight={800} opacity={draw}>
          {f.ratio}
        </text>,
      );
    }
  } else if (f.kind === 'fvg' || f.kind === 'ob') {
    const x0 = x(f.startIndex) - 8;
    const yt = y(f.top);
    const yb = y(f.bottom);
    holes.push(<rect key="h" x={x0 - 6} y={yt - 18} width={W - x0} height={yb - yt + 36} rx={12} />);
    marks.push(
      <rect
        key="m"
        x={x0}
        y={yt - 2}
        width={(W - 40 - x0) * draw}
        height={Math.max(4, yb - yt + 4)}
        rx={4}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        filter="url(#exGlow)"
      />,
    );
  } else if (f.kind === 'pattern') {
    f.points.forEach((pt, k) => {
      holes.push(<circle key={`h${k}`} cx={x(pt.index)} cy={y(pt.price)} r={50} />);
      const on = interpolate(local, [k * 8, k * 8 + 14], [0, 1], clamp);
      marks.push(
        <circle key={`m${k}`} cx={x(pt.index)} cy={y(pt.price)} r={20 + 4 * pulse} fill="none" stroke={color} strokeWidth={2.5} opacity={on} filter="url(#exGlow)" />,
      );
    });
    if (f.points.length > 1) {
      const d = f.points.map((pt, k) => `${k ? 'L' : 'M'}${x(pt.index)} ${y(pt.price)}`).join(' ');
      marks.push(<path key="p" d={d} fill="none" stroke={color} strokeWidth={1.6} strokeDasharray="6 6" opacity={0.8 * draw} />);
    }
  } else if (f.kind === 'plan' && rr) {
    const x0 = x(rr.entryIndex) - 10;
    const top = Math.min(y(rr.target), y(rr.stop));
    const bot = Math.max(y(rr.target), y(rr.stop));
    holes.push(<rect key="h" x={x0} y={top - 24} width={W - x0} height={bot - top + 48} rx={14} />);
    const len = (W - 40 - x0) * draw;
    marks.push(
      <g key="m" filter="url(#exGlow)">
        <line x1={x0} x2={x0 + len} y1={y(rr.target)} y2={y(rr.target)} stroke={TV.up} strokeWidth={3} />
        <line x1={x0} x2={x0 + len} y1={y(rr.stop)} y2={y(rr.stop)} stroke={TV.down} strokeWidth={3} />
        <line x1={x0} x2={x0 + len} y1={y(rr.entry)} y2={y(rr.entry)} stroke={TV.text} strokeWidth={1.6} strokeDasharray="6 6" />
      </g>,
    );
  } else if (f.kind === 'verdict') {
    const idx =
      props.outcome.index === null ? props.candles.length - 1 : Math.min(props.outcome.index, props.candles.length - 1);
    const price =
      props.outcome.result === 'TP' && rr ? rr.target : props.outcome.result === 'SL' && rr ? rr.stop : props.candles[idx].close;
    const cx = x(idx);
    const cy = y(price);
    holes.push(<circle key="h" cx={cx} cy={cy} r={44} />);
    marks.push(
      <circle key="m" cx={cx} cy={cy} r={(18 + 5 * pulse) * draw} fill="none" stroke={color} strokeWidth={4} filter="url(#exGlow)" />,
    );
  }

  return (
    <g>
      <defs>
        <filter id="exGlow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="exFeather" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {halo > 0 && (
        <g fill={color} opacity={halo} filter="url(#exFeather)">
          {holes}
        </g>
      )}
      {marks}
    </g>
  );
};
