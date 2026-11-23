import React from 'react';
import {interpolate, spring} from 'remotion';
import {TV, FONT, stroke, QUIZ_STRIP} from './chartTheme';
import {strings, type Locale} from '../i18n';
import {CHANNEL_MARK} from '../brand';
import {SAFE} from '../safeArea';
import {Img, staticFile} from 'remotion';
import {THO_REN} from '../brand';

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
        // Under the brand header, which now owns the first row of the band.
        top: SAFE.top + 118,
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
        {/* Was a hardcoded "or" — one English word sitting between two
            Vietnamese buttons, on every video of the Vietnam track. */}
        {t.or}
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
        // Was 330. This is the verdict, set at 150px, so its box reached up
        // from y=1590 — the bottom third of it printed under the caption bar.
        bottom: SAFE.bottom,
        height: QUIZ_STRIP,
        lineHeight: `${QUIZ_STRIP}px`,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: FONT,
        fontSize: 104,
        fontWeight: 900,
        color: '#fff',
        transform: `scale(${interpolate(beat, [0, 1], [1.4, 1])})`,
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
        // Was 330. This is the verdict, set at 150px, so its box reached up
        // from y=1590 — the bottom third of it printed under the caption bar.
        bottom: SAFE.bottom,
        height: QUIZ_STRIP,
        lineHeight: `${QUIZ_STRIP}px`,
        left: 0,
        // Centred in the readable width, not the frame: centred on 1080 the
        // last letter of "ĐÁP ÁN · BÁN" ran under the button column.
        right: SAFE.right,
        textAlign: 'center',
        fontFamily: FONT,
        // Sized from the text, not fixed. The English verdict is eleven
        // characters and fits at 104; the Vietnamese one is thirteen and ran
        // into both edges of the frame at the same size.
        fontSize: Math.min(84, Math.round(900 / Math.max(9, strings(locale).quiz.won(answer).length))),
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


/**
 * Dau trang thuong hieu: logo + ten kenh, ngay duoi hang chip cua Shorts.
 *
 * Thay cho bang vang "DEN LUOT BAN" cu: bang do nam tron trong vung bi giao dien
 * Shorts phu, va dung im ca 35 giay. Ten kenh o day thi luon thay duoc, va moi
 * video deu dong dau cung mot thuong hieu.
 */
export const ForgeHeader: React.FC<{frame: number; fps: number; locale?: Locale; logo: string}> = ({
  frame, fps, locale, logo,
}) => {
  const entry = spring({frame, fps, config: {damping: 14}, durationInFrames: 24});
  // Anh lua chay nhe qua chu: dong, de chu khong bao gio dung im — nhung cham
  // va mo, de no la vang nung chu khong phai den nhay.
  const sweep = ((frame * 1.6) % 900) - 300;
  return (
    <div
      style={{
        position: 'absolute',
        top: SAFE.top + 6,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 18,
        zIndex: 40,
        opacity: entry,
        transform: `translateY(${interpolate(entry, [0, 1], [-24, 0])}px)`,
      }}
    >
      <Img src={staticFile(`brand/${logo}`)} style={{width: 96, height: 96, objectFit: 'contain'}} />
      <span
        style={{
          fontFamily: FONT,
          fontSize: 58,
          fontWeight: 900,
          letterSpacing: 2,
          backgroundImage: `linear-gradient(100deg, ${TV.gold} 0%, ${TV.gold} ${sweep}px, #fff4d6 ${sweep + 60}px, ${TV.gold} ${sweep + 120}px, #c98a1c 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.55))',
        }}
      >
        {THO_REN.name[locale === 'en' ? 'en' : 'vi']}
      </span>
    </div>
  );
};

/**
 * Cau moc hai giay dau — thu quyet dinh video co duoc xem tiep hay khong.
 *
 * Dat ngay tren bieu do, chu vang nung lon, roi tan di dung luc nen bat dau
 * chay. Cau xoay vong theo tung video.
 */
export const HookCard: React.FC<{frame: number; fps: number; text: string; top: number; height: number}> = ({
  frame, fps, text, top, height,
}) => {
  const OUT = [96, 124];
  if (frame > OUT[1]) return null;
  const pop = spring({frame, fps, config: {damping: 10, mass: 0.7}, durationInFrames: 22});
  const out = interpolate(frame, OUT, [1, 0], clamp);
  const lines = text.split('\n');
  // Sized from the longest line, so a long hook stays on the two lines it was
  // written as. At a fixed 92px "CÂY NẾN TIẾP THEO" wrapped its last word onto
  // a line of its own and the card read as three ragged lines.
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(92, Math.floor(1300 / Math.max(10, longest)));
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: SAFE.right,
        height,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: `radial-gradient(ellipse at center, rgba(15,10,7,0.82) 0%, rgba(15,10,7,0.55) 55%, rgba(15,10,7,0) 80%)`,
        opacity: out,
      }}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily: FONT,
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1.08,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            color: i === lines.length - 1 ? TV.goldHot : TV.text,
            textShadow: `0 0 34px ${TV.ember}88, 0 4px 0 #000`,
            transform: `scale(${interpolate(pop, [0, 1], [0.7, 1])})`,
            opacity: pop,
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
};
