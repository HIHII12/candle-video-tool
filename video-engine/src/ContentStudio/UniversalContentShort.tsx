import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import core from '../content/case001.json';
import map from '../data/map_xau_h1.json';
import candleLesson from '../data/lesson_bullish-engulfing.json';
import {DISPLAY_FONT, TEXT_FONT} from '../fonts';
import {Narration, duckAt, type VoiceMark} from '../audio/Narration';
import {Soundtrack, type Cue} from '../audio/Soundtrack';

type Locale = 'vi' | 'en';
type Line = {at: number; text: string; tts?: string};
export type UniversalProps = {locale: Locale};
const C = {bg:'#061317',panel:'#0b2429',line:'#29484e',gold:'#f7c84b',cyan:'#18e0d0',white:'#f5fbfa',muted:'#91a9ab',red:'#ff6b67',green:'#33d49d'};
const clamp = {extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const ratios = [0,.236,.382,.5,.618,.786,1];

const marksFor = (lines: Line[], fps: number): VoiceMark[] => lines.map((line,index)=>({text:line.text,startFrame:Math.round(line.at*fps),endFrame:Math.round(Math.min(lines[index+1]?.at ?? 42.8,line.at+4.6)*fps)}));

const Candles:React.FC<{frame:number;mode:string}> = ({frame,mode}) => {
  const candleMode=mode==='candle-pattern'||mode==='candle-anatomy';
  const data=(candleMode ? candleLesson.candles.slice(0,26) : map.candles.slice(-42)); const lo=Math.min(...data.map(d=>d.low)); const hi=Math.max(...data.map(d=>d.high));
  const y=(v:number)=>510-((v-lo)/Math.max(.001,hi-lo))*440; const step=890/data.length;
  const shown=Math.floor(interpolate(frame,[180,900],[12,data.length],clamp));
  const fibHigh=core.content.fibonacciHigh; const fibLow=core.content.fibonacciLow;
  return <svg viewBox="0 0 930 560" style={{width:'100%',height:mode==='indicator'?300:'100%'}}>
    <defs><linearGradient id="gp" x1="0" x2="1"><stop stopColor={C.gold} stopOpacity=".2"/><stop offset="1" stopColor={C.cyan} stopOpacity=".05"/></linearGradient></defs>
    {[0,1,2,3,4].map(i=><line key={i} x1="20" x2="910" y1={50+i*108} y2={50+i*108} stroke="#1d3a40"/>)}
    {mode==='smc'&&<><rect x="500" y={y(core.data.decisionZoneHigh)} width="390" height={Math.max(6,y(core.data.decisionZoneLow)-y(core.data.decisionZoneHigh))} fill="url(#gp)" stroke={C.gold}/><text x="520" y={y(core.data.decisionZoneHigh)-10} fill={C.gold} fontSize="18" fontWeight="800">ORDER BLOCK</text><line x1="420" x2="875" y1={y(core.data.sellConfirmation)} y2={y(core.data.sellConfirmation)} stroke={C.red} strokeDasharray="8 7"/><text x="720" y={y(core.data.sellConfirmation)+25} fill={C.red} fontSize="18" fontWeight="800">CHoCH / BOS</text></>}
    {mode==='fibonacci'&&ratios.map((ratio,i)=>{const price=fibHigh-(fibHigh-fibLow)*ratio;return <g key={ratio}><line x1="330" x2="900" y1={y(price)} y2={y(price)} stroke={i===4?C.gold:C.cyan} strokeOpacity={i===4?1:.55} strokeWidth={i===4?3:1}/><text x="835" y={y(price)-7} fill={i===4?C.gold:C.muted} fontSize="16" fontWeight="800">{ratio.toFixed(3)} · {price.toFixed(1)}</text></g>})}
    {data.slice(0,shown).map((d,i)=>{const x=25+i*step+step/2,up=d.close>=d.open,top=y(Math.max(d.open,d.close)),bottom=y(Math.min(d.open,d.close)),focus=candleMode&&candleLesson.pattern.indices.includes(i);return <g key={d.time} opacity={focus?1:.85}><line x1={x} x2={x} y1={y(d.high)} y2={y(d.low)} stroke={up?C.green:C.red} strokeWidth={focus?3:1.6}/><rect x={x-Math.max(3,step*.28)} y={top} width={Math.max(6,step*.56)} height={Math.max(3,bottom-top)} rx="1" fill={up?C.green:C.red} stroke={focus?C.gold:'none'} strokeWidth="2"/></g>})}
    {candleMode&&shown>18&&<><rect x={25+16*step} y={y(candleLesson.pattern.bodyHigh)-18} width={step*2.25} height={Math.max(30,y(candleLesson.pattern.bodyLow)-y(candleLesson.pattern.bodyHigh)+36)} fill="none" stroke={C.gold} strokeWidth="3" rx="8"/><text x={25+15.2*step} y={y(candleLesson.pattern.bodyHigh)-30} fill={C.gold} fontSize="18" fontWeight="900">PATTERN FOCUS</text></>}
  </svg>;
};

const RSI:React.FC = () => {
  const closes=map.candles.slice(-42).map(d=>d.close); const values=closes.map((_,i)=>45+22*Math.sin(i*.45)+8*Math.sin(i*.13));
  const points=values.map((v,i)=>`${20+i*(880/(values.length-1))},${180-(v/100)*150}`).join(' ');
  return <div style={{height:260,background:C.panel,border:`1px solid ${C.line}`,borderRadius:20,padding:20}}><div style={{display:'flex',justifyContent:'space-between',fontSize:20,color:C.muted}}><b style={{color:C.cyan}}>RSI · {core.content.indicatorPeriod}</b><span>70 OVERBOUGHT · 30 OVERSOLD</span></div><svg viewBox="0 0 920 200" style={{width:'100%',height:190}}><rect x="20" y="75" width="880" height="60" fill="#18e0d00a"/><line x1="20" x2="900" y1="75" y2="75" stroke={C.red} strokeDasharray="7 6"/><line x1="20" x2="900" y1="135" y2="135" stroke={C.green} strokeDasharray="7 6"/><polyline points={points} fill="none" stroke={C.gold} strokeWidth="4"/></svg></div>;
};

const Engagement:React.FC<{locale:Locale}> = ({locale}) => <div style={{position:'absolute',inset:'300px 64px 310px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',background:'linear-gradient(145deg,#0d3035,#081c20)',border:`2px solid ${C.gold}80`,borderRadius:36,padding:50}}><div style={{fontFamily:DISPLAY_FONT,fontSize:74,lineHeight:1.05,color:C.white}}>{core.engagement[locale].title}</div><div style={{display:'flex',gap:16,marginTop:44}}>{['LIKE',core.engagement[locale].button,'COMMENT'].map((x,i)=><div key={x} style={{fontSize:27,fontWeight:900,color:i===1?C.bg:C.white,background:i===1?C.gold:'transparent',border:`1px solid ${i===1?C.gold:C.cyan}90`,borderRadius:999,padding:'15px 25px'}}>{x}</div>)}</div><div style={{fontSize:25,color:C.cyan,marginTop:34,fontWeight:800}}>{core.engagement[locale].sub}</div></div>;

export const UniversalContentShort:React.FC<UniversalProps> = ({locale}) => {
  const frame=useCurrentFrame(); const {fps,durationInFrames}=useVideoConfig(); const sec=frame/fps; const copy=core.locales[locale]; const mode=core.content.type;
  const lines=copy.shortNarration as Line[]; const marks=marksFor(lines,fps); const checks=core.content.lessonChecks[locale];
  const titleIn=spring({frame,fps,config:{damping:18,stiffness:110}}); const progress=frame/durationInFrames;
  const labels:Record<string,string>={"candle-pattern":locale==='vi'?'MÔ HÌNH NẾN':'CANDLE PATTERN',"candle-anatomy":locale==='vi'?'ĐỌC NẾN & BIỂU ĐỒ':'CANDLE ANATOMY',indicator:locale==='vi'?'CHỈ BÁO':'INDICATOR',smc:'SMART MONEY CONCEPTS',fibonacci:'FIBONACCI'};
  const title=mode==='candle-pattern'?core.content.pattern:mode==='indicator'?`${core.content.indicator} · Đọc đúng trước khi dùng`:mode==='smc'?core.content.smcConcept:mode==='fibonacci'?'Fibonacci · Vùng phản ứng':core.content.topic;
  const cues:Cue[]=[{at:0,sound:'thud',gain:.38},{at:4*fps,sound:'whoosh',gain:.28},{at:18*fps,sound:'tick',gain:.35},{at:31*fps,sound:'whoosh',gain:.28},{at:35*fps,sound:'tick',gain:.3}];
  return <AbsoluteFill style={{background:C.bg,color:C.white,fontFamily:TEXT_FONT,overflow:'hidden'}}>
    <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 25%,rgba(24,224,208,.13),transparent 42%),radial-gradient(circle at 10% 85%,rgba(247,200,75,.08),transparent 38%)'}}/>
    <div style={{position:'absolute',left:64,right:64,top:104,height:5,borderRadius:9,background:'#183238'}}><div style={{height:'100%',width:`${progress*100}%`,background:`linear-gradient(90deg,${C.gold},${C.cyan})`}}/></div>
    {sec<35&&<div style={{position:'absolute',inset:'145px 64px 250px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',opacity:titleIn}}><span style={{fontSize:20,fontWeight:900,letterSpacing:2,color:C.gold,border:`1px solid ${C.gold}80`,borderRadius:999,padding:'9px 16px'}}>{labels[mode]||'XAU LAB'}</span><span style={{fontSize:18,color:C.cyan,fontWeight:800}}>{Math.min(3,Math.max(1,Math.floor(sec/7)+1))}/3 · {core.retention.openLoop[locale]}</span></div>
      <div style={{fontFamily:DISPLAY_FONT,fontSize:67,lineHeight:1.03,marginTop:25,textAlign:'center',transform:`scale(${titleIn})`}}>{title}</div>
      <div style={{fontSize:24,color:C.muted,textAlign:'center',marginTop:12}}>{copy.hook}</div>
      <div style={{height:mode==='indicator'?650:650,marginTop:25,background:'rgba(7,28,32,.86)',border:`1px solid ${C.line}`,borderRadius:24,padding:14}}><Candles frame={frame} mode={mode}/>{mode==='indicator'&&<RSI/>}</div>
      {sec>=18&&<div style={{position:'absolute',left:0,right:0,bottom:10,background:'rgba(9,32,37,.96)',border:`1px solid ${C.line}`,borderRadius:22,padding:'24px 30px',display:'grid',gap:13}}>{checks.map((check,i)=>{const on=sec>19+i*3;return <div key={check} style={{fontSize:25,fontWeight:700,color:on?C.white:C.muted,display:'flex',gap:15,alignItems:'center'}}><b style={{width:32,height:32,borderRadius:9,display:'grid',placeContent:'center',color:on?C.bg:C.muted,background:on?C.gold:'#173239'}}>{on?'✓':i+1}</b>{check}</div>})}</div>}
    </div>}
    {sec>=35&&<Engagement locale={locale}/>} 
    <div style={{position:'absolute',left:64,right:64,bottom:175,display:'flex',justifyContent:'space-between',fontSize:16,color:C.muted}}><span>{core.data.symbol} · {core.data.timeframe}</span><span>EDUCATIONAL · NOT FINANCIAL ADVICE</span></div>
    <Soundtrack bed="dark" cues={cues} durationInFrames={durationInFrames} fps={fps} bedGain={(f)=>core.voice.musicGain*duckAt(marks,f,fps)}/><Narration id={`showcase-short-${locale}`} marks={marks} frame={frame} tone="dark" bottom={255}/>
  </AbsoluteFill>;
};

export const UniversalContentThumbnail:React.FC<UniversalProps> = ({locale}) => {
  const mode=core.content.type; const labels:Record<string,string>={"candle-pattern":locale==='vi'?'MÔ HÌNH NẾN':'CANDLE PATTERN',"candle-anatomy":locale==='vi'?'ĐỌC NẾN & BIỂU ĐỒ':'CANDLE ANATOMY',indicator:locale==='vi'?'CHỈ BÁO':'INDICATOR',smc:'SMART MONEY CONCEPTS',fibonacci:'FIBONACCI'};
  const title=mode==='candle-pattern'?core.content.pattern:mode==='indicator'?`${core.content.indicator} · ĐỌC ĐÚNG`:mode==='smc'?core.content.smcConcept:mode==='fibonacci'?'FIBONACCI · VÙNG PHẢN ỨNG':core.content.topic;
  return <AbsoluteFill style={{background:C.bg,color:C.white,fontFamily:TEXT_FONT,overflow:'hidden'}}><div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 80% 20%,rgba(24,224,208,.18),transparent 42%),radial-gradient(circle at 0 100%,rgba(247,200,75,.14),transparent 38%)'}}/><div style={{position:'absolute',inset:'54px 68px',display:'grid',gridTemplateColumns:'1fr .9fr',gap:55,alignItems:'center'}}><div><div style={{display:'inline-flex',color:C.gold,border:`1px solid ${C.gold}90`,borderRadius:999,padding:'9px 17px',fontSize:18,fontWeight:900,letterSpacing:1.5}}>{labels[mode]||'CONTENT LAB'}</div><div style={{fontFamily:DISPLAY_FONT,fontSize:72,lineHeight:1.02,marginTop:26}}>{title}</div><div style={{fontSize:27,color:C.cyan,fontWeight:800,marginTop:22}}>{core.locales[locale].hook}</div></div><div style={{height:500,background:'rgba(8,30,34,.88)',border:`1px solid ${C.line}`,borderRadius:22,padding:15}}><Candles frame={1400} mode={mode}/></div></div></AbsoluteFill>;
};
