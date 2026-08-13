#!/usr/bin/env node
import {writeFileSync} from 'node:fs';
import QRCode from 'qrcode';

const [url, output] = process.argv.slice(2);
if (!url || !output) {
  console.error('Usage: node scripts/generate_qr.mjs <url> <output.svg>');
  process.exit(1);
}

// Vector output, H correction and a four-module quiet zone are acceptance
// requirements for the video CTA—not cosmetic options.
const svg = await QRCode.toString(url, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 4,
  width: 512,
  color: {dark: '#061317ff', light: '#ffffffff'},
});
writeFileSync(output, svg, 'utf8');
console.log(`QR SVG: ${output}`);

