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


/**
 * Tho Ren Vang — kenh vang moi.
 *
 * Moc mo man la thu quyet dinh nguoi xem o lai hay luot di, nen no duoc viet tay
 * va xoay vong theo tung video: mot cau dung lai moi ngay la dau hieu ro nhat cua
 * kenh do may chay. Khong cau nao hua loi nhuan hay bia so lieu ("90% doan sai") —
 * vua sai su that, vua la thu nen tang bop tuong tac.
 */
export const THO_REN = {
  logo: 'tho-ren-vang.png',
  name: {vi: 'THỢ RÈN VÀNG', en: 'GOLD SMITH'},
  hooks: {
    vi: [
      'VÀNG SẮP\nBỨT HAY SẬP?',
      '3 GIÂY.\nCHỌN MỘT PHE.',
      'CÂY NẾN TIẾP THEO\nĐI ĐÂU?',
      'BẠN CÓ DÁM\nVÀO LỆNH NÀY?',
      'ĐỪNG TUA.\nĐOÁN TRƯỚC ĐÃ.',
      'THỢ RÈN SẼ\nCHỌN PHE NÀO?',
    ],
    en: [
      'WHERE IS GOLD\nGOING NEXT?',
      '3 SECONDS.\nPICK A SIDE.',
      'NEXT CANDLE:\nUP OR DOWN?',
      'WOULD YOU TAKE\nTHIS TRADE?',
      "DON'T SKIP.\nCALL IT FIRST.",
    ],
  },
  comment: {
    vi: 'Bạn đoán đúng không? Comment ngay 👇',
    en: 'Did you call it? Tell us below 👇',
  },
  // Du lieu dung san phai noi la dung san. Cau cu ghi "du lieu that" — dung voi
  // ban lay tu Yahoo, sai hoan toan voi ban chay offline.
  practice: {
    vi: 'Biểu đồ dựng lại để luyện tập · Chỉ mang tính giáo dục, không phải lời khuyên đầu tư',
    en: 'Constructed chart for practice · Educational only, not financial advice',
  },
} as const;
