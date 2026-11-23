import {SAFE} from '../safeArea';
import {THO_REN} from '../brand';
import React from 'react';
import {strings} from '../i18n';
import {AbsoluteFill, interpolate, spring} from 'remotion';
import type {ForexChartProps} from '../data/types';
import {CHART_BOX, TV, FONT, stroke} from './chartTheme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * A colour blast at the exact frame the trade resolves, shaped as a vignette and
 * confined to the chart.
 *
 * A flat full-frame fill — even at 30% — tinted the candles themselves, so red
 * and green stopped being distinguishable at the one moment the viewer is
 * reading the outcome off the chart. It also washed the banner and the footer,
 * which are text and only ever lose from being tinted. Glowing inward from the
 * chart's own edges punctuates just as hard and leaves both the candles and the
 * copy alone.
 */
export const Flash: React.FC<{frame: number; at: number; win: boolean}> = ({
  frame,
  at,
  win,
}) => {
  const opacity = interpolate(frame, [at - 4, at, at + 22], [0, 0.75, 0], clamp);
  if (opacity <= 0) return null;
  const c = win ? TV.up : TV.down;
  return (
    <div
      style={{
        position: 'absolute',
        left: CHART_BOX.left,
        top: CHART_BOX.top,
        width: CHART_BOX.width,
        height: CHART_BOX.height,
        background: `radial-gradient(ellipse 70% 62% at 50% 50%, transparent 0%, transparent 58%, ${c} 128%)`,
        opacity,
        zIndex: 45,
        pointerEvents: 'none',
      }}
    />
  );
};

/**
 * Outcome strip. Deliberately not a full-screen card: the chart is the proof,
 * so covering it at the payoff would throw away the moment.
 */
export const ResultStrip: React.FC<{
  props: ForexChartProps;
  frame: number;
  fps: number;
  at: number;
}> = ({props, frame, fps, at}) => {
  if (frame < at) return null;
  const rr = props.riskReward;
  if (!rr) return null;

  const t = strings(props.locale).quiz;
  const rise = spring({frame: frame - at, fps, config: {damping: 14}, durationInFrames: 28});
  const win = props.outcome.result === 'TP';
  const move = win ? Math.abs(rr.target - rr.entry) : -Math.abs(rr.stop - rr.entry);
  const ratio = Math.abs(rr.target - rr.entry) / Math.max(1e-6, Math.abs(rr.stop - rr.entry));

  return (
    <div
      style={{
        position: 'absolute',
        // Was top: 330, which landed the card on the brand header, the pills
        // and the top of the chart all at once. It belongs where the countdown
        // and the answer were — they are finished by the time it arrives.
        bottom: SAFE.bottom + 18,
        left: 40,
        right: SAFE.right,
        zIndex: 46,
        background: 'rgba(15,10,7,0.90)',
        border: `5px solid ${win ? TV.up : TV.down}`,
        borderRadius: 26,
        padding: '20px 26px',
        textAlign: 'center',
        fontFamily: FONT,
        opacity: rise,
        transform: `translateY(${interpolate(rise, [0, 1], [50, 0])}px)`,
      }}
    >
      <div style={{fontSize: 66, fontWeight: 900, color: win ? TV.up : TV.down, ...stroke(6)}}>
        {/* side is LONG / SHORT in the data; on the Vietnamese track that
            printed an English word in front of a Vietnamese sentence. */}
        {props.side === 'LONG' ? t.buy : t.sell} {win ? t.hitTp : t.stopped}
      </div>
      <div
        style={{
          fontSize: 42,
          fontWeight: 900,
          color: '#fff',
          marginTop: 6,
          fontVariantNumeric: 'tabular-nums',
          ...stroke(4),
        }}
      >
        {move >= 0 ? '+' : ''}
        {move.toFixed(1)} USD · R:R 1:{ratio.toFixed(1)}
      </div>
      <div style={{fontSize: 34, fontWeight: 800, color: TV.goldHot, marginTop: 10}}>
        {THO_REN.comment[props.locale === 'en' ? 'en' : 'vi']}
      </div>
    </div>
  );
};
