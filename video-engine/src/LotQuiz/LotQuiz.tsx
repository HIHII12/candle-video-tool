import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {LotQuizProps} from '../data/types';
import {LB, LDURATION, LFONT, LLAYER, LLAYOUT, LT, lramp} from './theme';
import {BrandMark} from '../BrandMark';
import {Soundtrack} from '../audio/Soundtrack';
import {SAFE} from '../safeArea';
import {strings} from '../i18n';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * How big should the trade be.
 *
 * Every other format on this channel answers "what is this shape on the chart".
 * This one answers the question that actually empties accounts. Gold moves a
 * hundred to three hundred pips in a session, so the same entry, the same stop
 * and the same idea end as a scratch or as a third of the account depending on
 * one number nobody put on screen.
 *
 * The stop is given in DOLLARS OF PRICE, never in pips. "One pip of gold" means
 * $0.01 to some brokers and $0.10 to others, and a video about risk that is
 * ambiguous by a factor of ten is worse than no video: a viewer who follows it
 * sizes ten times too large on the exact trade where that matters. Dollars of
 * price movement mean the same thing everywhere, and they teach the real
 * mechanic — a lot is an amount of metal.
 */
export const LotQuiz: React.FC<LotQuizProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = strings(props.locale);

  const oz = props.ozMotLot ?? 100;
  const tienRui = (props.soDu * props.ruiRo) / 100;
  const moiLot = props.stopDo * oz;
  // Rounded DOWN to the broker's step, not to nearest. Rounding up puts the
  // trade over the risk the viewer just chose, which is the one direction this
  // arithmetic must never fail in.
  const buoc = props.buocLot ?? 0.01;
  const lot = Math.floor((tienRui / moiLot) / buoc) * buoc;
  const soLe = Math.max(0, String(buoc).split('.')[1]?.length ?? 2);

  // What a full lot would have cost on this same stop — the reason the number
  // matters, in the viewer's own money rather than as a principle.
  const neuMotLot = moiLot;
  const phanTram = (neuMotLot / props.soDu) * 100;

  const tien = (n: number) =>
    '$' + n.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0});
  const tien2 = (n: number) =>
    '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

  const hienDap = frame >= LB.dap[0];
  const dapIn = spring({frame: frame - LB.dap[0], fps, config: {damping: 12}, durationInFrames: 30});

  const demCon = Math.ceil((LB.dap[0] - frame) / 60);
  const dangDem = frame >= LB.dem[0] && frame < LB.dap[0];

  const dong = (
    nhan: string,
    giaTri: string,
    nhip: readonly [number, number],
    manh = false,
  ) => {
    const v = lramp(frame, nhip);
    if (v <= 0) return null;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 20,
          padding: '18px 26px',
          background: LT.panel,
          border: `1px solid ${LT.line}`,
          borderRadius: 12,
          opacity: v,
          transform: `translateX(${interpolate(v, [0, 1], [-22, 0])}px)`,
        }}
      >
        <span style={{fontSize: 30, fontWeight: 500, color: LT.inkSoft}}>{nhan}</span>
        <span
          style={{
            fontSize: 46,
            fontWeight: 800,
            color: manh ? LT.accent : LT.ink,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {giaTri}
        </span>
      </div>
    );
  };

  const buocTinh = (i: number, chu: string, ket: string) => {
    const tu = LB.buoc[0] + i * 170;
    const v = lramp(frame, [tu, tu + 90] as const);
    if (v <= 0) return null;
    return (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          opacity: v,
          transform: `translateY(${interpolate(v, [0, 1], [14, 0])}px)`,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: LT.accent,
            minWidth: 30,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {i + 1}
        </span>
        <span style={{fontSize: 29, color: LT.inkSoft, flex: 1, lineHeight: 1.35}}>{chu}</span>
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: LT.ink,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {ket}
        </span>
      </div>
    );
  };

  const giaIn = lramp(frame, [LB.gia[0], LB.gia[0] + 90] as const);
  const luuIn = lramp(frame, [LB.luu[0], LB.luu[0] + 70] as const);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${LT.bgTop} 0%, ${LT.bg} 26%)`,
        fontFamily: LFONT,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          zIndex: LLAYER.overlay,
          top: LLAYOUT.headerTop,
          left: 56,
          right: props.brandMark ? SAFE.right + 130 : SAFE.right,
          opacity: lramp(frame, LB.hook),
        }}
      >
        <div
          style={{
            display: 'inline-block',
            fontSize: 23,
            fontWeight: 700,
            letterSpacing: 3,
            color: LT.accent,
            border: `1.5px solid ${LT.accent}`,
            borderRadius: 6,
            padding: '6px 14px',
          }}
        >
          {t.lot.badge}
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: LT.ink,
            marginTop: 18,
            lineHeight: 1.1,
            textWrap: 'balance',
          }}
        >
          {t.lot.hook(props.pair)}
        </div>
      </div>

      {/* The three inputs */}
      <div
        style={{
          position: 'absolute',
          zIndex: LLAYER.overlay,
          top: LLAYOUT.soTop,
          left: 56,
          right: SAFE.right,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {dong(t.lot.soDu, tien(props.soDu), LB.soDu)}
        {dong(t.lot.ruiRo, `${props.ruiRo}%  ·  ${tien(tienRui)}`, LB.ruiRo)}
        {dong(t.lot.stop, tien2(props.stopDo), LB.stop, true)}
      </div>

      {/* The question, then the answer in the same place. They never share a
          frame: the question fades out as the answer springs in. */}
      <div
        style={{
          position: 'absolute',
          zIndex: LLAYER.overlay,
          top: LLAYOUT.dapTop,
          left: 40,
          right: 40,
          textAlign: 'center',
        }}
      >
        {!hienDap ? (
          <div style={{opacity: lramp(frame, LB.hoi)}}>
            <div style={{fontSize: 52, fontWeight: 800, color: LT.ink, letterSpacing: 1}}>
              {t.lot.hoi}
            </div>
          </div>
        ) : (
          <div
            style={{
              opacity: dapIn,
              transform: `scale(${0.9 + 0.1 * dapIn})`,
            }}
          >
            <div style={{fontSize: 26, letterSpacing: 4, color: LT.inkSoft, fontWeight: 700}}>
              {t.lot.dapAn}
            </div>
            <div
              style={{
                fontSize: 150,
                fontWeight: 900,
                color: LT.up,
                lineHeight: 1.05,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {lot.toFixed(soLe)}
            </div>
            <div style={{fontSize: 30, color: LT.inkSoft, marginTop: -6}}>{t.lot.lot}</div>
          </div>
        )}
      </div>

      {/* The countdown owns the lower half while it runs.
          Left where it was — small, tucked under the question — it gave this
          format six seconds of empty screen below the fold, which is the one
          thing a feed reads instantly as nobody having laid the page out. It is
          also the only thing moving in that stretch, so it is what keeps the
          1.5-second visual-change rhythm alive until the answer lands. */}
      {dangDem ? (
        <div
          style={{
            position: 'absolute',
            zIndex: LLAYER.overlay,
            top: 1140,
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: interpolate(
              frame % 60,
              [0, 8, 52, 59],
              [0.9, 0.34, 0.30, 0.06],
              clamp,
            ),
          }}
        >
          <div
            style={{
              fontSize: 300,
              fontWeight: 900,
              color: LT.accent,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.max(1, demCon)}
          </div>
        </div>
      ) : null}

      {/* The working */}
      <div
        style={{
          position: 'absolute',
          zIndex: LLAYER.overlay,
          top: LLAYOUT.buocTop,
          left: 56,
          right: SAFE.right,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {buocTinh(0, t.lot.b1(props.ruiRo), tien(tienRui))}
        {buocTinh(1, t.lot.b2(oz, tien2(props.stopDo)), tien(moiLot))}
        {buocTinh(2, t.lot.b3, lot.toFixed(soLe))}
      </div>

      {/* What the wrong size costs, in this viewer's own money. */}
      {giaIn > 0 ? (
        <div
          style={{
            position: 'absolute',
            zIndex: LLAYER.overlay,
            bottom: SAFE.bottom + 96,
            left: 56,
            right: SAFE.right,
            padding: '18px 24px',
            background: 'rgba(232,87,76,0.10)',
            borderLeft: `3px solid ${LT.down}`,
            borderRadius: '0 12px 12px 0',
            opacity: giaIn,
            transform: `translateY(${interpolate(giaIn, [0, 1], [16, 0])}px)`,
          }}
        >
          <div style={{fontSize: 30, color: LT.ink, lineHeight: 1.4}}>
            {t.lot.gia(tien(neuMotLot), phanTram.toFixed(0))}
          </div>
        </div>
      ) : null}

      {/* Broker specs differ. Said plainly, because this is the one line that
          stops a viewer applying the arithmetic to an account where the
          contract size is not 100 ounces. */}
      {luuIn > 0 ? (
        <div
          style={{
            position: 'absolute',
            zIndex: LLAYER.overlay,
            bottom: SAFE.bottom + 30,
            left: 56,
            right: SAFE.right,
            fontSize: 25,
            color: LT.accent,
            opacity: luuIn,
            lineHeight: 1.35,
          }}
        >
          {t.lot.luuY}
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          top: LLAYOUT.disclaimerY,
          left: 56,
          right: SAFE.right,
          fontSize: 19,
          color: LT.inkSoft,
          opacity: 0.75,
        }}
      >
        {t.disclaimer}
      </div>

      {props.brandMark ? <BrandMark file={props.brandMark} /> : null}

      <Soundtrack
        nhac={props.nhac}
        bed="dark"
        cues={[
          {at: LB.hoi[0], sound: 'whoosh'},
          {at: LB.dap[0] - 156, sound: 'riser'},
          {at: LB.dap[0], sound: 'win'},
          {at: LB.buoc[0], sound: 'tick'},
          {at: LB.buoc[0] + 170, sound: 'tick'},
          {at: LB.buoc[0] + 340, sound: 'tick'},
          {at: LB.gia[0], sound: 'thud'},
        ]}
        durationInFrames={LDURATION}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
