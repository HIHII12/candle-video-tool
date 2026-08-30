import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CandleCompareProps} from '../data/types';
import {Pane} from './Pane';
import {KB, KLAYER, KLAYOUT, KT, kramp} from './theme';
import {BrandMark} from '../BrandMark';
import {Soundtrack} from '../audio/Soundtrack';
import {SAFE} from '../safeArea';
import {strings} from '../i18n';
import {TEXT_FONT} from '../fonts';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Two confusable patterns, and the single measurement that tells them apart.
 *
 * The other four formats all answer "what is this shape". This one answers the
 * question that actually costs people money — "these two look identical, which
 * am I looking at" — and it is the only one that needs two charts on screen at
 * once, because the answer is a comparison and cannot be shown any other way.
 *
 * The structure is an argument, in order: draw one, draw the other, say what
 * they share, measure the one thing that differs, then say what each turns out
 * to be. Nothing is named until after the measurement, so the viewer is given
 * the chance to decide first.
 */
export const CandleCompare: React.FC<CandleCompareProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = strings(props.locale);

  const drawA = (f: number) => kramp(f, KB.drawA);
  const drawB = (f: number) => kramp(f, KB.drawB);
  const measure = kramp(frame, KB.diff);
  // From the moment the top chart is done, all the way to the last frame. Both
  // panes get the identical value so they never drift to different scales — the
  // bottom one is still filling while it pushes in, which is fine, and it keeps
  // the top one moving through the stretch where only the bottom one draws.
  const zoom = (f: number) => kramp(f, [KB.drawA[1], durationInFrames - 40] as const);
  const settle = spring({frame, fps, config: {damping: 200}, durationInFrames: 26});

  const sameIn = interpolate(
    frame,
    [KB.same[0], KB.same[0] + 26, KB.diff[0] - 20, KB.diff[0] + 10],
    [0, 1, 1, 0],
    clamp,
  );
  const diffIn = interpolate(
    frame,
    [KB.diff[0], KB.diff[0] + 26, KB.verdict[0] - 20, KB.verdict[0] + 10],
    [0, 1, 1, 0],
    clamp,
  );
  const verdictIn = kramp(frame, [KB.verdict[0], KB.verdict[0] + 40] as const);
  const whyIn = kramp(frame, [KB.why[0], KB.why[0] + 40] as const);

  const measureLabel = props.metric === 'body' ? t.compare.body : t.compare.bar;

  /**
   * One vertical scale for both panes, in percent of price.
   *
   * Measured over the bars the camera actually ends on, not the whole series:
   * the approach legs are there to give the pattern context, and letting a wide
   * early swing set the scale would squash the two candles being compared back
   * down to the size at which they look alike.
   */
  const relSpan = React.useMemo(() => {
    const rel = (side: typeof props.left) => {
      const key = side.indices[side.indices.length - 1];
      const bars = side.candles.slice(Math.max(0, key - 4), key + 1);
      if (!bars.length) return 0;
      const hi = Math.max(...bars.map((c) => c.high));
      const lo = Math.min(...bars.map((c) => c.low));
      const m = (hi + lo) / 2;
      return m ? (hi - lo) / Math.abs(m) : 0;
    };
    return Math.max(rel(props.left), rel(props.right));
  }, [props.left, props.right]);

  /**
   * The height the closing push-in settles at — again shared, again the larger.
   *
   * Three times the taller candle's own range, so the candle fills roughly a
   * third of its pane at the end. Tighter than that and the approach bars leave
   * the frame, which takes the context away exactly when the verdict needs it.
   */
  const focusSpan = React.useMemo(() => {
    const rel = (side: typeof props.left) => {
      const k = side.candles[side.indices[side.indices.length - 1]];
      const m = (k.high + k.low) / 2;
      return m ? (k.high - k.low) / Math.abs(m) : 0;
    };
    return Math.max(rel(props.left), rel(props.right)) * 3;
  }, [props.left, props.right]);

  // Held back until the verdict, then run right to the end.
  const focus = (f: number) =>
    kramp(f, [KB.verdict[0], durationInFrames - 30] as const) * 0.85;

  const nameTag = (side: typeof props.left, shown: number, top: number) => (
    <div
      style={{
        position: 'absolute',
        zIndex: KLAYER.overlay,
        top,
        left: 56,
        opacity: shown,
        fontSize: 30,
        fontWeight: 800,
        letterSpacing: 1.4,
        color: KT.inkSoft,
        // Named only once the measurement has been made, so the viewer is not
        // told the answer before being shown how to reach it.
        transform: `translateX(${interpolate(shown, [0, 1], [-18, 0])}px)`,
      }}
    >
      {side.name}
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${KT.bgTop} 0%, ${KT.bg} 24%)`,
        fontFamily: TEXT_FONT,
      }}
    >
      <div
        style={{
          position: 'absolute',
          zIndex: KLAYER.overlay,
          top: KLAYOUT.headerTop,
          left: 60,
          right: props.brandMark ? SAFE.right + 130 : SAFE.right,
          transform: `translateY(${interpolate(settle, [0, 1], [-14, 0])}px)`,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 3,
            color: KT.accent,
            border: `1.5px solid ${KT.accent}`,
            borderRadius: 6,
            padding: '6px 14px',
          }}
        >
          {t.compare.badge}
        </div>
        <div
          style={{
            fontSize: 62,
            fontWeight: 800,
            color: KT.ink,
            marginTop: 20,
            lineHeight: 1.06,
            textWrap: 'balance',
          }}
        >
          {props.title}
        </div>
      </div>

      {props.brandMark ? <BrandMark file={props.brandMark} /> : null}

      <Pane
        side={props.left}
        box={KLAYOUT.a}
        frame={frame}
        drawAt={drawA}
        measure={measure}
        zoomAt={zoom}
        relSpan={relSpan}
        focusAt={focus}
        focusSpan={focusSpan}
        metric={props.metric}
        label={measureLabel}
      />
      <Pane
        side={props.right}
        box={KLAYOUT.b}
        frame={frame}
        drawAt={drawB}
        measure={measure}
        zoomAt={zoom}
        relSpan={relSpan}
        focusAt={focus}
        focusSpan={focusSpan}
        metric={props.metric}
        label={measureLabel}
      />

      {nameTag(props.left, verdictIn, KLAYOUT.a.top - 44)}
      {nameTag(props.right, verdictIn, KLAYOUT.b.top - 44)}

      {/* The seam between the panes carries one line at a time: what they share,
          then what to measure. Putting it here rather than at the bottom means
          the eye reads it without leaving the comparison. */}
      <div
        style={{
          position: 'absolute',
          zIndex: KLAYER.overlay,
          top: KLAYOUT.seamTop,
          left: 56,
          right: SAFE.right,
          textAlign: 'center',
        }}
      >
        <div style={{fontSize: 33, fontWeight: 600, color: KT.inkSoft, opacity: sameIn}}>
          {props.same}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            fontSize: 36,
            fontWeight: 800,
            color: KT.measure,
            opacity: diffIn,
          }}
        >
          {props.diff}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          zIndex: KLAYER.overlay,
          top: KLAYOUT.verdictTop,
          left: 56,
          right: SAFE.right,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {[props.left, props.right].map((side, i) => {
          const step = interpolate(
            verdictIn,
            [i * 0.28, 0.55 + i * 0.28],
            [0, 1],
            clamp,
          );
          return (
            <div
              key={side.name}
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'baseline',
                opacity: step,
                transform: `translateY(${interpolate(step, [0, 1], [16, 0])}px)`,
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: side.bias === 'bullish' ? KT.up : KT.down,
                  whiteSpace: 'nowrap',
                }}
              >
                {side.name}
              </span>
              <span style={{fontSize: 28, fontWeight: 500, color: KT.inkSoft, lineHeight: 1.3}}>
                {side.verdict}
              </span>
            </div>
          );
        })}

        <div
          style={{
            marginTop: 8,
            fontSize: 31,
            fontWeight: 700,
            color: KT.ink,
            opacity: whyIn,
            transform: `translateY(${interpolate(whyIn, [0, 1], [14, 0])}px)`,
            textWrap: 'balance',
          }}
        >
          {props.why}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          zIndex: KLAYER.overlay,
          top: KLAYOUT.disclaimerY,
          left: 56,
          right: 56,
          textAlign: 'center',
          fontSize: 21,
          fontWeight: 500,
          color: KT.inkFaint,
        }}
      >
        {props.note} · {t.disclaimer}
      </div>

      <Soundtrack
        bed="dark"
        cues={[
          {at: KB.drawA[0], sound: 'whoosh', gain: 0.8},
          {at: KB.drawB[0], sound: 'whoosh', gain: 0.8},
          {at: KB.same[0], sound: 'thud', gain: 0.5},
          {at: KB.diff[0], sound: 'riser', gain: 0.7},
          {at: KB.verdict[0], sound: 'thud', gain: 0.6},
        ]}
        durationInFrames={durationInFrames}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
