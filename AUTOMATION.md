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

Chỉ format này chạy được số lượng lớn khi **không có mạng** — ba format kia cần
dữ liệu giá thật.

Trên Windows: nháy đúp `run-100-roi-tat-may.bat` (render → soi sạn → tắt máy).

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

## Còn thiếu

- **Đã có tiếng.** Music bed, SFX, narration và subtitle đều có trong engine;
  showcase song ngữ dùng Piper local và xuất track voice riêng.
- **Chưa tự đăng.** YouTube Data API v3 làm được; TikTok cần audit 2–6 tuần.
- Đăng thật thì để `outcome: any` — kế hoạch đã mặc định vậy. Ép `TP` chỉ dùng
  lúc demo.
