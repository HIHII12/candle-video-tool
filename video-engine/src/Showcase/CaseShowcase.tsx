import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Narration, duckAt, type VoiceMark} from '../audio/Narration';
import {Soundtrack, type Cue} from '../audio/Soundtrack';
import {DISPLAY_FONT, TEXT_FONT} from '../fonts';
import core from '../content/case001.json';
import mapData from '../data/map_xau_h1.json';

type Locale = 'vi' | 'en';
type NarrationLine = {at: number; text: string; tts?: string};
type Copy = (typeof core.locales)[Locale];
type Destination = (typeof core.destinations)[Locale];

export type ShowcaseProps = {locale: Locale};

const C = {
  bg: '#061317',
  panel: '#0b2025',
  panel2: '#0e2a2f',
  gold: '#f7c84b',
  gold2: '#c98718',
  cyan: '#18e0d0',
  white: '#f7fbfa',
  muted: '#9ab0b2',
  red: '#ff6b67',
  green: '#33d49d',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const marksFor = (lines: NarrationLine[], fps: number, duration: number): VoiceMark[] =>
  lines.map((line, index) => {
    const start = Math.round(line.at * fps);
    const next = lines[index + 1]?.at ?? duration;
    const end = Math.round(Math.min(next - 0.18, line.at + (fps === 60 ? 4.3 : 7)) * fps);
    return {text: line.text, startFrame: start, endFrame: Math.max(start + 1, end)};
  });

const Logo: React.FC<{size?: number}> = ({size = 94}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      border: `2px solid ${C.gold}`,
      boxShadow: '0 0 26px rgba(247,200,75,.22)',
      background: C.bg,
      flex: '0 0 auto',
    }}
  >
    <Img
      src={staticFile('brand/van-thang-invest-logo.png')}
      style={{width: '110%', height: '110%', margin: '-5%', objectFit: 'cover'}}
    />
  </div>
);

const BrandHeader: React.FC<{copy: Copy; compact?: boolean}> = ({copy, compact}) => {
  if (!core.branding.showLogo && !core.branding.showBrandName) return null;
  return <div style={{display: 'flex', alignItems: 'center', gap: compact ? 16 : 22}}>
    {core.branding.showLogo && <Logo size={compact ? 74 : 96} />}
    <div>
      <div
        style={{
          color: C.gold,
          fontFamily: DISPLAY_FONT,
          fontSize: compact ? 31 : 42,
          letterSpacing: 1.2,
        }}
      >
        XAU LAB
      </div>
      {core.branding.showBrandName && <div style={{color: C.white, fontSize: compact ? 20 : 25, fontWeight: 800, letterSpacing: 2}}>VĂN THẮNG INVEST</div>}
      {!compact && <div style={{color: C.muted, marginTop: 6, fontSize: 18}}>{copy.tagline}</div>}
    </div>
  </div>;
};

const Pill: React.FC<{children: React.ReactNode; tone?: 'gold' | 'cyan' | 'red'}> = ({children, tone = 'gold'}) => {
  const color = tone === 'cyan' ? C.cyan : tone === 'red' ? C.red : C.gold;
  return (
    <div
      style={{
        display: 'inline-flex',
        border: `1px solid ${color}80`,
        color,
        background: `${color}12`,
        borderRadius: 999,
        padding: '9px 16px',
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: 0.8,
      }}
    >
      {children}
    </div>
  );
};

type ChartProps = {
  frame: number;
  fps: number;
  width: number;
  height: number;
  reveal?: number;
  annotations?: boolean;
  compact?: boolean;
};

const GoldChart: React.FC<ChartProps> = ({frame, fps, width, height, reveal = 1, annotations = true, compact}) => {
  const candles = mapData.candles.slice(-56);
  const min = Math.min(...candles.map((d) => d.low), core.data.sellConfirmation - 5);
  const max = Math.max(...candles.map((d) => d.high), core.data.sellInvalidation + 5);
  const left = compact ? 20 : 46;
  const right = compact ? 16 : 86;
  const top = compact ? 18 : 34;
  const bottom = compact ? 28 : 48;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const x = (i: number) => left + (i + 0.5) * (innerW / candles.length);
  const y = (price: number) => top + ((max - price) / (max - min)) * innerH;
  const step = innerW / candles.length;
  const shown = Math.max(1, Math.floor(candles.length * reveal));
  const zoneTop = y(core.data.decisionZoneHigh);
  const zoneBottom = y(core.data.decisionZoneLow);
  const pulse = 0.5 + 0.5 * Math.sin(frame / fps * Math.PI * 2 / 2.4);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="chart-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#102c31" />
          <stop offset="1" stopColor="#07191d" />
        </linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect width={width} height={height} rx={compact ? 20 : 28} fill="url(#chart-bg)" stroke="#2c4b4f" />
      {[0, 1, 2, 3, 4].map((i) => {
        const yy = top + (innerH / 4) * i;
        return <line key={i} x1={left} x2={width - right} y1={yy} y2={yy} stroke="#6d858a" strokeOpacity={0.16} />;
      })}
      {annotations && (
        <>
          <rect
            x={left}
            y={zoneTop}
            width={innerW}
            height={Math.max(9, zoneBottom - zoneTop)}
            fill={C.gold}
            opacity={0.12 + pulse * 0.08}
          />
          <line x1={left} x2={width - right} y1={y(core.data.sellConfirmation)} y2={y(core.data.sellConfirmation)} stroke={C.red} strokeDasharray="10 9" strokeOpacity={0.8} />
          <line x1={left} x2={width - right} y1={y(core.data.buyConfirmation)} y2={y(core.data.buyConfirmation)} stroke={C.green} strokeDasharray="10 9" strokeOpacity={0.8} />
        </>
      )}
      {candles.slice(0, shown).map((d, i) => {
        const up = d.close >= d.open;
        const color = up ? C.cyan : '#f2a44a';
        const bodyTop = y(Math.max(d.open, d.close));
        const bodyBottom = y(Math.min(d.open, d.close));
        return (
          <g key={d.time}>
            <line x1={x(i)} x2={x(i)} y1={y(d.high)} y2={y(d.low)} stroke={color} strokeWidth={Math.max(1.3, step * 0.1)} />
            <rect
              x={x(i) - Math.max(2, step * 0.3)}
              y={bodyTop}
              width={Math.max(4, step * 0.6)}
              height={Math.max(2, bodyBottom - bodyTop)}
              fill={up ? '#0d5f59' : '#7c451e'}
              stroke={color}
              strokeWidth={1.4}
            />
          </g>
        );
      })}
      {annotations && !compact && (
        <>
          <text x={width - right - 8} textAnchor="end" y={zoneTop + 18} fill={C.gold} fontSize="17" fontWeight="800">DECISION ZONE</text>
          <text x={width - right - 8} textAnchor="end" y={y(core.data.buyConfirmation) - 7} fill={C.green} fontSize="15" fontWeight="800">BUY CONFIRM</text>
          <text x={width - right - 8} textAnchor="end" y={y(core.data.sellConfirmation) + 20} fill={C.red} fontSize="15" fontWeight="800">SELL CONFIRM</text>
        </>
      )}
    </svg>
  );
};

const ChoiceRow: React.FC<{copy: Copy; selected?: boolean; countdown?: number; large?: boolean}> = ({copy, selected, countdown, large}) => {
  const choices = [
    {label: 'BUY', color: C.green},
    {label: 'SELL', color: C.red},
    {label: copy.choiceWait, color: C.gold},
  ];
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: large ? 22 : 14, width: '100%'}}>
      {choices.map((choice, index) => {
        const active = selected && index === 2;
        return (
          <div
            key={choice.label}
            style={{
              minHeight: large ? 116 : 86,
              borderRadius: large ? 22 : 18,
              border: `2px solid ${active ? choice.color : `${choice.color}75`}`,
              background: active ? `${choice.color}28` : 'rgba(9,27,31,.76)',
              color: active ? choice.color : C.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: DISPLAY_FONT,
              fontSize: large ? (index === 2 ? 33 : 42) : (index === 2 ? 26 : 32),
              letterSpacing: 1.2,
              boxShadow: active ? `0 0 30px ${choice.color}33` : 'none',
            }}
          >
            {countdown && index === 2 ? countdown : choice.label}
          </div>
        );
      })}
    </div>
  );
};

const QRCard: React.FC<{copy: Copy; destination: Destination; horizontal?: boolean}> = ({copy, destination, horizontal}) => (
  <div
    style={{
      width: '100%',
      display: 'flex',
      flexDirection: horizontal ? 'row' : 'column',
      gap: horizontal ? 42 : 26,
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(145deg,rgba(13,43,48,.98),rgba(7,24,28,.98))',
      border: `2px solid ${C.gold}80`,
      borderRadius: 30,
      padding: horizontal ? '30px 46px' : '38px 38px 32px',
      boxShadow: '0 24px 70px rgba(0,0,0,.35)',
    }}
  >
    <div style={{background: '#fff', borderRadius: 18, padding: 18, lineHeight: 0, flex: '0 0 auto'}}>
      <Img src={staticFile(destination.qrAsset)} style={{width: horizontal ? 255 : 360, height: horizontal ? 255 : 360}} />
    </div>
    <div style={{textAlign: horizontal ? 'left' : 'center', maxWidth: horizontal ? 760 : 840}}>
      <div style={{fontFamily: DISPLAY_FONT, fontSize: horizontal ? 42 : 48, lineHeight: 1.16, color: C.white}}>{copy.ctaTitle}</div>
      <div style={{fontSize: horizontal ? 26 : 30, color: C.cyan, marginTop: 20, fontWeight: 800}}>{copy.ctaSub}</div>
      <div style={{fontSize: 20, color: C.gold, marginTop: 15, fontWeight: 800, letterSpacing: 1.2}}>{copy.scan}</div>
      <div style={{fontSize: 18, color: C.muted, marginTop: 10}}>{destination.handle} · {destination.url}</div>
    </div>
  </div>
);

const EngagementCard: React.FC<{locale: Locale; horizontal?: boolean}> = ({locale, horizontal}) => {
  const engagement = core.engagement[locale];
  return (
    <div style={{width: '100%', display: 'flex', flexDirection: horizontal ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: horizontal ? 54 : 28, background: 'linear-gradient(145deg,rgba(13,43,48,.98),rgba(7,24,28,.98))', border: `2px solid ${C.gold}80`, borderRadius: 30, padding: horizontal ? '42px 58px' : '48px 40px', boxShadow: '0 24px 70px rgba(0,0,0,.35)', textAlign: horizontal ? 'left' : 'center'}}>
      <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
        <div style={{fontSize: horizontal ? 35 : 29, color: C.white, border: `1px solid ${C.cyan}70`, borderRadius: 999, padding: '12px 22px'}}>LIKE</div>
        <div style={{fontSize: horizontal ? 35 : 29, color: C.bg, background: C.gold, borderRadius: 999, padding: '12px 25px', fontWeight: 900}}>{engagement.button}</div>
        <div style={{fontSize: horizontal ? 35 : 29, color: C.white, border: `1px solid ${C.cyan}70`, borderRadius: 999, padding: '12px 22px'}}>COMMENT</div>
      </div>
      <div style={{maxWidth: 820}}>
        <div style={{fontFamily: DISPLAY_FONT, fontSize: horizontal ? 48 : 54, lineHeight: 1.12, color: C.white}}>{engagement.title}</div>
        <div style={{fontSize: horizontal ? 25 : 28, color: C.cyan, marginTop: 18, fontWeight: 800}}>{engagement.sub}</div>
      </div>
    </div>
  );
};

const ShortVisual: React.FC<{copy: Copy; destination: Destination; locale: Locale; frame: number; fps: number}> = ({copy, destination, locale, frame, fps}) => {
  const seconds = frame / fps;
  const revealChart = interpolate(seconds, [3, 15.5], [0.3, 1], clamp);
  const countdown = seconds >= 19.9 ? 1 : seconds >= 18.7 ? 2 : 3;
  const introScale = spring({frame, fps, config: {damping: 16, stiffness: 120}});

  if (seconds >= 35) {
    return (
      <div style={{position: 'absolute', inset: '160px 64px 250px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 46}}>
        <BrandHeader copy={copy} />
        {core.ctaMode === 'link' ? <QRCard copy={copy} destination={destination} /> : <EngagementCard locale={locale} />}
      </div>
    );
  }

  if (seconds >= 23) {
    const p = spring({frame: frame - Math.round(23 * fps), fps, config: {damping: 15, stiffness: 105}});
    return (
      <div style={{position: 'absolute', inset: '160px 64px 270px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34}}>
        <BrandHeader copy={copy} compact />
        <div style={{height: 560, overflow: 'hidden', borderRadius: 22}}><GoldChart frame={frame} fps={fps} width={952} height={560} /></div>
        <ChoiceRow copy={copy} selected large />
        <div style={{textAlign: 'center', transform: `scale(${p})`}}>
          <div style={{fontFamily: DISPLAY_FONT, fontSize: 76, color: C.gold, letterSpacing: 2}}>{copy.reveal}</div>
          <div style={{fontSize: 29, lineHeight: 1.3, fontWeight: 800, color: C.white, marginTop: 18}}>{copy.reason}</div>
          <div style={{fontSize: 22, color: C.muted, marginTop: 16}}>{copy.invalidLevel}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{position: 'absolute', inset: '145px 64px 260px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30}}>
      <BrandHeader copy={copy} compact />
      <div style={{textAlign: 'center', transform: `scale(${introScale})`}}>
        <div style={{fontFamily: DISPLAY_FONT, color: C.white, fontSize: 66, lineHeight: 1.04}}>{copy.hook}</div>
        <div style={{color: C.cyan, fontSize: 21, marginTop: 12, fontWeight: 800}}>{copy.sourceLine}</div>
        <div style={{color: C.muted, fontSize: 17, marginTop: 5}}>{copy.notSpot}</div>
      </div>
      <GoldChart frame={frame} fps={fps} width={952} height={690} reveal={revealChart} />
      {seconds < 16 ? (
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center'}}>
          <Pill tone="cyan">{copy.structure}</Pill>
          <Pill>{copy.zone}</Pill>
          <Pill tone="red">{copy.invalidation}</Pill>
        </div>
      ) : (
        <>
          <div style={{fontSize: 28, color: C.white, fontWeight: 800}}>{copy.countdown}</div>
          <ChoiceRow copy={copy} countdown={countdown} large />
        </>
      )}
    </div>
  );
};

export const CaseShort: React.FC<ShowcaseProps> = ({locale}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const copy = core.locales[locale] as Copy;
  const destination = core.destinations[locale] as Destination;
  const lines = copy.shortNarration as NarrationLine[];
  const marks = marksFor(lines, fps, core.duration.shortSeconds);
  const cues: Cue[] = [
    {at: 0, sound: 'thud', gain: 0.42},
    {at: 3 * fps, sound: 'tick', gain: 0.42},
    {at: 7 * fps, sound: 'tick', gain: 0.36},
    {at: 11 * fps, sound: 'tick', gain: 0.36},
    {at: 16 * fps, sound: 'riser', gain: 0.22},
    {at: 20 * fps, sound: 'thud', gain: 0.35},
    {at: 23 * fps, sound: 'whoosh', gain: 0.3},
    {at: 35 * fps, sound: 'tick', gain: 0.3},
  ];

  return (
    <AbsoluteFill style={{background: C.bg, color: C.white, fontFamily: TEXT_FONT, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 28%,rgba(24,224,208,.12),transparent 42%),radial-gradient(circle at 20% 80%,rgba(247,200,75,.08),transparent 38%)'}} />
      <ShortVisual copy={copy} destination={destination} locale={locale} frame={frame} fps={fps} />
      {core.retention.progressBar && (
        <div style={{position: 'absolute', top: 112, left: 64, right: 64, height: 5, borderRadius: 99, background: '#183238', overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${(frame / durationInFrames) * 100}%`, background: `linear-gradient(90deg,${C.gold},${C.cyan})`}} />
        </div>
      )}
      {core.retention.evidenceCounter && frame < 23 * fps && (
        <div style={{position: 'absolute', top: 127, right: 64, color: C.cyan, fontWeight: 900, fontSize: 17, letterSpacing: 1.2}}>
          {Math.min(3, Math.max(1, Math.floor(frame / (4 * fps)) + 1))}/3 · {core.retention.openLoop[locale]}
        </div>
      )}
      <div style={{position: 'absolute', left: 64, right: 64, bottom: 178, display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 17}}>
        <span>CASE #001 · {core.data.symbol} · {core.data.timeframe}</span>
        <span>EDUCATIONAL · NOT INVESTMENT ADVICE</span>
      </div>
      <Soundtrack bed="dark" cues={cues} durationInFrames={durationInFrames} fps={fps} bedGain={(f) => core.voice.musicGain * duckAt(marks, f, fps)} />
      <Narration id={`showcase-short-${locale}`} marks={marks} frame={frame} tone="dark" bottom={265} volume={1} />
    </AbsoluteFill>
  );
};

const chapterForSecond = (second: number) => {
  if (second < 15) return 0;
  if (second < 50) return 1;
  if (second < 100) return 2;
  if (second < 155) return 3;
  if (second < 205) return 4;
  if (second < 260) return 5;
  return 6;
};

const Stat: React.FC<{label: string; value: string; color?: string}> = ({label, value, color = C.white}) => (
  <div style={{background: 'rgba(12,36,41,.88)', border: '1px solid #335158', borderRadius: 18, padding: '22px 26px'}}>
    <div style={{fontSize: 16, color: C.muted, letterSpacing: 1.1, fontWeight: 800}}>{label}</div>
    <div style={{fontFamily: DISPLAY_FONT, color, fontSize: 38, marginTop: 7}}>{value}</div>
  </div>
);

const LongVisual: React.FC<{copy: Copy; destination: Destination; frame: number; fps: number}> = ({copy, destination, frame, fps}) => {
  const second = frame / fps;
  const chapter = chapterForSecond(second);
  const fade = interpolate(second % 1, [0, 0.18], [0.92, 1], clamp);

  if (second >= 290) {
    return <div style={{position: 'absolute', inset: '170px 150px 90px', display: 'flex', alignItems: 'center'}}>{core.ctaMode === 'link' ? <QRCard copy={copy} destination={destination} horizontal /> : <EngagementCard locale="vi" horizontal />}</div>;
  }

  if (chapter === 0) {
    return (
      <div style={{position: 'absolute', inset: '170px 140px 95px', display: 'grid', gridTemplateColumns: '1.05fr .95fr', alignItems: 'center', gap: 70}}>
        <div>
          <Pill>{copy.longTitle}</Pill>
          <div style={{fontFamily: DISPLAY_FONT, fontSize: 92, lineHeight: 1.02, color: C.white, marginTop: 28}}>{copy.hook}</div>
          <div style={{fontSize: 30, color: C.muted, lineHeight: 1.4, marginTop: 24}}>{copy.lesson}</div>
          <div style={{marginTop: 34}}><ChoiceRow copy={copy} large /></div>
        </div>
        <GoldChart frame={frame} fps={fps} width={760} height={650} annotations />
      </div>
    );
  }

  if (chapter === 1) {
    return (
      <div style={{position: 'absolute', inset: '170px 140px 100px', display: 'grid', gridTemplateColumns: '1.25fr .75fr', gap: 54, alignItems: 'center'}}>
        <GoldChart frame={frame} fps={fps} width={1080} height={650} annotations={false} />
        <div style={{display: 'grid', gap: 18}}>
          <Stat label="SOURCE" value="YAHOO GC=F" color={C.gold} />
          <Stat label="INSTRUMENT" value="GOLD FUTURES PROXY" color={C.cyan} />
          <Stat label="TIMEFRAME" value="H1" />
          <Stat label="LAST SNAPSHOT PRICE" value={core.data.lastPrice.toFixed(1)} />
          <div style={{color: C.red, fontSize: 22, fontWeight: 800, padding: '8px 4px'}}>{copy.notSpot}</div>
        </div>
      </div>
    );
  }

  if (chapter === 2) {
    const reveal = interpolate(second, [50, 92], [0.45, 1], clamp);
    return (
      <div style={{position: 'absolute', inset: '170px 140px 100px', display: 'grid', gridTemplateColumns: '1.35fr .65fr', gap: 54, alignItems: 'center'}}>
        <GoldChart frame={frame} fps={fps} width={1170} height={680} reveal={reveal} />
        <div style={{display: 'grid', gap: 22}}>
          <Pill tone="red">{copy.structure}</Pill>
          <div style={{fontFamily: DISPLAY_FONT, fontSize: 54, color: C.white, lineHeight: 1.08}}>LOCATION ≠ CONFIRMATION</div>
          <div style={{fontSize: 25, lineHeight: 1.45, color: C.muted}}>{copy.zone}</div>
          <div style={{fontSize: 23, lineHeight: 1.4, color: C.white}}>{copy.invalidation}</div>
        </div>
      </div>
    );
  }

  if (chapter === 3) {
    const selected = second > 145;
    return (
      <div style={{position: 'absolute', inset: '175px 140px 95px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 34}}>
        <div style={{gridColumn: '1 / -1'}}><ChoiceRow copy={copy} selected={selected} large /></div>
        <div style={{background: 'rgba(11,38,39,.92)', border: `2px solid ${C.green}70`, borderRadius: 24, padding: 34}}>
          <div style={{fontFamily: DISPLAY_FONT, fontSize: 46, color: C.green}}>SCENARIO A · BUY</div>
          <div style={{fontSize: 28, lineHeight: 1.5, marginTop: 24}}>H1 close above <b>{core.data.buyConfirmation.toFixed(1)}</b></div>
          <div style={{fontSize: 25, color: C.muted, marginTop: 18}}>Invalid below {core.data.buyInvalidation.toFixed(1)}</div>
          <div style={{height: 260, marginTop: 22}}><GoldChart frame={frame} fps={fps} width={720} height={260} compact /></div>
        </div>
        <div style={{background: 'rgba(40,24,21,.72)', border: `2px solid ${C.red}70`, borderRadius: 24, padding: 34}}>
          <div style={{fontFamily: DISPLAY_FONT, fontSize: 46, color: C.red}}>SCENARIO B · SELL</div>
          <div style={{fontSize: 28, lineHeight: 1.5, marginTop: 24}}>Reject zone + H1 close below <b>{core.data.sellConfirmation.toFixed(1)}</b></div>
          <div style={{fontSize: 25, color: C.muted, marginTop: 18}}>Invalid above {core.data.sellInvalidation.toFixed(1)}</div>
          <div style={{height: 260, marginTop: 22}}><GoldChart frame={frame} fps={fps} width={720} height={260} compact /></div>
        </div>
      </div>
    );
  }

  if (chapter === 4) {
    const meter = interpolate(second, [155, 180], [0, core.data.riskPercent], clamp);
    return (
      <div style={{position: 'absolute', inset: '180px 150px 100px', display: 'grid', gridTemplateColumns: '.8fr 1.2fr', gap: 70, alignItems: 'center'}}>
        <div>
          <Pill tone="cyan">CAPITAL FIRST</Pill>
          <div style={{fontFamily: DISPLAY_FONT, fontSize: 72, color: C.white, lineHeight: 1.04, marginTop: 28}}>RISK BEFORE ENTRY</div>
          <div style={{fontFamily: DISPLAY_FONT, fontSize: 125, color: C.gold, marginTop: 28}}>{meter.toFixed(1)}%</div>
          <div style={{fontSize: 23, color: C.muted}}>Illustrative account-risk ceiling</div>
        </div>
        <div style={{display: 'grid', gap: 24}}>
          <div style={{background: C.panel, borderRadius: 26, border: '1px solid #38545a', padding: 40}}>
            <div style={{fontFamily: DISPLAY_FONT, fontSize: 40, color: C.cyan}}>DETERMINISTIC FORMULA</div>
            <div style={{fontSize: 35, lineHeight: 1.45, color: C.white, marginTop: 25}}>{copy.formula}</div>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18}}>
            <Stat label="ENTRY" value="ONLY AFTER CONFIRM" color={C.cyan} />
            <Stat label="STOP" value="STRUCTURE-BASED" color={C.red} />
            <Stat label="SIZE" value="CODE-CALCULATED" color={C.gold} />
          </div>
          <div style={{fontSize: 22, color: C.muted, lineHeight: 1.45}}>AI does not calculate price, R:R, backtest, outcome, or position size.</div>
        </div>
      </div>
    );
  }

  if (chapter === 5) {
    return (
      <div style={{position: 'absolute', inset: '175px 140px 100px', display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 56, alignItems: 'center'}}>
        <GoldChart frame={frame} fps={fps} width={1050} height={650} />
        <div style={{textAlign: 'center'}}>
          <Pill tone="gold">REPLAY RESULT</Pill>
          <div style={{fontFamily: DISPLAY_FONT, fontSize: 112, color: C.gold, marginTop: 28}}>WAIT</div>
          <div style={{fontSize: 31, lineHeight: 1.45, fontWeight: 800, color: C.white, marginTop: 20}}>{copy.discipline}</div>
          <div style={{fontSize: 23, color: C.muted, lineHeight: 1.45, marginTop: 24}}>A valid plan can produce no trade. Discipline is the outcome.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{position: 'absolute', inset: '175px 150px 100px', display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 70, alignItems: 'center'}}>
      <div><Logo size={430} /></div>
      <div style={{opacity: fade}}>
        <Pill>{copy.chapters[6]}</Pill>
        <div style={{fontFamily: DISPLAY_FONT, fontSize: 70, color: C.white, lineHeight: 1.08, marginTop: 28}}>{copy.lesson}</div>
        <div style={{fontSize: 28, lineHeight: 1.5, color: C.muted, marginTop: 30}}>WAIT is a real decision: conditions first, position size second, outcome last.</div>
      </div>
    </div>
  );
};

export const CaseFile: React.FC<ShowcaseProps> = ({locale}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const copy = core.locales[locale] as Copy;
  const destination = core.destinations[locale] as Destination;
  const lines = copy.longNarration as NarrationLine[];
  const marks = marksFor(lines, fps, core.duration.longSeconds);
  const second = frame / fps;
  const chapter = chapterForSecond(second);
  const cues: Cue[] = [0, 15, 50, 100, 155, 205, 260, 290].map((s, i) => ({at: s * fps, sound: i === 0 ? 'thud' : 'tick', gain: i === 0 ? 0.35 : 0.24}));

  return (
    <AbsoluteFill style={{background: C.bg, color: C.white, fontFamily: TEXT_FONT, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 75% 20%,rgba(24,224,208,.09),transparent 38%),radial-gradient(circle at 10% 90%,rgba(247,200,75,.08),transparent 34%)'}} />
      <div style={{position: 'absolute', top: 38, left: 72, right: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <BrandHeader copy={copy} compact />
        <div style={{textAlign: 'right'}}>
          <div style={{fontFamily: DISPLAY_FONT, fontSize: 28, color: C.gold}}>{copy.chapters[chapter]}</div>
          <div style={{fontSize: 17, color: C.muted, marginTop: 5}}>{core.data.symbol} · {core.data.display} · {core.data.timeframe}</div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 72, right: 72, top: 132, height: 3, background: '#294147'}}>
        <div style={{width: `${(frame / durationInFrames) * 100}%`, height: '100%', background: `linear-gradient(90deg,${C.gold},${C.cyan})`}} />
      </div>
      <LongVisual copy={copy} destination={destination} frame={frame} fps={fps} />
      <div style={{position: 'absolute', left: 72, right: 72, bottom: 34, display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 16}}>
        <span>CASE #001 · SOURCE: YAHOO GC=F (COMEX GOLD FUTURES PROXY)</span>
        <span>EDUCATIONAL · NOT INVESTMENT ADVICE</span>
      </div>
      <Soundtrack bed="dark" cues={cues} durationInFrames={durationInFrames} fps={fps} bedGain={(f) => core.voice.musicGain * duckAt(marks, f, fps)} />
      <Narration id="showcase-long-vi" marks={marks} frame={frame} tone="dark" bottom={74} respectShortSafeArea={false} />
    </AbsoluteFill>
  );
};

export const CaseThumbnail: React.FC<ShowcaseProps> = ({locale}) => {
  const copy = core.locales[locale] as Copy;
  return (
    <AbsoluteFill style={{background: C.bg, color: C.white, fontFamily: TEXT_FONT, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 20%,rgba(24,224,208,.18),transparent 42%),radial-gradient(circle at 0% 100%,rgba(247,200,75,.14),transparent 38%)'}} />
      <div style={{position: 'absolute', inset: '52px 70px', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 48, alignItems: 'center'}}>
        <div>
          <BrandHeader copy={copy} compact />
          <div style={{fontFamily: DISPLAY_FONT, fontSize: 75, lineHeight: 1.02, marginTop: 35}}>BUY · SELL<br />OR <span style={{color: C.gold}}>{copy.choiceWait}?</span></div>
          <div style={{fontSize: 26, color: C.cyan, fontWeight: 800, marginTop: 25}}>1 ZONE · 2 SCENARIOS · 3 CHOICES</div>
        </div>
        <div style={{position: 'relative'}}>
          <GoldChart frame={0} fps={30} width={570} height={470} annotations compact />
          <div style={{position: 'absolute', right: 22, bottom: 22, background: C.gold, color: C.bg, fontFamily: DISPLAY_FONT, fontSize: 38, padding: '14px 26px', borderRadius: 14}}>WAIT</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
