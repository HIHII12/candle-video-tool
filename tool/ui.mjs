#!/usr/bin/env node
/**
 * A local control panel for the render machine.
 *
 * The console was the wrong surface for this. A thirty-video run takes twenty
 * minutes, and on Windows a stray click inside cmd.exe selects text and
 * *suspends the process* until Escape is pressed — which looked exactly like a
 * crash, twice. A browser page cannot be frozen by a misclick, shows every job
 * at once instead of a scrolling wall, and can play the results back.
 *
 * It shells out to tool/batch.mjs and reads its output rather than
 * reimplementing the pipeline. One source of truth for what a day contains and
 * how a video is made; this file only watches and displays.
 *
 * Node standard library only — no install step on the machine that renders.
 *
 *     node tool/ui.mjs          then open http://localhost:4321
 */

import { spawn } from 'node:child_process';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { planFor } from './variants.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = join(ROOT, 'video-engine');
const PORT = Number(process.env.PORT ?? 4321);

const today = () => new Date().toISOString().slice(0, 10);

/** The running batch, if any. One at a time: two would fight over the same files. */
let run = null;

const listeners = new Set();
const push = (event) => {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of listeners) res.write(data);
};

/**
 * Parse batch.mjs's output back into events.
 *
 * The formats are fixed by batch.mjs and matched loosely on purpose: an
 * unrecognised line becomes a log entry rather than being dropped, so anything
 * unexpected still reaches the operator instead of vanishing.
 */
function parseLine(line) {
  let m;
  if ((m = line.match(/^\s+(\S+)\s+(\d+)%$/))) {
    return { type: 'progress', id: m[1], percent: Number(m[2]) };
  }
  if ((m = line.match(/^\[\s*(\d+)\/(\d+)\]\s+(ok|--|FAIL)\s+(\S+)\s+(.*)$/))) {
    return {
      type: 'job',
      index: Number(m[1]),
      total: Number(m[2]),
      status: m[3] === 'ok' ? 'done' : m[3] === '--' ? 'skipped' : 'failed',
      id: m[4],
      detail: m[5].trim(),
    };
  }
  if ((m = line.match(/^(\d+) rendered, (\d+) skipped, (\d+) failed/))) {
    return { type: 'summary', rendered: +m[1], skipped: +m[2], failed: +m[3] };
  }
  return { type: 'log', text: line };
}

function startRun(body) {
  if (run) return { error: 'A run is already going.' };

  const args = ['tool/batch.mjs', '--date', body.date || today(), '--count', String(body.count || 30)];
  if (body.workers) args.push('--workers', String(body.workers));
  if (body.only) args.push('--only', body.only);
  if (body.noVoice) args.push('--no-voice');

  const p = spawn(process.execPath, args, { cwd: ROOT });
  run = { p, startedAt: Date.now() };
  push({ type: 'started', args });

  let buf = '';
  const onData = (d) => {
    buf += d.toString();
    const parts = buf.split(/[\r\n]+/);
    buf = parts.pop() ?? '';
    for (const l of parts) if (l.trim()) push(parseLine(l.trimEnd()));
  };
  p.stdout.on('data', onData);
  p.stderr.on('data', onData);
  p.on('close', (code) => {
    run = null;
    push({ type: 'finished', code });
  });
  return { ok: true };
}

/** Videos already on disk for a date, newest first. */
function videosFor(date) {
  const dir = join(ENGINE, 'out', 'batch', date);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.mp4'))
    .map((f) => {
      const s = statSync(join(dir, f));
      return { id: f.replace(/\.mp4$/, ''), file: f, mb: +(s.size / 1e6).toFixed(1), at: s.mtimeMs };
    })
    .sort((a, b) => b.at - a.at);
}

const json = (res, obj, code = 200) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(PAGE);
  }

  if (url.pathname === '/api/state') {
    const date = url.searchParams.get('date') || today();
    return json(res, {
      date,
      running: Boolean(run),
      plan: planFor(date, 30),
      videos: videosFor(date),
    });
  }

  if (url.pathname === '/api/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    res.write('\n');
    listeners.add(res);
    req.on('close', () => listeners.delete(res));
    return;
  }

  if (url.pathname === '/api/run' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const parsed = body ? JSON.parse(body) : {};
    const out = startRun(parsed);
    return json(res, out, out.error ? 409 : 200);
  }

  if (url.pathname === '/api/stop' && req.method === 'POST') {
    if (run) run.p.kill();
    return json(res, { ok: true });
  }

  // Video playback. Confined to the batch output directory, and the filename is
  // matched against a strict pattern — this server binds to localhost, but a
  // path that walks out of its directory is never acceptable regardless.
  if (url.pathname.startsWith('/video/')) {
    const [, , date, name] = url.pathname.split('/');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[\w.-]+\.mp4$/.test(name)) {
      return json(res, { error: 'bad path' }, 400);
    }
    const file = join(ENGINE, 'out', 'batch', date, name);
    if (!file.startsWith(join(ENGINE, 'out', 'batch')) || !existsSync(file)) {
      return json(res, { error: 'not found' }, 404);
    }
    res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': statSync(file).size });
    return createReadStream(file).pipe(res);
  }

  json(res, { error: 'not found' }, 404);
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Bang dieu khien: ${url}\n  (Dong cua so nay de tat)\n`);
  // Open the browser, best-effort. Failing to launch one is not an error worth
  // stopping for — the URL is printed above either way.
  const opener =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  // spawn reports a missing binary through an 'error' event, not a throw, so a
  // try/catch here catches nothing and the unhandled event takes the server
  // down with it. On a machine without xdg-open that meant the control panel
  // died the instant it started — because it could not open a browser.
  const child = spawn(opener[0], opener[1], { detached: true, stdio: 'ignore' });
  child.on('error', () => {
    console.log('  (khong tu mo duoc trinh duyet — mo tay dia chi o tren)');
  });
  child.unref();
});

const PAGE = String.raw`<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cỗ máy video — bảng điều khiển</title>
<style>
  :root{
    --bg:#0d1117; --panel:#161b22; --line:#232a34;
    --ink:#e6edf3; --soft:#8b949e; --faint:#4c5561;
    --ok:#2ebd85; --bad:#e2465e; --accent:#f0b429; --run:#1c6cff;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:15px/1.5 ui-sans-serif,system-ui,"Segoe UI",sans-serif}
  header{position:sticky;top:0;z-index:5;background:var(--bg);
    border-bottom:1px solid var(--line);padding:18px 22px;
    display:flex;gap:16px;align-items:center;flex-wrap:wrap}
  h1{font-size:19px;margin:0;font-weight:800;letter-spacing:-.2px}
  .sp{flex:1}
  button{font:inherit;font-weight:700;border:0;border-radius:9px;
    padding:10px 18px;cursor:pointer;color:#fff;background:var(--run)}
  button.ghost{background:transparent;color:var(--soft);border:1px solid var(--line)}
  button:disabled{opacity:.4;cursor:not-allowed}
  select,input{font:inherit;background:var(--panel);color:var(--ink);
    border:1px solid var(--line);border-radius:9px;padding:9px 12px}
  main{padding:22px;max-width:1100px;margin:0 auto}
  .bar{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:14px}
  .bar>i{display:block;height:100%;background:var(--run);width:0;transition:width .3s}
  .totals{display:flex;gap:22px;margin-top:12px;color:var(--soft);font-size:14px}
  .totals b{color:var(--ink)}
  .grid{display:grid;gap:10px;margin-top:22px;
    grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
  .job{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:13px 15px}
  .job .top{display:flex;align-items:center;gap:9px}
  .dot{width:9px;height:9px;border-radius:99px;background:var(--faint);flex:none}
  .job.run .dot{background:var(--run);animation:pulse 1.1s infinite}
  .job.done .dot{background:var(--ok)} .job.skipped .dot{background:var(--accent)}
  .job.failed .dot{background:var(--bad)}
  @keyframes pulse{50%{opacity:.35}}
  .name{font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fmt{color:var(--soft);font-size:12.5px;margin-top:3px}
  .pct{margin-left:auto;color:var(--soft);font-variant-numeric:tabular-nums;font-size:13px}
  .jbar{height:4px;border-radius:99px;background:var(--line);margin-top:9px;overflow:hidden}
  .jbar>i{display:block;height:100%;background:var(--run);width:0;transition:width .3s}
  .job.done .jbar>i{background:var(--ok)}
  video{width:100%;border-radius:9px;margin-top:11px;background:#000;display:block}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:1.4px;
    color:var(--soft);margin:34px 0 0}
  pre{background:var(--panel);border:1px solid var(--line);border-radius:11px;
    padding:13px 15px;margin-top:12px;max-height:200px;overflow:auto;
    font-size:12.5px;color:var(--soft);white-space:pre-wrap}
  .note{color:var(--faint);font-size:13px;margin-top:8px}
</style></head><body>
<header>
  <h1>Cỗ máy video</h1>
  <input type="date" id="date">
  <select id="count">
    <option value="30">30 video</option><option value="8">8 video</option>
    <option value="4">4 video</option><option value="2">2 video (chạy thử)</option>
  </select>
  <select id="workers"><option value="2">2 luồng</option>
    <option value="1">1 luồng</option><option value="3">3 luồng</option></select>
  <div class="sp"></div>
  <button id="go">Bắt đầu render</button>
  <button id="stop" class="ghost" disabled>Dừng</button>
</header>
<main>
  <div class="bar"><i id="all"></i></div>
  <div class="totals">
    <span><b id="tDone">0</b> xong</span><span><b id="tSkip">0</b> bỏ qua</span>
    <span><b id="tFail">0</b> lỗi</span><span><b id="tLeft">0</b> còn lại</span>
    <span id="clock"></span>
  </div>
  <div class="note">Bấm vào video đã xong để xem lại. Đóng trang này không làm dừng render.</div>
  <div class="grid" id="grid"></div>
  <h2>Nhật ký</h2>
  <pre id="log"></pre>
</main>
<script>
const $ = (s) => document.querySelector(s);
let jobs = new Map(), date = new Date().toISOString().slice(0,10), t0 = 0, timer = 0;
$('#date').value = date;

function card(j){
  const el = document.createElement('div');
  el.className = 'job'; el.id = 'j-' + j.id;
  el.innerHTML =
    '<div class="top"><span class="dot"></span>' +
    '<div><div class="name"></div><div class="fmt"></div></div>' +
    '<span class="pct"></span></div><div class="jbar"><i></i></div>';
  el.querySelector('.name').textContent = j.label || j.id;
  el.querySelector('.fmt').textContent = j.format;
  return el;
}

async function load(){
  const r = await fetch('/api/state?date=' + date);
  const s = await r.json();
  jobs = new Map(s.plan.map((j) => [j.id, j]));
  const g = $('#grid'); g.innerHTML = '';
  for (const j of s.plan) g.appendChild(card(j));
  for (const v of s.videos) markDone(v.id, '', v.file);
  $('#tLeft').textContent = s.plan.length - s.videos.length;
  running(s.running);
}

function markDone(id, detail, file){
  const el = document.getElementById('j-' + id); if (!el) return;
  el.classList.remove('run'); el.classList.add('done');
  el.querySelector('.pct').textContent = detail || 'xong';
  el.querySelector('.jbar > i').style.width = '100%';
  if (file && !el.querySelector('video')){
    const v = document.createElement('video');
    v.controls = true; v.preload = 'none';
    v.src = '/video/' + date + '/' + file;
    el.appendChild(v);
  }
}

function running(on){
  $('#go').disabled = on; $('#stop').disabled = !on;
  if (on && !timer){ t0 = t0 || Date.now(); timer = setInterval(tick, 1000); }
  if (!on && timer){ clearInterval(timer); timer = 0; }
}
function tick(){
  const s = Math.round((Date.now() - t0) / 1000);
  $('#clock').textContent = 'đã chạy ' + Math.floor(s/60) + 'p ' + (s%60) + 'g';
}

const es = new EventSource('/api/events');
es.onmessage = (e) => {
  const ev = JSON.parse(e.data);
  const log = $('#log');
  if (ev.type === 'started'){ t0 = Date.now(); running(true); log.textContent = ''; }
  if (ev.type === 'progress'){
    const el = document.getElementById('j-' + ev.id); if (!el) return;
    el.classList.add('run');
    el.querySelector('.pct').textContent = ev.percent + '%';
    el.querySelector('.jbar > i').style.width = ev.percent + '%';
  }
  if (ev.type === 'job'){
    const el = document.getElementById('j-' + ev.id);
    if (el){
      el.classList.remove('run'); el.classList.add(ev.status);
      el.querySelector('.pct').textContent =
        ev.status === 'failed' ? 'lỗi' : ev.status === 'skipped' ? 'đã có' : ev.detail.split('·')[0].trim();
      el.querySelector('.jbar > i').style.width = '100%';
      if (ev.status === 'done' && !el.querySelector('video')){
        const v = document.createElement('video');
        v.controls = true; v.preload = 'none';
        v.src = '/video/' + date + '/' + ev.id + '.mp4';
        el.appendChild(v);
      }
    }
    const n = (id) => Number($(id).textContent);
    if (ev.status === 'done') $('#tDone').textContent = n('#tDone') + 1;
    if (ev.status === 'skipped') $('#tSkip').textContent = n('#tSkip') + 1;
    if (ev.status === 'failed') $('#tFail').textContent = n('#tFail') + 1;
    $('#tLeft').textContent = Math.max(0, ev.total - ev.index);
    $('#all').style.width = (100 * ev.index / ev.total) + '%';
  }
  if (ev.type === 'finished'){ running(false); log.textContent += '\n— kết thúc —\n'; }
  if (ev.type === 'log' || ev.type === 'summary'){
    log.textContent += (ev.text ?? JSON.stringify(ev)) + '\n';
    log.scrollTop = log.scrollHeight;
  }
};

$('#go').onclick = () => fetch('/api/run', {
  method: 'POST', headers: {'content-type':'application/json'},
  body: JSON.stringify({date, count: +$('#count').value, workers: +$('#workers').value}),
}).then((r) => r.json()).then((r) => { if (r.error) alert(r.error); });

$('#stop').onclick = () => fetch('/api/stop', {method:'POST'});
$('#date').onchange = (e) => { date = e.target.value; load(); };
load();
</script></body></html>`;
