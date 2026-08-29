import React from 'react';
import {interpolate, spring} from 'remotion';
import type {PatternStats} from '../data/types';
import {CB, CT} from './theme';
import {SAFE} from '../safeArea';
import {strings, type Locale} from '../i18n';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * The reality check: what this pattern actually did, every time it appeared.
 *
 * This is the beat the videos were missing. Teaching a rule and showing one
 * example that worked is survivorship bias with a chart attached — it is also
 * why the content felt shallow, because after twenty seconds the viewer has
 * learned one thing they could have read in a caption.
 *
 * The measured number is almost always lower than anyone expects, which makes it
 * both the honest thing to show and the genuinely surprising one. The break-even
 * line is drawn alongside it, because a hit rate means nothing without the
 * reward-to-risk it was earned at: at 1:2, 34% is the line, so 41% is a good
 * pattern and 25% is not, and a viewer shown only "41%" would guess wrong.
 */
export const RealityCheck: React.FC<{
  stats: PatternStats;
  frame: number;
  fps: number;
  locale?: Locale;
}> = ({stats, frame, fps, locale}) => {
  const at = CB.result[0];
  if (frame < at) return null;
  const t = strings(locale).reality;

  const step = (delay: number, damping = 18) =>
    spring({frame: frame - (at + delay), fps, config: {damping}, durationInFrames: 26});

  const headline = step(0);
  const barIn = step(26);
  const verdictIn = step(96, 14);

  // Break-even hit rate for this reward:risk. At 1:2 that is 33.3%.
  const breakEven = 100 / (1 + stats.rewardRisk);
  const edge = stats.hitRate >= breakEven;

  // The bar fills to the measured rate, so the eye compares it against the
  // break-even marker rather than reading a percentage in isolation.
  const fill = interpolate(barIn, [0, 1], [0, stats.hitRate], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: SAFE.bottom,
        left: 52,
        // The break-even marker lives at this panel's right edge, and at right:52
        // it sat under the Shorts button column — the one number in the video a
        // viewer must be able to read, covered on every phone.
        right: SAFE.right,
        zIndex: 20,
      }}
    >
      <div
        style={{
          fontSize: 34,
          fontWeight: 700,
          color: CT.ink,
          textAlign: 'center',
          opacity: headline,
          transform: `translateY(${interpolate(headline, [0, 1], [26, 0])}px)`,
        }}
      >
        {t.headline}
      </div>
      <div
        style={{
          fontSize: 27,
          fontWeight: 500,
          color: CT.inkSoft,
          textAlign: 'center',
          marginTop: 8,
          opacity: headline,
        }}
      >
        {t.source(stats)}
      </div>

      {/* Hit rate against break-even */}
      <div style={{marginTop: 22, opacity: barIn}}>
        <div
          style={{
            position: 'relative',
            height: 46,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.07)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: `${fill}%`,
              background: edge ? 'rgba(46,189,133,0.5)' : 'rgba(226,70,94,0.5)',
            }}
          />
          {/* Break-even marker, drawn over the fill so it is never hidden. */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${breakEven}%`,
              width: 3,
              background: CT.accent,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 16,
              fontSize: 28,
              fontWeight: 800,
              color: CT.ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {t.tally(stats.wins, stats.losses, Math.round(fill))}
          </div>
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 23,
            fontWeight: 600,
            color: CT.accent,
            textAlign: 'right',
          }}
        >
          {t.breakEven(stats.rewardRisk, breakEven.toFixed(0))}
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          textAlign: 'center',
          fontSize: 33,
          fontWeight: 800,
          color: edge ? CT.up : CT.down,
          opacity: verdictIn,
          transform: `scale(${interpolate(verdictIn, [0, 1], [0.85, 1])})`,
        }}
      >
        {edge
          ? t.edge(stats.expectancyR)
          : t.noEdge(stats.expectancyR)}
      </div>
      <div
        style={{
          marginTop: 6,
          textAlign: 'center',
          fontSize: 24,
          fontWeight: 500,
          color: CT.inkSoft,
          opacity: verdictIn,
        }}
      >
        {edge
          ? t.footEdge
          : t.foot}
      </div>
    </div>
  );
};
