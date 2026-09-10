# Đăng tự động 2 kênh

## Một lần duy nhất — cài đặt

**1. Hai Google Cloud project riêng.** Quota YouTube là 10.000 đơn vị/ngày **tính theo
project**, mỗi lần upload tốn 1.600 → **~6 video/ngày/project**. Hai kênh dùng chung một
project thì chia đôi cái trần đó.

- Project A → OAuth của **GoldFather FX**
- Project B → OAuth của **Văn Thắng Invest**

**2. Trong n8n:** Settings → Credentials → thêm 2 credential YouTube OAuth2, đặt tên
`YT GoldFather` và `YT Van Thang`.

**3. Biến môi trường của n8n** (không phải file trong vault):

```
THU_MUC_TOOL=D:\duong\dan\candle-video-tool
TELEGRAM_CHAT_ID=<id chat cua anh>
```

> ⚠️ Token không bao giờ nằm plain-text trong repo hay trong vault. n8n giữ trong
> credential store đã mã hoá; nhớ đặt `N8N_ENCRYPTION_KEY` ở biến môi trường máy.

**4. Import** `n8n-dang-youtube.json` → gán credential:

| Node | Credential |
|---|---|
| `YouTube GoldFather` | YT GoldFather |
| `YouTube Van Thang` | YT Van Thang |

Hai node riêng là **bắt buộc** — một node YouTube chỉ giữ được một credential, dùng chung
thì cả hai kênh đăng vào cùng một chỗ.

**Nếu n8n chạy trên Windows**, sửa 4 node lệnh (node nào cũng có ghi chú sẵn):
`ls` → `dir /b` · `cat` → `type` · `mv` → `move`

## Hàng ngày — không phải làm gì

Cron chạy **8h · 13h · 20h**, mỗi lần đăng **1 bài/kênh** → **3 bài/ngày/kênh**.
Telegram báo mỗi lần đăng xong hoặc hỏng.

Video 1080×1920 dài 35 giây được YouTube **tự nhận là Shorts** — không cần thêm `#Shorts`.

Hết hàng đợi thì workflow **dừng im lặng**, không báo lỗi. Hết bài không phải là hỏng.

## Nạp thêm video vào hàng đợi

```bash
python3 dang-tu-dong/tao_lich.py video-engine/out/batch/<ngày> --kenh gf   # English
python3 dang-tu-dong/tao_lich.py video-engine/out/batch/<ngày> --kenh vt   # tiếng Việt
```

Video đã nằm trong `hang-doi/` hoặc `da-dang/` sẽ **không bị xếp lại** — chạy lại lệnh này
bao nhiêu lần cũng không sinh bài trùng.

## Ba thư mục — nhìn là biết tình hình

| Thư mục | Nghĩa |
|---|---|
| `lich/hang-doi/` | còn chờ tới lượt |
| `lich/da-dang/` | đã lên sóng |
| `lich/loi/` | đăng hỏng — xem rồi kéo ngược về `hang-doi/` |

Bài hỏng **không nằm lại** `hang-doi/`. Nếu để nằm lại, lần chạy sau lại vớ đúng nó và
hỏng y hệt — hàng đợi đứng tại chỗ mãi mãi.

## Gắn nhạc cho cả lô

Anh bỏ file nhạc vào `nhac/`, rồi:

```bash
# nghe thử 3 cái trước, KHÔNG đụng vào bản gốc
python3 dang-tu-dong/gan_nhac.py nhac/bai-cua-anh.mp3 video-engine/out/batch/<ngày> --thu 3

# ưng thì áp cho cả lô
python3 dang-tu-dong/gan_nhac.py nhac/bai-cua-anh.mp3 video-engine/out/batch/<ngày>
```

**Không render lại** — chỉ trộn tiếng, giữ nguyên hình, vài giây một video.
Nhạc nền cũ + tiếng hiệu ứng (tick khi nến đóng, riser trước lúc lộ đáp án) được **giữ lại
và hạ xuống dưới**, vì mấy tiếng đó cắt theo storyboard, không bản nhạc nào thay được.

Chỉnh to nhỏ: `--muc-nhac 0.55` (nhạc mới) · `--muc-cu 0.75` (giữ lại bao nhiêu phần cũ).
