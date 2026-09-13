/**
 * The channel mark, in one place.
 *
 * It was hardcoded per format and drifted: the quiz said "XAU DAILY" while the
 * lesson and the map said "XAU LAB", so a viewer meeting two of our videos met
 * two channels. Worse, one format once carried a *reference channel's* initials,
 * copied along with its layout — the layout is fair to study, the mark is not
 * ours to reuse. Importing it from here makes both mistakes impossible to repeat
 * quietly.
 */
export const CHANNEL_MARK = 'XAU LAB';

/**
 * Two channels, two names. A blanket rename once put the Vietnamese channel's
 * name on the English tagline — they are different channels and the English
 * side has never been Van Thang anything.
 */
export const BRAND = {
  name: {
    vi: 'XAU LAB | VĂN THẮNG TRADING',
    en: 'GOLDFATHER FX',
  },
  tagline: {
    vi: 'Quản lý vốn • Giao dịch an toàn cùng Văn Thắng Trading',
    en: 'Risk Management • Safer Trading with GoldFather FX',
  },
  zaloUrl: 'https://zalo.me/g/vuqtnr406',
  disclaimer: 'Educational content · Not investment advice',
} as const;
