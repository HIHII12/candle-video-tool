import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ForexChartProps, RiskReward} from '../data/types';
import {useLightweightChart} from '../XauChart/useLightweightChart';
import {ChartEdges} from '../ChartEdges';
import {slowPush} from '../camera';
import {BrandMark} from '../BrandMark';
import {strings} from '../i18n';
import {logicalWindowAt} from '../XauChart/logicalWindow';
import {EntryZone, Neckline, PatternLabels, TradeZone, ZigZag} from './Markup';
import {LESSON_BOX, LESSON_DURATION, LFONT, LSB, LT, STEPS, lramp} from './theme';
import {CHANNEL_MARK} from '../brand';
import {SAFE} from '../safeArea';
import {Soundtrack} from '../audio/Soundtrack';
import {lessonCues} from '../audio/cues';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Used only when the caption step produced nothing — no key set, or the model
 * failed and the deterministic fallback ran. Several of them, indexed off the
 * data, so a keyless run still varies across a day's videos instead of stamping
 * one line onto every upload.
 */
// The lines themselves live in src/i18n.ts: the Vietnam track opens with its own
// five, not with a translation of these.

/** Last candle this format ever draws — where the formation's trade resolved. */
const lastShownIndex = (props: ForexChartProps) =>
  props.patternOutcome.index === null
    ? props.candles.length - 1
    : Math.min(props.patternOutcome.index, props.candles.length - 1);

/**
 * Lesson format: teaches one named confluence setup on a light chart, in the
 * order a trader would draw it. Sibling to XauChart, which is the quiz format —
 * both read the same config, but this one trades the formation rather than the
 * channel, so it uses patternTrade and patternOutcome throughout.
 */

const priceWindow = (props: ForexChartProps, frame: number) => {
  const trade = props.patternTrade;
  // The target is a projection price has not reached yet, so it only joins the
  // window during the reveal — including it up front left the candles squashed
  // into a third of the frame.
  const nearAnchors = [
    ...(trade ? [trade.entry, trade.stop] : []),
    ...(props.pattern ? [props.pattern.neckline, ...props.pattern.points.map((p) => p.price)] : []),
  ];
  const anchors = [...nearAnchors, ...(trade ? [trade.target] : [])];
  const setupPrices = props.candles
    .slice(0, props.setupCount)
    .flatMap((c) => [c.high, c.low]);
  // Only to the resolving candle; bars the reveal never reaches would only
  // squash everything the viewer does see.
  const allPrices = props.candles
    .slice(0, lastShownIndex(props) + 1)
    .flatMap((c) => [c.high, c.low]);

  const pad = (prices: number[]) => {
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const p = (hi - lo) * 0.08 || 1;
    return {minValue: lo - p, maxValue: hi + p};
  };

  const tight = pad([...setupPrices, ...nearAnchors]);
  const wide = pad([...allPrices, ...anchors]);
  const t = lramp(frame, LSB.reveal);
  // The tight -> wide move only happens during the reveal; the twenty seconds
  // of markup before it held one fixed window, which the frame check reads as
  // five and a half seconds of frozen video. The push runs underneath it.
  return slowPush(
    {
      minValue: tight.minValue + (wide.minValue - tight.minValue) * t,
      maxValue: tight.maxValue + (wide.maxValue - tight.maxValue) * t,
    },
    frame / LESSON_DURATION,
  );
};

const shownAt = (props: ForexChartProps, frame: number) => {
  const total = props.candles.length;
  const setup = props.setupCount;
  const last =
    props.patternOutcome.index === null
      ? total - 1
      : Math.min(props.patternOutcome.index, total - 1);
  const span = Math.max(0, last - (setup - 1));

  if (frame < LSB.reveal[0]) {
    // Opens part-drawn: see the note in XauChart's storyboard. An empty first
    // frame is the cheapest way to lose a short-form viewer.
    const OPEN_AT = 0.55;
    return Math.max(1, (OPEN_AT + (1 - OPEN_AT) * lramp(frame, LSB.replay)) * setup);
  }
  // Fractional: the newest bar forms rather than appearing whole. See camera.ts.
  return Math.min(total, setup + lramp(frame, LSB.reveal) * span);
};

export const LessonShort: React.FC<ForexChartProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const shown = shownAt(props, frame);
  const window = priceWindow(props, frame);
  const {containerRef, coords} = useLightweightChart(
    props,
    shown,
    window,
    {bg: LT.bg, up: LT.up, down: LT.down, box: LESSON_BOX},
    logicalWindowAt(props.setupCount, lastShownIndex(props), lramp(frame, LSB.reveal)),
  );

  const pattern = props.pattern;
  const trade: RiskReward | null = props.patternTrade;
  const side = props.patternSide ?? 'LONG';
  const t = strings(props.locale);
  const win = props.patternOutcome.result === 'TP';

  const titleIn = spring({frame: frame - 8, fps, config: {damping: 200}, durationInFrames: 26});
  const step = [...STEPS].reverse().find((s) => frame >= s.from);

  const resolved = frame >= LSB.reveal[1];
  const resultIn = spring({
    frame: frame - LSB.result[0],
    fps,
    config: {damping: 15},
    durationInFrames: 30,
  });

  return (
    <AbsoluteFill style={{background: LT.bg, fontFamily: LFONT}}>
      {/* Headline: the formula gets a name, which is what makes it shareable */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 46,
          right: 46,
          textAlign: 'center',
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [-24, 0])}px)`,
        }}
      >
        {/* The headline the caption step wrote.
            It was a hardcoded string, so all eight named-setup videos a day
            carried the identical line — and the caption model's output was
            written into the config and then read by nobody, so the whole AI step
            was paying for text that never reached the screen. The fallback is a
            rotation rather than one constant, because a hardcoded default would
            quietly recreate exactly the same problem the moment no key is set. */}
        <div
          style={{
            fontSize: props.title && props.title.length > 34 ? 46 : 56,
            fontWeight: 900,
            color: LT.ink,
            letterSpacing: -1,
            lineHeight: 1.08,
          }}
        >
          {(props.title || '').trim().toUpperCase() ||
            t.setup.hooks[(props.candles.length + props.setupCount) % t.setup.hooks.length]}
        </div>
        <div style={{marginTop: 14}}>
          <span
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: LT.ink,
              background: LT.highlight,
              padding: '8px 18px',
              borderRadius: 8,
              lineHeight: 1.5,
            }}
          >
            {t.setup.subtitle(t.term(pattern ? pattern.name : 'Structure'))}
          </span>
        </div>
        <div style={{marginTop: 20, fontSize: 32, fontWeight: 900, color: LT.inkSoft}}>
          {props.pair} · {props.timeframe}
        </div>
      </div>

      {/* Our own faint channel mark. Never reuse a reference channel's. */}
      <div
        style={{
          position: 'absolute',
          top: 880,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 130,
          fontWeight: 900,
          color: 'rgba(11,15,20,0.05)',
          letterSpacing: 6,
        }}
      >
        {props.brandMark ? '' : CHANNEL_MARK}
      </div>

      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: LESSON_BOX.left,
          top: LESSON_BOX.top,
          width: LESSON_BOX.width,
          height: LESSON_BOX.height,
        }}
      />

      <ChartEdges box={LESSON_BOX} bg={LT.bg} zIndex={5} />

      {/* Below the headline block, which runs full width on this format and is
          the one thing that must not be crowded. */}
      {props.brandMark ? (
        <BrandMark file={props.brandMark} top={352} size={78} opacity={0.85} />
      ) : null}

      {/* zIndex: the chart canvas paints over siblings without it. */}
      {coords && (
        <svg
          width={LESSON_BOX.width}
          height={LESSON_BOX.height}
          style={{
            position: 'absolute',
            left: LESSON_BOX.left,
            top: LESSON_BOX.top,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <ZigZag
            structure={props.structure}
            coords={coords}
            progress={lramp(frame, LSB.structure)}
          />
          {pattern && (
            <Neckline
              price={pattern.neckline}
              coords={coords}
              progress={lramp(frame, LSB.neckline)}
            locale={props.locale}
          />
          )}
          {props.orderBlock && (
            <EntryZone ob={props.orderBlock} coords={coords} progress={lramp(frame, LSB.ob)}
            locale={props.locale}
          />
          )}
          {trade && (
            <TradeZone
              trade={trade}
              side={side}
              coords={coords}
              progress={lramp(frame, LSB.trade)}
            />
          )}
          {/* Named last: the right shoulder doubles as the order block candle,
              so the zone would otherwise paint over its label. */}
          {pattern && (
            <PatternLabels
              pattern={pattern}
              coords={coords}
              progress={lramp(frame, LSB.labels)}
            locale={props.locale}
          />
          )}
        </svg>
      )}

      {/* Step narration */}
      {step && frame < LSB.result[0] && (
        <div
          style={{
            position: 'absolute',
            // Above the Shorts title bar, not under it. At bottom 210 this step
            // label — the one line that says which part of the setup is being
            // drawn — sat inside the platform's own band on every phone, and the
            // frame check measured a fifth of the video's ink down there.
            bottom: SAFE.bottom,
            left: 46,
            right: SAFE.right,
            textAlign: 'center',
            fontSize: 40,
            fontWeight: 900,
            color: LT.ink,
            background: LT.highlight,
            borderRadius: 12,
            padding: '16px 20px',
          }}
        >
          {/* Numbered by position in the list, so a translated step keeps the
              step number the English one had. */}
          {t.setup.steps[STEPS.indexOf(step)] ?? step.text}
        </div>
      )}

      {/* Verdict */}
      {frame >= LSB.result[0] && trade && (
        <div
          style={{
            position: 'absolute',
            bottom: SAFE.bottom,
            left: 46,
            right: SAFE.right,
            textAlign: 'center',
            opacity: resultIn,
            transform: `translateY(${interpolate(resultIn, [0, 1], [60, 0])}px)`,
          }}
        >
          <div
            style={{
              fontSize: 62,
              fontWeight: 900,
              color: win ? LT.up : LT.down,
            }}
          >
            {win ? t.setup.targetHit : t.setup.stopped}
          </div>
          <div style={{fontSize: 34, fontWeight: 900, color: LT.inkSoft, marginTop: 8}}>
            {win
              ? t.setup.winLine
              : t.setup.lossLine}
          </div>
        </div>
      )}

      {resolved && frame < LSB.result[0] && (
        <div
          style={{
            position: 'absolute',
            bottom: SAFE.bottom + 96,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 56,
            fontWeight: 900,
            color: win ? LT.up : LT.down,
          }}
        >
          {win ? 'TP' : 'SL'}
        </div>
      )}

      {/* The channel line sits above the step label and the verdict, which now
          share the band just under it. Two blocks at the same offset would draw
          straight through each other. */}
      <div
        style={{
          position: 'absolute',
          bottom: SAFE.bottom + 62,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 34,
          fontWeight: 900,
          color: LT.ink,
        }}
      >
        {/* Pair-aware: "gold setups" printed over a silver chart, same class of
            false label as the hardcoded XAU/USD above it. */}
        {t.setup.cta(
          props.pair.split('/')[0] === 'XAU'
            ? props.locale === 'vi'
              ? 'vàng'
              : 'gold'
            : props.pair.split('/')[0],
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 34,
          left: 40,
          right: 40,
          textAlign: 'center',
          fontSize: 22,
          fontWeight: 700,
          color: LT.inkSoft,
        }}
      >
        {t.realData(props.pair)}
      </div>
      <Soundtrack bed="light" cues={lessonCues(win)} durationInFrames={durationInFrames} fps={fps} />
    </AbsoluteFill>
  );
};
