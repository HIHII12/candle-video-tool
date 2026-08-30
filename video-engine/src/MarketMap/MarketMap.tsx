import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {MarketMapProps} from '../data/types';
import {useLightweightChart} from '../XauChart/useLightweightChart';
import {ChartEdges} from '../ChartEdges';
import {slowPush} from '../camera';
import {BrandMark} from '../BrandMark';
import {strings} from '../i18n';
import {ChochMark, PlanPath, TrendLine, ZoneBand} from './Marks';
import {
  MAP_BOX,
  MAP_STEPS,
  MB,
  MFONT,
  MT,
  MTEXT,
  mapShownAt,
  mease,
  mramp,
  zoneColor,
  zoneProgress,
} from './theme';
import {CHANNEL_MARK} from '../brand';
import {SAFE} from '../safeArea';
import {Soundtrack} from '../audio/Soundtrack';
import {mapCues} from '../audio/cues';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Daily market map — the fourth format, and the only forward-looking one.
 *
 * The other three answer "what happened next", which needs candles withheld and
 * replayed. This one answers "where does it matter tomorrow", so every candle is
 * on screen from the start and the empty space to the right is the point: it is
 * where the plan gets drawn.
 *
 * The plan is a projection, not a measurement. It is the one line in the project
 * that is not derived from candles that exist, so it says so on screen, and the
 * video never reports it as having resolved.
 */
export const MarketMap: React.FC<MarketMapProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const total = props.candles.length;
  const shown = mapShownAt(total, frame);

  // Vertical window covers the candles plus every band, so nothing a label
  // points at can sit off screen.
  const prices = [
    ...props.candles.flatMap((c) => [c.high, c.low]),
    ...props.zones.flatMap((z) => [z.top, z.bottom]),
    ...props.path.map((w) => w.price),
  ];
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const padY = (hi - lo) * 0.06 || 1;

  /**
   * The opening move: start on where price actually is, pull back to the map.
   *
   * A slow push was tried first and measured: it moved the frame by about a
   * tenth of a pixel between sampled frames, and both the frame check and the
   * eye read the first ten seconds as a still image — the candles finish
   * arriving at nine seconds and nothing else lands until the trend line at ten.
   * On a light chart a gentle zoom simply does not change enough pixels.
   *
   * So the camera starts tight on the most recent bars, which is where a trader
   * looks first anyway, and widens to the full map as the bars fill in. That is
   * a real move with real pixel change, and it says what the format is for:
   * here is the price, now here is everything around it.
   */
  const recent = props.candles.slice(-18).flatMap((c) => [c.high, c.low]);
  const rLo = Math.min(...recent);
  const rHi = Math.max(...recent);
  const rPad = (rHi - rLo) * 0.18 || 1;
  const full = {minValue: lo - padY, maxValue: hi + padY};
  const near = {minValue: rLo - rPad, maxValue: rHi + rPad};
  const openT = mease(mramp(frame, MB.candles));
  const openWindow = slowPush(
    {
      minValue: near.minValue + (full.minValue - near.minValue) * openT,
      maxValue: near.maxValue + (full.maxValue - near.maxValue) * openT,
    },
    // The push carries on underneath once the pull-back has finished, so the
    // twenty-five seconds of annotation that follow are never perfectly still.
    frame / durationInFrames,
    0.2,
    0.08,
  );

  // Reserve the projection space on the right from the first frame. Growing it
  // later would slide every band and marker sideways mid-video.
  const logical = {from: -0.6, to: total - 1 + props.projectBars + 0.6};

  const {containerRef, coords} = useLightweightChart(
    props,
    shown,
    openWindow,
    {bg: MT.bg, up: MT.up, down: MT.down, box: MAP_BOX},
    logical,
  );

  const titleIn = spring({frame: frame - 6, fps, config: {damping: 200}, durationInFrames: 26});
  const t = strings(props.locale);
  const step = [...MAP_STEPS].reverse().find((s) => frame >= s.from);
  const bullish = props.bias === 'bullish';
  const biasColor = bullish ? MT.up : MT.down;

  const summaryIn = spring({
    frame: frame - MB.summary[0],
    fps,
    config: {damping: 16},
    durationInFrames: 30,
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${MT.bgTop} 0%, ${MT.bg} 38%)`,
        fontFamily: MTEXT,
        color: MT.ink,
      }}
    >
      {/* Header: instrument, timeframe, bias. */}
      <div
        style={{
          position: 'absolute',
          top: 66,
          left: 56,
          right: 56,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [-24, 0])}px)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
          }}
        >
          <span style={{fontFamily: MFONT, fontSize: 74, letterSpacing: -1}}>
            {props.pair}
          </span>
          <span
            style={{
              fontFamily: MTEXT,
              fontSize: 34,
              fontWeight: 800,
              color: '#fff',
              background: MT.ink,
              padding: '9px 20px',
              borderRadius: 11,
              letterSpacing: 1.5,
            }}
          >
            {props.timeframe}
          </span>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 20}}>
          <span
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: '#fff',
              background: biasColor,
              padding: '8px 20px',
              borderRadius: 10,
              letterSpacing: 1.2,
            }}
          >
            {t.map.bias(bullish)}
          </span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: MT.inkSoft,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {props.lastPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Chart canvas */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: MAP_BOX.left,
          top: MAP_BOX.top,
          width: MAP_BOX.width,
          height: MAP_BOX.height,
        }}
      />

      {/* Above the marks, not below them. This format's zone bands are drawn
          the full width of the chart on purpose, so they reached both frame
          edges and painted straight over a fade that was sitting underneath
          them. */}
      <ChartEdges box={MAP_BOX} bg={MT.bg} zIndex={15} />

      {/* The map's own header already owns the top-right with its timeframe
          badge, so the mark drops below the header rule instead. */}
      {props.brandMark ? (
        <BrandMark file={props.brandMark} top={196} size={80} opacity={0.85} />
      ) : null}

      {/* Marks overlay. zIndex matters: the chart canvas paints over siblings. */}
      {coords && (
        <svg
          width={MAP_BOX.width}
          height={MAP_BOX.height}
          style={{
            position: 'absolute',
            left: MAP_BOX.left,
            top: MAP_BOX.top,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {props.trendline && (
            <TrendLine
              line={props.trendline}
              coords={coords}
              width={MAP_BOX.width}
              height={MAP_BOX.height}
              reveal={mramp(frame, MB.trend)}
            />
          )}
          {props.zones.map((z, i) => (
            <ZoneBand
              key={`${z.label}-${z.index}`}
              zone={z}
              coords={coords}
              width={MAP_BOX.width}
              // Clear of the platform's button column: a zone whose name is
              // covered is a zone the viewer cannot use. See src/safeArea.ts.
              labelRight={MAP_BOX.width - SAFE.right - 14}
              reveal={zoneProgress(frame, i, props.zones.length)}
            />
          ))}
          {props.choch.map((c, i) => (
            <ChochMark
              key={c.index}
              point={c}
              coords={coords}
              reveal={mramp(frame, [MB.choch[0] + i * 40, MB.choch[1] + i * 40] as const)}
            />
          ))}
          <PlanPath
            path={props.path}
            coords={coords}
            width={MAP_BOX.width}
            reveal={mramp(frame, MB.path)}
          />
        </svg>
      )}

      {/* Narration line for the current beat. */}
      {step && (
        <div
          style={{
            position: 'absolute',
            bottom: 232,
            left: 56,
            right: 56,
            textAlign: 'center',
            fontSize: 40,
            fontWeight: 800,
            color: MT.ink,
            // Without this the chart canvas paints over it, which clipped the
            // top of every line that reached into the chart's own box.
            zIndex: 20,
          }}
        >
          {t.map.steps[MAP_STEPS.indexOf(step)] ?? step.text}
        </div>
      )}

      {/* Closing summary: the levels to watch, in one line. */}
      {frame >= MB.summary[0] && (
        <div
          style={{
            position: 'absolute',
            bottom: 300,
            left: 40,
            right: 40,
            background: MT.planSoft,
            border: `4px solid ${MT.plan}`,
            borderRadius: 22,
            padding: '18px 24px',
            textAlign: 'center',
            zIndex: 20,
            opacity: summaryIn,
            transform: `translateY(${interpolate(summaryIn, [0, 1], [40, 0])}px)`,
          }}
        >
          <div style={{fontFamily: MFONT, fontSize: 40, color: MT.plan}}>LEVELS TO WATCH</div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 12,
            }}
          >
            {props.zones.map((z) => (
              <span
                key={`${z.label}-${z.index}`}
                style={{
                  fontSize: 27,
                  fontWeight: 800,
                  color: '#fff',
                  background: zoneColor(z.kind),
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {z.label} {((z.top + z.bottom) / 2).toFixed(1)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Our own mark. A reference channel's initials are not ours to reuse. */}
      <div
        style={{
          position: 'absolute',
          bottom: SAFE.bottom - 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: MFONT,
          fontSize: 34,
          letterSpacing: 6,
          color: MT.inkFaint,
        }}
      >
        {CHANNEL_MARK}
      </div>

      {/* The plan is a projection. Saying so is not optional. */}
      <div
        style={{
          position: 'absolute',
          bottom: 62,
          left: 40,
          right: 40,
          textAlign: 'center',
          fontSize: 25,
          fontWeight: 700,
          color: MT.inkSoft,
          lineHeight: 1.35,
        }}
      >
        {t.map.provenance(props.pair)}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 22,
          left: 40,
          right: 40,
          textAlign: 'center',
          fontSize: 22,
          fontWeight: 700,
          color: MT.inkFaint,
        }}
      >
        {t.disclaimer}
      </div>
      <Soundtrack bed="light" cues={mapCues()} durationInFrames={durationInFrames} fps={fps} />
    </AbsoluteFill>
  );
};
