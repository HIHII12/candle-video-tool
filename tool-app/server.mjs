import express from 'express';
import QRCode from 'qrcode';
import {spawn} from 'node:child_process';
import {cp, mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const APP = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(APP, '..');
const ENGINE = join(ROOT, 'video-engine');
const CORE_PATH = join(ENGINE, 'src', 'content', 'case001.json');
const MAP_PATH = join(ENGINE, 'src', 'data', 'map_xau_h1.json');
const LATEST_OUT = join(ENGINE, 'out', 'showcase', 'case-001');
const DATA = join(APP, 'data');
const PROJECTS = join(DATA, 'projects');
const PREVIEWS = join(DATA, 'previews');
const ARCHIVES = join(ENGINE, 'out', 'projects');
const JOBS_PATH = join(DATA, 'jobs.json');
const PORT = Number(process.env.XAU_LAB_PORT || 4173);
const jobs = [];
let active = null;

const cleanId = (value) => String(value || 'project').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'project';
const projectPath = (id) => join(PROJECTS, `${cleanId(id)}.json`);
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const mergeDefaults = (defaults, value) => {
  if (Array.isArray(defaults)) return Array.isArray(value) ? value : defaults;
  if (!defaults || typeof defaults !== 'object') return value === undefined ? defaults : value;
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(Object.keys(defaults).map((key) => [key, mergeDefaults(defaults[key], source[key])]).concat(Object.keys(source).filter((key) => !(key in defaults)).map((key) => [key, source[key]])));
};
const fillLongTimeline = (lines, seconds) => {
  if (!Array.isArray(lines) || lines.length < 2) return lines || [];
  const last = Number(lines.at(-1).at) || 1;
  if (last >= seconds * .82) return lines;
  const target = Math.max(1, seconds - 14);
  return lines.map((line) => ({...line, at: Math.round((Number(line.at || 0) / last) * target * 10) / 10}));
};

async function ensureData() {
  await Promise.all([mkdir(PROJECTS, {recursive: true}), mkdir(PREVIEWS, {recursive: true}), mkdir(ARCHIVES, {recursive: true})]);
  const [core, map] = await Promise.all([readJson(CORE_PATH), readJson(MAP_PATH)]);
  const path = projectPath('case-001');
  if (!existsSync(path)) {
    await writeFile(path, JSON.stringify({id: 'case-001', name: 'Gold H1 · WAIT', updatedAt: new Date().toISOString(), core, candles: map.candles}, null, 2), 'utf8');
  }
  const names = (await readdir(PROJECTS)).filter((name) => extname(name) === '.json');
  for (const name of names) {
    const projectFile = join(PROJECTS, name);
    const current = await readJson(projectFile);
    current.core = mergeDefaults(core, current.core);
    if (!current.core.locales?.en?.longNarration?.length) current.core.locales.en.longNarration = core.locales.en.longNarration;
    for (const locale of ['vi', 'en']) current.core.locales[locale].longNarration = fillLongTimeline(current.core.locales[locale].longNarration, Number(current.core.duration.longSeconds));
    await writeFile(projectFile, JSON.stringify(current, null, 2), 'utf8');
  }
}

async function listProjects() {
  const names = (await readdir(PROJECTS)).filter((name) => extname(name) === '.json');
  const items = await Promise.all(names.map(async (name) => {
    const p = await readJson(join(PROJECTS, name));
    return {id: p.id, name: p.name, updatedAt: p.updatedAt, candles: p.candles?.length || 0};
  }));
  return items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function validateProject(input) {
  if (!input || typeof input !== 'object' || !input.core || !Array.isArray(input.candles)) throw new Error('Project không hợp lệ.');
  if (input.candles.length < 8) throw new Error('Cần tối thiểu 8 nến OHLC.');
  for (const candle of input.candles) {
    for (const key of ['time', 'open', 'high', 'low', 'close']) if (!Number.isFinite(Number(candle[key]))) throw new Error(`Nến thiếu ${key}.`);
    if (Number(candle.high) < Math.max(Number(candle.open), Number(candle.close)) || Number(candle.low) > Math.min(Number(candle.open), Number(candle.close))) throw new Error('OHLC không hợp lệ: high/low không bao trọn thân nến.');
  }
  return {...input, id: cleanId(input.id), name: String(input.name || input.core.caseId || 'Untitled'), updatedAt: new Date().toISOString()};
}

async function saveProject(input) {
  const project = validateProject(input);
  await writeFile(projectPath(project.id), JSON.stringify(project, null, 2), 'utf8');
  return project;
}

function serializeJob(job) {
  const queued = jobs.filter((item) => item.status === 'queued');
  return {id: job.id, projectId: job.projectId, batchId: job.batchId, only: job.only, status: job.status, progress: job.progress, queuePosition: job.status === 'queued' ? queued.indexOf(job) + 1 : 0, startedAt: job.startedAt, finishedAt: job.finishedAt, error: job.error, archive: job.archive, log: job.log.slice(-28)};
}

async function persistJobs() {
  await writeFile(JOBS_PATH, JSON.stringify(jobs.slice(-200).map(serializeJob), null, 2), 'utf8');
}

async function restoreJobs() {
  if (!existsSync(JOBS_PATH)) return;
  const saved = await readJson(JOBS_PATH);
  for (const item of Array.isArray(saved) ? saved : []) {
    jobs.push({...item, log: Array.isArray(item.log) ? item.log : []});
  }
  for (const job of jobs) {
    if (job.status === 'running') {
      job.status = 'queued';
      job.progress = 0;
      job.startedAt = undefined;
      job.finishedAt = undefined;
      job.error = undefined;
      job.log.push('Tool đã mở lại: task được đưa về hàng chờ để chạy từ đầu.');
    }
  }
  await persistJobs();
}

async function runQueue() {
  if (active) return;
  const job = jobs.find((item) => item.status === 'queued');
  if (!job) return;
  active = job;
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  await persistJobs();
  const project = await readJson(projectPath(job.projectId));
  const [originalCore, originalMapText] = await Promise.all([readFile(CORE_PATH, 'utf8'), readFile(MAP_PATH, 'utf8')]);
  const map = JSON.parse(originalMapText);
  map.candles = project.candles;
  map.lastPrice = Number(project.candles.at(-1).close);
  map.pair = project.core.data.symbol;
  map.timeframe = project.core.data.timeframe;
  try {
    await Promise.all([writeFile(CORE_PATH, JSON.stringify(project.core, null, 2), 'utf8'), writeFile(MAP_PATH, JSON.stringify(map, null, 2), 'utf8')]);
    const renderArgs = [join(ROOT, 'tool', 'showcase.mjs'), ...(job.only ? ['--only', job.only] : [])];
    const child = spawn(process.execPath, renderArgs, {cwd: ROOT, windowsHide: true, env: {...process.env, FORCE_COLOR: '0'}});
    job.child = child;
    const onData = (buffer) => {
      const lines = buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
      job.log.push(...lines);
      const text = lines.join(' ');
      for (const key of ['short-vi','short-en','long-vi','long-en','thumb-vi','thumb-en']) if (text.includes(`${key}.`)) job.renderPhase = key;
      const matches = [...text.matchAll(/Rendered\s+(\d+)\/(\d+)/ig)];
      if (matches.length) {
        const match = matches.at(-1);
        const current = Number(match[1]); const total = Number(match[2]);
        if (job.only) {
          job.progress = Math.max(job.progress, Math.round(12 + (current / total) * 83));
        } else {
          const phases = {'short-vi':[8,12],'short-en':[20,12],'long-vi':[32,27],'long-en':[59,29],'thumb-vi':[88,3],'thumb-en':[92,3]};
          const [phaseBase,phaseSpan] = phases[job.renderPhase] || [8,12];
          job.progress = Math.max(job.progress, Math.round(phaseBase + (current / total) * phaseSpan));
        }
      }
      if (/make_showcase_voice|lines,/.test(text)) job.progress = Math.max(job.progress, 7);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const code = await new Promise((done) => child.on('close', done));
    if (code !== 0) throw new Error(`Renderer dừng với mã ${code}.`);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `${project.id}-${stamp}`;
    const archivePath = join(ARCHIVES, project.id, archiveName);
    await mkdir(dirname(archivePath), {recursive: true});
    if (job.only) {
      await mkdir(archivePath, {recursive: true});
      const onlyFiles = {"short-vi":["short-vi.mp4","vi.srt","voice-vi.wav","metadata-vi.txt"],"short-en":["short-en.mp4","en.srt","voice-en.wav","metadata-en.txt"],"long-vi":["long-vi.mp4","metadata-vi.txt"],"long-en":["long-en.mp4","metadata-en.txt"],"thumb-vi":["thumb-vi.png"],"thumb-en":["thumb-en.png"]}[job.only] || [];
      for (const file of onlyFiles) if (existsSync(join(LATEST_OUT,file))) await cp(join(LATEST_OUT,file),join(archivePath,file));
    } else await cp(LATEST_OUT, archivePath, {recursive: true});
    job.archive = `/archives/${project.id}/${archiveName}`;
    job.progress = 100;
    job.status = 'complete';
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    job.log.push(error.stack || error.message);
  } finally {
    await Promise.all([writeFile(CORE_PATH, originalCore, 'utf8'), writeFile(MAP_PATH, originalMapText, 'utf8')]);
    job.finishedAt = new Date().toISOString();
    active = null;
    await persistJobs();
    runQueue();
  }
}

await ensureData();
await restoreJobs();
const app = express();
app.use(express.json({limit: '32mb'}));
app.use('/outputs', express.static(LATEST_OUT));
app.use('/archives', express.static(ARCHIVES));
app.use('/previews', express.static(PREVIEWS));
app.use('/brand', express.static(join(ENGINE, 'public', 'brand')));

app.get('/api/health', (_req, res) => res.json({ok: true, renderer: 'Remotion 4', voice: 'Piper enhanced', queue: jobs.filter((j) => ['queued', 'running'].includes(j.status)).length}));
app.get('/api/projects', async (_req, res, next) => { try { res.json(await listProjects()); } catch (e) { next(e); } });
app.get('/api/projects/:id', async (req, res, next) => { try { res.json(await readJson(projectPath(req.params.id))); } catch (e) { next(e); } });
app.post('/api/projects', async (req, res, next) => {
  try {
    const base = await readJson(projectPath('case-001'));
    const id = `${cleanId(req.body.name || 'case')}-${Date.now().toString(36)}`;
    res.status(201).json(await saveProject({...base, id, name: req.body.name || 'Case mới'}));
  } catch (e) { next(e); }
});
app.put('/api/projects/:id', async (req, res, next) => { try { res.json(await saveProject({...req.body, id: req.params.id})); } catch (e) { next(e); } });
app.get('/api/qr', async (req, res, next) => { try { res.type('image/svg+xml').send(await QRCode.toString(String(req.query.url || ''), {type: 'svg', margin: 2, errorCorrectionLevel: 'H', color: {dark: '#061317ff', light: '#ffffffff'}})); } catch (e) { next(e); } });
app.get('/api/jobs', (_req, res) => res.json(jobs.slice(-100).reverse().map(serializeJob)));
app.post('/api/render', async (req, res, next) => {
  try {
    if (req.body.project) await saveProject(req.body.project);
    const projectId = cleanId(req.body.projectId || req.body.project?.id);
    await readFile(projectPath(projectId), 'utf8');
    const allowedOnly = ['short-vi','short-en','long-vi','long-en','thumb-vi','thumb-en'].includes(req.body.only) ? req.body.only : '';
    const job = {id: `render-${Date.now().toString(36)}`, projectId, only: allowedOnly, status: 'queued', progress: 0, log: []};
    jobs.push(job); await persistJobs(); runQueue(); res.status(202).json(serializeJob(job));
  } catch (e) { next(e); }
});
app.post('/api/jobs/:id/retry', async (req, res, next) => {
  try {
    const original = jobs.find((job) => job.id === req.params.id);
    if (!original) throw new Error('Không tìm thấy task cần chạy lại.');
    await readFile(projectPath(original.projectId), 'utf8');
    const job = {id:`render-${Date.now().toString(36)}`,projectId:original.projectId,batchId:original.batchId,only:original.only,status:'queued',progress:0,log:['Chạy lại từ task trước.']};
    jobs.push(job); await persistJobs(); runQueue(); res.status(202).json(serializeJob(job));
  } catch (e) { next(e); }
});
app.post('/api/jobs/:id/cancel', async (req, res, next) => {
  try {
    const job = jobs.find((item) => item.id === req.params.id);
    if (!job) throw new Error('Không tìm thấy task.');
    if (job.status !== 'queued') throw new Error('Chỉ có thể hủy task đang chờ.');
    job.status = 'canceled'; job.finishedAt = new Date().toISOString(); job.log.push('Đã hủy khỏi hàng chờ.');
    await persistJobs(); res.json(serializeJob(job));
  } catch (e) { next(e); }
});
app.post('/api/batch', async (req, res, next) => {
  try {
    const incoming = Array.isArray(req.body.projects) ? req.body.projects.slice(0, 50) : [];
    if (!incoming.length) throw new Error('Batch cần ít nhất một nội dung.');
    const batchId = `batch-${Date.now().toString(36)}`;
    const fallbackLocale = req.body.locale === 'en' ? 'en' : 'vi';
    for (let index=0; index<incoming.length; index++) {
      const saved = await saveProject({...incoming[index], id: `${cleanId(incoming[index].id || incoming[index].name)}-${Date.now().toString(36)}-${index+1}`});
      const itemLocale = incoming[index].batchLocale === 'en' ? 'en' : incoming[index].batchLocale === 'vi' ? 'vi' : fallbackLocale;
      jobs.push({id:`render-${Date.now().toString(36)}-${index+1}`,projectId:saved.id,batchId,only:`short-${itemLocale}`,status:'queued',progress:0,log:[]});
    }
    await persistJobs(); runQueue(); res.status(202).json({batchId,count:incoming.length,jobs:jobs.filter((j)=>j.batchId===batchId).map(serializeJob)});
  } catch (e) { next(e); }
});
app.get('/api/batches', (_req,res) => {
  const ids=[...new Set(jobs.map((j)=>j.batchId).filter(Boolean))];
  res.json(ids.map((id)=>{const items=jobs.filter((j)=>j.batchId===id);return {id,total:items.length,queued:items.filter((j)=>j.status==='queued').length,running:items.filter((j)=>j.status==='running').length,complete:items.filter((j)=>j.status==='complete').length,failed:items.filter((j)=>j.status==='failed').length,jobs:items.map(serializeJob)}}).reverse());
});
app.post('/api/voice-preview', async (req, res, next) => {
  try {
    const {locale = 'vi', text = '', voice = {}} = req.body;
    if (!String(text).trim()) throw new Error('Nhập một câu để nghe thử.');
    const file = `voice-${Date.now().toString(36)}.wav`;
    const target = join(PREVIEWS, file);
    const args = [join(ENGINE, 'scripts', 'preview_voice.py'), '--locale', locale, '--text', String(text).slice(0, 280), '--output', target, '--pace', String(voice.pace ?? .94), '--gain-db', String(voice.gainDb ?? 3), '--clarity', String(voice.clarity ?? .72)];
    const child = spawn(process.platform === 'win32' ? 'python' : 'python3', args, {cwd: ENGINE, windowsHide: true});
    let error = ''; child.stderr.on('data', (b) => { error += b.toString(); });
    const code = await new Promise((done) => child.on('close', done));
    if (code !== 0) throw new Error(error || 'Không tạo được voice preview.');
    res.json({url: `/previews/${file}`});
  } catch (e) { next(e); }
});
app.get('/api/output-files', async (_req, res, next) => { try { res.json((await readdir(LATEST_OUT)).filter((name) => /\.(mp4|png|srt|txt|json|svg|wav)$/i.test(name)).map((name) => ({name, url: `/outputs/${encodeURIComponent(name)}`}))); } catch (e) { next(e); } });

app.use(express.static(join(APP, 'dist')));
app.get(/.*/, (_req, res) => res.sendFile(join(APP, 'dist', 'index.html')));
app.use((error, _req, res, _next) => res.status(400).json({error: error.message || 'Có lỗi xảy ra.'}));
app.listen(PORT, '127.0.0.1', () => {
  console.log(`XAU LAB Studio: http://127.0.0.1:${PORT}`);
  runQueue();
});
