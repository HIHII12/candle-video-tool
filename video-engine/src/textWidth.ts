/**
 * How wide a run of text will actually be, in pixels.
 *
 * Every pill in this codebase used to size itself as `text.length * K`, and
 * that estimate is wrong in exactly the way that hurts: it is calibrated on
 * English, and Vietnamese runs wider. "ĐƯỜNG VIỀN CỔ 4305.2" came out 332px of
 * pill holding 380px of text — and because the text is white and the page is
 * white, the 48px that hung off the end were white-on-white. The label did not
 * look clipped. It looked like the tool had rendered "ĐƯỜNG VIỀN CỔ 430" and
 * stopped, which is worse, because nobody reading the frame can tell there is a
 * bug rather than a typo.
 *
 * Canvas text measurement is not available here — Remotion renders each frame
 * from scratch and a measurement pass would need a layout round-trip per frame,
 * on 2100 frames. So this is a per-character table instead, calibrated against
 * Archivo at weight 700-900, which is what every pill in this tool uses.
 * Deliberately a slight over-estimate: a pill 10px too wide is invisible, a
 * pill 10px too narrow eats a character.
 */

/** Width of one character as a fraction of the font size. */
const RATIO: Array<[RegExp, number]> = [
  // Space and thin punctuation.
  [/[ .,:'’|!]/, 0.30],
  // Digits are tabular in this family, and narrower than caps.
  [/[0-9]/, 0.60],
  // Latin capitals, and every Vietnamese capital — the stacked diacritics do
  // not add width, but the base letters are the wide ones.
  [/[A-ZÀ-ỹ]/, 0.72],
  // Lowercase.
  [/[a-z]/, 0.56],
  // The wide ones this tool actually prints: em dash, arrows, middle dot.
  [/[—–→←·×]/, 0.85],
];

export const textWidth = (text: string, fontSize: number, bold = true): number => {
  let units = 0;
  for (const ch of text) {
    const hit = RATIO.find(([re]) => re.test(ch));
    units += hit ? hit[1] : 0.66;
  }
  // Heavy weights add roughly 4% over the regular cut, and the whole estimate
  // carries 6% of headroom: measured against rendered frames it came out about
  // 8% light on long mixed-case Vietnamese, and every failure mode of this
  // function is a clipped word, never a slightly wide pill.
  return units * fontSize * (bold ? 1.04 : 1) * 1.06;
};

/**
 * The width of a pill that holds `text` with `padding` on each side.
 *
 * Use this everywhere a rounded rect sits behind a text run. It is the single
 * place the estimate lives, so a font change is one edit rather than four.
 */
export const pillWidth = (text: string, fontSize: number, padding = 16, bold = true): number =>
  textWidth(text, fontSize, bold) + padding * 2;
