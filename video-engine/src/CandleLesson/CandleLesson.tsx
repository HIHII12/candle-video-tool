import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CandleLessonProps} from '../data/types';
import {useLightweightChart} from '../XauChart/useLightweightChart';
import {AnatomyLabels, Spotlight, TradeLevels} from './Annotations';
import {RealityCheck} from './RealityCheck';
import {CB, CFONT, CHART, CT, cramp, ease, focusRange, hWindowAt, shownAt, windowAt} from './theme';
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
  const bullish = pattern.bias === 'bullish';
  const win = props.outcome.result === 'TP';

  const titleIn = spring({frame: frame - 6, fps, config: {damping: 200}, durationInFrames: 28});
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
  const tradeProgress = cramp(frame, [CB.zoomOut[0] + 40, CB.zoomOut[1] + 90] as const);

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
          top: 96,
          left: 60,
          right: 60,
          opacity: titleIn * (0.45 + 0.55 * titleOut),
          transform: `translateY(${interpolate(titleIn, [0, 1], [-22, 0])}px) scale(${
            0.94 + 0.06 * titleOut
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
          CANDLE ANATOMY
        </div>
        <div style={{fontSize: 74, fontWeight: 800, color: CT.ink, marginTop: 22, lineHeight: 1.05}}>
          {pattern.name}
        </div>
        <div style={{fontSize: 34, fontWeight: 500, color: CT.inkSoft, marginTop: 12}}>
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
            zIndex: 10,
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
          />
        </svg>
      )}

      {/* Rule + checklist */}
      {rulePanel > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 150,
            left: 56,
            right: 56,
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

      {/* Follow-through caption */}
      {frame >= CB.reveal[0] && frame < CB.result[0] && (
        <div
          style={{
            position: 'absolute',
            bottom: SAFE.bottom + 40,
            left: 56,
            right: 56,
            textAlign: 'center',
            fontSize: 34,
            fontWeight: 600,
            color: CT.inkSoft,
            opacity: interpolate(frame, [CB.reveal[0], CB.reveal[0] + 24], [0, 1], clamp),
          }}
        >
          {bullish ? 'Buyers follow through…' : 'Sellers follow through…'}
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
      {props.stats && <RealityCheck stats={props.stats} frame={frame} fps={fps} />}

      {/* The recap is the fallback for when no statistic could be measured — no
          network, or too few settled trades to quote honestly. */}
      {!props.stats && frame >= CB.result[0] && (
        <div
          style={{
            position: 'absolute',
            bottom: SAFE.bottom,
            left: 56,
            right: 56,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: win ? CT.up : CT.down,
              opacity: resultIn,
              transform: `translateY(${interpolate(resultIn, [0, 1], [44, 0])}px)`,
            }}
          >
            {win ? 'Target reached' : 'Target not reached'}
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
                Follow for one pattern a day
              </div>
            );
          })()}
        </div>
      )}

      {/* Provenance. A constructed series has to say so. */}
      <div
        style={{
          position: 'absolute',
          bottom: 42,
          left: 56,
          right: 56,
          textAlign: 'center',
          fontSize: 21,
          fontWeight: 500,
          color: CT.inkFaint,
        }}
      >
        {props.note} · Educational only, not financial advice
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
          bottom={660}
        />
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
