import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CandleLessonProps} from '../data/types';
import {useLightweightChart} from '../XauChart/useLightweightChart';
import {AnatomyLabels, Spotlight, TradeLevels} from './Annotations';
import {RealityCheck} from './RealityCheck';
import {BeatRail} from './BeatRail';
import {BrandMark} from '../BrandMark';
import {strings} from '../i18n';
import {ChartEdges} from '../ChartEdges';
import {CB, CFONT, CHART, CT, LAYER, LAYOUT, cramp, ease, focusRange, hWindowAt, shownAt, windowAt} from './theme';
import {Soundtrack} from '../audio/Soundtrack';
import {SAFE} from '../safeArea';
import {candleCues} from '../audio/cues';
import {Narration, duckAt} from '../audio/Narration';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Candlestick-pattern lesson. Third format: no market data, no guessing game.
 * It shows one pattern in textbook proportions, names its parts, states the
 * rule, then lets the rule play out — a constructed series, labelled as such.
 */
export const CandleLesson: React.FC<CandleLessonProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const shown = shownAt(props, frame);
  const priceWindow = windowAt(props, frame);
  const {containerRef, coords} = useLightweightChart(
    props,
    shown,
    priceWindow,
    {bg: CT.bg, up: CT.up, down: CT.down, box: CHART},
    hWindowAt(props, frame),
  );

  const {pattern, trade} = props;
  const t = strings(props.locale);
  const bullish = pattern.bias === 'bullish';
  const win = props.outcome.result === 'TP';
  /**
   * What the series actually printed, said plainly.
   *
   * "Target not reached" covered two very different endings — the stop being
   * taken out, and the clip simply running out with the trade still live — and
   * blurred the more useful of the two. A stop-out on a textbook-perfect pattern
   * is the most instructive frame this format produces; it should not be phrased
   * as an absence.
   */
  const verdict =
    props.outcome.result === 'TP'
      ? t.verdict.TP
      : props.outcome.result === 'SL'
        ? t.verdict.SL
        : t.verdict.OPEN;

  /**
   * The header is legible on frame zero and only *settles* after it.
   *
   * It used to fade in from nothing over the first half-second, which meant the
   * cover frame — the still a feed shows before anyone presses play, and the one
   * frame that decides whether they do — was a bare chart with no title on it.
   * Motion on the opening frame is worth having; an unlabelled opening frame is
   * not what it costs.
   */
  const settle = spring({frame, fps, config: {damping: 200}, durationInFrames: 26});
  const titleIn = 1;
  // Title shrinks out of the way once the chart becomes the subject.
  const titleOut = interpolate(frame, [CB.focus[0], CB.focus[1]], [1, 0.62], clamp);

  const spotlight =
    interpolate(
      frame,
      [CB.focus[0], CB.focus[1], CB.zoomOut[0], CB.zoomOut[1]],
      [0, 1, 1, 0],
      clamp,
    ) * 1;
  const anatomyProgress = cramp(frame, CB.anatomy);
  // Fades out as the camera pulls back, so the naming layer does not compete
  // with the trade labels during the follow-through.
  const anatomyOpacity = interpolate(
    frame,
    [CB.anatomy[0], CB.anatomy[0] + 20, CB.zoomOut[0] - 40, CB.zoomOut[0] + 20],
    [0, 1, 1, 0],
    clamp,
  );
  const ruleProgress = cramp(frame, CB.rule);
  const tradeProgress = cramp(frame, [CB.zoomOut[1], CB.zoomOut[1] + 130] as const);

  const range = focusRange(props);

  // Rule panel slides up, holds, then clears before the follow-through.
  const rulePanel = interpolate(
    frame,
    [CB.rule[0] - 26, CB.rule[0] + 16, CB.zoomOut[0] - 30, CB.zoomOut[0]],
    [0, 1, 1, 0],
    clamp,
  );
  const resultIn = spring({
    frame: frame - CB.result[0],
    fps,
    config: {damping: 16},
    durationInFrames: 32,
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${CT.bgTop} 0%, ${CT.bg} 24%)`,
        fontFamily: CFONT,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          zIndex: LAYER.overlay,
          top: LAYOUT.headerTop,
          left: 60,
          // Give the corner mark its own column when there is one, so a long
          // pattern name wraps rather than running under the badge.
          right: props.brandMark ? SAFE.right + 130 : SAFE.right,
          opacity: titleIn * (0.45 + 0.55 * titleOut),
          transform: `translateY(${interpolate(settle, [0, 1], [-14, 0])}px) scale(${
            (0.985 + 0.015 * settle) * (0.94 + 0.06 * titleOut)
          })`,
          transformOrigin: 'left top',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 3,
            color: CT.accent,
            border: `1.5px solid ${CT.accent}`,
            borderRadius: 6,
            padding: '6px 14px',
          }}
        >
          {t.badge}
        </div>
        <div
          style={{
            fontSize: 74,
            fontWeight: 800,
            color: CT.ink,
            marginTop: 22,
            lineHeight: 1.05,
            textWrap: 'balance',
          }}
        >
          {pattern.name}
        </div>
        {/* Balanced rather than ragged: Vietnamese pattern names and taglines run
            longer than the English ones and wrap to two lines, and the default
            break leaves a single word stranded on the second. */}
        <div
          style={{
            fontSize: 34,
            fontWeight: 500,
            color: CT.inkSoft,
            marginTop: 12,
            lineHeight: 1.28,
            textWrap: 'balance',
          }}
        >
          {pattern.tagline}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: CHART.left,
          top: CHART.top,
          width: CHART.width,
          height: CHART.height,
        }}
      />

      <ChartEdges box={CHART} bg={CT.bg} zIndex={LAYER.chart + 5} />

      {/* zIndex: the chart canvas paints over siblings without it. */}
      {coords && (
        <svg
          width={CHART.width}
          height={CHART.height}
          style={{
            position: 'absolute',
            left: CHART.left,
            top: CHART.top,
            pointerEvents: 'none',
            zIndex: LAYER.marks,
          }}
        >
          <Spotlight coords={coords} from={range.from} to={range.to} opacity={spotlight * 0.92} />
          <AnatomyLabels
            props={props}
            coords={coords}
            progress={anatomyProgress}
            opacity={anatomyOpacity}
          />
          <TradeLevels
            trade={trade}
            bias={pattern.bias}
            coords={coords}
            progress={tradeProgress}
            locale={props.locale}
          />
        </svg>
      )}

      <BeatRail frame={frame} marks={props.voiceMarks ?? undefined} locale={props.locale} />

      {/* Rule + checklist */}
      {rulePanel > 0 && (
        <div
          style={{
            position: 'absolute',
            // Without this the panel is *behind* the chart canvas, and since the
            // panel grows upward from its bottom edge it is the top of it that
            // disappears — which is the rule itself, the one sentence the beat
            // exists to deliver. It rendered, it was simply painted over.
            zIndex: LAYER.overlay,
            bottom: SAFE.bottom,
            left: 56,
            right: SAFE.right,
            background: CT.panel,
            border: `1.5px solid ${CT.panelLine}`,
            borderRadius: 20,
            padding: '30px 34px',
            opacity: rulePanel,
            transform: `translateY(${interpolate(rulePanel, [0, 1], [40, 0])}px)`,
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{fontSize: 33, fontWeight: 500, color: CT.ink, lineHeight: 1.38}}>
            {pattern.rule}
          </div>
          <div style={{marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14}}>
            {pattern.checks.map((check, i) => {
              const tick = interpolate(
                ruleProgress,
                [0.25 + i * 0.16, 0.45 + i * 0.16],
                [0, 1],
                clamp,
              );
              return (
                <div
                  key={check}
                  style={{display: 'flex', alignItems: 'center', gap: 16, opacity: 0.35 + 0.65 * tick}}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: `1.5px solid ${tick > 0.5 ? CT.up : CT.inkFaint}`,
                      background: tick > 0.5 ? 'rgba(46,189,133,0.18)' : 'transparent',
                      color: CT.up,
                      fontSize: 22,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: `scale(${0.8 + 0.2 * tick})`,
                    }}
                  >
                    {tick > 0.5 ? '✓' : ''}
                  </div>
                  <span style={{fontSize: 29, fontWeight: 500, color: CT.inkSoft}}>{check}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Follow-through caption.
          Only when there is no narration: with a voice track the same band holds
          the subtitle, and a line naming a direction is the kind of copy that
          fills a slot without telling anyone anything. */}
      {!props.voiceMarks?.length && frame >= CB.reveal[0] && frame < CB.result[0] && (
        <div
          style={{
            position: 'absolute',
            zIndex: LAYER.overlay,
            top: LAYOUT.captionTop,
            left: 56,
            right: SAFE.right,
            textAlign: 'center',
            fontSize: 34,
            fontWeight: 600,
            color: CT.inkSoft,
            opacity: interpolate(frame, [CB.reveal[0], CB.reveal[0] + 24], [0, 1], clamp),
          }}
        >
          {/* Neutral on purpose: the follow-through is where the trade is
              decided, and about four in ten of them decide against it. */}
          {t.followThrough}
        </div>
      )}

      {/* Verdict */}
      {/* Recap, built one line at a time.
          This used to be a single block that sprang in at once and then held for
          four and a half seconds. Combined with a chart that had stopped moving,
          the last third of the video was a still image — the clearest signal that
          nothing was edited. Staggering the lines means something arrives every
          few frames right to the end, and a recap is worth watching: it is the
          rule restated at the moment the viewer has just seen it pay off. */}
      {props.stats && (
        <RealityCheck stats={props.stats} frame={frame} fps={fps} locale={props.locale} />
      )}

      {/* The recap is the fallback for when no statistic could be measured — no
          network, or too few settled trades to quote honestly. */}
      {!props.stats && frame >= CB.result[0] && (
        <div
          style={{
            position: 'absolute',
            zIndex: LAYER.overlay,
            bottom: SAFE.bottom,
            left: 56,
            right: SAFE.right,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color:
                props.outcome.result === 'TP'
                  ? CT.up
                  : props.outcome.result === 'SL'
                    ? CT.down
                    : CT.inkSoft,
              opacity: resultIn,
              transform: `translateY(${interpolate(resultIn, [0, 1], [44, 0])}px)`,
            }}
          >
            {verdict}
          </div>

          {/* The honesty beat, for the videos that could not measure one.
              With statistics the panel says what the pattern really does across
              every occurrence; without them the least this can do is refuse to
              let one worked example stand in for evidence. Ending on "it worked"
              is how a teaching channel turns into a highlight reel. */}
          <div
            style={{
              marginTop: 14,
              fontSize: 30,
              fontWeight: 600,
              color: CT.inkSoft,
              opacity: interpolate(resultIn, [0.4, 1], [0, 1], clamp),
            }}
          >
            {props.outcome.result === 'SL'
              ? t.caveatLoss
              : t.caveatDefault}
          </div>

          <div style={{marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12}}>
            {pattern.checks.map((check, i) => {
              const step = spring({
                frame: frame - (CB.result[0] + 34 + i * 26),
                fps,
                config: {damping: 18},
                durationInFrames: 26,
              });
              return (
                <div
                  key={check}
                  style={{
                    fontSize: 27,
                    fontWeight: 600,
                    color: CT.inkSoft,
                    opacity: step,
                    transform: `translateX(${interpolate(step, [0, 1], [-26, 0])}px)`,
                  }}
                >
                  <span style={{color: CT.up, marginRight: 10}}>✓</span>
                  {check}
                </div>
              );
            })}
          </div>

          {(() => {
            const cta = spring({
              frame: frame - (CB.result[0] + 34 + pattern.checks.length * 26 + 20),
              fps,
              config: {damping: 14},
              durationInFrames: 28,
            });
            return (
              <div
                style={{
                  marginTop: 24,
                  display: 'inline-block',
                  fontSize: 30,
                  fontWeight: 700,
                  color: CT.bg,
                  background: CT.accent,
                  borderRadius: 30,
                  padding: '14px 34px',
                  opacity: cta,
                  transform: `scale(${interpolate(cta, [0, 1], [0.8, 1])})`,
                }}
              >
                {t.cta}
              </div>
            );
          })()}
        </div>
      )}

      {/* Provenance. A constructed series has to say so. */}
      <div
        style={{
          position: 'absolute',
          zIndex: LAYER.overlay,
          top: LAYOUT.disclaimerY,
          left: 56,
          right: 56,
          textAlign: 'center',
          fontSize: 21,
          fontWeight: 500,
          color: CT.inkFaint,
        }}
      >
        {props.note} · {t.disclaimer}
      </div>
      {/* Narration is optional: no voice files means no track, no subtitle, and
          an unducked bed. The video is complete without it. */}
      {props.voiceId && props.voiceMarks?.length ? (
        <Narration
          id={props.voiceId}
          marks={props.voiceMarks}
          frame={frame}
          tone="dark"
          // Clear of the statistics panel, which owns the bottom of the frame
          // from the result beat onward.
          // The caption band under the chart. At 660 the subtitle floated in the
          // middle of the chart and lay across the trade box during the one beat
          // where the levels are the subject.
          bottom={SAFE.bottom}
          // The final lines are the statistics headline, word for word. Printing
          // them again as a subtitle put two copies of one sentence on screen,
          // the higher one sitting across the panel that earns it.
          hideCaptionFrom={CB.result[0]}
          // The rule beat prints the same sentence in the panel below, at length.
          hideCaptionBetween={CB.rule}
        />
      ) : null}

      {props.brandMark ? (
        <BrandMark file={props.brandMark} />
      ) : null}

      <Soundtrack
        bed="dark"
        cues={candleCues(win, props.outcome.result !== 'OPEN')}
        durationInFrames={durationInFrames}
        fps={fps}
        bedGain={
          props.voiceMarks?.length
            ? (f) => duckAt(props.voiceMarks!, f, fps)
            : undefined
        }
      />
    </AbsoluteFill>
  );
};
