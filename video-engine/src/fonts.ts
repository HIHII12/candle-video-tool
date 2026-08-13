/**
 * Typefaces, embedded in the bundle as data URIs.
 *
 * The render container ships no Inter and no Arial, so every earlier font stack
 * silently fell back to Liberation Sans and the browser synthesised the heavy
 * weights. That faux bold is why large headings looked soft.
 *
 * Getting the real faces in took three attempts, and the two failures are worth
 * recording because both passed every short test:
 *
 *  1. `@remotion/google-fonts` downloads the woff2 from fonts.gstatic.com at
 *     render time. That fails outright behind a TLS-inspecting proxy, and on a
 *     machine with no internet it quietly falls back to a system face — the same
 *     sloppy look, with no error to warn us.
 *  2. `@remotion/fonts`' loadFont() opens a delayRender at module scope. Remotion
 *     creates fresh pages as a render progresses, so that module runs again
 *     mid-render, and around frame 718 of 2100 the handle stopped being cleared
 *     and cancelled the whole render. Stills and short ranges never reached it.
 *
 * So: plain CSS, no delayRender to leak, and the font bytes inline so there is
 * nothing to fetch. `font-display: block` means text waits for the real face
 * rather than flashing a substitute — with the bytes already in the document
 * that wait is imperceptible, and the chart hook already holds the frame for
 * three animation frames before anything is captured.
 *
 * Google splits each family into unicode-range subsets; everything these videos
 * print (English copy, prices, the middot separator) is inside latin, so one
 * subset per family is all we carry.
 */
import {ARCHIVO_WOFF2, INTER_WOFF2} from './fontData';

const INTER = 'Inter Local';
const ARCHIVO = 'Archivo Black Local';
const STYLE_ID = 'xau-embedded-fonts';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
    `@font-face{font-family:"${INTER}";src:url(${INTER_WOFF2}) format("woff2");`,
    `font-weight:100 900;font-style:normal;font-display:block}`,
    `@font-face{font-family:"${ARCHIVO}";src:url(${ARCHIVO_WOFF2}) format("woff2");`,
    `font-weight:400;font-style:normal;font-display:block}`,
  ].join('');
  document.head.appendChild(style);
}

/** Display face: a single very heavy weight, for headlines and prices. */
export const DISPLAY_FONT = `"${ARCHIVO}", Impact, sans-serif`;

/** Text face: real weights 400-800, used where copy has to be read. */
export const TEXT_FONT = `"${INTER}", system-ui, sans-serif`;
