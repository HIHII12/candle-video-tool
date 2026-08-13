export const CONTENT_TYPES = [
  {id:'market-case',name:'Market Case',tag:'BUY · SELL · WAIT',description:'Phân tích một tình huống thị trường và quyết định có điều kiện.',icon:'◇'},
  {id:'candle-pattern',name:'Mô hình nến',tag:'Pattern Lab',description:'Dạy điều kiện, giải phẫu và bối cảnh của một mô hình nến.',icon:'▥'},
  {id:'candle-anatomy',name:'Đọc nến & chart',tag:'Chart Reading',description:'Thân, râu, động lượng và câu chuyện giữa các cây nến.',icon:'╽'},
  {id:'indicator',name:'Chỉ báo',tag:'Indicator Lab',description:'Đọc RSI, EMA, MACD… theo bối cảnh, không dùng máy móc.',icon:'⌁'},
  {id:'smc',name:'SMC',tag:'Smart Money',description:'Market structure, BOS/CHoCH, order block, FVG và liquidity.',icon:'⌗'},
  {id:'fibonacci',name:'Fibonacci',tag:'Retracement',description:'Chọn swing, vẽ vùng và đọc hợp lưu Fibonacci.',icon:'∿'},
];

const typeCopy = {
  'market-case': {title:'Gold H1 · Decision Lab',topic:'Chờ xác nhận tại vùng quyết định',hook:'BUY · SELL · ĐỨNG NGOÀI?',reason:'Chưa có nến H1 xác nhận khỏi vùng quyết định'},
  'candle-pattern': {title:'Bullish Engulfing · Pattern Lab',topic:'Mô hình Bullish Engulfing',hook:'Hai cây nến này có thật sự đảo chiều?',reason:'Mô hình chỉ có ý nghĩa khi đúng bối cảnh và có xác nhận'},
  'candle-anatomy': {title:'Đọc nến như đọc dòng tiền',topic:'Thân nến, râu nến và động lượng',hook:'Một cây nến đang kể cho anh điều gì?',reason:'Thân cho thấy lực đóng cửa; râu cho thấy vùng giá bị từ chối'},
  indicator: {title:'RSI · Đọc đúng trước khi dùng',topic:'RSI và phân kỳ theo bối cảnh',hook:'RSI quá mua có thật sự là tín hiệu SELL?',reason:'Quá mua mô tả động lượng, không tự động dự báo đảo chiều'},
  smc: {title:'SMC · Structure First',topic:'Order Block, CHoCH và thanh khoản',hook:'Order Block nào đáng chú ý — và vì sao?',reason:'Vùng chỉ có giá trị khi cấu trúc, displacement và thanh khoản đồng thuận'},
  fibonacci: {title:'Fibonacci · Vùng phản ứng',topic:'Chọn swing và đọc hợp lưu',hook:'Vì sao mức 0.618 không phải nút BUY thần kỳ?',reason:'Fibonacci là bản đồ vùng giá; xác nhận và bối cảnh mới tạo quyết định'},
};

const narrations = {
  'candle-pattern': {
    vi:[[.3,'Hai cây nến này có thật sự tạo tín hiệu đảo chiều?'],[3.4,'Trước tiên, nhìn bối cảnh: giá vừa trải qua một nhịp giảm rõ.'],[7.2,'Thân nến xanh bao trọn thân nến đỏ trước đó.'],[11.4,'Nhưng hình dạng đẹp vẫn chưa đủ.'],[16.3,'Kiểm tra ba lớp: bối cảnh, cấu trúc thân nến và xác nhận.'],[23.2,'Đây là Bullish Engulfing đúng hình thái.'],[26.4,'Nó cho thấy bên mua đã xóa phần thân bán của phiên trước.'],[31,'Đừng vào lệnh chỉ vì tên mô hình; hãy chờ giá xác nhận.'],[35.3,'Thấy hữu ích, hãy đăng ký để học mô hình tiếp theo.'],[39.2,'Bình luận mô hình nến anh muốn xem.']],
    en:[[.3,'Do these two candles really signal a reversal?'],[3.4,'Start with context: price has completed a clear down leg.'],[7.2,'The green body fully engulfs the previous red body.'],[11.4,'But a clean shape is still not enough.'],[16.3,'Check context, body structure, and confirmation.'],[23.2,'This is a textbook Bullish Engulfing shape.'],[26.4,'Buyers erased the previous session body.'],[31,'Never enter from the pattern name alone; wait for confirmation.'],[35.3,'Subscribe for the next pattern breakdown.'],[39.2,'Comment the candle pattern you want next.']]
  },
  'candle-anatomy': {
    vi:[[.3,'Một cây nến đang kể cho anh điều gì?'],[3.4,'Thân nến cho biết khoảng cách giữa giá mở và đóng cửa.'],[7.2,'Thân lớn thường cho thấy lực đẩy rõ hơn.'],[11.4,'Râu nến ghi lại vùng giá đã bị từ chối.'],[16.3,'Đọc ba thứ: vị trí, thân và râu.'],[23.2,'Không có cây nến nào nên được đọc tách khỏi các nến xung quanh.'],[26.4,'Cùng một hình dạng có thể mang ý nghĩa khác trong bối cảnh khác.'],[31,'Hãy đọc câu chuyện, không học thuộc hình vẽ.'],[35.3,'Đăng ký để học cách đọc chart từng lớp.'],[39.2,'Bình luận phần anh muốn đào sâu.']],
    en:[[.3,'What is one candle actually telling you?'],[3.4,'The body measures the distance between open and close.'],[7.2,'A large body usually shows clearer directional pressure.'],[11.4,'The wicks record prices that were rejected.'],[16.3,'Read location, body, and wick.'],[23.2,'No candle should be read in isolation.'],[26.4,'The same shape can mean different things in different contexts.'],[31,'Read the story instead of memorizing pictures.'],[35.3,'Subscribe to learn chart reading layer by layer.'],[39.2,'Comment what you want us to break down next.']]
  },
  indicator: {
    vi:[[.3,'RSI quá mua có thật sự là tín hiệu SELL?'],[3.4,'RSI đo tốc độ và độ lớn của biến động giá gần đây.'],[7.2,'Trên bảy mươi là động lượng mạnh, không phải lệnh bán tự động.'],[11.4,'Dưới ba mươi cũng không phải nút mua thần kỳ.'],[16.3,'Đọc xu hướng, vùng giá và tín hiệu phân kỳ.'],[23.2,'Trong xu hướng mạnh, RSI có thể quá mua rất lâu.'],[26.4,'Chỉ báo xác nhận bối cảnh; nó không thay thế cấu trúc giá.'],[31,'Ưu tiên hợp lưu thay vì một con số đơn lẻ.'],[35.3,'Đăng ký để học chỉ báo tiếp theo.'],[39.2,'Bình luận EMA, MACD hay Volume.']],
    en:[[.3,'Does overbought RSI really mean sell?'],[3.4,'RSI measures the speed and magnitude of recent price changes.'],[7.2,'Above seventy means strong momentum, not an automatic sell.'],[11.4,'Below thirty is not a magic buy button either.'],[16.3,'Read trend, location, and divergence.'],[23.2,'In a strong trend RSI can stay overbought for a long time.'],[26.4,'The indicator confirms context; it does not replace price structure.'],[31,'Look for confluence instead of one isolated number.'],[35.3,'Subscribe for the next indicator lesson.'],[39.2,'Comment EMA, MACD, or Volume.']]
  },
  smc: {
    vi:[[.3,'Order Block nào đáng chú ý — và vì sao?'],[3.4,'Bắt đầu từ cấu trúc, không bắt đầu từ hình chữ nhật.'],[7.2,'Đánh dấu swing high, swing low và điểm phá cấu trúc.'],[11.4,'Sau đó mới tìm displacement và vùng lệnh đối ứng cuối cùng.'],[16.3,'Ba lớp là cấu trúc, thanh khoản và phản ứng giá.'],[23.2,'CHoCH là tín hiệu thay đổi hành vi, chưa phải bảo đảm đảo chiều.'],[26.4,'Order Block chỉ đáng chú ý khi đúng vị trí và có xác nhận.'],[31,'SMC là ngôn ngữ mô tả thị trường, không phải máy in tín hiệu.'],[35.3,'Đăng ký để học từng khái niệm SMC.'],[39.2,'Bình luận FVG, BOS hay Liquidity.']],
    en:[[.3,'Which order block matters, and why?'],[3.4,'Start with structure, not with a rectangle.'],[7.2,'Mark swing highs, swing lows, and the structural break.'],[11.4,'Then locate displacement and the last opposing candle.'],[16.3,'Use structure, liquidity, and price reaction.'],[23.2,'A CHoCH shows behavioral change, not a guaranteed reversal.'],[26.4,'An order block matters only in the right location with confirmation.'],[31,'SMC is a market language, not a signal machine.'],[35.3,'Subscribe to learn each SMC concept.'],[39.2,'Comment FVG, BOS, or Liquidity.']]
  },
  fibonacci: {
    vi:[[.3,'Vì sao mức không phẩy sáu một tám không phải nút BUY thần kỳ?'],[3.4,'Fibonacci bắt đầu bằng việc chọn đúng một nhịp swing rõ ràng.'],[7.2,'Vẽ từ swing low lên swing high trong nhịp tăng.'],[11.4,'Các tỷ lệ chỉ tạo vùng tham chiếu, không tạo lệnh.'],[16.3,'Đọc vùng, cấu trúc và tín hiệu xác nhận.'],[23.2,'Mức không phẩy sáu một tám thường được theo dõi vì hành vi đám đông.'],[26.4,'Giá có thể xuyên mọi mức nếu bối cảnh không ủng hộ.'],[31,'Fibonacci mạnh nhất khi có hợp lưu với cấu trúc và thanh khoản.'],[35.3,'Đăng ký để học cách chọn swing chuẩn.'],[39.2,'Bình luận Fibonacci extension nếu anh muốn phần hai.']],
    en:[[.3,'Why is point six one eight not a magic buy button?'],[3.4,'Fibonacci starts by selecting one clear price swing.'],[7.2,'Draw from swing low to swing high in an upward leg.'],[11.4,'The ratios create reference zones, not trades.'],[16.3,'Read the zone, structure, and confirmation.'],[23.2,'Point six one eight is watched because many traders watch it.'],[26.4,'Price can cut through every level when context disagrees.'],[31,'Fibonacci is strongest with structure and liquidity confluence.'],[35.3,'Subscribe to learn proper swing selection.'],[39.2,'Comment Fibonacci extension if you want part two.']]
  }
};

export function applyContentType(project, type) {
  const next=structuredClone(project); const preset=typeCopy[type]; next.core.content.type=type; next.core.content.title=preset.title; next.core.content.topic=preset.topic;
  next.core.locales.vi.hook=preset.hook; next.core.locales.vi.reason=preset.reason;
  next.core.retention.openLoop.vi=type==='market-case'?'3 dữ kiện trước khi chốt đáp án':'3 lớp kiến thức trước phần kết luận';
  if (narrations[type]) {
    for (const locale of ['vi','en']) next.core.locales[locale].shortNarration=narrations[type][locale].map(([at,text])=>({at,text}));
  }
  next.name=preset.title; return next;
}
