import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {ForexChartProps} from '../data/types';
import {buildScale} from './geometry';
import {Candlestick} from './Candlestick';
import {SupportResistance} from './SupportResistance';
import {VirtualCursor} from './VirtualCursor';
import {RiskRewardBox} from './RiskRewardBox';
import {CHART} from './geometry';
import {THEME, FONT} from './theme';

const CANDLE_START = 12;
const CANDLE_STEP = 4;

// Piecewise cursor animation: fade in, annotate resistance, move to support,
// move to the entry, then fade out — mimicking a trader marking up the chart.
const cursorState = (
  frame: number,
  res: {x: number; y: number},
  sup: {x: number; y: number},
  entry: {x: number; y: number},
  start: {x: number; y: number},
) => {
  const opacity = interpolate(
    frame,
    [175, 190, 520, 555],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  // X and Y move through waypoints at these frame anchors.
  const anchors = [190, 200, 275, 290, 375, 390];
  const xs = [start.x, res.x, res.x, sup.x, sup.x, entry.x];
  const ys = [start.y, res.y, res.y, sup.y, sup.y, entry.y];
  const x = interpolate(frame, anchors, xs, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, anchors, ys, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pressed =
    (frame >= 200 && frame <= 260) ||
    (frame >= 290 && frame <= 350) ||
    (frame >= 390 && frame <= 520);
  return {x, y, opacity, pressed};
};

export const ForexChart: React.FC<ForexChartProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const scale = buildScale(props);

  const resistance = props.levels.find((l) => l.kind === 'resistance');
  const support = props.levels.find((l) => l.kind === 'support');

  const resistanceDraw = interpolate(frame, [200, 262], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const supportDraw = interpolate(frame, [290, 352], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rrReveal = interpolate(frame, [390, 520], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleIn = spring({frame: frame - 4, fps, config: {damping: 200}, durationInFrames: 24});

  const resTarget = {
    x: CHART.x + CHART.width - 100,
    y: resistance ? scale.priceToY(resistance.price) : CHART.y,
  };
  const supTarget = {
    x: CHART.x + CHART.width - 100,
    y: support ? scale.priceToY(support.price) : CHART.y,
  };
  const entryTarget = props.riskReward
    ? {x: scale.indexToX(props.riskReward.entryIndex), y: scale.priceToY(props.riskReward.entry)}
    : resTarget;
  const cursor = cursorState(frame, resTarget, supTarget, entryTarget, {
    x: CHART.x + CHART.width / 2,
    y: CHART.y + CHART.height / 2,
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${THEME.bgGradientTop} 0%, ${THEME.bg} 55%)`,
        fontFamily: FONT,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          left: 60,
          right: 60,
          transform: `translateY(${interpolate(titleIn, [0, 1], [-30, 0])}px)`,
          opacity: titleIn,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <span
            style={{
              background: THEME.bull,
              color: '#04120d',
              fontWeight: 800,
              fontSize: 30,
              padding: '6px 16px',
              borderRadius: 10,
            }}
          >
            {props.pair}
          </span>
          <span style={{color: THEME.textDim, fontSize: 30, fontWeight: 600}}>
            {props.timeframe}
          </span>
        </div>
        <div style={{color: THEME.text, fontSize: 46, fontWeight: 800, marginTop: 18, lineHeight: 1.15}}>
          {props.title}
        </div>
      </div>

      <svg width={width} height={1920} style={{position: 'absolute', inset: 0}}>
        {props.candles.map((c, i) => (
          <Candlestick
            key={c.time}
            candle={c}
            index={i}
            scale={scale}
            frame={frame}
            appearFrame={CANDLE_START + i * CANDLE_STEP}
          />
        ))}

        {resistance && (
          <SupportResistance level={resistance} scale={scale} drawProgress={resistanceDraw} />
        )}
        {support && (
          <SupportResistance level={support} scale={scale} drawProgress={supportDraw} />
        )}

        {props.riskReward && rrReveal > 0 && (
          <RiskRewardBox rr={props.riskReward} scale={scale} reveal={rrReveal} />
        )}

        {cursor.opacity > 0 && (
          <VirtualCursor x={cursor.x} y={cursor.y} opacity={cursor.opacity} pressed={cursor.pressed} />
        )}
      </svg>
    </AbsoluteFill>
  );
};
