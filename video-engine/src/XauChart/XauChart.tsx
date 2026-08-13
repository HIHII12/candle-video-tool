import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ForexChartProps} from '../data/types';
import {useLightweightChart} from './useLightweightChart';
import {priceWindowAt} from './priceWindow';
import {Cursor, LevelLine, PositionBox} from './Overlay';
import {FiboLevels, FvgBox, OrderBlockBox} from './Zones';
import {Flash, ResultStrip} from './Beats';
import {AnswerBadge, Countdown, QuizPills, TopBanner, Watermark} from './Chrome';
import {RESOLUTION_FRAME, SB, lastRevealIndex, ramp, shownAt} from './storyboard';
import {logicalWindowAt} from './logicalWindow';
import {CHART_BOX, TV, FONT} from './chartTheme';
import {interpolate} from 'remotion';
import {Soundtrack} from '../audio/Soundtrack';
import {quizCues} from '../audio/cues';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const BANNERS = [
  'WOULD YOU BUY OR SELL?',
  'BUY OR SELL THIS CHART?',
  'YOUR CALL: BUY OR SELL?',
  'LONG OR SHORT HERE?',
];

/**
 * The banner still has to pose the question the pills answer, so an arbitrary
 * model sentence cannot go here. But it must not be one frozen string either —
 * eight identical banners a day is what makes a feed look automated.
 */
const quizBanner = (props: ForexChartProps) => {
  const hook = (props.hook ?? '').trim().toUpperCase();
  // At 70px, anything much over 24 characters wraps and breaks the strip.
  if (hook && hook.length <= 24 && hook.includes('?')) return hook;
  return BANNERS[(props.candles.length + props.setupCount) % BANNERS.length];
};

export const XauChart: React.FC<ForexChartProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const shown = shownAt(props, frame);
  const priceWindow = priceWindowAt(props, frame);
  const {containerRef, coords} = useLightweightChart(
    props,
    shown,
    priceWindow,
    undefined,
    logicalWindowAt(props.setupCount, lastRevealIndex(props), ramp(frame, SB.reveal)),
  );

  const resistance = props.levels.find((l) => l.kind === 'resistance');
  const support = props.levels.find((l) => l.kind === 'support');

  // Both levels are drawn in the same beat; the second trails the first.
  const levelProgress = ramp(frame, SB.level);
  const secondLevelProgress = ramp(frame, [SB.level[0] + 30, SB.level[1] + 30] as const);
  const fvgProgress = ramp(frame, SB.fvg);
  const obProgress = ramp(frame, [SB.fvg[0] + 45, SB.fvg[1] + 45] as const);
  const fiboProgress = ramp(frame, SB.fibo);
  const boxProgress = ramp(frame, SB.box);

  // Every overlay used to stay at full strength once drawn, so by the reveal the
  // frame carried support/resistance, five Fibonacci lines, an FVG, an order
  // block and the trade box all at once — unreadable on a phone. Each concept
  // now dims to a ghost when the next one takes over: the confluence story is
  // still legible, but only what matters right now is loud.
  const settle = (floor: number) =>
    interpolate(frame, [SB.box[0], SB.box[1]], [1, floor], clamp);
  const fiboOpacity = settle(0.2);
  const fvgOpacity = settle(0.32);

  const win = props.outcome.result === 'TP';
  const revealing = frame >= SB.reveal[0] && frame < SB.reveal[1];

  const lastShown = props.candles[shown - 1];

  // A slight jitter while the outcome plays reads as tension on a static chart.
  const shake = revealing ? Math.sin(frame * 1.9) * 1.8 : 0;
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.3);

  let cursor = {x: 0, y: 0, opacity: 0, pressed: false};
  if (coords) {
    const resPoint = {x: 250, y: resistance ? coords.priceToY(resistance.price) : 0};
    const supPoint = {x: 250, y: support ? coords.priceToY(support.price) : 0};
    const entryPoint = props.riskReward
      ? {
          x: coords.indexToX(props.riskReward.entryIndex),
          y: coords.priceToY(props.riskReward.entry),
        }
      : resPoint;

    const fvg = props.fvgs[0];
    const fvgPoint = fvg
      ? {x: coords.indexToX(fvg.startIndex), y: coords.priceToY((fvg.top + fvg.bottom) / 2)}
      : resPoint;
    const fibPoint = props.fibonacci
      ? {
          x: coords.indexToX(props.fibonacci.startIndex),
          y: coords.priceToY(props.fibonacci.levels[3].price),
        }
      : resPoint;

    const anchors = [
      SB.level[0] - 40,
      SB.level[0],
      SB.level[1],
      SB.fvg[0],
      SB.fvg[1],
      SB.fibo[0],
      SB.fibo[1],
      SB.box[0],
    ];
    const xs = [
      CHART_BOX.width * 0.5,
      resPoint.x,
      supPoint.x,
      fvgPoint.x,
      fvgPoint.x,
      fibPoint.x,
      fibPoint.x,
      entryPoint.x,
    ];
    const ys = [
      CHART_BOX.height * 0.5,
      resPoint.y,
      supPoint.y,
      fvgPoint.y,
      fvgPoint.y,
      fibPoint.y,
      fibPoint.y,
      entryPoint.y,
    ];

    cursor = {
      x: interpolate(frame, anchors, xs, clamp),
      y: interpolate(frame, anchors, ys, clamp),
      opacity: interpolate(
        frame,
        [SB.level[0] - 60, SB.level[0] - 24, SB.box[1], SB.box[1] + 26],
        [0, 1, 1, 0],
        clamp,
      ),
      pressed:
        (frame >= SB.level[0] && frame <= SB.level[1]) ||
        (frame >= SB.fvg[0] && frame <= SB.fvg[1] + 45) ||
        (frame >= SB.fibo[0] && frame <= SB.fibo[1]) ||
        (frame >= SB.box[0] && frame <= SB.box[1]),
    };
  }

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${TV.bgTop} 0%, ${TV.bg} 42%)`,
        fontFamily: FONT,
      }}
    >
      {/* The banner has to keep asking the question the pills answer, so it is
          not free text — but it does not have to be one string forever. The
          caption model's hook is used when it is short enough to stay on one
          line at this size; otherwise a rotation, indexed off the data so a
          keyless run still varies between videos. */}
      <TopBanner text={quizBanner(props)} frame={frame} />
      <QuizPills frame={frame} fps={fps} answerAt={SB.answer} answer={props.answer} />
      <Watermark visible={frame < SB.result[0]} />

      {/* Instrument + live price, small so the candles stay dominant.
          Hidden once the result strip claims this slot. */}
      <div
        style={{
          position: 'absolute',
          top: 456,
          left: 0,
          right: 0,
          opacity: frame >= SB.result[0] ? 0 : 1,
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          alignItems: 'baseline',
        }}
      >
        <span style={{fontSize: 40, fontWeight: 900, color: '#ffe000'}}>
          {props.pair} · {props.timeframe}
        </span>
        <span
          style={{
            fontSize: 40,
            fontWeight: 900,
            color: '#fff',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {lastShown.close.toFixed(1)}
        </span>
      </div>

      {/* TradingView lightweight-charts canvas */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: CHART_BOX.left,
          top: CHART_BOX.top,
          width: CHART_BOX.width,
          height: CHART_BOX.height,
          transform: `translateX(${shake}px)`,
        }}
      />

      {/* Annotation overlay, aligned to the chart canvas.
          zIndex matters: the chart canvas paints over siblings without it. */}
      {coords && (
        <svg
          width={CHART_BOX.width}
          height={CHART_BOX.height}
          style={{
            position: 'absolute',
            left: CHART_BOX.left,
            top: CHART_BOX.top,
            transform: `translateX(${shake}px)`,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {resistance && (
            <LevelLine
              price={resistance.price}
              label={resistance.label}
              kind="resistance"
              coords={coords}
              progress={levelProgress}
            />
          )}
          {support && (
            <LevelLine
              price={support.price}
              label={support.label}
              kind="support"
              coords={coords}
              progress={secondLevelProgress}
            />
          )}
          {props.fibonacci && (
            <g opacity={fiboOpacity}>
              <FiboLevels fib={props.fibonacci} coords={coords} reveal={fiboProgress} />
            </g>
          )}
          <g opacity={fvgOpacity}>
            {props.fvgs.map((fvg) => (
              <FvgBox key={fvg.startIndex} fvg={fvg} coords={coords} reveal={fvgProgress} />
            ))}
          </g>
          {props.orderBlock && (
            <OrderBlockBox ob={props.orderBlock} coords={coords} reveal={obProgress} />
          )}
          {props.riskReward && (
            <PositionBox rr={props.riskReward} coords={coords} reveal={boxProgress} />
          )}

          {revealing && (
            <circle
              cx={coords.indexToX(shown - 1)}
              cy={coords.priceToY(lastShown.close)}
              r={12 + pulse * 11}
              fill={win ? 'rgba(0,224,95,0.35)' : 'rgba(255,43,43,0.35)'}
              stroke={win ? TV.up : TV.down}
              strokeWidth={3}
            />
          )}

          <Cursor {...cursor} />
        </svg>
      )}

      <Countdown frame={frame} fps={fps} range={SB.countdown} />
      {frame < SB.result[0] && (
        <AnswerBadge frame={frame} fps={fps} at={SB.answer} answer={props.answer} />
      )}
      <Flash frame={frame} at={RESOLUTION_FRAME} win={win} />
      <ResultStrip props={props} frame={frame} fps={fps} at={SB.result[0]} />

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 40,
          right: 40,
          textAlign: 'center',
          color: 'rgba(255,255,255,0.34)',
          fontSize: 21,
          fontWeight: 700,
          zIndex: 60,
        }}
      >
        Real {props.pair} data · Educational only, not financial advice
      </div>
      <Soundtrack bed="dark" cues={quizCues(win)} durationInFrames={durationInFrames} fps={fps} />
    </AbsoluteFill>
  );
};
