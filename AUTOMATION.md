# Chạy tự động — 30 video/ngày

## Một lệnh duy nhất

```bash
node tool/batch.mjs                 # kế hoạch hôm nay, 30 video
node tool/batch.mjs --dry-run       # xem sẽ làm gì, không render
node tool/batch.mjs --workers 2     # render 2 cái song song
node tool/batch.mjs --count 6       # chạy thử ngắn
node tool/batch.mjs --only xag-15m  # chạy lại đúng 1 job sau khi sửa
```

Chạy lại cùng một ngày thì **bỏ qua video đã có** — batch đứt giữa chừng cứ
chạy lại, không mất công.

## Tốc độ đo thật (máy 4 nhân)

| | |
|---|---|
| 1 video, 1 luồng | **2 phút 31** |
| 2 video, 2 luồng | **4 phút 18** → ~2,1 phút/video |
| **30 video** | **≈ 65 phút** |

Trước đây là 4 phút 16/video vì `setConcurrency(1)` — sót lại từ lúc debug,
bỏ phí 3 trong 4 nhân. Đã sửa.

## 30 video khác nhau ra từ đâu

Không phải viết thêm format, mà **nhân tổ hợp**:

- 6 video dạy nến (6 mẫu, **đổi seed theo ngày** nên chuỗi giá mỗi ngày mỗi khác)
- 12 video quiz (3 sản phẩm × 4 khung: XAU, XAG, WTI × 5m/15m/30m/1H)
- 12 video named-setup (cùng ma trận)

Thứ tự xoay theo ngày nên hai ngày liên tiếp không mở đầu giống nhau.

## Caption bằng AI

Đây là **bước duy nhất** dùng model. Mức giá, mẫu hình, kết quả đều là số học
và giữ nguyên như vậy — bắt model tính mấy thứ đó thì sẽ có lúc sai, mà số sai
trên chart còn tệ hơn caption nhạt.

```bash
cp tool/.env.example tool/.env      # rồi điền key
```

**Không có key thì batch vẫn chạy** — dùng caption dự phòng. Model hỏng, quá
thời gian, trả JSON sai định dạng: đều rơi về dự phòng chứ không làm hỏng video.

## Chạy hằng ngày ở đâu

**Khuyên dùng: máy Windows của bro.** Task Scheduler → chạy `tool\daily.bat`
lúc 2h sáng. Máy 4 nhân xong trong ~1 tiếng, không tốn đồng nào.

**GitHub Actions thì cân nhắc.** Có sẵn `.github/workflows/daily-batch.yml`,
nhưng phải biết trước:

- Runner của GitHub chỉ **2 nhân** → mỗi video ~4 phút → 30 video ≈ **2 tiếng/ngày**
- Repo **private** chỉ được **2000 phút/tháng** → 2 tiếng/ngày ≈ **3600 phút** ⇒ **vượt hạn mức**
- Repo **public** thì **không giới hạn phút**

⇒ Dùng Actions để render lẻ vài cái thì tốt; chạy cả 30 mỗi ngày thì nên để
máy nhà, hoặc để repo public, hoặc giảm số lượng.

Nếu dùng Actions, đặt key ở **Settings → Secrets and variables → Actions**:
`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Đừng bỏ key vào file.

## Kết quả để ở đâu

```
video-engine/out/batch/<ngày>/*.mp4
video-engine/out/batch/<ngày>/manifest.json
```

`manifest.json` ghi lại từng video: thành công hay hỏng, mất bao lâu, caption
lấy từ model hay dự phòng. Một job hỏng **không** làm chết cả batch.

## Muốn 100 video một lượt

```bash
node tool/batch.mjs --format candle-lesson --count 100 --workers 2
```

`--format candle-lesson` chuyển sang **kế hoạch mục lục** (`candlePlan`) thay
cho kế hoạch một ngày: kế hoạch ngày chỉ có 13 video dạy nến, mục lục thì bao
nhiêu cũng được, mỗi cái một seed riêng.

**Nhưng 100 cái cùng một format thì lúc giải nén ra vẫn là một kiểu.** Muốn cả
năm kiểu trong một lượt:

```bash
node tool/batch.mjs --mix --count 100 --workers 2 --locale vi
```

`--mix` trộn hai kiểu **sinh được offline** (mẫu nến · so sánh) với ba kiểu
replay từ config dữ liệu thật đã có sẵn trong repo. Phần replay + so sánh bị
chặn ở tối đa 3/5 lượt chạy, nên lượt ngắn cũng đủ cả năm kiểu chứ không bị cắt
mất đuôi.

Riêng format so sánh:

```bash
node tool/batch.mjs --format candle-compare --count 12 --locale vi
```

Hai kiểu này chạy được số lượng lớn khi **không có mạng** — ba kiểu kia cần dữ
liệu giá thật để *sinh config*, dù render thì không cần.

Trên Windows: nháy đúp `run-100-roi-tat-may.bat` (render → soi sạn → tắt máy).

## Hai luồng ngôn ngữ

```bash
node tool/batch.mjs --format candle-lesson --count 50 --workers 2               # global
node tool/batch.mjs --format candle-lesson --count 50 --workers 2 --locale vi   # Việt Nam
```

`--locale vi` đổi ba thứ cùng lúc: chữ giao diện (`video-engine/src/i18n.ts`),
nội dung mẫu nến (bảng `VI` trong `make_candle_lesson.py`), và bật logo kênh ở
góc trên phải.

Logo lấy từ `video-engine/public/brand/`, đổi bằng `--brand <tên-file>.png`,
hoặc `--brand none` để tắt. Cắt nền cho file mới:

```bash
python3 video-engine/scripts/lam_sach_logo.py logo-moi.png \
        --out video-engine/public/brand/van-thang-trading.png
```

Id job có tiền tố locale (`vi-candle-hammer-v01`), nên hai luồng build cùng một
ngày vào cùng một thư mục mà không cái nào đè cái nào.

## Âm lượng — bước cuối, tự động

Sau mỗi video, batch chạy `scripts/chuan_am_luong.py` đưa file về
**-14 LUFS / -1.5 dBTP** (chuẩn YouTube, TikTok). Đo hai lượt: lượt 1 đo, lượt 2
chỉnh đúng bằng số vừa đo — một lượt là bóp mất transient của hiệu ứng.

Tắt đi: `--no-loudness`.

Vì sao không chỉnh trong engine: cân bằng giữa nhạc nền / hiệu ứng / giọng đọc
phải đúng ở mọi khung hình và thuộc về engine; còn **âm lượng tuyệt đối** chỉ đo
được khi cả bản mix đã xong. Đo trước khi có bước này: -30 dB trung bình, tức
thấp hơn chuẩn nền tảng ~16 dB.

## Soi sạn

```bash
python3 video-engine/scripts/kiem_video.py "video-engine/out/batch/*/*.mp4" \
        --json bao-cao-san.json
```

Bắt: tràn khung · chữ nằm dưới giao diện Shorts · bố cục lệch · **đứng hình** ·
âm lượng lệch chuẩn. Mã thoát 1 nếu có LOI, nên cắm được vào CI.

## Đã chạy thật — 100 video bốn format, tiếng Việt, 30/08/2026

| | |
|---|---|
| Render | **100/100, 0 hỏng** |
| Soi sạn | **0 LỖI** |
| Đứng hình | max 2,01 s · trung bình 0,09 s |
| Chuyển động | 15–28% khung hình |
| Âm lượng | -14,1 … -13,8 LUFS · đỉnh max -1,03 dBTP |
| Format | 77 mẫu nến · 9 setup có tên · 8 đố mua/bán · 6 bản đồ |

> **Đính chính 30/08 — 1.460 cảnh báo đó em đọc sai nguyên nhân.**
> Lúc đó em ghi là "vùng chart nằm dưới cột nút". Đo lại thì không phải:
> `check_layout.py` đếm **mọi** vệt sáng, kể cả dòng miễn trừ trách nhiệm cỡ
> nhỏ — thứ **cố tình** đặt dưới vạch, vì nó chỉ cần *có mặt*, không cần *nổi
> bật* (`src/safeArea.ts` ghi rõ điều này từ đầu).
>
> Đo cụ thể: dòng miễn trừ sáng tối đa **183**, chữ thân bài từ **600** trở
> lên — hai nhóm tách hẳn nhau. Nay phép kiểm chỉ tính chữ **đọc được**
> (ngưỡng 200), và số cảnh báo còn lại là **thật**: format đố mua/bán vẽ dòng
> miễn trừ của nó ở `rgba(255,255,255,0.34)` đậm 700, sáng hơn ba format kia,
> nên nó vượt ngưỡng — đã chỉnh về đúng kiểu chung.
>
> **Bài học:** một phép kiểm bắn 1.460 phát vào cùng một thứ đã được chấp nhận
> thì bằng không có phép kiểm nào. Em đã báo con số đó như thể nó là kết quả.

## Đã chạy thật — 50 video tiếng Việt, 29/08/2026

| | |
|---|---|
| Render | **50/50, 0 hỏng, 65 phút** |
| Soi sạn | **0 LỖI**, 4 cảnh báo dưới ngưỡng |
| Âm lượng | -13,9 … -13,8 LUFS, đỉnh thật max -1,03 dBTP |
| Đứng hình | max 1,5 s (ngưỡng lỗi 2,4 s) |
| Kết quả kèo | 26 thắng · 20 thua · 4 còn mở |
| Đa dạng | 13 tên mẫu nến tiếng Việt · 37 tagline khác nhau |
| Logo | có trên cả 50, góc trên phải |

## Đã chạy thật — 100 video, 28/08/2026

| | |
|---|---|
| Render | **100/100, 0 hỏng, 159 phút** (máy 4 nhân, 2 luồng) |
| Soi sạn | **0 LỖI**, 13 cảnh báo dưới ngưỡng |
| Âm lượng | -13,9 … -13,8 LUFS, đỉnh thật max -1,03 dBTP |
| Đứng hình | max 1,5 s (ngưỡng lỗi là 2,4 s) |
| Kết quả kèo | 58 thắng · 37 thua · 5 còn mở |
| Đa dạng | 13 mẫu nến · 38 tagline khác nhau |

## Còn thiếu

- **Đã có tiếng.** Music bed, SFX, narration và subtitle đều có trong engine;
  showcase song ngữ dùng Piper local và xuất track voice riêng.
- **Chưa tự đăng.** YouTube Data API v3 làm được; TikTok cần audit 2–6 tuần.
- Đăng thật thì để `outcome: any` — kế hoạch đã mặc định vậy. Ép `TP` chỉ dùng
  lúc demo.

## Đã chạy thật — 100 video NĂM khuôn, tiếng Việt, 31/08/2026

| | |
|---|---|
| Render | **100/100, 0 hỏng, 153 phút** (2 luồng) |
| Soi sạn | **0 LỖI** trên cả 100 |
| Đứng hình | max **2,01 s** · trung bình **0,33 s** (ngưỡng lỗi 2,4 s) |
| Chuyển động | 12,4 – 27,8% khung hình |
| Âm lượng | -14,1 … -13,8 LUFS · đỉnh thật max **-1,0 dBTP** |
| Khuôn | **53 mẫu nến · 24 so sánh · 9 setup · 8 đố · 6 bản đồ** |
| Cặp so sánh | đủ **8/8** cặp |
| Kiểu mở đầu | chia đều **18 · 18 · 17** |
| Dung lượng | 349 MB · 100 file `.mp4` + 100 file `.txt` |

Lệnh đã chạy:

```bash
node tool/batch.mjs --mix --count 100 --locale vi --date 2026-08-31 --workers 2
```

**Khác lượt 30/08 ở chỗ nào.** Lượt trước 100 video ra **một khuôn** — giải nén
thấy đúng một kiểu. Lượt này năm khuôn, trong đó khuôn so sánh (24 video) và ba
kiểu mở đầu là thứ trực tiếp chữa lỗi đó.
