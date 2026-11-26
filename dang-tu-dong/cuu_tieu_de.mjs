/**
 * Sinh lai file .txt (tieu de / mo ta / hashtag) cho video da render tu lau.
 *
 * Lo dau tien ra lo truoc khi co bo sinh ghi chu, nen 100 video nam do khong
 * dang duoc — khong phai vi hinh xau, ma vi khong ai biet viet gi len tieu de.
 * Cau hinh cua chung van con trong src/data/, nen thu can lam la doc lai roi
 * viet ghi chu, KHONG phai render lai vai tieng dong ho.
 *
 *     node dang-tu-dong/cuu_tieu_de.mjs video-engine/out/batch/2026-08-28
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeUploadNote } from '../tool/upload-kit.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ENGINE = join(ROOT, 'video-engine');

/** Doan dinh dang tu ten file — thu duy nhat con lai sau khi video roi day chuyen. */
function doanFormat(id) {
  if (/(^|-)compare-|(^|-)sosanh-/.test(id)) return 'candle-compare';
  if (/(^|-)map-/.test(id)) return 'market-map';
  if (/(^|-)concept-|(^|-)kienthuc-/.test(id)) return 'concept-lesson';
  if (/(^|-)lot-/.test(id)) return 'lot-quiz';
  if (/(^|-)candle-|(^|-)nen-/.test(id)) return 'candle-lesson';
  return 'candle-lesson';
}

const thuMuc = process.argv[2];
if (!thuMuc) {
  console.log('thieu duong dan thu muc video');
  process.exit(1);
}

let xong = 0;
let thieuCauHinh = [];

for (const f of readdirSync(join(ROOT, thuMuc)).sort()) {
  if (!f.endsWith('.mp4')) continue;
  const id = basename(f, '.mp4');
  const txt = join(ROOT, thuMuc, `${id}.txt`);
  if (existsSync(txt)) continue;

  const cauHinh = join(ENGINE, 'src', 'data', `batch_${id}.json`);
  if (!existsSync(cauHinh)) { thieuCauHinh.push(id); continue; }

  const cfg = JSON.parse(readFileSync(cauHinh, 'utf8'));
  const job = {
    id,
    format: doanFormat(id),
    // locale khong ghi trong cau hinh cu nghia la en — do la mac dinh cua tool
    // luc do, khong phai "chua biet".
    locale: cfg.locale ?? 'en',
    label: id.replace(/-/g, ' '),
    pair: cfg.pair,
  };
  // Khong goi model viet lai: cau hinh da co tagline va rule viet san cho dung
  // bieu do nay. Mot dong moi sinh bay gio la noi ve mot bieu do no chua he thay.
  // writeUploadNote tu ghep voi thu muc engine, nen duong dan phai la duong
  // dan TUONG DOI so voi engine — dua ca "video-engine/..." vao thi thanh
  // video-engine/video-engine/...
  const duongDanTuongDoi = thuMuc.replace(/^video-engine\//, '');
  writeUploadNote(ENGINE, join(duongDanTuongDoi, f), job, cfg,
    { title: cfg.title ?? null, hook: cfg.hook ?? null, source: 'none' });
  xong += 1;
}

console.log(`da viet ${xong} file .txt`);
if (thieuCauHinh.length) {
  console.log(`  ⚠ ${thieuCauHinh.length} video khong con cau hinh — khong cuu duoc: ${thieuCauHinh.slice(0,3).join(', ')}...`);
}
