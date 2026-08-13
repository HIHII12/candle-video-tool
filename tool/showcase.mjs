#!/usr/bin/env node
/** Build every artifact for XAU LAB case-001 from one content core. */

import {spawnSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = join(ROOT, 'video-engine');
const OUT = join(ENGINE, 'out', 'showcase', 'case-001');
const PUBLIC_BRAND = join(ENGINE, 'public', 'brand');
const CORE_PATH = join(ENGINE, 'src', 'content', 'case001.json');
const CORE = JSON.parse(readFileSync(CORE_PATH, 'utf8'));
const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const onlyArg = (() => { const i = args.indexOf('--only'); return i >= 0 ? args[i + 1] : ''; })();
const python = process.platform === 'win32' ? 'python' : 'python3';

const run = (cmd, cmdArgs, cwd = ENGINE) => {
  console.log(`\n$ ${cmd} ${cmdArgs.join(' ')}`);
  const result = spawnSync(cmd, cmdArgs, {cwd, stdio: 'inherit', shell: process.platform === 'win32'});
  if (result.status !== 0) process.exit(result.status || 1);
};

mkdirSync(OUT, {recursive: true});
mkdirSync(PUBLIC_BRAND, {recursive: true});

// Run inside video-engine so Node resolves the package from its local
// node_modules even when the launcher itself lives one directory above.
if (CORE.ctaMode === 'link') {
  for (const locale of ['vi', 'en']) {
    const destination = CORE.destinations[locale];
    const filename = destination.qrAsset.split('/').pop();
    run('node', ['scripts/generate_qr.mjs', destination.url, join(PUBLIC_BRAND, filename)]);
    copyFileSync(join(PUBLIC_BRAND, filename), join(OUT, filename));
  }
}
writeFileSync(join(OUT, 'content-core.json'), JSON.stringify(CORE, null, 2));

for (const locale of ['vi', 'en']) {
  const meta = CORE.locales[locale].metadata;
  const destination = CORE.destinations[locale];
  const text = [
    `TITLE\n${meta.title}`,
    `DESCRIPTION\n${meta.description}`,
    `PINNED COMMENT\n${meta.pinnedComment}`,
    `CTA ${destination.channel.toUpperCase()}\n${destination.handle}\n${destination.url}`,
  ].join('\n\n');
  writeFileSync(join(OUT, `metadata-${locale}.txt`), text, 'utf8');
  writeFileSync(join(OUT, `props-short-${locale}.json`), JSON.stringify({locale}, null, 2));
  writeFileSync(join(OUT, `props-thumb-${locale}.json`), JSON.stringify({locale}, null, 2));
}
writeFileSync(join(OUT, 'props-case-file-vi.json'), JSON.stringify({locale: 'vi'}, null, 2));
writeFileSync(join(OUT, 'README.txt'), [
  'XAU LAB | VĂN THẮNG INVEST — CASE 001',
  '',
  'Xem nhanh:',
  '1. short-vi.mp4 — Short tiếng Việt, 1080x1920, 60 fps, 43 giây.',
  '2. short-en.mp4 — Short tiếng Anh, cùng hình và nhịp.',
  '3. case-file-vi.mp4 — video dài tiếng Việt, 1920x1080, 30 fps, 5 phút.',
  '',
  'File đi kèm:',
  '- voice-vi.wav / voice-en.wav: track giọng riêng của Shorts.',
  '- vi.srt / en.srt: subtitle Shorts.',
  '- thumb-vi.png / thumb-en.png: thumbnail 1280x720.',
  '- metadata-vi.txt / metadata-en.txt: title, description, bình luận ghim và CTA.',
  '- zalo-qr.svg / telegram-qr.svg: QR vector theo từng thị trường.',
  '- qa.json: nguồn dữ liệu, probe video, audio, layout, QR và license.',
  '',
  'Lưu ý dữ liệu: Yahoo GC=F là COMEX Gold Futures proxy, không phải XAUUSD spot.',
  `Zalo: ${CORE.cta.url}`,
  `Global Telegram: ${CORE.destinations.en.handle} · ${CORE.destinations.en.url}`,
  '',
  'Không tự đăng công khai. Nội dung giáo dục, không phải khuyến nghị đầu tư.',
].join('\n'), 'utf8');

if (!has('skip-voice')) {
  const vendor = join(ENGINE, 'vendor', 'piper');
  if (!existsSync(join(vendor, process.platform === 'win32' ? 'piper.exe' : 'piper'))) {
    run(python, ['scripts/setup_voice.py', '--voice', 'vi_VN-vais1000-medium']);
  } else if (!existsSync(join(vendor, 'vi_VN-vais1000-medium.onnx'))) {
    run(python, ['scripts/setup_voice.py', '--voice', 'vi_VN-vais1000-medium']);
  }
  if (!existsSync(join(vendor, 'en_US-norman-medium.onnx'))) {
    run(python, ['scripts/setup_voice.py', '--voice', 'en_US-norman-medium']);
  }
  run(python, ['scripts/make_showcase_voice.py']);
}

if (!has('skip-render')) {
  const marketCase = CORE.content?.type === 'market-case';
  const jobs = [
    {key: 'short-vi', type: 'render', composition: CORE.content?.type === 'market-case' ? 'CaseShort' : 'UniversalContentShort', file: 'short-vi.mp4', props: 'props-short-vi.json'},
    {key: 'short-en', type: 'render', composition: CORE.content?.type === 'market-case' ? 'CaseShort' : 'UniversalContentShort', file: 'short-en.mp4', props: 'props-short-en.json'},
    ...(marketCase ? [{key: 'case-file-vi', type: 'render', composition: 'CaseFile', file: 'case-file-vi.mp4', props: 'props-case-file-vi.json'}] : []),
    {key: 'thumb-vi', type: 'still', composition: marketCase ? 'CaseThumbnail' : 'UniversalContentThumbnail', file: 'thumb-vi.png', props: 'props-thumb-vi.json'},
    {key: 'thumb-en', type: 'still', composition: marketCase ? 'CaseThumbnail' : 'UniversalContentThumbnail', file: 'thumb-en.png', props: 'props-thumb-en.json'},
  ].filter((job) => !onlyArg || job.key === onlyArg);

  for (const job of jobs) {
    const target = join(OUT, job.file);
    const props = join(OUT, job.props);
    if (job.type === 'still') {
      run('npx', ['remotion', 'still', job.composition, target, `--props=${props}`, '--image-format=png']);
    } else {
      run('npx', [
        'remotion', 'render', job.composition, target, `--props=${props}`,
        '--codec=h264', '--crf=18', '--pixel-format=yuv420p', '--audio-codec=aac', '--audio-bitrate=192k',
      ]);
    }
  }
}

// Keep the exact provided logo alongside the deliverable for provenance.
copyFileSync(join(PUBLIC_BRAND, 'van-thang-invest-logo.png'), join(OUT, 'brand-logo-source.png'));
console.log(`\nShowcase package: ${OUT}`);
