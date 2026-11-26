import {THO_REN} from '../brand';
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ForexChartProps} from '../data/types';
import {useLightweightChart} from './useLightweightChart';
import {priceWindowAt} from './priceWindow';
import {LevelLine, PositionBox} from './Overlay';
import {ExplainCard, Spotlight} from './Explain';
import {FiboLevels, FvgBox, OrderBlockBox} from './Zones';
import {Flash, ResultStrip} from './Beats';
import {AnswerBadge, Countdown, QuizPills, TopBanner, Watermark, ForgeHeader, HookCard} from './Chrome';
import {EX, RESOLUTION_FRAME, SB, lastRevealIndex, ramp, resultAt, shownAt, shownFloatAt, stepWindows} from './storyboard';
import {visibleCandles} from '../camera';
import {ChartEdges} from '../ChartEdges';
import {BrandMark} from '../BrandMark';
import {strings} from '../i18n';
import {logicalWindowAt} from './logicalWindow';
import {CHART_BOX, TV, FONT} from './chartTheme';
import {interpolate} from 'remotion';
import {Soundtrack} from '../audio/Soundtrack';
import {quizCues} from '../audio/cues';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// The four phrasings live in src/i18n.ts, because the Vietnam track asks the
// same question in its own words rather than in a translation of these.

/**
 * The banner still has to pose the question the pills answer, so an arbitrary
 * model sentence cannot go here. But it must not be one frozen string either —
 * eight identical banners a day is what makes a feed look automated.
 */
const quizBanner = (props: ForexChartProps) => {
  const hook = (props.hook ?? '').trim().toUpperCase();
  // At 70px, anything much over 24 characters wraps and breaks the strip.
  if (hook && hook.length <= 24 && hook.includes('?')) return hook;
  const banners = strings(props.locale).quiz.banners;
  return banners[(props.candles.length + props.setupCount) % banners.length];
};

export const XauChart: React.FC<ForexChartProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const shownFloat = shownFloatAt(props, frame);
  const shown = shownAt(props, frame);
  const priceWindow = priceWindowAt(props, frame);
  const {containerRef, coords} = useLightweightChart(
    props,
    shownFloat,
    priceWindow,
    undefined,
    (() => {
      // Room after the newest bar: it is the bar the question is about, and
      // flush against the edge it sat inside the edge fade, half hidden.
      const base = logicalWindowAt(props.setupCount, lastRevealIndex(props), ramp(frame, SB.reveal), 3);
      if (!props.explain) return base;
      // Walk-through: step back so the whole trade sits clear of every edge.
      const x = ramp(frame, [EX.explain[0] - 60, EX.explain[0] + 10]);
      const k = x * x * (3 - 2 * x);
      const to = lastRevealIndex(props) + 9;
      return {from: base.from + (-2 - base.from) * k, to: base.to + (to - base.to) * k};
    })(),
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

  // The bar as it is drawn right now, not as it will close. Reading the closed
  // candle here put a price on screen that the chart had not printed yet.
  const visible = visibleCandles(props.candles, shownFloat);
  const lastShown = visible[visible.length - 1] ?? props.candles[0];

  // A slight jitter while the outcome plays reads as tension on a static chart.
  const shake = revealing ? Math.sin(frame * 1.9) * 1.8 : 0;
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.3);

  // Walk-through timing, and the moment the quiz chrome steps aside for it.
  const resAt = resultAt(props);
  const windows = props.explain
    ? stepWindows(props.explain.steps, props.locale === 'en' ? 'en' : 'vi')
    : null;
  const quizChrome = windows ? interpolate(frame, [EX.explain[0] - 14, EX.explain[0]], [1, 0], clamp) : 1;

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
      {props.brandMark === THO_REN.logo ? (
        <ForgeHeader frame={frame} fps={fps} locale={props.locale} logo={props.brandMark} />
      ) : (
        <TopBanner text={quizBanner(props)} frame={frame} />
      )}
      {quizChrome > 0 && (
        <div style={{opacity: quizChrome}}>
          <QuizPills frame={frame} fps={fps} answerAt={SB.answer} answer={props.answer} locale={props.locale} />
        </div>
      )}
      <Watermark visible={frame < resAt && !props.brandMark} />

      {/* Instrument + live price, small so the candles stay dominant.
          Hidden once the result strip claims this slot. */}
      <div
        style={{
          position: 'absolute',
          // Above the chart, not on it. The chart box was grown upward to use
          // the dead band and this line stayed where it was, so the canvas
          // painted straight over it — the same z-order trap the rule panel
          // fell into. Keeping it clear of CHART_BOX.top by construction rather
          // than by a number that has to be remembered.
          top: CHART_BOX.top - 84,
          left: 0,
          right: 0,
          zIndex: 30,
          opacity: frame >= resAt ? 0 : quizChrome,
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          alignItems: 'baseline',
        }}
      >
        <span style={{fontSize: 40, fontWeight: 900, color: TV.gold}}>
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

      {/* Thin edge fade. The default 92px band dimmed the newest candles — the
          ones the whole video is about. With room left around the bars it
          only has to tidy the boundary, not hide anything. */}
      <ChartEdges box={CHART_BOX} bg={TV.bg} side={34} top={22} bottom={22} solid={6} zIndex={5} transform={`translateX(${shake}px)`} />

      {/* Below both the banner and the BUY/SELL pills. The banner owns the top
          116px and the pills sit at 176; anything between the two lands on one
          of them, so the mark waits until under both. */}
      {props.brandMark && props.brandMark !== THO_REN.logo ? (
        <BrandMark file={props.brandMark} top={300} size={76} opacity={0.85} />
      ) : null}
      {props.brandMark === THO_REN.logo ? (
        <HookCard
          frame={frame}
          fps={fps}
          top={CHART_BOX.top}
          height={CHART_BOX.height}
          text={(() => {
            const pool = THO_REN.hooks[props.locale === 'en' ? 'en' : 'vi'];
            // A batch passes its own running number, so a day's videos walk
            // through the whole pool instead of landing on the same few lines.
            const i =
              props.hookIndex ?? props.candles.length * 7 + props.setupCount + Math.round(props.candles[0].close);
            return pool[Math.abs(i) % pool.length];
          })()}
        />
      ) : null}

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
              locale={props.locale}
            />
          )}
          {support && (
            <LevelLine
              price={support.price}
              label={support.label}
              kind="support"
              coords={coords}
              progress={secondLevelProgress}
              locale={props.locale}
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

          {windows && <Spotlight props={props} frame={frame} windows={windows} coords={coords} />}
        </svg>
      )}

      <Countdown frame={frame} fps={fps} range={SB.countdown} />
      {frame < resAt && quizChrome > 0 && (
        <AnswerBadge frame={frame} fps={fps} at={SB.answer} answer={props.answer} locale={props.locale} />
      )}
      <Flash frame={frame} at={RESOLUTION_FRAME} win={win} />
      <ResultStrip props={props} frame={frame} fps={fps} at={resAt} />
      {windows && <ExplainCard props={props} frame={frame} windows={windows} />}

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 40,
          right: 40,
          textAlign: 'center',
          // Matched to the other formats' small print. At 0.34 opacity and
          // weight 700 this line was bright enough to read from the sofa, which
          // put readable text under the platform's own controls — where it
          // simply is not seen. Small print is required to be present, not
          // prominent; see src/safeArea.ts.
          color: 'rgba(230,237,243,0.30)',
          fontSize: 21,
          fontWeight: 500,
          zIndex: 60,
        }}
      >
        {props.note === 'offline'
          ? THO_REN.practice[props.locale === 'en' ? 'en' : 'vi']
          : strings(props.locale).realData(props.pair)}
      </div>
      <Soundtrack nhac={props.nhac} bed="dark" cues={[...quizCues(win), ...(windows ?? []).map(([at]) => ({at, sound: 'whoosh' as const, gain: 0.45}))]} durationInFrames={durationInFrames} fps={fps} />
    </AbsoluteFill>
  );
};
