import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import './studio.css';
import {CONTENT_TYPES, applyContentType, resizeLong} from './templates';

const api = async (url, options) => {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
};
const json = (method, body) => ({method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
const clone = (value) => structuredClone(value);

function setPath(source, path, value) {
  const next = clone(source);
  const keys = path.split('.');
  let cursor = next;
  keys.slice(0, -1).forEach((key) => { cursor = cursor[key]; });
  cursor[keys.at(-1)] = value;
  return next;
}

function Field({label, value, onChange, type = 'text', hint, step, min, max}) {
  return <label className="field"><span>{label}</span><input type={type} value={value ?? ''} step={step} min={min} max={max} onChange={(e) => onChange(type === 'number' || type === 'range' ? Number(e.target.value) : e.target.value)} />{hint && <small>{hint}</small>}</label>;
}
function TextArea({label, value, onChange, rows = 4}) {
  return <label className="field"><span>{label}</span><textarea rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></label>;
}
function Toggle({label, checked, onChange, hint}) {
  return <label className="toggle"><button type="button" className={checked ? 'toggle-on' : ''} onClick={() => onChange(!checked)}><i /></button><span><b>{label}</b>{hint && <small>{hint}</small>}</span></label>;
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean).map((line) => line.split(/[,;\t]/).map((cell) => cell.trim().replace(/^"|"$/g, '')));
  if (rows.length < 9) throw new Error('CSV cần header và tối thiểu 8 dòng nến.');
  const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  const pick = (names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0);
  const index = {time: pick(['time', 'timestamp', 'date', 'datetime']), open: pick(['open', 'o']), high: pick(['high', 'h']), low: pick(['low', 'l']), close: pick(['close', 'c'])};
  if (Object.values(index).some((v) => v === undefined)) throw new Error('Header cần có time, open, high, low, close.');
  return rows.slice(1).map((row, i) => {
    const rawTime = row[index.time];
    const parsedDate = Date.parse(rawTime);
    const time = Number.isFinite(Number(rawTime)) ? Number(rawTime) : Math.round(parsedDate / 1000);
    const candle = {time, open: Number(row[index.open]), high: Number(row[index.high]), low: Number(row[index.low]), close: Number(row[index.close])};
    if (Object.values(candle).some((v) => !Number.isFinite(v))) throw new Error(`Dòng ${i + 2} có dữ liệu không hợp lệ.`);
    return candle;
  });
}

function parseBatchCsv(text) {
  const lines=text.trim().split(/\r?\n/).filter(Boolean); if(lines.length<2) throw new Error('CSV cần header và ít nhất một nội dung.');
  const delimiter=lines[0].includes(';')?';':','; const split=(line)=>{const cells=[];let cell='';let quoted=false;for(let i=0;i<line.length;i++){const char=line[i];if(char==='"'&&line[i+1]==='"'){cell+='"';i++;}else if(char==='"')quoted=!quoted;else if(char===delimiter&&!quoted){cells.push(cell.trim());cell='';}else cell+=char;}cells.push(cell.trim());return cells;};
  const headers=split(lines[0]).map((x)=>x.toLowerCase()); const aliases={'chart-reading':'candle-anatomy','candles':'candle-pattern','fib':'fibonacci'};
  return lines.slice(1).map((line,index)=>{const cells=split(line);const row=Object.fromEntries(headers.map((h,i)=>[h,cells[i]||'']));const requested=aliases[row.type]||row.type||'candle-pattern';const type=CONTENT_TYPES.some((item)=>item.id===requested)?requested:'candle-pattern';return {id:index+1,type,title:row.title||`Nội dung ${index+1}`,topic:row.topic||row.title||'',hook:row.hook||'',locale:row.locale==='en'?'en':'vi'};});
}

function HomeView({project,onShort,onLong,onBatch}) {
  return <div className="home-view"><div className="hero"><span>CONTENT VIDEO WORKSPACE</span><h1>Hôm nay anh muốn tạo gì?</h1><p>Chọn một mục. Tool sẽ dẫn từng bước; không cần hiểu các tab nâng cao.</p></div><div className="home-actions"><button onClick={onShort}><i>01</i><b>Tạo 1 video Short</b><span>Chọn chủ đề → sửa hook → nghe voice → render 9:16.</span><em>BẮT ĐẦU →</em></button><button onClick={onLong}><i>02</i><b>Tạo video dài</b><span>Video 16:9 từ 3–8 phút, có chương, voice và thumbnail.</span><em>CHỌN THỜI LƯỢNG →</em></button><button onClick={onBatch}><i>03</i><b>Shorts theo lô</b><span>Nạp CSV nhiều chủ đề, theo dõi từng video và render tự động.</span><em>NẠP DANH SÁCH →</em></button></div><div className="how"><h3>Quy trình 4 bước</h3>{[['1','Chọn loại content'],['2','Điền chủ đề hoặc nạp dữ liệu'],['3','Kiểm tra kịch bản và giọng đọc'],['4','Bấm render và tải MP4']].map(([n,t])=><div key={n}><b>{n}</b><span>{t}</span></div>)}</div><div className="current-project"><span>DỰ ÁN ĐANG MỞ</span><b>{project.name}</b><small>{project.core.content.title} · {project.candles.length} nến dữ liệu</small></div></div>;
}

function BatchView({rows,setRows,locale,setLocale,onQueue,batches,busy}) {
  const sample='type,title,topic,hook,locale\ncandle-pattern,Bullish Engulfing,Bối cảnh của Bullish Engulfing,Hai cây nến này có đảo chiều?,vi\nsmc,CHoCH và BOS,Đọc thay đổi cấu trúc,CHoCH có phải đảo chiều?,vi\nfibonacci,Fibonacci 0.618,Vùng phản ứng Fibonacci,0.618 có phải nút BUY?,vi';
  const load=(file)=>file.text().then((text)=>setRows(parseBatchCsv(text))).catch((e)=>alert(e.message));
  return <div className="batch-view">
    <div className="batch-head"><div><span>BATCH SHORTS</span><h1>Tạo Shorts theo lô</h1><p>Mỗi dòng là một project riêng. Video lỗi được báo riêng và không chặn các video còn lại.</p></div><div className="locale-switch"><button className={locale==='vi'?'active':''} onClick={()=>setLocale('vi')}>VI</button><button className={locale==='en'?'active':''} onClick={()=>setLocale('en')}>EN</button></div></div>
    <div className="batch-upload"><label>Nạp CSV<input type="file" accept=".csv,.txt" onChange={(e)=>e.target.files[0]&&load(e.target.files[0])}/></label><button onClick={()=>setRows(parseBatchCsv(sample))}>Dùng danh sách mẫu</button>{rows.length>0&&<button onClick={()=>setRows([])}>Xóa danh sách</button>}<small>Header: type, title, topic, hook, locale · tối đa 50 video/lô</small></div>
    {rows.length>0&&<><div className="batch-summary"><b>{rows.length}<span>VIDEO</span></b><b>{rows.filter((x)=>x.locale==='vi').length}<span>TIẾNG VIỆT</span></b><b>{rows.filter((x)=>x.locale==='en').length}<span>GLOBAL</span></b></div><div className="batch-table"><div className="batch-tr head"><span>#</span><span>FORMAT</span><span>TIÊU ĐỀ</span><span>HOOK</span><span>NGÔN NGỮ</span></div>{rows.map((row,i)=><div className="batch-tr" key={row.id}><span>{i+1}</span><span>{CONTENT_TYPES.find((x)=>x.id===row.type)?.name||row.type}</span><span>{row.title}</span><span>{row.hook||'Dùng hook mẫu'}</span><span>{row.locale.toUpperCase()}</span></div>)}</div><button className="primary batch-run" onClick={onQueue} disabled={busy}>Xếp hàng render {rows.length} Shorts</button></>}
    {batches.map((batch)=><div className="batch-progress" key={batch.id}><div><b>{batch.id}</b><span>{batch.complete}/{batch.total} hoàn tất · {batch.failed} lỗi</span></div><div className="progress"><i style={{width:`${((batch.complete+batch.failed)/batch.total)*100}%`}}/></div><div className="batch-jobs">{batch.jobs.map((job,index)=><div key={job.id} className={job.status}><span>{index+1}. {job.projectId}</span><b>{job.status==='complete'?'XONG':job.status==='failed'?'LỖI':job.status==='running'?`${job.progress}%`:'CHỜ'}</b>{job.archive&&<a href={`${job.archive}/${job.only}.mp4`} target="_blank">Tải MP4</a>}</div>)}</div></div>)}
  </div>;
}

function MiniChart({candles, zoneLow, zoneHigh}) {
  const data = candles.slice(-36);
  const min = Math.min(...data.map((d) => d.low), zoneLow);
  const max = Math.max(...data.map((d) => d.high), zoneHigh);
  const y = (v) => 248 - ((v - min) / Math.max(.001, max - min)) * 218;
  const step = 360 / Math.max(1, data.length);
  return <svg viewBox="0 0 380 270" className="mini-chart" role="img" aria-label="OHLC preview">
    <defs><linearGradient id="zone" x1="0" x2="1"><stop stopColor="#f7c84b" stopOpacity=".24"/><stop offset="1" stopColor="#18e0d0" stopOpacity=".08"/></linearGradient></defs>
    {[0,1,2,3,4].map((i) => <line key={i} x1="10" x2="370" y1={30+i*54} y2={30+i*54} stroke="#24434a" strokeWidth="1"/>)}
    <rect x="10" y={y(zoneHigh)} width="360" height={Math.max(3, y(zoneLow)-y(zoneHigh))} fill="url(#zone)" stroke="#f7c84b" strokeDasharray="5 4"/>
    {data.map((d, i) => { const x=12+i*step+step/2; const up=d.close>=d.open; const top=y(Math.max(d.open,d.close)); const bottom=y(Math.min(d.open,d.close)); return <g key={d.time+i}><line x1={x} x2={x} y1={y(d.high)} y2={y(d.low)} stroke={up?'#27dbc7':'#ff6b67'} strokeWidth="1.4"/><rect x={x-Math.max(2,step*.25)} y={top} width={Math.max(4,step*.5)} height={Math.max(2,bottom-top)} rx="1" fill={up?'#27dbc7':'#ff6b67'}/></g>; })}
  </svg>;
}

function PhonePreview({project, locale}) {
  const {core, candles} = project;
  const copy = core.locales[locale];
  const dest = core.destinations[locale];
  return <div className="phone-shell"><div className="phone-stage">
    <div className="preview-progress"><i /></div>
    <header><img src="/brand/van-thang-invest-logo.png"/><div><b>XAU LAB</b><span>VĂN THẮNG INVEST</span></div></header>
    <div className="evidence">1/3 · {core.retention.openLoop[locale]}</div>
    <h2>{copy.hook}</h2><p className="source">{copy.sourceLine}</p>
    <MiniChart candles={candles} zoneLow={core.data.decisionZoneLow} zoneHigh={core.data.decisionZoneHigh}/>
    <div className="pills"><span>{copy.structure}</span><span>{copy.zone}</span></div>
    <div className="choices"><span>BUY</span><span>SELL</span><b>{copy.choiceWait}</b></div>
    <div className="preview-cta">{core.ctaMode==='link'?<><img src={`/api/qr?url=${encodeURIComponent(dest.url)}`}/><div><b>{copy.ctaTitle}</b><span>{dest.handle}</span></div></>:<><div className="engage-icons"><b>LIKE</b><strong>{core.engagement[locale].button}</strong><b>COMMENT</b></div><div><b>{core.engagement[locale].title}</b><span>{core.engagement[locale].sub}</span></div></>}</div>
    <footer>{core.data.symbol} · {core.data.timeframe}<span>EDUCATIONAL</span></footer>
  </div></div>;
}

function App() {
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [view, setView] = useState('home');
  const [tab, setTab] = useState('format');
  const [locale, setLocale] = useState('vi');
  const [status, setStatus] = useState('Đang kết nối…');
  const [dirty, setDirty] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [voiceUrl, setVoiceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [batchRows, setBatchRows] = useState([]);
  const [batchLocale, setBatchLocale] = useState('vi');
  const [batches, setBatches] = useState([]);

  const loadList = async (selectId) => {
    const list = await api('/api/projects'); setProjects(list);
    const id = selectId || project?.id || list[0]?.id;
    if (id) { setProject(await api(`/api/projects/${id}`)); setDirty(false); }
  };
  useEffect(() => { api('/api/health').then((h) => setStatus(`${h.renderer} · ${h.voice}`)).catch((e) => setStatus(e.message)); loadList(); api('/api/output-files').then(setOutputs).catch(()=>{}); api('/api/batches').then(setBatches).catch(()=>{}); }, []);
  useEffect(() => { const timer=setInterval(() => { api('/api/jobs').then((v) => {setJobs(v); if(v[0]?.status==='complete') api('/api/output-files').then(setOutputs);}).catch(()=>{}); api('/api/batches').then(setBatches).catch(()=>{}); }, 1700); return () => clearInterval(timer); }, []);
  const update = (path, value) => { setProject((current) => setPath(current, path, value)); setDirty(true); };
  const save = async () => { setBusy(true); try { const saved=await api(`/api/projects/${project.id}`, json('PUT', project)); setProject(saved); setDirty(false); await loadList(saved.id); } catch(e){alert(e.message);} finally{setBusy(false);} };
  const createProject = async () => { const name=prompt('Tên case mới:', 'Gold case mới'); if(!name)return; const created=await api('/api/projects', json('POST',{name})); await loadList(created.id); };
  const importCsv = async (file) => { try { const candles=parseCsv(await file.text()); setProject((p)=>({...p,candles})); setDirty(true); alert(`Đã nạp ${candles.length} nến. Bấm Lưu dự án để xác nhận.`); } catch(e){alert(e.message);} };
  const previewVoice = async () => { setBusy(true); try { const copy=project.core.locales[locale]; const result=await api('/api/voice-preview',json('POST',{locale,text:copy.shortNarration[0]?.tts||copy.shortNarration[0]?.text||copy.hook,voice:project.core.voice})); setVoiceUrl(result.url); setTimeout(()=>document.querySelector('#voice-player')?.play(),80); } catch(e){alert(e.message);} finally{setBusy(false);} };
  const renderOnly = async (only) => { setBusy(true); try { const saved=await api(`/api/projects/${project.id}`,json('PUT',project)); setProject(saved);setDirty(false);await api('/api/render',json('POST',{projectId:saved.id,only})); setView('studio');setTab('export'); } catch(e){alert(e.message);} finally{setBusy(false);} };
  const render = async () => renderOnly(undefined);
  const queueBatch = async () => { setBusy(true); try { const batchProjects=batchRows.map((row,index)=>{let next=applyContentType(project,row.type);next=clone(next);next.id=`batch-${Date.now()}-${index+1}`;next.name=row.title;next.core.content.title=row.title;next.core.content.topic=row.topic||row.title;if(row.hook)next.core.locales[row.locale].hook=row.hook;next.batchLocale=row.locale;return next;});await api('/api/batch',json('POST',{projects:batchProjects,locale:batchLocale}));setBatches(await api('/api/batches')); } catch(e){alert(e.message);} finally{setBusy(false);} };
  const activeJob = jobs.find((j)=>j.projectId===project?.id);
  const copy = project?.core.locales[locale];
  const dest = project?.core.destinations[locale];
  const narrationText = useMemo(()=>project ? project.core.locales[locale].shortNarration.map((n)=>`${n.at}|${n.text}|${n.tts||''}`).join('\n'):'',[project,locale]);
  const longNarrationText = useMemo(()=>project ? project.core.locales.vi.longNarration.map((n)=>`${n.at}|${n.text}|${n.tts||''}`).join('\n'):'',[project]);
  const setNarration = (text) => { const lines=text.split(/\r?\n/).filter(Boolean).map((line)=>{const [at,visible,tts]=line.split('|');return {at:Number(at)||0,text:visible||'',...(tts?{tts}:{})};}); update(`core.locales.${locale}.shortNarration`,lines); };
  const setLongNarration = (text) => { const lines=text.split(/\r?\n/).filter(Boolean).map((line)=>{const [at,visible,tts]=line.split('|');return {at:Number(at)||0,text:visible||'',...(tts?{tts}:{})};}); update('core.locales.vi.longNarration',lines); };
  if (!project) return <div className="loading">XAU LAB STUDIO<br/><span>{status}</span></div>;

  const tabs = [['format','Loại content'],['data','Dữ liệu'],['script','Kịch bản'],['voice','Giọng đọc'],['retention','Giữ chân'],['cta','CTA'],['output','Đầu ra'],['export','Render']];
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><img src="/brand/van-thang-invest-logo.png"/><div><b>XAU LAB</b><span>CONTENT STUDIO</span></div></div>
      <button className="new-project" onClick={createProject}>＋ Case mới</button>
      <div className="side-nav"><button className={view==='home'?'active':''} onClick={()=>setView('home')}>⌂ <span><b>Trang chủ</b><small>Chọn việc cần làm</small></span></button><button className={view==='studio'?'active':''} onClick={()=>setView('studio')}>✦ <span><b>Studio</b><small>Chỉnh nội dung chi tiết</small></span></button><button className={view==='batch'?'active':''} onClick={()=>setView('batch')}>▦ <span><b>Shorts theo lô</b><small>CSV · tối đa 50 video</small></span></button></div>
      <div className="project-list">{projects.map((item)=><button key={item.id} className={item.id===project.id?'active':''} onClick={async()=>{if(dirty&&!confirm('Bỏ thay đổi chưa lưu?'))return;setProject(await api(`/api/projects/${item.id}`));setDirty(false);}}><b>{item.name}</b><span>{item.candles} nến · {new Date(item.updatedAt).toLocaleDateString('vi-VN')}</span></button>)}</div>
      <div className="engine"><i/> Engine sẵn sàng<small>{status}</small></div>
    </aside>
    <main>
      <div className="topbar"><div><input className="project-title" value={project.name} onChange={(e)=>{setProject({...project,name:e.target.value});setDirty(true);}}/><span>Local-first · dữ liệu và video nằm trên máy anh</span></div><div className="top-actions"><span className={dirty?'unsaved':'saved'}>{dirty?'Chưa lưu':'Đã lưu'}</span><button className="secondary" onClick={save} disabled={busy}>Lưu dự án</button><button className="primary" onClick={()=>view==='studio'?render():setView('studio')} disabled={busy}>{view==='studio'?'Render bộ video':'Mở Studio'}</button></div></div>
      {view==='home'?<HomeView project={project} onShort={()=>{setView('studio');setTab('format');}} onLong={()=>{setView('studio');setTab('output');}} onBatch={()=>setView('batch')}/>:view==='batch'?<BatchView rows={batchRows} setRows={setBatchRows} locale={batchLocale} setLocale={setBatchLocale} onQueue={queueBatch} batches={batches} busy={busy}/>:<div className="workspace">
        <section className="editor">
          <nav className="tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
          <div className="panel">
            {tab==='format'&&<><div className="panel-head"><div><h1>Chọn loại content</h1><p>Mỗi loại dùng bố cục, nhịp kể và lớp biểu đồ riêng trong renderer.</p></div><span className="format-count">6 FORMAT</span></div><div className="format-grid">{CONTENT_TYPES.map((item)=><button key={item.id} className={project.core.content.type===item.id?'active':''} onClick={()=>{setProject(applyContentType(project,item.id));setDirty(true);}}><i>{item.icon}</i><div><b>{item.name}</b><span>{item.tag}</span><p>{item.description}</p></div>{project.core.content.type===item.id&&<em>ĐANG CHỌN</em>}</button>)}</div><div className="format-config"><h3>Thông tin bài</h3><div className="grid two"><Field label="Tiêu đề project" value={project.core.content.title} onChange={(v)=>update('core.content.title',v)}/><Field label="Chủ đề chính" value={project.core.content.topic} onChange={(v)=>update('core.content.topic',v)}/>{project.core.content.type==='candle-pattern'&&<Field label="Tên mô hình nến" value={project.core.content.pattern} onChange={(v)=>update('core.content.pattern',v)}/>} {project.core.content.type==='indicator'&&<><Field label="Chỉ báo" value={project.core.content.indicator} onChange={(v)=>update('core.content.indicator',v)}/><Field type="number" label="Chu kỳ" value={project.core.content.indicatorPeriod} onChange={(v)=>update('core.content.indicatorPeriod',v)}/></>}{project.core.content.type==='smc'&&<Field label="Khái niệm SMC" value={project.core.content.smcConcept} onChange={(v)=>update('core.content.smcConcept',v)}/>} {project.core.content.type==='fibonacci'&&<><Field type="number" step="0.1" label="Swing High" value={project.core.content.fibonacciHigh} onChange={(v)=>update('core.content.fibonacciHigh',v)}/><Field type="number" step="0.1" label="Swing Low" value={project.core.content.fibonacciLow} onChange={(v)=>update('core.content.fibonacciLow',v)}/></>}</div></div></>}
            {tab==='data'&&<><div className="panel-head"><div><h1>Nạp dữ liệu thị trường</h1><p>CSV chuẩn OHLC; tool kiểm tra high/low trước khi nhận.</p></div><label className="upload">Nạp CSV<input type="file" accept=".csv,.txt" onChange={(e)=>e.target.files[0]&&importCsv(e.target.files[0])}/></label></div><div className="stats"><b>{project.candles.length}<span>nến</span></b><b>{project.core.data.timeframe}<span>khung</span></b><b>{project.candles.at(-1)?.close}<span>giá cuối</span></b></div><div className="grid two"><Field label="Mã / Symbol" value={project.core.data.symbol} onChange={(v)=>update('core.data.symbol',v)}/><Field label="Khung thời gian" value={project.core.data.timeframe} onChange={(v)=>update('core.data.timeframe',v)}/><Field label="Nhà cung cấp" value={project.core.data.provider} onChange={(v)=>update('core.data.provider',v)}/><Field label="Nhãn dữ liệu" value={project.core.data.display} onChange={(v)=>update('core.data.display',v)}/><Field type="number" step="0.1" label="Vùng quyết định · thấp" value={project.core.data.decisionZoneLow} onChange={(v)=>update('core.data.decisionZoneLow',v)}/><Field type="number" step="0.1" label="Vùng quyết định · cao" value={project.core.data.decisionZoneHigh} onChange={(v)=>update('core.data.decisionZoneHigh',v)}/><Field type="number" step="0.1" label="Xác nhận BUY" value={project.core.data.buyConfirmation} onChange={(v)=>update('core.data.buyConfirmation',v)}/><Field type="number" step="0.1" label="Xác nhận SELL" value={project.core.data.sellConfirmation} onChange={(v)=>update('core.data.sellConfirmation',v)}/></div></>}
            {tab==='script'&&<><div className="locale-switch"><button className={locale==='vi'?'active':''} onClick={()=>setLocale('vi')}>🇻🇳 Việt Nam</button><button className={locale==='en'?'active':''} onClick={()=>setLocale('en')}>🌍 Global / EN</button></div><h1>Kịch bản {locale==='vi'?'tiếng Việt':'Global English'}</h1><div className="grid"><TextArea label="Hook mở đầu" value={copy.hook} onChange={(v)=>update(`core.locales.${locale}.hook`,v)} rows={2}/><TextArea label="Lý do quyết định" value={copy.reason} onChange={(v)=>update(`core.locales.${locale}.reason`,v)} rows={3}/><TextArea label="CTA chính" value={copy.ctaTitle} onChange={(v)=>update(`core.locales.${locale}.ctaTitle`,v)} rows={2}/><TextArea label="Narration · mỗi dòng: giây|phụ đề|cách đọc" value={narrationText} onChange={setNarration} rows={12}/></div></>}
            {tab==='voice'&&<><h1>Giọng đọc rõ, lớn, ưu tiên loa điện thoại</h1><p className="lead">Voice chạy local bằng Piper, qua high-pass, compressor và peak limiter trước khi ghép nhạc.</p><div className="voice-card"><div className="range"><span>Tốc độ</span><input type="range" min="0.82" max="1.08" step="0.01" value={project.core.voice.pace} onChange={(e)=>update('core.voice.pace',Number(e.target.value))}/><b>{project.core.voice.pace.toFixed(2)}×</b></div><div className="range"><span>Độ rõ</span><input type="range" min="0" max="1" step="0.01" value={project.core.voice.clarity} onChange={(e)=>update('core.voice.clarity',Number(e.target.value))}/><b>{Math.round(project.core.voice.clarity*100)}%</b></div><div className="range"><span>Voice boost</span><input type="range" min="0" max="6" step="0.5" value={project.core.voice.gainDb} onChange={(e)=>update('core.voice.gainDb',Number(e.target.value))}/><b>+{project.core.voice.gainDb} dB</b></div><div className="range"><span>Nhạc nền</span><input type="range" min="0.04" max="0.18" step="0.01" value={project.core.voice.musicGain} onChange={(e)=>update('core.voice.musicGain',Number(e.target.value))}/><b>{Math.round(project.core.voice.musicGain*100)}%</b></div></div><button className="primary wide" onClick={previewVoice} disabled={busy}>▶ Nghe thử câu mở đầu ({locale.toUpperCase()})</button>{voiceUrl&&<audio id="voice-player" controls src={voiceUrl}/>}</>}
            {tab==='retention'&&<><h1>Yếu tố giữ chân</h1><p className="lead">Mỗi yếu tố gắn vào timeline thật, không chỉ là trang trí trên preview.</p><div className="toggle-list"><Toggle label="Thanh tiến độ" checked={project.core.retention.progressBar} onChange={(v)=>update('core.retention.progressBar',v)} hint="Cho người xem biết video đang đi tới đâu."/><Toggle label="Bộ đếm 3 bằng chứng" checked={project.core.retention.evidenceCounter} onChange={(v)=>update('core.retention.evidenceCounter',v)} hint="Mở vòng tò mò và cập nhật 1/3, 2/3, 3/3."/><Toggle label="Countdown trước đáp án" checked={project.core.retention.countdown} onChange={(v)=>update('core.retention.countdown',v)} hint="Tạo nhịp dừng để người xem tự chọn BUY/SELL/WAIT."/></div><div className="grid two"><Field label="Open loop · Việt" value={project.core.retention.openLoop.vi} onChange={(v)=>update('core.retention.openLoop.vi',v)}/><Field label="Open loop · Global" value={project.core.retention.openLoop.en} onChange={(v)=>update('core.retention.openLoop.en',v)}/></div></>}
            {tab==='cta'&&<><h1>CTA cuối video</h1><p className="lead">Mặc định chỉ kêu gọi tương tác. Logo, QR và link đều tắt; anh có thể nạp sau.</p><div className="cta-modes"><button className={project.core.ctaMode==='engagement'?'active':''} onClick={()=>update('core.ctaMode','engagement')}><b>LIKE · SUBSCRIBE · COMMENT</b><span>Không logo, không QR, không link</span></button><button className={project.core.ctaMode==='link'?'active':''} onClick={()=>update('core.ctaMode','link')}><b>QR / LINK</b><span>Bật khi anh đã sẵn sàng dẫn traffic</span></button></div><div className="toggle-list"><Toggle label="Hiện logo trong video" checked={project.core.branding.showLogo} onChange={(v)=>update('core.branding.showLogo',v)} hint="Đang tắt theo yêu cầu."/><Toggle label="Hiện tên thương hiệu" checked={project.core.branding.showBrandName} onChange={(v)=>update('core.branding.showBrandName',v)} hint="Có thể bật riêng mà không cần logo."/></div>{project.core.ctaMode==='engagement'?<><div className="locale-switch"><button className={locale==='vi'?'active':''} onClick={()=>setLocale('vi')}>🇻🇳 Việt</button><button className={locale==='en'?'active':''} onClick={()=>setLocale('en')}>🌍 Global</button></div><div className="grid"><Field label="Headline CTA" value={project.core.engagement[locale].title} onChange={(v)=>update(`core.engagement.${locale}.title`,v)}/><Field label="Dòng phụ" value={project.core.engagement[locale].sub} onChange={(v)=>update(`core.engagement.${locale}.sub`,v)}/><Field label="Nút chính" value={project.core.engagement[locale].button} onChange={(v)=>update(`core.engagement.${locale}.button`,v)}/></div></>:<><div className="locale-switch"><button className={locale==='vi'?'active':''} onClick={()=>setLocale('vi')}>🇻🇳 Zalo</button><button className={locale==='en'?'active':''} onClick={()=>setLocale('en')}>🌍 Telegram</button></div><div className="destination-card"><img src={`/api/qr?url=${encodeURIComponent(dest.url)}`}/><div><Field label="Kênh" value={dest.channel} onChange={(v)=>update(`core.destinations.${locale}.channel`,v)}/><Field label="Handle" value={dest.handle} onChange={(v)=>update(`core.destinations.${locale}.handle`,v)}/><Field label="URL đích" value={dest.url} onChange={(v)=>update(`core.destinations.${locale}.url`,v)}/></div></div></>}</>}
            {tab==='output'&&<><div className="panel-head"><div><h1>Chọn đầu ra cần tạo</h1><p>Render riêng từng định dạng để đỡ chờ, hoặc xuất trọn bộ khi nội dung đã hoàn thiện.</p></div><span className="format-count">SHORT + LONG</span></div><div className="output-grid"><button onClick={()=>renderOnly('short-vi')}><i>9:16</i><b>Short tiếng Việt</b><span>43 giây · 1080×1920 · subtitle + voice</span><em>RENDER SHORT VI →</em></button><button onClick={()=>renderOnly('short-en')}><i>9:16</i><b>Short Global</b><span>43 giây · English voice · subtitle</span><em>RENDER SHORT EN →</em></button><button className="long-output" onClick={()=>renderOnly('long-vi')}><i>16:9</i><b>Video dài tiếng Việt</b><span>{Math.round(project.core.duration.longSeconds/60)} phút · 1920×1080 · chia chương</span><em>RENDER VIDEO DÀI →</em></button><button onClick={()=>renderOnly('thumb-vi')}><i>PNG</i><b>Thumbnail</b><span>Ảnh bìa độc lập, render rất nhanh</span><em>TẠO ẢNH BÌA →</em></button></div><div className="long-config"><div><h3>Thiết lập video dài</h3><p>Chọn mốc gần nhất rồi sửa timeline nếu muốn tinh chỉnh sâu.</p></div><div className="duration-options">{[180,300,480].map((seconds)=><button key={seconds} className={project.core.duration.longSeconds===seconds?'active':''} onClick={()=>{setProject(resizeLong(project,seconds));setDirty(true);}}><b>{seconds/60} phút</b><span>{seconds===180?'Giải thích nhanh':seconds===300?'Bài học chuẩn':'Chuyên sâu'}</span></button>)}</div><TextArea label="Narration video dài · mỗi dòng: giây|phụ đề|cách đọc" value={longNarrationText} onChange={setLongNarration} rows={10}/><button className="primary wide" onClick={()=>renderOnly('long-vi')} disabled={busy}>Render video dài {Math.round(project.core.duration.longSeconds/60)} phút</button></div></>}
            {tab==='export'&&<><h1>Render & tải file</h1><p className="lead">Mỗi job có trạng thái riêng. Anh có thể tiếp tục chỉnh project khác trong lúc hàng đợi chạy tuần tự.</p><div className="export-grid"><div><h3>Đầu ra khả dụng</h3>{['Short VI · 1080×1920 · 60fps','Short Global · 1080×1920 · 60fps','Video dài VI · 1920×1080 · 30fps','2 thumbnails · PNG','Voice riêng · WAV','Subtitle · SRT','Metadata + QA'].map((x)=><div className="check" key={x}>✓ {x}</div>)}<button className="primary wide" onClick={render} disabled={busy||activeJob?.status==='running'}>{activeJob?.status==='running'?'Đang render…':'Render toàn bộ package'}</button></div><div className="job-card"><div className={`job-state ${activeJob?.status||'idle'}`}>{activeJob?.status==='complete'?'HOÀN TẤT':activeJob?.status==='failed'?'CÓ LỖI':activeJob?.status==='running'?'ĐANG RENDER':activeJob?.status==='queued'?'ĐANG XẾP HÀNG':'SẴN SÀNG'}</div><div className="progress"><i style={{width:`${activeJob?.progress||0}%`}}/></div><b>{activeJob?.progress||0}%</b><pre>{activeJob?.log?.slice(-7).join('\n')||'Chọn một đầu ra ở tab Đầu ra hoặc bấm render toàn bộ package.'}</pre></div></div><h3 className="files-title">File mới nhất</h3><div className="files">{outputs.map((file)=><a href={file.url} target="_blank" key={file.name}><span>{/\.mp4$/.test(file.name)?'▶':/\.png$/.test(file.name)?'▣':'↓'}</span>{file.name}</a>)}</div></>}
          </div>
        </section>
        <section className="preview"><div className="preview-head"><div><b>LIVE PREVIEW</b><span>Short · 9:16</span></div><div className="locale-switch mini"><button className={locale==='vi'?'active':''} onClick={()=>setLocale('vi')}>VI</button><button className={locale==='en'?'active':''} onClick={()=>setLocale('en')}>EN</button></div></div><PhonePreview project={project} locale={locale}/><div className="preview-note"><i/> Preview cập nhật tức thì. Render dùng Remotion và dữ liệu đầy đủ.</div></section>
      </div>}
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
