/**
 * Every word the renderer prints that does not come from the data.
 *
 * Two audiences, two tracks. The global track is English and stays what it was;
 * the Vietnam track is not a translation of it — the pattern names are what
 * Vietnamese traders actually call these shapes ("Sao Mai", "Nhấn Chìm Tăng",
 * "Đáy Nhíp"), and the names that became terms of art in the trade (Doji, Pin
 * Bar, Marubozu) stay in the form everyone already says out loud. Translating
 * those would produce words nobody uses.
 *
 * The pattern copy itself — name, tagline, rule, checks, part labels — comes
 * from the generator, because it belongs with the data that has to satisfy it.
 * What lives here is the chrome: verdicts, the progress rail, the trade labels,
 * the disclaimer.
 */

export type Locale = 'en' | 'vi';

export type PatternStatsLike = {
  pattern: string;
  pair: string;
  timeframe: string;
  windowLabel: string;
  settled: number;
  wins: number;
  losses: number;
  rewardRisk: number;
  expectancyR: number;
};

type Strings = {
  badge: string;
  rail: [string, string, string, string];
  followThrough: string;
  verdict: {TP: string; SL: string; OPEN: string};
  caveatLoss: string;
  caveatDefault: string;
  cta: string;
  disclaimer: string;
  target: (price: string) => string;
  stop: (price: string) => string;
  entry: (ratio: string) => string;
  reality: {
    headline: string;
    source: (s: PatternStatsLike) => string;
    tally: (wins: number, losses: number, pct: number) => string;
    breakEven: (rr: number, pct: string) => string;
    edge: (r: number) => string;
    noEdge: (r: number) => string;
    foot: string;
    footEdge: string;
  };
};

const EN: Strings = {
  badge: 'CANDLE ANATOMY',
  rail: ['Pattern', 'Rule', 'Trade', 'Reality'],
  followThrough: 'The follow-through',
  verdict: {TP: 'Target reached', SL: 'Stop hit', OPEN: 'Still open at the end'},
  caveatLoss: 'Every check passed and it still lost. That is what a trigger is.',
  caveatDefault: 'One trade is not evidence — the pattern is a trigger, not a system.',
  cta: 'Follow for one pattern a day',
  disclaimer: 'Educational only, not financial advice',
  target: (p) => `Target · ${p}`,
  stop: (p) => `Stop · ${p}`,
  entry: (r) => `Entry · 1:${r} reward`,
  reality: {
    headline: 'But once is not evidence.',
    source: (s) =>
      `Every ${s.pattern.replace(/-/g, ' ')} on ${s.pair} ${s.timeframe}, last ${s.windowLabel} — ${s.settled} trades`,
    tally: (w, l, pct) => `${w}W · ${l}L · ${pct}%`,
    breakEven: (rr, pct) => `break-even at 1:${rr} is ${pct}%`,
    edge: (r) => `Edge: ${r > 0 ? '+' : ''}${r}R per trade`,
    noEdge: (r) => `No edge alone: ${r}R per trade`,
    foot: 'The pattern is a trigger, not a system — it needs context',
    footEdge: 'Confluence and context still decide the entry',
  },
};

const VI: Strings = {
  badge: 'GIẢI PHẪU NẾN',
  rail: ['Mẫu nến', 'Quy tắc', 'Vào lệnh', 'Sự thật'],
  followThrough: 'Diễn biến sau đó',
  verdict: {TP: 'Chạm chốt lời', SL: 'Dính dừng lỗ', OPEN: 'Hết clip vẫn chưa đóng'},
  caveatLoss: 'Đủ cả ba điều kiện mà vẫn thua. Tín hiệu vào lệnh là như vậy.',
  caveatDefault: 'Một lệnh không phải bằng chứng — mẫu nến là tín hiệu, không phải hệ thống.',
  cta: 'Theo dõi — mỗi ngày một mẫu nến',
  disclaimer: 'Chỉ mang tính giáo dục, không phải lời khuyên đầu tư',
  target: (p) => `Chốt lời · ${p}`,
  stop: (p) => `Dừng lỗ · ${p}`,
  entry: (r) => `Vào lệnh · lãi gấp ${r} lần rủi ro`,
  reality: {
    headline: 'Nhưng một lần thì chưa nói lên gì.',
    source: (s) =>
      `Mọi lần ${s.pattern.replace(/-/g, ' ')} xuất hiện trên ${s.pair} ${s.timeframe}, ${s.windowLabel} gần nhất — ${s.settled} lệnh`,
    tally: (w, l, pct) => `${w} thắng · ${l} thua · ${pct}%`,
    breakEven: (rr, pct) => `hoà vốn ở tỉ lệ 1:${rr} là ${pct}%`,
    edge: (r) => `Có lợi thế: ${r > 0 ? '+' : ''}${r}R mỗi lệnh`,
    noEdge: (r) => `Đứng một mình thì không có lợi thế: ${r}R mỗi lệnh`,
    foot: 'Mẫu nến là tín hiệu vào lệnh, không phải hệ thống — nó cần bối cảnh',
    footEdge: 'Điểm hợp lưu và bối cảnh vẫn là thứ quyết định điểm vào',
  },
};

export const strings = (locale: Locale | undefined): Strings => (locale === 'vi' ? VI : EN);
