import React from 'react';
import {interpolate, spring} from 'remotion';
import {strings, type Locale} from '../i18n';
import {CFONT, CT, LAYER} from './theme';
import {SAFE} from '../safeArea';
import {textWidth} from '../textWidth';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * The quiz that opens a candle-anatomy lesson.
 *
 * The lesson already had everything a quiz needs — a constructed setup, a
 * decisive candle, and a bias the video can be graded against — and it simply
 * never asked. Asking changes what the viewer does with the next twenty
 * seconds: having committed to an answer, they now have a stake in the
 * explanation, instead of watching someone else's chart.
 *
 * It occupies the beats the lesson was spending on nothing in particular: the
 * approach leg streaming in, the pattern landing, the push-in. The answer lands
 * exactly as the anatomy beat starts, so the explanation IS the mark scheme.
 */
export const QuizLayer: React.FC<{
  frame: number;
  fps: number;
  bias: 'bullish' | 'bearish';
  /** Frame the answer is shown. Should be the frame the anatomy beat starts. */
  answerAt: number;
  /** Rotates the wording so a batch of these does not open the same way twice. */
  variant?: number;
  locale?: Locale;
}> = ({frame, fps, bias, answerAt, variant = 0, locale}) => {
  // Gone before the anatomy labels arrive; nothing of the quiz overlaps them.
  const out = interpolate(frame, [answerAt + 110, answerAt + 144], [1, 0], clamp);
  if (out <= 0) return null;

  /*
   * The question band and the lesson header want the same 244px of screen, and
   * they cannot share it — the first cut drew one straight through the other.
   * They take turns instead: the band holds the top until the answer has landed
   * and been read, then clears, and the header fades in behind it to open the
   * explanation. HEADER_BACK_AT is the frame the header may start returning;
   * CandleLesson reads it from here so the two can never drift apart.
   */

  const t = strings(locale);
  const answer: 'BUY' | 'SELL' = bias === 'bullish' ? 'BUY' : 'SELL';
  const revealed = frame >= answerAt;
  const entry = spring({frame: frame - 8, fps, config: {damping: 14}, durationInFrames: 28});

  // Three, two, one — one number a second, ending on the answer.
  const cdFrom = answerAt - 180;
  const secsLeft = Math.ceil((answerAt - frame) / 60);
  const counting = frame >= cdFrom && frame < answerAt;

  const pill = (side: 'BUY' | 'SELL') => {
    const isAnswer = side === answer;
    const label = side === 'BUY' ? t.quiz.buy : t.quiz.sell;
    const color = side === 'BUY' ? CT.up : CT.down;
    const pop = revealed && isAnswer
      ? spring({frame: frame - answerAt, fps, config: {damping: 11}, durationInFrames: 26})
      : 0;
    return (
      <div
        style={{
          padding: '16px 40px',
          borderRadius: 60,
          background: color,
          // After the answer the loser dims rather than disappears: the viewer
          // has to see which one they picked, not just which one was right.
          opacity: revealed && !isAnswer ? 0.22 : 1,
          transform: `scale(${1 + pop * 0.12})`,
          boxShadow: revealed && isAnswer ? `0 0 54px ${color}` : 'none',
          fontSize: 62,
          fontWeight: 900,
          color: '#08131c',
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
    );
  };

  const verdict = t.quiz.won(answer);
  // The top band clears first; the verdict at the bottom outlives it, because
  // that is the line the viewer is actually reading when the answer lands.
  const topOut = interpolate(frame, [answerAt + 62, answerAt + 98], [1, 0], clamp);

  return (
    <div style={{position: 'absolute', inset: 0, zIndex: LAYER.overlay, opacity: out, pointerEvents: 'none'}}>
      {/* The question, and the two answers. Owns the header band outright: on a
          quiz the lesson header is held back until this has cleared. */}
      <div
        style={{
          position: 'absolute',
          top: 92,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          opacity: entry * topOut,
          transform: `translateY(${interpolate(entry, [0, 1], [-26, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: CFONT,
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: 3,
            color: CT.accent,
            border: `2px solid ${CT.accent}`,
            borderRadius: 8,
            padding: '8px 20px',
          }}
        >
          {t.quiz.banners[variant % t.quiz.banners.length]}
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
          {pill('BUY')}
          <span style={{fontFamily: CFONT, fontSize: 40, fontWeight: 900, color: CT.inkSoft}}>
            {t.quiz.or}
          </span>
          {pill('SELL')}
        </div>
      </div>

      {/* The countdown, over the chart, where the eye already is. */}
      {counting && (
        <div
          style={{
            position: 'absolute',
            top: 470,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: CFONT,
            fontSize: 190,
            fontWeight: 900,
            color: CT.ink,
            opacity: 0.20 * topOut,
            lineHeight: 1,
          }}
        >
          {Math.max(1, secsLeft)}
        </div>
      )}

      {/* The verdict, sized from its own text so a long localisation cannot
          run off the frame. */}
      {revealed && (
        <div
          style={{
            position: 'absolute',
            // Measured off a rendered frame, not guessed: at +40 this headline
            // landed 10px under the beat-rail labels, which for 57px of cap
            // height reads as one crowded block rather than two elements.
            bottom: SAFE.bottom + 4,
            left: 40,
            right: 40,
            textAlign: 'center',
            fontFamily: CFONT,
            fontSize: Math.min(76, Math.round((1080 - 140) / Math.max(6, textWidth(verdict, 1)))),
            fontWeight: 900,
            color: answer === 'BUY' ? CT.up : CT.down,
            opacity: interpolate(frame, [answerAt, answerAt + 18], [0, 1], clamp),
            transform: `translateY(${interpolate(
              spring({frame: frame - answerAt, fps, config: {damping: 15}, durationInFrames: 24}),
              [0, 1],
              [26, 0],
            )}px)`,
          }}
        >
          {verdict}
        </div>
      )}
    </div>
  );
};

/**
 * Frames after the answer at which the lesson header may return.
 *
 * It is deliberately past the frame the question band finishes clearing (+98),
 * not crossfaded with it: two blocks of text dissolving through each other in
 * the same band is the same unreadable frame as two blocks drawn on top of
 * each other, only harder to spot in review.
 *
 * The header names the pattern and states its claim, which on a quiz is the
 * answer — so it cannot be on screen while the question is. This is the single
 * number that keeps the two halves of that handover in step.
 */
export const HEADER_BACK_AFTER = 100;
