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
const PORT = Number(process.env.XAU_LAB_PORT || 4173);
const jobs = [];
let active = null;

const cleanId = (value) => String(value || 'project').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'project';
const projectPath = (id) => join(PROJECTS, `${cleanId(id)}.json`);
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

async function ensureData() {
  await Promise.all([mkdir(PROJECTS, {recursive: true}), mkdir(PREVIEWS, {recursive: true}), mkdir(ARCHIVES, {recursive: true})]);
  const path = projectPath('case-001');
  if (!existsSync(path)) {
    const [core, map] = await Promise.all([readJson(CORE_PATH), readJson(MAP_PATH)]);
    await writeFile(path, JSON.stringify({id: 'case-001', name: 'Gold H1 · WAIT', updatedAt: new Date().toISOString(), core, candles: map.candles}, null, 2), 'utf8');
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
  return {id: job.id, projectId: job.projectId, status: job.status, progress: job.progress, startedAt: job.startedAt, finishedAt: job.finishedAt, error: job.error, archive: job.archive, log: job.log.slice(-28)};
}

async function runQueue() {
  if (active) return;
  const job = jobs.find((item) => item.status === 'queued');
  if (!job) return;
  active = job;
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  const project = await readJson(projectPath(job.projectId));
  const [originalCore, originalMapText] = await Promise.all([readFile(CORE_PATH, 'utf8'), readFile(MAP_PATH, 'utf8')]);
  const map = JSON.parse(originalMapText);
  map.candles = project.candles;
  map.lastPrice = Number(project.candles.at(-1).close);
  map.pair = project.core.data.symbol;
  map.timeframe = project.core.data.timeframe;
  try {
    await Promise.all([writeFile(CORE_PATH, JSON.stringify(project.core, null, 2), 'utf8'), writeFile(MAP_PATH, JSON.stringify(map, null, 2), 'utf8')]);
    const child = spawn(process.execPath, [join(ROOT, 'tool', 'showcase.mjs')], {cwd: ROOT, windowsHide: true, env: {...process.env, FORCE_COLOR: '0'}});
    job.child = child;
    const onData = (buffer) => {
      const lines = buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
      job.log.push(...lines);
      const text = lines.join(' ');
      const matches = [...text.matchAll(/Rendered\s+(\d+)\/(\d+)/ig)];
      if (matches.length) {
        const match = matches.at(-1);
        const current = Number(match[1]); const total = Number(match[2]);
        const phase = total === 2580 ? (/short-en/.test(text) ? 1 : 0) : total === 9000 ? 2 : 3;
        const phaseBase = [12, 32, 52, 88][phase] || 12;
        const phaseSpan = [20, 20, 36, 7][phase] || 20;
        job.progress = Math.max(job.progress, Math.round(phaseBase + (current / total) * phaseSpan));
      }
      if (/make_showcase_voice|lines,/.test(text)) job.progress = Math.max(job.progress, 12);
      if (/short-en|case-file-vi|thumb-vi|thumb-en/.test(text)) job.progress = Math.min(95, job.progress + 3);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const code = await new Promise((done) => child.on('close', done));
    if (code !== 0) throw new Error(`Renderer dừng với mã ${code}.`);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `${project.id}-${stamp}`;
    const archivePath = join(ARCHIVES, project.id, archiveName);
    await mkdir(dirname(archivePath), {recursive: true});
    await cp(LATEST_OUT, archivePath, {recursive: true});
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
    runQueue();
  }
}

await ensureData();
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
app.get('/api/jobs', (_req, res) => res.json(jobs.slice(-12).reverse().map(serializeJob)));
app.post('/api/render', async (req, res, next) => {
  try {
    if (req.body.project) await saveProject(req.body.project);
    const projectId = cleanId(req.body.projectId || req.body.project?.id);
    await readFile(projectPath(projectId), 'utf8');
    const job = {id: `render-${Date.now().toString(36)}`, projectId, status: 'queued', progress: 0, log: []};
    jobs.push(job); runQueue(); res.status(202).json(serializeJob(job));
  } catch (e) { next(e); }
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
app.listen(PORT, '127.0.0.1', () => console.log(`XAU LAB Studio: http://127.0.0.1:${PORT}`));
