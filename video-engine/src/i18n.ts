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
  /**
   * Same four beats, for the lessons that are not about a candle.
   *
   * The rail read "Pattern" over a Fibonacci grid and a range — naming the
   * wrong thing on every concept video, in the one place a viewer looks to see
   * what they are being taught.
   */
  conceptRail: [string, string, string, string];
  followThrough: string;
  verdict: {TP: string; SL: string; OPEN: string};
  caveatLoss: string;
  caveatDefault: string;
  cta: string;
  /**
   * The same two lines for the concept lessons.
   *
   * The candlestick wording — "the pattern is a trigger", "one pattern a day" —
   * shipped verbatim over a Fibonacci grid and a range, telling the viewer the
   * video was about something it was not.
   */
  conceptCaveat: string;
  conceptCta: string;
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
  /** Buy-or-sell quiz. */
  quiz: {
    banners: string[];
    buy: string;
    sell: string;
    /** The word between the two buttons. */
    or: string;
    won: (side: 'BUY' | 'SELL') => string;
    hitTp: string;
    stopped: string;
  };
  /** Named setup walkthrough. */
  setup: {
    hooks: string[];
    steps: string[];
    subtitle: (pattern: string) => string;
    targetHit: string;
    stopped: string;
    winLine: string;
    lossLine: string;
    cta: (asset: string) => string;
  };
  /** Market map. */
  map: {
    bias: (bullish: boolean) => string;
    steps: string[];
    provenance: (pair: string) => string;
  };
  /** Side-by-side comparison of two confusable patterns. */
  compare: {badge: string; body: string; bar: string; upper: string; lower: string};
  /** Disclaimer for the formats built on live market data. */
  realData: (pair: string) => string;
  /**
   * Chart terms that arrive inside the data rather than from this file.
   *
   * The named-setup configs carry English labels — "Shoulder", "Double Bottom" —
   * because they were fetched for the global track and the same file feeds both.
   * Anything not in the table is passed through unchanged, which is the right
   * answer for the terms Vietnamese traders already say in English (OB, BSL,
   * CHoCH): translating those would be the odd thing to do.
   */
  term: (english: string) => string;
};

const EN: Strings = {
  badge: 'CANDLE ANATOMY',
  rail: ['Pattern', 'Rule', 'Trade', 'Reality'],
  conceptRail: ['Structure', 'Rule', 'Trade', 'Reality'],
  followThrough: 'The follow-through',
  verdict: {TP: 'Target reached', SL: 'Stop hit', OPEN: 'Still open at the end'},
  caveatLoss: 'Every check passed and it still lost. That is what a trigger is.',
  caveatDefault: 'One trade is not evidence — the pattern is a trigger, not a system.',
  cta: 'Follow for one pattern a day',
  conceptCaveat: 'One trade is not evidence — structure gives a reason, not a promise.',
  conceptCta: 'Follow — one concept a day',
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
  quiz: {
    banners: [
      'WOULD YOU BUY OR SELL?',
      'BUY OR SELL THIS CHART?',
      'YOUR CALL: BUY OR SELL?',
      'LONG OR SHORT HERE?',
    ],
    or: 'or',
    buy: 'BUY',
    sell: 'SELL',
    won: (side) => (side === 'BUY' ? 'BUYERS WON' : 'SELLERS WON'),
    hitTp: 'HIT TP \u2705',
    stopped: 'STOPPED OUT \u274c',
  },
  setup: {
    hooks: [
      'THE SNIPER ENTRY FORMULA',
      'WHERE SMART MONEY ENTERS',
      'THE CONFLUENCE PLAYBOOK',
      'READ THE STRUCTURE FIRST',
      'THE ENTRY MOST TRADERS MISS',
    ],
    steps: [
      '1 · Map the market structure',
      '2 · Name the formation',
      '3 · Mark the neckline trigger',
      '4 · Order block = entry zone',
      '5 · Stop beyond the shoulder, target the measured move',
      'What happened next?',
    ],
    subtitle: (pattern) => `${pattern} + Order Block`,
    targetHit: 'TARGET HIT \u2705',
    stopped: 'STOPPED OUT \u274c',
    winLine: 'The measured move played out',
    lossLine: 'Not every valid formation works — that is why you use a stop',
    cta: (asset) => `Follow for daily ${asset} setups`,
  },
  map: {
    bias: (bullish) => (bullish ? 'BULLISH BIAS' : 'BEARISH BIAS'),
    steps: [
      'The line price has been respecting',
      'Where the liquidity is resting',
      'Where structure changed character',
      'The plan · not a prediction',
    ],
    provenance: (pair) =>
      `Levels are measured from real ${pair} data. The blue path is a plan, not a forecast.`,
  },
  compare: {badge: 'TELL THEM APART', body: 'the body', bar: 'the bar',
            upper: 'the upper wick', lower: 'the lower wick'},
  realData: (pair) => `Real ${pair} data · Educational only, not financial advice`,
  term: (english) => english,
};

const VI: Strings = {
  badge: 'GIẢI PHẪU NẾN',
  rail: ['Mẫu nến', 'Quy tắc', 'Vào lệnh', 'Sự thật'],
  conceptRail: ['Cấu trúc', 'Quy tắc', 'Vào lệnh', 'Sự thật'],
  followThrough: 'Diễn biến sau đó',
  verdict: {TP: 'Chạm chốt lời', SL: 'Dính dừng lỗ', OPEN: 'Hết clip vẫn chưa đóng'},
  caveatLoss: 'Đủ cả ba điều kiện mà vẫn thua. Tín hiệu vào lệnh là như vậy.',
  caveatDefault: 'Một lệnh không phải bằng chứng — mẫu nến là tín hiệu, không phải hệ thống.',
  cta: 'Theo dõi — mỗi ngày một mẫu nến',
  conceptCaveat: 'Một lệnh không phải bằng chứng — cấu trúc cho lý do, không cho lời hứa.',
  conceptCta: 'Theo dõi — mỗi ngày một kiến thức',
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
  quiz: {
    // Kept short on purpose: the banner is one line in a fixed band, and the
    // longer phrasings wrapped to two and lost the first off the top of frame.
    banners: [
      'MUA HAY BÁN?',
      'CHART NÀY: MUA HAY BÁN?',
      'ĐẾN LƯỢT BẠN',
      'LONG HAY SHORT?',
    ],
    buy: 'MUA',
    sell: 'BÁN',
    or: 'hay',
    won: (side) => (side === 'BUY' ? 'PHE MUA THẮNG' : 'PHE BÁN THẮNG'),
    hitTp: 'CHẠM CHỐT LỜI \u2705',
    stopped: 'DÍNH DỪNG LỖ \u274c',
  },
  setup: {
    hooks: [
      'CÔNG THỨC VÀO LỆNH CHÍNH XÁC',
      'DÒNG TIỀN LỚN VÀO Ở ĐÂU',
      'BỘ KHUNG ĐIỂM HỢP LƯU',
      'ĐỌC CẤU TRÚC TRƯỚC ĐÃ',
      'ĐIỂM VÀO MÀ ĐA SỐ BỎ LỠ',
    ],
    steps: [
      '1 · Vẽ cấu trúc thị trường',
      '2 · Gọi tên mô hình',
      '3 · Đánh dấu đường kích hoạt',
      '4 · Vùng lệnh = vùng vào',
      '5 · Dừng lỗ qua vai, chốt lời bằng biên độ đo được',
      'Rồi chuyện gì xảy ra?',
    ],
    subtitle: (pattern) => `${pattern} + Vùng lệnh`,
    targetHit: 'CHẠM CHỐT LỜI \u2705',
    stopped: 'DÍNH DỪNG LỖ \u274c',
    winLine: 'Biên độ đo được đã chạy đúng',
    lossLine: 'Không phải mô hình đúng nào cũng chạy — nên mới cần dừng lỗ',
    cta: (asset) => `Theo dõi — setup ${asset} mỗi ngày`,
  },
  map: {
    bias: (bullish) => (bullish ? 'THIÊN HƯỚNG TĂNG' : 'THIÊN HƯỚNG GIẢM'),
    steps: [
      'Đường mà giá vẫn đang tôn trọng',
      'Chỗ thanh khoản đang nằm',
      'Chỗ cấu trúc đổi tính chất',
      'Đây là kế hoạch · không phải dự đoán',
    ],
    provenance: (pair) =>
      `Các vùng giá đo từ dữ liệu ${pair} thật. Đường xanh là kế hoạch, không phải dự báo.`,
  },
  compare: {badge: 'PHÂN BIỆT', body: 'thân nến', bar: 'cả cây nến',
            upper: 'bóng trên', lower: 'bóng dưới'},
  realData: (pair) =>
    `Dữ liệu ${pair} thật · Chỉ mang tính giáo dục, không phải lời khuyên đầu tư`,
  term: (english) => VI_TERMS[english] ?? english,
};

const VI_TERMS: Record<string, string> = {
  'Resistance': 'Kháng cự',
  'Support': 'Hỗ trợ',
  'Shoulder': 'Vai',
  'Head': 'Đầu',
  'Bottom 1': 'Đáy 1',
  'Bottom 2': 'Đáy 2',
  'Top 1': 'Đỉnh 1',
  'Top 2': 'Đỉnh 2',
  'NECKLINE': 'ĐƯỜNG VIỀN CỔ',
  'ORDER BLOCK': 'VÙNG LỆNH',
  'Double Bottom': 'Hai Đáy',
  'Double Top': 'Hai Đỉnh',
  'Head & Shoulders': 'Vai Đầu Vai',
  'Inverse Head & Shoulders': 'Vai Đầu Vai Ngược',
  'Structure': 'Cấu trúc',
};

export const strings = (locale: Locale | undefined): Strings => (locale === 'vi' ? VI : EN);
