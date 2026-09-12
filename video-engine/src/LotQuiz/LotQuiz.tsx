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

  const buocTinh = (i: number, chu: string, so: number, le: number, truoc = '') => {
    const tu = LB.buoc[0] + i * 145;
    const v = lramp(frame, [tu, tu + 90] as const);
    if (v <= 0) return null;
    const ket = truoc + demLen(so, tu + 10, 95, le);
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

  /*
   * Dem len thay vi hien ra mot cai.
   *
   * Do tren ban render dau tien: chi 3,6% khung hinh doi moi frame, va co doan
   * 4,5 giay gan nhu dung hoan toan — may kiem bao LOI. Cac dinh dang khac co
   * nen ve vao lien tuc nen khong bao gio gap chuyen nay; dinh dang nay toan
   * chu, giua hai nhip khong co gi nhuc nhich. So dem len bien moi ket qua
   * thanh mot doan chuyen dong that, dung o cho nguoi xem dang nhin.
   */
  const demLen = (dich: number, tu: number, dai = 90, le = 0) => {
    const v = interpolate(frame, [tu, tu + dai], [0, 1], clamp);
    // Cham dan ve cuoi, nhu dong ho co dung lai — dung tuyen tinh thi no
    // dung khuc mot cai, trong nhu bi treo.
    const e = 1 - Math.pow(1 - v, 3);
    return (dich * e).toFixed(le);
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
      {/*
        Bang gia chay lien tuc.
        ------------------------------------------------------------------
        Do tren hai ban render: dinh dang nay chi 3,6% roi 4,3% khung hinh doi
        moi frame, va van con doan 5 giay may kiem bao LOI. Nguyen nhan khong
        phai thieu nhip — them nhip roi van hong. Nguyen nhan la khong co gi
        chuyen dong LIEN TUC: chu hien ra roi nam im cho toi nhip sau.

        Thanh tai khoan em them truoc do cao 34px, nho hon mot o do 16x9, nen
        may dem coi nhu khong doi. Sua bang cach doan thi ra the.

        Bang gia nay TROI lien tuc sang trai, nen ca dai 240px doi moi frame —
        khoang 18 trong 144 o, tren nguong 4% suot ca video. Va no khong phai
        de doi pho may do: khoang cach stop dang duoc noi bang con so, o day
        nguoi xem NHIN THAY no dai bao nhieu tren bieu do that.
      */}
      <div
        style={{
          position: 'absolute',
          zIndex: LLAYER.base,
          top: LLAYOUT.giaTop,
          left: 0,
          right: 0,
          height: LLAYOUT.giaCao,
          opacity: lramp(frame, [LB.soDu[0], LB.soDu[1]] as const) * 0.95,
          overflow: 'hidden',
        }}
      >
        <svg width={1080} height={LLAYOUT.giaCao} style={{display: 'block'}}>
          {(() => {
            const H = LLAYOUT.giaCao;
            const rong = 26;
            // Troi lien tuc: 0,42 px moi frame. Du cham de khong roi mat, du
            // deu de khong frame nao giong frame truoc.
            const troi = (frame * 0.42) % rong;
            const n = Math.ceil(1080 / rong) + 2;
            const bat = Math.floor((frame * 0.42) / rong);
            const nen = [];
            for (let i = 0; i < n; i += 1) {
              const k = bat + i;
              // Chuoi gia tat dinh theo chi so nen — cung mot frame luon ve ra
              // dung mot hinh, khong phu thuoc thu tu ve.
              const w1 = Math.sin(k * 0.37) * 0.5 + Math.sin(k * 0.11) * 0.35;
              const w2 = Math.sin(k * 0.83 + 1.7) * 0.22;
              const giua = H / 2 + w1 * H * 0.26;
              const than = 8 + Math.abs(w2) * 26;
              const len = w2 > 0;
              const x = i * rong - troi;
              nen.push(
                <g key={k}>
                  <line
                    x1={x + rong / 2}
                    x2={x + rong / 2}
                    y1={giua - than - 9 - Math.abs(w1) * 12}
                    y2={giua + than + 9 + Math.abs(w2) * 14}
                    stroke={len ? LT.up : LT.down}
                    strokeWidth={2}
                    opacity={0.5}
                  />
                  <rect
                    x={x + 5}
                    y={giua - than}
                    width={rong - 10}
                    height={than * 2}
                    fill={len ? LT.up : LT.down}
                    opacity={0.5}
                  />
                </g>,
              );
            }
            return nen;
          })()}
        </svg>
        {/* Mo dan hai ben de bang gia chim vao nen, khong thanh mot o vuong dan len */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, ${LT.bg} 0%, transparent 12%, transparent 88%, ${LT.bg} 100%),
                         linear-gradient(180deg, ${LT.bg} 0%, transparent 30%, transparent 70%, ${LT.bg} 100%)`,
          }}
        />
      </div>

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
        {buocTinh(0, t.lot.b1(props.ruiRo), tienRui, 0, '$')}
        {buocTinh(1, t.lot.b2(oz, tien2(props.stopDo)), moiLot, 0, '$')}
        {buocTinh(2, t.lot.b3, lot, soLe)}
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

          {/* Thanh tai khoan bi an dan.
              Doan nay tung la 4,5 giay dung hinh — cau chu hien ra roi khong co
              gi nhuc nhich cho toi cuoi video. Thanh nay chay het 3,5 giay, va
              no khong phai trang tri: no cho thay dung cai ma cau chu vua noi,
              bang dien tich chu khong bang con so. */}
          <div
            style={{
              marginTop: 16,
              height: 34,
              borderRadius: 8,
              background: 'rgba(232,238,245,0.10)',
              border: `1px solid ${LT.line}`,
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, phanTram) *
                  interpolate(frame, [LB.gia[0] + 80, LB.gia[0] + 290], [0, 1], clamp)}%`,
                background: LT.down,
                height: '100%',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 7,
              fontSize: 22,
              color: LT.inkSoft,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>{tien(props.soDu)}</span>
            <span style={{color: LT.down, fontWeight: 700}}>
              -{demLen(neuMotLot, LB.gia[0] + 80, 210, 0)}
            </span>
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
