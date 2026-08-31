# Cỗ máy video — nó là gì, và còn thiếu gì

Viết 29/08/2026, sau vòng nâng cấp đầu tiên và 100 video xuất thật.
**Cập nhật 30/08/2026** — đánh dấu cái nào đã làm xong, cái nào còn nguyên.
**Cập nhật 31/08/2026** — sau vòng anh nghiệm thu 100 video và chỉ sạn.

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

### Năm khuôn nội dung

| Khuôn | Nói gì | Cần mạng |
|---|---|---|
| **candle-lesson** | Một mẫu nến: giải phẫu → quy tắc → vào lệnh → kết quả | ❌ không |
| **candle-compare** *(30/08)* | Hai mẫu **dễ nhầm** xếp trên dưới, một phép đo tách chúng ra | ❌ không |
| **concept-lesson** *(mới 31/08)* | Fibonacci · Vùng lệnh · Quét thanh khoản · CHoCH · Vai Đầu Vai · Hai Đáy · Đi ngang | ❌ không |
| **named-setup** | Một setup có tên (double bottom + order block…) trên dữ liệu thật | ✅ có |
| **buy-or-sell-quiz** | Đố: mua hay bán? Đếm ngược 3 giây, rồi lật bài | ✅ có |
| **market-map** | Bản đồ vùng thanh khoản, order block, gap trên khung lớn | ✅ có |

Một ngày mặc định: 8 quiz · 8 named-setup · 8 candle-lesson · 6 market-map.
Lượt `--mix 100`: 59 mẫu nến · 18 so sánh · 9 setup · 8 đố · 6 bản đồ.

**Hai khuôn chạy được offline** (mẫu nến, so sánh) — trước chỉ có một, và đó
đúng là lý do 100 video đợt trước giải nén ra chỉ thấy một kiểu.

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

**1. ✅ XONG — Toàn bộ tiếng Anh.** Đã có luồng `vi`: bảng chữ song ngữ
(`src/i18n.ts`), tên mẫu nến theo cách dân trade Việt gọi, logo góc phải, chọn
bằng `--locale vi`.

**2. 🟡 ĐÃ DỰNG XONG ĐƯỜNG — chưa chạy thật trên máy anh.** Lời đọc tiếng Việt
đã viết cho **cả năm khuôn**, và `cai-dat.py --giong` tự tải giọng
`vi_VN-vais1000-medium` từ **Hugging Face**. Em **chưa nghe được** file nào:
môi trường render của em bị chặn ra huggingface.co, nên phần tải là code chưa
chạy qua lần nào. Anh chạy `giong-tieng-viet.bat` một lần rồi báo em.

**3. Không có link đo được cho từng video.** Máy sinh 100 video, nhưng không có
UTM/link riêng để biết video nào ra người mở tài khoản GTCFX. Không đo được thì
không biết nên làm thêm cái nào.

### 🟡 Nhóm 2 — làm cho chuyên nghiệp

**4. Hook 3 giây đầu giống hệt nhau.** 100 video mở cùng một kiểu: nhãn →
tên mẫu → tagline → chart. Trong feed, đó là dấu hiệu "sản xuất hàng loạt" mà
cả người xem lẫn thuật toán đều nhận ra. Cần 3–4 kiểu mở khác nhau.

**5. ✅ XONG — file mô tả + hashtag kèm mỗi video.** Mỗi `.mp4` giờ có một
`.txt` cùng tên: tiêu đề · mô tả · hashtag · câu miễn trừ. Chữ lấy từ chính
config của video, hashtag sản phẩm đọc từ `cfg.pair`.

**6. Không có phụ đề `.srt`.** YouTube tự tạo nhưng với tiếng Việt thì tệ.

**7. Không có thumbnail** cho từng video.

**8. Chỉ có 9:16.** Không có 16:9 cho YouTube thường, không có 1:1 cho Facebook.

**9. Nhạc nền tổng hợp nghe sạch nhưng nhạt.** Đã có sẵn đường nạp nhạc thật từ
Pixabay (`nap_am_thanh.py`), chỉ chưa chạy.

### 🟢 Nhóm 3 — đa dạng nội dung thật sự

Bốn khuôn hiện tại đều là **"đây là cái gì"**. Thiếu hẳn các dạng khác:

| Dạng còn thiếu | Vì sao đáng làm |
|---|---|
| ✅ ~~**Hai mẫu dễ nhầm**~~ — **đã làm**, 6 cặp, hai khung chung một thang giá | Dạy được điều mà một mẫu đơn lẻ không dạy được |
| **Bóc sai lầm** — cùng setup: người mới vào thế nào vs có hệ thống vào thế nào | Dạng giữ chân tốt nhất trên kênh trading |
| **Nhật ký lệnh thật** — lệnh có thật, số có thật | Thứ duy nhất tạo được niềm tin thật |
| **Tổng kết tuần / cộng pips** | La bàn đã ghi là cần, và nó nuôi phễu rebate |
| **Quiz nhiều lựa chọn** thay vì mua/bán nhị phân | Comment nhiều hơn = phân phối tốt hơn |

**10. 🟡 ĐỠ HẲN — Một mẫu nến quay lại ~8 lần trong 100 video.** Nay một lượt
100 là **37 mẫu nến · 20 so sánh · 20 kiến thức · 9 setup · 8 đố · 6 bản đồ**,
và bài mẫu nến có **ba kiểu mở đầu** chọn theo seed. Vẫn còn lặp, nhưng không
còn là một khuôn đội sáu cái mũ.

---

## 3b. Vòng 31/08 — anh xem video thật rồi chỉ sạn

Ba lỗi anh chỉ, và **nguyên nhân thật** của từng cái:

| Anh thấy | Em tưởng | Hoá ra |
|---|---|---|
| Chữ đè lên nhau ở cuối video setup | lệch vài pixel | dòng CTA **không có điều kiện khung hình nào cả** — vẽ suốt 35 giây ở một vị trí cố định |
| Nhãn cụt "ĐƯỜNG VIỀN CỔ 430" | chữ quá dài | viên thuốc tính bằng `ký tự × 15`; 53px chữ tràn ra là **trắng trên nền trắng** |
| Khung nến quiz tràn viền | chart hơi rộng | cây nến **mới nhất** nằm dưới cột nút nền tảng — đúng cái mà câu hỏi đang nói về |

Và hai lỗi **máy soi không bắt được**, chỉ mắt thấy:

- Nét vẽ Fibonacci **biến mất đúng lúc video đặt lệnh** — xoá mất lý do của lệnh.
- Chữ kết vẫn nói *"mẫu nến là tín hiệu"* trên một video Fibonacci.

> **Bài học:** `kiem_video.py` đo tràn khung · vùng an toàn · bố cục · đứng hình
> · LUFS. Nó **không đọc được chữ**, nên nó không bao giờ bắt được "chữ nói sai
> chủ đề" hay "nét vẽ tắt sai lúc". Mắt người vẫn là phép kiểm cuối.

---

## 4. Điều quan trọng nhất, nói thẳng

Theo `LA-BAN.md`, ngách GoldFather FX do **Codex + Hermes** dẫn, và nút thắt số
một của ngách đó là **chưa có bot tín hiệu** — không phải thiếu video.

Cỗ máy này giờ đã đủ tốt để chạy hàng ngày. Nhồi thêm tính năng cho nó **không
gỡ được nút thắt đó**.

**Cập nhật 30/08:** khuôn thứ năm và giọng đọc tiếng Việt đã làm — vì anh yêu
cầu dứt điểm, và vì "100 video một kiểu" là lỗi thật của em, không phải chuyện
thêm tính năng cho vui. Nhưng **kết luận dưới đây không đổi**:

> Việc đáng làm tiếp **không phải khuôn thứ sáu**. Đăng 20 video trong số này,
> đọc số giữ chân, rồi để số thật quyết định. Không có số đó thì mọi nâng cấp
> tiếp theo đều là đoán — kể cả những cái em vừa làm.
