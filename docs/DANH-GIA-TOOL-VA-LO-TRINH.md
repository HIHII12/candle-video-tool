# Cỗ máy video — nó là gì, và còn thiếu gì

Viết 29/08/2026, sau vòng nâng cấp đầu tiên và 100 video xuất thật.

---

## 1. Nó là cái gì

Một cỗ máy render video dọc **1080×1920 @ 60fps, 35 giây**, chạy hoàn toàn bằng
lệnh — không mở phần mềm dựng, không kéo thả.

| Thành phần | Là gì |
|---|---|
| Bộ dựng hình | **Remotion** — viết video bằng React, mỗi khung hình là một lần render |
| Bộ vẽ nến | **TradingView lightweight-charts** thật, bị điều khiển theo đồng hồ khung hình |
| Dữ liệu | Yahoo Finance — XAU · XAG · WTI × 5m/15m/30m/1H/D1 |
| Âm thanh | Nhạc nền + 6 hiệu ứng **tự tổng hợp bằng công thức**, giọng đọc Piper (tuỳ chọn) |
| Chữ | LLM viết tiêu đề/hook (tuỳ chọn), có bản dự phòng khi không có key |
| Xuất hàng loạt | 30 video/ngày, có manifest, chạy lại thì bỏ qua cái đã xong |
| Máy soi | 5 script kiểm tra tự động |

~7.300 dòng TypeScript + 17 script Python.

### Bốn khuôn nội dung

| Khuôn | Nói gì | Cần mạng |
|---|---|---|
| **candle-lesson** | Một mẫu nến: giải phẫu → quy tắc → vào lệnh → kết quả | ❌ không |
| **named-setup** | Một setup có tên (double bottom + order block…) trên dữ liệu thật | ✅ có |
| **buy-or-sell-quiz** | Đố: mua hay bán? Đếm ngược 3 giây, rồi lật bài | ✅ có |
| **market-map** | Bản đồ vùng thanh khoản, order block, gap trên khung lớn | ✅ có |

Một ngày mặc định: 8 quiz · 8 named-setup · 8 candle-lesson · 6 market-map.

**Chỉ candle-lesson chạy được offline.** Đó là lý do 100 video vừa rồi đều là
khuôn này — mạng ở môi trường render bị chặn.

---

## 2. Nó làm tốt cái gì

**Đo được, không phải nói suông.** `kiem_video.py` chấm 5 thứ trên file thật:
tràn khung · chữ nằm dưới giao diện Shorts · bố cục lệch · đứng hình · âm lượng
LUFS. Mã thoát 1 nếu có lỗi. Đây là thứ tách nó khỏi mấy tool "AI làm video".

**Nó dám nói mình sai.** `check_patterns.py` kiểm mẫu nến vẽ ra có thoả đúng
quy tắc mà chính video đang phát biểu không — 780 lần sinh, 0 vi phạm. Và kết
quả kèo được **đọc từ chuỗi giá**, không phải gán nhãn.

**Nó không tô hồng.** 40% video kết thúc bằng lệnh thua, có chủ ý. Video thua
nói thẳng: *"Every check passed and it still lost. That is what a trigger is."*

**Nó tự chuẩn hoá âm lượng** về -14 LUFS / -1.5 dBTP — đúng chuẩn YouTube và
TikTok, đo hai lượt.

---

## 3. Còn thiếu gì — xếp theo thứ tự ăn tiền

### 🔴 Nhóm 1 — chặn việc kiếm tiền

**1. Toàn bộ tiếng Anh.** Không có một chữ tiếng Việt nào trong video. Nếu khán
giả là người Việt thì đây là nút chặn lớn nhất, lớn hơn mọi thứ khác cộng lại.
Cần: bảng chữ song ngữ + chọn ngôn ngữ ở cấp job.

**2. Không có giọng đọc.** Piper chưa cài trên máy render. Short 35 giây không
có giọng thì giữ chân kém hơn hẳn — người xem đọc chữ trên màn hình mất công hơn
nghe. Đây là yếu tố giữ chân số 1 của định dạng này.

**3. Không có link đo được cho từng video.** Máy sinh 100 video, nhưng không có
UTM/link riêng để biết video nào ra người mở tài khoản GTCFX. Không đo được thì
không biết nên làm thêm cái nào.

### 🟡 Nhóm 2 — làm cho chuyên nghiệp

**4. Hook 3 giây đầu giống hệt nhau.** 100 video mở cùng một kiểu: nhãn →
tên mẫu → tagline → chart. Trong feed, đó là dấu hiệu "sản xuất hàng loạt" mà
cả người xem lẫn thuật toán đều nhận ra. Cần 3–4 kiểu mở khác nhau.

**5. Không có file mô tả + hashtag kèm mỗi video.** Manifest có tiêu đề và hook
nhưng chưa xuất ra `.txt` để copy-paste lúc upload.

**6. Không có phụ đề `.srt`.** YouTube tự tạo nhưng với tiếng Việt thì tệ.

**7. Không có thumbnail** cho từng video.

**8. Chỉ có 9:16.** Không có 16:9 cho YouTube thường, không có 1:1 cho Facebook.

**9. Nhạc nền tổng hợp nghe sạch nhưng nhạt.** Đã có sẵn đường nạp nhạc thật từ
Pixabay (`nap_am_thanh.py`), chỉ chưa chạy.

### 🟢 Nhóm 3 — đa dạng nội dung thật sự

Bốn khuôn hiện tại đều là **"đây là cái gì"**. Thiếu hẳn các dạng khác:

| Dạng còn thiếu | Vì sao đáng làm |
|---|---|
| **Hai mẫu dễ nhầm** — hammer vs hanging man, các loại doji | Dạy được điều mà một mẫu đơn lẻ không dạy được |
| **Bóc sai lầm** — cùng setup: người mới vào thế nào vs có hệ thống vào thế nào | Dạng giữ chân tốt nhất trên kênh trading |
| **Nhật ký lệnh thật** — lệnh có thật, số có thật | Thứ duy nhất tạo được niềm tin thật |
| **Tổng kết tuần / cộng pips** | La bàn đã ghi là cần, và nó nuôi phễu rebate |
| **Quiz nhiều lựa chọn** thay vì mua/bán nhị phân | Comment nhiều hơn = phân phối tốt hơn |

**10. Một mẫu nến quay lại ~8 lần trong 100 video.** Tagline đã khác (38 câu
khác nhau) nhưng **cấu trúc y hệt**. Đa dạng chữ chưa phải đa dạng nội dung.

---

## 4. Điều quan trọng nhất, nói thẳng

Theo `LA-BAN.md`, ngách GoldFather FX do **Codex + Hermes** dẫn, và nút thắt số
một của ngách đó là **chưa có bot tín hiệu** — không phải thiếu video.

Cỗ máy này giờ đã đủ tốt để chạy hàng ngày. Nhồi thêm tính năng cho nó **không
gỡ được nút thắt đó**. Việc đáng làm tiếp không phải là khuôn video thứ năm, mà
là: có giọng đọc tiếng Việt, có link đo được, rồi để số thật quyết định làm gì tiếp.

> Trước khi thêm bất cứ tính năng nào: đăng 20 video trong số 100 cái này, rồi
> đọc số giữ chân. Không có số đó thì mọi việc nâng cấp tiếp theo đều là đoán.
