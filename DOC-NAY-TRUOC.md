# Cỗ máy render video — đọc file này trước

Gói này tự render video phân tích forex dọc 9:16, **1080×1920 @ 60fps**, mỗi
video ~35 giây. Mục tiêu: **30 video/ngày**.

---

## Cài đặt: cài 2 thứ, rồi nháy đúp 1 file

| | Tải ở đâu | Lưu ý |
|---|---|---|
| **Node.js** (bản LTS) | https://nodejs.org | Cứ Next → Next |
| **Python 3** | https://python.org | ⚠️ **NHỚ TICK "Add Python to PATH"** ở màn hình đầu |

Cài xong **mở lại cửa sổ CMD/PowerShell** (hoặc khởi động lại máy) để máy nhận
lệnh mới. Rồi:

### 👉 Nháy đúp **`CAI-DAT.bat`**

Nó tự làm hết phần còn lại và **tự tải về** những thứ cần từ trên mạng:

| Tải cái gì | Từ đâu |
|---|---|
| thư viện Node | npm registry |
| thư viện Python *(numpy, pillow, ffmpeg)* | PyPI |
| trình duyệt để render | Remotion tự tải Chromium |
| **giọng đọc** *(tuỳ chọn)* | bản chạy Piper từ **GitHub Releases**, mô hình giọng từ **Hugging Face** (`rhasspy/piper-voices`) |

Chạy xong nó **render thử một khung hình thật** rồi mới báo "xong" — nên nếu nó
nói xong thì máy chạy được thật, không phải đoán.

| Muốn gì | Nháy đúp / gõ |
|---|---|
| Cài lần đầu | `CAI-DAT.bat` |
| **Nâng cấp** *(kéo bản mới từ git rồi cài lại)* | `NANG-CAP.bat` |
| Chỉ kiểm tra máy đủ đồ chưa | `python cai-dat.py --kiem` |
| Cài thêm giọng đọc | `python cai-dat.py --giong` |
| macOS / Linux | `./cai-dat.sh` |

Không cần tài khoản AWS, không cần Docker.

> **Máy bị chặn mạng?** Nếu máy đã có sẵn Chromium, đặt biến môi trường
> `REMOTION_BROWSER` trỏ tới file chạy của nó rồi chạy lại — tool sẽ dùng bản
> đó thay vì tải bản riêng.

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

Năm format, mỗi ngày chia đều:

- **8 video** dạy mẫu nến — **13 mẫu** (engulfing, hammer, shooting star,
  morning/evening star, 3 loại doji, marubozu, pin bar, tweezer top/bottom).
  Dữ liệu tự dựng nên **không cần mạng**, và đổi seed mỗi ngày.
- **8 video** quiz "BUY or SELL" — dữ liệu thật
- **8 video** phân tích setup có tên — dữ liệu thật
- **6 video** *market map* — đánh dấu vùng thanh khoản BSL/SSL, order
  block, gap chưa lấp, điểm CHoCH, rồi vẽ **kế hoạch** đi tới các vùng đó.
  Đây là format duy nhất nhìn về phía trước.
- **video so sánh** *(format thứ 5, mới)* — hai mẫu nến **dễ nhầm nhau** xếp
  trên dưới, một phép đo duy nhất vẽ lên cả hai cùng lúc. 6 cặp:
  Búa/Doji Chuồn Chuồn · Sao Băng/Doji Bia Mộ · Sao Mai/Sao Hôm ·
  Nhấn Chìm Tăng/Giảm · Đáy Nhíp/Đỉnh Nhíp · Doji/Marubozu.
  **Không cần mạng.**

> **Vì sao thêm format so sánh.** Bốn format cũ đều trả lời cùng một câu —
> *"cái này là cái gì"*. Không cái nào trả lời câu làm người ta vào lệnh sai:
> *"hai cái này nhìn y hệt nhau, làm sao phân biệt"*. Câu đó cần **hai chart
> cùng lúc** mới trả lời được. Hai khung dùng **chung một thang giá**, nên thân
> nến to gấp đôi thì vẽ ra cũng to gấp đôi — không khung nào tự co giãn cho vừa
> khung của nó.

Nhân với 3 sản phẩm (vàng, bạc, dầu) × 4 khung giờ (5m, 15m, 30m, 1H);
market map dùng H1 và D1. Thứ tự xoay theo ngày nên hôm nay khác hôm qua.

> **Lưu ý về market map:** đường màu xanh là *kế hoạch*, không phải dự đoán —
> video ghi rõ điều đó trên màn hình. Các mức giá thì đều đo từ dữ liệu thật.

---

## Hai luồng: global và Việt Nam

Cùng một cỗ máy, hai bộ chữ.

| | Luồng **global** (`en`) | Luồng **Việt Nam** (`vi`) |
|---|---|---|
| Chữ trên video | Tiếng Anh | Tiếng Việt |
| Tên mẫu nến | Bullish Engulfing, Morning Star… | Nhấn Chìm Tăng, Sao Mai, Đáy Nhíp… |
| Logo góc phải trên | không | **có** |
| Lệnh | `--locale en` *(mặc định)* | `--locale vi` |
| Nháy đúp | `run-100-roi-tat-may.bat` | `run-50-tieng-viet.bat` |

> **Không phải bản dịch.** Tên mẫu nến dùng đúng tên dân trade Việt gọi nhau
> hàng ngày. Những cái đã thành tên riêng trong nghề — **Doji · Pin Bar ·
> Marubozu** — giữ nguyên, vì dịch chúng ra mới là thứ không ai nói.

Hai luồng chạy được cùng một ngày mà không đè lên nhau: id video có tiền tố
`vi-` hoặc `en-`.

### Đổi logo

Kéo file logo `.png` **thả thẳng vào `doi-logo.bat`**. Xong.

Script tự cắt nền giả ra khỏi ảnh — file logo tải về thường bị *nướng* sẵn cái
nền ca-rô xám-trắng mô phỏng trong suốt; trên nền trắng thì không ai thấy, trên
video nền tối thì nó thành một ô vuông sáng bao quanh logo tròn.

---

## Bốn kiểu nội dung trong một lượt chạy

```
node tool\batch.mjs --mix --locale vi --count 100 --workers 2
```

| Kiểu | Nói gì | Bao nhiêu trong 100 |
|---|---|---|
| **Bài học mẫu nến** | Giải phẫu → quy tắc → vào lệnh → kết quả | 59 |
| **So sánh hai mẫu dễ nhầm** | Giống chỗ nào → đo cái khác nhau → chốt | 18 |
| **Setup có tên** | Vai Đầu Vai, Hai Đáy… + vùng lệnh | 9 |
| **Đố mua hay bán** | Đếm ngược 3 giây rồi lật bài | 8 |
| **Bản đồ thị trường** | Vùng thanh khoản, order block, gap | 6 |

**Vì sao chia thế này.** Hai kiểu **sinh được không cần mạng** là bài học mẫu
nến và so sánh — nên chúng gánh phần lớn. Ba kiểu kia cần mạng để *sinh config*
nhưng không cần mạng để *render*, và 23 config có dữ liệu giá thật đã nằm sẵn
trong repo. 23 là trần cứng khi máy không có mạng.

Lượt chạy ngắn cũng đủ cả 5 kiểu: `--mix --count 10` ra 4 bài học · 3 so sánh ·
1 đố · 1 setup · 1 bản đồ. Phần "khách" bị chặn ở **tối đa 3/5 lượt chạy**, nên
kiểu sinh tươi luôn còn chỗ.

> **Máy anh có mạng thì khác.** `run-30.bat` chạy kế hoạch ngày với dữ liệu
> tươi: **8 đố · 8 setup · 8 mẫu nến · 6 bản đồ** — chia đều bốn kiểu, giá của
> hôm nay. Muốn số lượng lớn thì `--mix`; muốn dữ liệu tươi thì kế hoạch ngày.

Giá trong video replay **cũ bằng tuổi config**, không phải giá hôm nay. Dạy một
setup thì không sao; đừng đăng kèm câu nào ngụ ý đây là chart hôm nay.

---

## Mỗi video có sẵn một file chữ để dán lên nền tảng

Cạnh mỗi `.mp4` có một `.txt` **cùng tên**:

```
vi-compare-hammer-vs-dragonfly-v01.mp4
vi-compare-hammer-vs-dragonfly-v01.txt   ← tiêu đề · mô tả · hashtag
```

Mở ra, copy, dán. Hết.

Chữ trong đó **lấy từ chính video** — không phải viết mới. Lý do: mô tả nói một
đằng video nói một nẻo còn tệ hơn là không có mô tả, và đó đúng là cách một kênh
tự khẳng định thứ mình không chứng minh được. Câu miễn trừ trách nhiệm luôn có
sẵn ở cuối.

> Render 100 video mà vẫn phải ngồi gõ 100 cái tiêu đề thì chỗ chết của dây
> chuyền nằm ở đó, không nằm ở khâu render.

---

## Giọng đọc — hai thứ tiếng

```
python cai-dat.py --giong          # cài cả giọng Việt lẫn giọng Anh
```

- Giọng Việt: `vi_VN-vais1000-medium` — tải từ **Hugging Face**
- Giọng Anh: `en_US-norman-medium`

Cài xong thì `--locale vi` **tự đọc tiếng Việt**, `--locale en` tự đọc tiếng
Anh; không phải khai thêm cờ nào. Lời đọc **sinh từ chính config**, không phải
model viết ra — con số trên màn hình và con số trong lời đọc buộc phải là một.

Không cài giọng thì video vẫn render bình thường, chỉ là không có lời.

---

## Làm 100 video một lượt (chạy qua đêm)

Nháy đúp **`run-100-roi-tat-may.bat`**. Nó render 100 video short, soi sạn toàn
bộ, rồi **tự tắt máy** sau 60 giây. Muốn huỷ tắt máy: mở CMD gõ `shutdown /a`.

Mất khoảng **2,5–3,5 tiếng** trên máy 4 nhân.

100 video này chỉ dùng **một format: dạy mẫu nến** — vì đó là format duy nhất
**không cần mạng**. Một cú rớt mạng lúc 3 giờ sáng không làm hỏng cả đêm. 13 mẫu
nến × ~8 lượt, mỗi lượt một seed khác nên chuỗi giá, mẫu nến và đoạn sau đều khác.

> **Có video kèo thua, và đó là chủ ý.** Trước đây đoạn sau luôn được dựng để
> chạm target, nên **mọi** video đều cho thấy quy tắc đúng. Giờ seed quyết định:
> khoảng 40% số video bị quét stop. Video thua mới là video dạy được nhiều nhất —
> đủ cả 3 điều kiện mà vẫn thua, đó chính là nghĩa của chữ *tín hiệu vào lệnh*.

---

## Soi sạn — bằng máy, không bằng mắt

Nháy đúp **`soi-san.bat`**, hoặc:

```
python video-engine\scripts\kiem_video.py "out\batch\*\*.mp4"
```

Năm phép đo, mỗi phép ứng với một kiểu hỏng:

| Đo | Bắt được gì |
|---|---|
| `bleed` | có thứ tràn ra ngoài khung |
| `safe` | chữ nằm dưới thanh điều khiển / cột nút của Shorts |
| `drift` | bố cục lệch hẳn về một bên |
| `freeze` | video đứng hình — dấu hiệu "không ai dựng" |
| `audio` | có tiếng không, **-14 LUFS** chưa, đỉnh có sát ngưỡng không |

Soi tay 10 khung hình thì bỏ sót đúng cái khung hình hỏng. Máy soi 70 khung.

---

## Âm thanh

Gói này **tự tổng hợp** nhạc nền và hiệu ứng bằng công thức — không cần mạng,
không vướng giấy phép. Âm lượng cuối được đặt về **-14 LUFS / -1.5 dBTP** (đúng
chuẩn YouTube & TikTok) ở bước cuối, tự động trong batch.

Muốn thay bằng âm thanh thật từ **Pixabay**:

```
python video-engine\scripts\nap_am_thanh.py C:\Users\AD\Downloads\sfx --map
python video-engine\scripts\nap_am_thanh.py C:\Users\AD\Downloads\sfx --apply
```

Lệnh `--map` in ra 8 ô âm thanh cần có và **từ khoá tìm trên Pixabay** cho từng
ô. Tải về bỏ chung một thư mục rồi chạy `--apply`: máy tự đổi sang WAV, cắt đúng
độ dài, fade hai đầu cho khỏi lách cách, chuẩn hoá, và ghi nguồn vào
`video-engine\public\audio\NGUON-AM-THANH.md`.

Bản tổng hợp cũ được giữ lại thành `*.synth.wav` — muốn quay về thì đổi tên lại.

> Pixabay **không mở API cho sound effects** (API công khai của họ chỉ có ảnh và
> video), nên bước tải về phải do anh làm bằng tay. Phần biên tập thì máy làm.

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
