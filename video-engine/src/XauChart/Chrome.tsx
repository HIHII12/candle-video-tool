import React from 'react';
import {interpolate, spring} from 'remotion';
import {TV, FONT, stroke} from './chartTheme';
import {strings, type Locale} from '../i18n';
import {CHANNEL_MARK} from '../brand';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Full-width yellow strip. Frames the video and states the format instantly. */
export const TopBanner: React.FC<{text: string; frame: number}> = ({text, frame}) => {
  const slide = interpolate(frame, [0, 18], [-120, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 116,
        background: TV.banner,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translateY(${slide}px)`,
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontSize: 70,
          fontWeight: 900,
          color: '#000',
          letterSpacing: -1,
        }}
      >
        {text}
      </span>
    </div>
  );
};

/**
 * The retention device: the viewer has to pick a side. Once the answer lands,
 * the wrong pill drains away and the right one is pushed forward.
 */
export const QuizPills: React.FC<{
  frame: number;
  fps: number;
  answerAt: number;
  answer: 'BUY' | 'SELL';
  locale?: Locale;
}> = ({frame, fps, answerAt, answer, locale}) => {
  const t = strings(locale).quiz;
  const entry = spring({frame: frame - 10, fps, config: {damping: 13}, durationInFrames: 30});
  const revealed = frame >= answerAt;

  const pill = (label: 'BUY' | 'SELL', color: string) => {
    const isAnswer = label === answer;
    const text = label === 'BUY' ? t.buy : t.sell;
    const settle = revealed
      ? spring({
          frame: frame - answerAt,
          fps,
          config: {damping: 11, mass: 0.6},
          durationInFrames: 26,
        })
      : 0;
    // Before the answer both pills breathe; afterwards only the winner stays lit.
    const idle = 1 + (revealed ? 0 : Math.sin(frame * 0.11) * 0.035);
    const scale = idle * (isAnswer ? 1 + settle * 0.22 : 1 - settle * 0.12);
    const opacity = isAnswer ? 1 : 1 - settle * 0.72;

    return (
      <div
        style={{
          background: color,
          borderRadius: 70,
          padding: '18px 54px',
          transform: `scale(${scale})`,
          opacity,
          boxShadow: isAnswer && revealed ? `0 0 60px ${color}` : 'none',
        }}
      >
        <span
          style={{
            fontFamily: FONT,
            fontSize: 68,
            fontWeight: 900,
            color: '#fff',
            ...stroke(5),
          }}
        >
          {text}
        </span>
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 176,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 34,
        opacity: entry,
        transform: `translateY(${interpolate(entry, [0, 1], [-40, 0])}px)`,
      }}
    >
      {pill('BUY', TV.up)}
      <span style={{fontFamily: FONT, fontSize: 62, fontWeight: 900, color: '#fff', ...stroke(4)}}>
        or
      </span>
      {pill('SELL', TV.down)}
    </div>
  );
};

/** Faint channel mark so reposts stay traceable. */
export const Watermark: React.FC<{visible: boolean}> = ({visible}) => (
  <div
    style={{
      position: 'absolute',
      top: 370,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontFamily: FONT,
      fontSize: 40,
      fontWeight: 900,
      color: 'rgba(255,255,255,0.13)',
      opacity: visible ? 1 : 0,
      letterSpacing: 2,
    }}
  >
    {CHANNEL_MARK}
  </div>
);

/** Big bottom counter during the think-time beat. */
export const Countdown: React.FC<{
  frame: number;
  fps: number;
  range: readonly [number, number];
}> = ({frame, fps, range}) => {
  const [start, end] = range;
  if (frame < start || frame > end) return null;

  const span = (end - start) / 3;
  const step = Math.min(2, Math.floor((frame - start) / span));
  const digit = 3 - step;
  const beat = spring({
    frame: frame - start - step * span,
    fps,
    config: {damping: 11, mass: 0.5},
    durationInFrames: 24,
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 330,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: FONT,
        fontSize: 150,
        fontWeight: 900,
        color: '#fff',
        transform: `scale(${interpolate(beat, [0, 1], [1.6, 1])})`,
        ...stroke(8),
      }}
    >
      {digit}
    </div>
  );
};

/** The market's verdict, thrown on screen the instant the countdown ends. */
export const AnswerBadge: React.FC<{
  frame: number;
  fps: number;
  at: number;
  answer: 'BUY' | 'SELL';
  locale?: Locale;
}> = ({frame, fps, at, answer, locale}) => {
  if (frame < at) return null;
  const pop = spring({frame: frame - at, fps, config: {damping: 10, mass: 0.6}, durationInFrames: 26});
  const color = answer === 'BUY' ? TV.up : TV.down;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 330,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: FONT,
        // Sized from the text, not fixed. The English verdict is eleven
        // characters and fits at 104; the Vietnamese one is thirteen and ran
        // into both edges of the frame at the same size.
        fontSize: Math.min(104, Math.round(1180 / Math.max(9, strings(locale).quiz.won(answer).length))),
        fontWeight: 900,
        color,
        transform: `scale(${interpolate(pop, [0, 1], [0.5, 1])})`,
        opacity: interpolate(pop, [0, 0.3], [0, 1], clamp),
        ...stroke(9),
      }}
    >
      {/* "SELLER!" read as a label for a person rather than a verdict on the
          move. Naming the winner is what the viewer is waiting to hear. */}
      {strings(locale).quiz.won(answer)}
    </div>
  );
};
