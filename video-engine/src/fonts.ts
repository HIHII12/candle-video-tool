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
 * Google splits each family into unicode-range subsets. English copy, prices and
 * the middot separator are all inside latin — but Vietnamese is not. The latin
 * files are missing 52 of the 70 marks Vietnamese needs, so every accented vowel fell
 * back to whatever the container had, which is how a headline ends up half in
 * one typeface and half in another. The Vietnamese subset is carried as a second
 * face per family under the same family name, scoped by unicode-range exactly
 * the way Google serves it: Latin text still comes from the original file, and
 * only the accented characters come from the new one.
 *
 * Archivo Black has no Vietnamese subset at all, so its companion is Archivo
 * Variable pinned to weight 900 — the same design at the same weight.
 */
import {ARCHIVO_VI_WOFF2, ARCHIVO_WOFF2, INTER_VI_WOFF2, INTER_WOFF2} from './fontData';

/**
 * The Vietnamese subset's range, copied from what Google Fonts serves.
 *
 * Ã, Õ, Â, Ê, Ô and the plain accented vowels are already in latin and stay
 * there; this covers the marks that are not — the breve and horn vowels, the
 * dot-below family, the barred d, and the dong sign.
 */
const VI_RANGE = [
  'U+0102-0103', 'U+0110-0111', 'U+0128-0129', 'U+0168-0169',
  'U+01A0-01A1', 'U+01AF-01B0', 'U+0300-0301', 'U+0303-0304',
  'U+0308-0309', 'U+0323', 'U+0329', 'U+1EA0-1EF9', 'U+20AB',
].join(',');

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
    `@font-face{font-family:"${INTER}";src:url(${INTER_VI_WOFF2}) format("woff2");`,
    `font-weight:100 900;font-style:normal;font-display:block;unicode-range:${VI_RANGE}}`,
    // Weight is pinned rather than ranged: Archivo Variable answers for the
    // accented characters only, and it has to land on the one weight Archivo
    // Black is, or a Vietnamese headline comes out lighter than its own Latin.
    `@font-face{font-family:"${ARCHIVO}";src:url(${ARCHIVO_VI_WOFF2}) format("woff2");`,
    `font-weight:400;font-style:normal;font-display:block;font-variation-settings:"wght" 900;`,
    `unicode-range:${VI_RANGE}}`,
  ].join('');
  document.head.appendChild(style);
}

/** Display face: a single very heavy weight, for headlines and prices. */
export const DISPLAY_FONT = `"${ARCHIVO}", Impact, sans-serif`;

/** Text face: real weights 400-800, used where copy has to be read. */
export const TEXT_FONT = `"${INTER}", system-ui, sans-serif`;
