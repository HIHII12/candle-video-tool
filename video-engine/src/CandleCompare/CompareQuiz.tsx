import React from 'react';
import {interpolate, spring} from 'remotion';
import {strings, type Locale} from '../i18n';
import {KB, KLAYER, KLAYOUT, KT} from './theme';
import {TEXT_FONT} from '../fonts';
import {pillWidth} from '../textWidth';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * The comparison, asked as a question.
 *
 * This format was already quiz-shaped and never said so: it withholds both
 * names until the verdict, so for twenty-six seconds the viewer is looking at
 * two charts with no way to tell which is which — which is exactly the state a
 * quiz wants them in, minus the part where they commit to an answer. Naming the
 * two panes TOP and BOTTOM and asking outright is the whole difference between
 * watching someone else measure a candle and having a stake in the measurement.
 *
 * The question sits in the band the verdict will later occupy, and clears
 * before the verdict arrives. That band is empty for the first twenty-six
 * seconds of every one of these videos, so the quiz costs no other element its
 * place.
 */
export const CompareQuiz: React.FC<{
  frame: number;
  fps: number;
  /** The pattern the viewer is asked to find. */
  askName: string;
  /** Which pane it is. */
  answer: 'TOP' | 'BOTTOM';
  locale?: Locale;
}> = ({frame, fps, askName, answer, locale}) => {
  const t = strings(locale);

  /*
   * The answer lands, is read, and the band is empty again before the verdict
   * starts drawing into it. The first cut answered on the same frame as the
   * verdict and crossfaded the two through each other in the same 200px of
   * screen — which is the "text on text" defect, not a transition.
   *
   * Answering early is also the better beat: the correct pane lights up, the
   * viewer learns whether they were right, and THEN the names arrive as
   * confirmation rather than as the answer itself.
   */
  const answerAt = KB.verdict[0] - 110;
  const out = interpolate(frame, [KB.verdict[0] - 46, KB.verdict[0] - 10], [1, 0], clamp);
  if (out <= 0) return null;

  // Nothing is on screen to reason about until the second chart has drawn.
  const entry = spring({
    frame: frame - (KB.drawB[1] - 90),
    fps,
    config: {damping: 15},
    durationInFrames: 30,
  });
  if (entry <= 0) return null;

  const question = t.quiz.whichIs(askName);
  // Sized from the text rather than assumed: these names run from "Doji" to
  // "Three Black Crows", and the long ones ran off both ends of the frame.
  const qSize = Math.min(46, Math.round((1080 - 130) / (pillWidth(question, 1, 0) || 1)));

  // A bar that drains instead of a digit that ticks. The seam between the two
  // panes is already carrying a line of copy through this whole stretch, and a
  // second number competing with it is the collision this format cannot afford.
  const timer = interpolate(frame, [KB.diff[0], answerAt], [1, 0], clamp);

  const pill = (side: 'TOP' | 'BOTTOM') => {
    const isAnswer = side === answer;
    const revealed = frame >= answerAt;
    const label = side === 'TOP' ? t.quiz.top : t.quiz.bottom;
    return (
      <div
        key={side}
        style={{
          padding: '13px 34px',
          borderRadius: 54,
          background: revealed && isAnswer ? KT.accent : 'rgba(230,237,243,0.10)',
          border: `2px solid ${revealed && isAnswer ? KT.accent : 'rgba(230,237,243,0.34)'}`,
          color: revealed && isAnswer ? '#08131c' : KT.ink,
          opacity: revealed && !isAnswer ? 0.3 : 1,
          fontSize: 44,
          fontWeight: 900,
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: KLAYER.overlay,
        top: KLAYOUT.verdictTop - 6,
        left: 56,
        right: 56,
        opacity: out * entry,
        transform: `translateY(${interpolate(entry, [0, 1], [18, 0])}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        fontFamily: TEXT_FONT,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: qSize,
          fontWeight: 800,
          letterSpacing: 1,
          color: KT.ink,
          textAlign: 'center',
          textWrap: 'balance',
        }}
      >
        {question}
      </div>
      <div style={{display: 'flex', gap: 24}}>{pill('TOP')}{pill('BOTTOM')}</div>
      <div
        style={{
          width: 360,
          height: 6,
          borderRadius: 3,
          background: 'rgba(230,237,243,0.14)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${timer * 100}%`,
            height: '100%',
            background: KT.accent,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
};
