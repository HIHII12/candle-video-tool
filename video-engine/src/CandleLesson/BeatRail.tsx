import React from 'react';
import {interpolate} from 'remotion';
import {CB, CFONT, CT, LAYER, LAYOUT} from './theme';
import {SAFE} from '../safeArea';
import {ramp} from '../camera';
import {speakingAt, type VoiceMark} from '../audio/Narration';
import {strings, type Locale} from '../i18n';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * A four-stop rail across the band under the chart, showing where the video is.
 *
 * It exists for two reasons, and the second is the one that matters.
 *
 * The band was empty. The frame is 1920 tall, the chart ends at 1458, and until
 * the rule panel arrived at eighteen seconds there was nothing at all between
 * the chart and the small print — a fifth of the screen, held blank, for the
 * first two thirds of the video.
 *
 * And a viewer three seconds into a short is deciding whether to keep watching
 * with no idea what they are being kept for. "Rule → Trade → Reality" is a
 * reason to stay, and it is an honest one: those beats really are coming, and
 * the last of them is the measured hit rate rather than another winning example.
 */
const BEATS = [CB.patternIn[0], CB.rule[0], CB.zoomOut[0], CB.result[0]] as const;

export const BeatRail: React.FC<{
  frame: number;
  marks?: VoiceMark[];
  locale?: Locale;
  /** True for the lessons that teach a structure rather than a candle. */
  concept?: boolean;
}> = ({
  frame,
  marks,
  locale,
  concept,
}) => {
  // Up from just after the title lands, gone before the rule panel needs the band.
  // It also yields to a subtitle: they share the band, and of the two the rail is
  // the one nobody needs to read.
  const spoken = marks?.length ? speakingAt(marks, frame) : false;
  const show =
    ramp(frame, 0, 40) *
    (1 - ramp(frame, CB.rule[0] - 90, CB.rule[0] - 30)) *
    (spoken ? 0 : 1);
  if (show <= 0.01) return null;

  // Progress runs on the beats themselves, so the rail cannot claim to be
  // somewhere the video is not.
  const labels = concept ? strings(locale).conceptRail : strings(locale).rail;
  const span = BEATS[BEATS.length - 1] - BEATS[0];
  const progress = interpolate(frame, [BEATS[0], BEATS[BEATS.length - 1]], [0, 1], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: LAYER.overlay,
        top: LAYOUT.captionTop,
        left: 60,
        right: SAFE.right,
        opacity: show,
        transform: `translateY(${interpolate(show, [0, 1], [18, 0])}px)`,
        fontFamily: CFONT,
      }}
    >
      <div style={{position: 'relative', height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 2}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background: CT.accent,
            borderRadius: 2,
          }}
        />
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 18}}>
        {BEATS.map((at, i) => {
          const reached = frame >= at - 30;
          const position = (at - BEATS[0]) / span;
          const active = reached && progress - position < 0.34;
          return (
            <div
              key={labels[i]}
              style={{
                fontSize: 25,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: active ? CT.accent : reached ? CT.inkSoft : CT.inkFaint,
              }}
            >
              {labels[i]}
            </div>
          );
        })}
      </div>
    </div>
  );
};
