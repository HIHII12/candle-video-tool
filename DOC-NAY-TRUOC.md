# Cỗ máy render video — đọc file này trước

Gói này tự render video phân tích forex dọc 9:16, **1080×1920 @ 60fps**, mỗi
video ~35 giây. Mục tiêu: **30 video/ngày**.

---

## Cần cài 2 thứ (một lần duy nhất)

| | Tải ở đâu | Lưu ý |
|---|---|---|
| **Node.js** (bản LTS) | https://nodejs.org | Cứ Next → Next |
| **Python 3** | https://python.org | ⚠️ **NHỚ TICK "Add Python to PATH"** ở màn hình đầu |

Cài xong **mở lại cửa sổ CMD/PowerShell** (hoặc khởi động lại máy) để máy nhận
lệnh mới.

Không cần cài gì thêm. Không cần tài khoản AWS, không cần Docker.

---

## Chạy: nháy đúp theo thứ tự này

### 1. `xem-ke-hoach.bat` — 1 giây
In ra danh sách 30 video hôm nay sẽ làm. **Không render gì cả.** Chạy cái này
trước để biết máy đã đủ điều kiện chưa.

### 2. `render-thu-2-cai.bat` — khoảng 5 phút
Render 2 video thật. Lần đầu sẽ tự cài dependency (thêm vài phút) và tự tải
trình duyệt render (~150 MB).

👉 **Chạy cái này trước khi làm cả 30.** Nếu 2 cái ra được thì 30 cái cũng ra.

### 3. `run-30.bat` — khoảng 60–75 phút
Render trọn 30 video. Cứ để máy chạy, không cần ngồi trông.

---

## Video ra ở đâu

```
video-engine\out\batch\<ngày-hôm-nay>\
```

Trong đó có **30 file .mp4** và **`manifest.json`** — ghi lại từng video: thành
công hay lỗi, mất bao lâu, tiêu đề là gì.

## Xem trước không cần render

Nháy đúp **`xem-truoc.html`** — mở trong trình duyệt, xem 6 mẫu nến chạy ngay,
không tốn thời gian render. Chạy offline, không cần mạng.

---

## 30 video khác nhau ở đâu

Bốn format, mỗi ngày chia đều:

- **8 video** dạy mẫu nến — **13 mẫu** (engulfing, hammer, shooting star,
  morning/evening star, 3 loại doji, marubozu, pin bar, tweezer top/bottom).
  Dữ liệu tự dựng nên **không cần mạng**, và đổi seed mỗi ngày.
- **8 video** quiz "BUY or SELL" — dữ liệu thật
- **8 video** phân tích setup có tên — dữ liệu thật
- **6 video** *market map* (mới) — đánh dấu vùng thanh khoản BSL/SSL, order
  block, gap chưa lấp, điểm CHoCH, rồi vẽ **kế hoạch** đi tới các vùng đó.
  Đây là format duy nhất nhìn về phía trước.

Nhân với 3 sản phẩm (vàng, bạc, dầu) × 4 khung giờ (5m, 15m, 30m, 1H);
market map dùng H1 và D1. Thứ tự xoay theo ngày nên hôm nay khác hôm qua.

> **Lưu ý về market map:** đường màu xanh là *kế hoạch*, không phải dự đoán —
> video ghi rõ điều đó trên màn hình. Các mức giá thì đều đo từ dữ liệu thật.

---

## Nếu có lỗi

Tool **kiểm tra máy trước khi chạy** và nói rõ thiếu gì. Vài trường hợp hay gặp:

| Báo lỗi | Cách xử lý |
|---|---|
| `Chua co Node.js` / `Chua co Python` | Cài theo bảng trên, rồi **mở lại cửa sổ CMD** |
| `python not found` dù đã cài | Cài lại Python và **tick "Add to PATH"** |
| Một vài video `FAIL`, số còn lại `ok` | Bình thường. Chạy lại `run-30.bat` — nó **bỏ qua video đã xong** và chỉ làm lại cái thiếu |
| Đứt giữa buổi / tắt máy | Chạy lại `run-30.bat`, nó tiếp tục chỗ dở |
| Mạng công ty chặn | 3 format cần internet (lấy dữ liệu giá + tải trình duyệt lần đầu). Format dạy nến thì **không cần mạng** — kể cả font cũng đã nhúng sẵn trong gói |

Một video lỗi **không làm chết cả batch** — 29 cái còn lại vẫn chạy.

---

## Caption bằng AI (không bắt buộc)

Không cấu hình gì thì tool dùng **caption có sẵn** và vẫn chạy bình thường.

Muốn dùng AI viết caption: sửa file `tool\.env.example` thành `tool\.env` rồi điền:

```
LLM_BASE_URL=https://api.shopaikey.com
LLM_API_KEY=key-của-bạn
LLM_MODEL=deepseek-chat
```

⚠️ **Đừng dùng key cũ** — key đó đã bị chia sẻ công khai, tạo key mới.
⚠️ **Đừng đưa file `.env` cho ai** và đừng commit lên GitHub.

AI **chỉ viết caption**. Toàn bộ mức giá, mẫu hình, kết quả thắng/thua đều tính
bằng công thức toán — không để AI tính, vì số sai trên chart tệ hơn caption nhạt.

---

## Thời gian đo thật (máy 4 nhân)

| | |
|---|---|
| 1 video | ~2 phút 30 |
| 2 video song song | ~4 phút 20 |
| **30 video** | **~60–75 phút** |

Máy nhiều nhân hơn thì nhanh hơn: sửa `--workers 2` thành `--workers 3` trong
`run-30.bat`.

---

## Hai điều nên biết

1. **Đã có âm thanh.** Tool có music bed, SFX, narration và subtitle. Case showcase
   dùng voice local Piper, duck nhạc khi có lời và xuất track giọng riêng.

2. **Kết quả kèo là thật.** Phần phân tích chỉ đọc dữ liệu trước điểm vào lệnh;
   phần sau bị giấu hoàn toàn rồi mới chạy ra. Nên **có video kèo thua** — đó là
   chủ ý, không phải lỗi. Kênh nào cũng thắng thì không ai tin.
