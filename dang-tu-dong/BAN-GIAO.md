# BÀN GIAO — Đăng YouTube tự động 2 kênh

> **File này tự chứa đủ.** Một phiên mới chưa biết gì đọc file này là triển được ngay.
> Cập nhật: **2026-09-11** · n8n → **Make**

---

## 0. Tóm tắt một đoạn

Có sẵn **300 video đã render xong, đã kiểm 0 lỗi**, và một hệ thống hàng đợi + workflow n8n
để tự đăng lên **2 kênh YouTube** với nhịp **3 bài/ngày/kênh**. Toàn bộ code đã commit và push.
**Việc còn lại là cài đặt trên máy anh Tuấn Anh** — chưa ai chạy thử luồng upload thật vì
máy render không có credential YouTube.

| | |
|---|---|
| Repo | `https://github.com/HIHII12/candle-video-tool` |
| Nhánh | `claude/nang-cap-video-engine` |
| Commit lúc bàn giao | `c307ed7` |
| Thư mục việc này | `dang-tu-dong/` |

---

## 1. Hai kênh

| Mã | Kênh | Ngôn ngữ | Logo | Video sẵn |
|---|---|---|---|---|
| `gf` | **GoldFather FX** | English | `goldfather-fx.png` | **100** |
| `vt` | **Văn Thắng Invest** | Tiếng Việt | `van-thang-trading.png` | **200** |

Chạy 3 bài/ngày/kênh → GoldFather đủ **33 ngày**, Văn Thắng đủ **66 ngày**.

**Không đăng chéo** video giữa hai kênh. Khác ngôn ngữ nên tự nhiên đã tách, chỉ cần đừng lỡ tay.

---

## 2. Video nằm ở đâu

| Thư mục | Nội dung |
|---|---|
| `video-engine/out/batch/2026-09-10/` | 100 video quiz **English** (`en-quiz-*.mp4`) |
| `video-engine/out/batch/2026-09-06/` | 100 video giải phẫu nến **tiếng Việt** (`vi-*.mp4`) |
| `video-engine/out/batch/2026-08-31/` | 100 video **tiếng Việt** lô trước (`vi-*.mp4`) |

Mỗi `.mp4` có một `.txt` **cùng tên** nằm cạnh, chứa sẵn tiêu đề · mô tả · hashtag.
Script hàng đợi đọc thẳng từ file `.txt` này.

**Thông số đã đo:** 1080×1920 · 60fps · ~35 giây · dừng hình cao nhất 1.0s ·
âm lượng −13.7 → −14.1 LUFS · đỉnh −1.0 → −1.4 dBTP. Toàn bộ **0 lỗi** qua
`video-engine/scripts/kiem_video.py`.

**Tiêu đề bài quiz cố ý KHÔNG ghi tên mẫu nến** — tên chính là đáp án, ghi lên tiêu đề là
tự lộ ngay trên feed. Tên nằm trong mô tả và hashtag, vẫn search ra được.
Đừng "sửa lại cho đầy đủ".

---

## 3. Bốn file trong `dang-tu-dong/`

| File | Việc |
|---|---|
| `tao_lich.py` | Biến một thư mục video thành hàng đợi |
| `n8n-dang-youtube.json` | Workflow n8n, import thẳng |
| `gan_nhac.py` | Trộn nhạc vào video đã render, không render lại |
| `BAN-GIAO.md` | Chính là file này — bản hướng dẫn duy nhất |

### Hàng đợi — tại sao là file rời chứ không phải bảng

`lich/hang-doi/` · `lich/da-dang/` · `lich/loi/` — mỗi video một file JSON, đăng xong thì
**chuyển file** sang thư mục khác.

Lý do: n8n chạy nhiều nhánh cùng lúc và máy có thể tắt giữa chừng. Sửa chung một bảng CSV
thì hai nhánh ghi đè lên nhau, tắt máy giữa lúc ghi thì mất cả bảng. Chuyển file thì **hoặc
nó ở hàng-đợi, hoặc nó ở đã-đăng** — không có trạng thái lửng lơ phải đi dò lại.

**Bài hỏng chuyển sang `loi/`, KHÔNG nằm lại `hang-doi/`.** Nằm lại thì lần chạy sau vớ đúng
nó, hỏng y hệt, và hàng đợi đứng tại chỗ mãi mãi.

Hàng đợi hiện tại: **100 `gf` + 200 `vt`** (thư mục `lich/` không commit lên git).

Nạp thêm — chạy lại bao nhiêu lần cũng không sinh bài trùng:

```bash
python3 dang-tu-dong/tao_lich.py video-engine/out/batch/<ngay> --kenh gf
python3 dang-tu-dong/tao_lich.py video-engine/out/batch/<ngay> --kenh vt
```

---

## 4. ⛔ Chọn công cụ — Make hay n8n

| | n8n tự cài | **Make** |
|---|---|---|
| Đọc ổ cứng máy anh | ✅ | ❌ **không bao giờ** |
| Máy phải bật | ✅ phải bật | ❌ không cần |
| Độ khó | cao hơn | dễ hơn |

**n8n Cloud thì không dùng được** — node `Execute Command` không tồn tại trên đó, và
video nằm trên ổ cứng máy anh nên Cloud cũng không thấy file.
*(Nguồn: docs.n8n.io — tra 2026-09-10.)*

**Make cũng không đọc được ổ cứng** — nó chạy trên máy chủ của họ. Nhưng vì anh vốn đã
định cho video vào Google Drive, nên ràng buộc đó **không còn là ràng buộc**:

```
Google Drive  →  Make  →  YouTube
```

Make xem một thư mục Drive, có file mới là đẩy lên YouTube rồi chuyển sang thư mục "đã
đăng". Không máy nào phải bật. Đây là **đường em khuyên** — dễ hơn thật, và hợp với cách
anh đang định làm.

*(Nguồn: make.com — tra 2026-09-11.)*

---

## 5. Dựng trên Make

### Chuẩn bị — làm một lần

1. **Chia video theo loại** (không còn lẫn ngày với ngày):
   ```bash
   python3 dang-tu-dong/sap_xep.py
   ```
   Ra `~/giao-hang/da-phan-loai/viet/<loại>/` và `.../global/<loại>/`.
   Dùng **liên kết cứng** — không tốn thêm dung lượng ổ đĩa.

2. **Sinh bảng hàng đợi**:
   ```bash
   python3 dang-tu-dong/tao_bang.py
   ```
   Ra `~/giao-hang/hang-doi-make.csv` — một dòng một video, có sẵn tiêu đề · mô tả ·
   hashtag · cột `trang_thai`.

3. **Tải lên Google Drive** — một thư mục cho mỗi kênh:
   `GoldFather-cho-dang/` và `VanThang-cho-dang/`, thêm `da-dang/`.

4. **Nhập CSV vào Google Sheets** (File → Import → Upload).
   File đã có BOM nên **dấu tiếng Việt không bị vỡ**.

### Kịch bản Make — làm 2 lần, mỗi kênh một cái

| # | Module | Cài gì |
|---|---|---|
| 1 | **Schedule** | 3 lần/ngày: 8h · 13h · 20h |
| 2 | **Google Sheets → Search Rows** | Lọc `kenh` = tên kênh **và** `trang_thai` = `cho` · Limit **1** |
| 3 | **Google Drive → Search Files** | Tìm theo `ten_file` của dòng vừa lấy |
| 4 | **Google Drive → Download a File** | Lấy nội dung file |
| 5 | **YouTube → Upload a Video** | Title = `tieu_de` · Description = `mo_ta` + `hashtag` · Privacy **private** lúc thử, đổi **public** sau |
| 6 | **Google Sheets → Update a Row** | `trang_thai` = `xong`, `link_youtube` = id vừa nhận |
| 7 | **Google Drive → Move a File** | Sang `da-dang/` |

> **Bước 6 là bước không được bỏ.** Không cập nhật `trang_thai` thì lần chạy sau
> module 2 vớ đúng dòng cũ và đăng lại y hệt video đó — mỗi ngày ba lần, mãi mãi.

> **Limit = 1 ở bước 2.** Để trống thì Make lấy hết mấy trăm dòng và đẩy tất cả lên
> YouTube trong một lần chạy. Quota cho khoảng **6 video/ngày**, phần còn lại báo lỗi.

### Hai kênh, hai kết nối YouTube riêng

Mỗi kịch bản dùng một connection YouTube khác nhau. Dùng chung là cả hai kênh đăng vào
một chỗ, và **không có gì trong lần chạy báo cho anh biết**.

### Chạy thử

Đặt privacy **private**, bấm **Run once**, mở YouTube Studio cả hai kênh kiểm đúng 1
video mỗi kênh. Xong thì xoá video thử, sửa `trang_thai` về `cho`, đổi privacy
**public**, bật **Scheduling ON**.

---

## 6. Ba cái bẫy

### Bẫy #1 — token 7 ngày ⚠️ dính nhiều nhất

App OAuth để nguyên trạng thái **Testing** thì refresh token của Google hết hạn sau
**7 ngày**. Một tuần sau n8n lăn ra báo lỗi xác thực, đang chạy ngon tự dưng hỏng.
**Bấm Publish app là hết** — không cần Google duyệt gì, vì chỉ xin quyền vào kênh của chính mình.

> **Mức tin cậy:** con số 7 ngày ghi theo trí nhớ, **chưa tra lại được** ngày 2026-09-10
> vì mạng của máy render chặn `developers.google.com`. Publish app mất 30 giây và không
> mất gì, cứ làm. **Phiên sau nên tra lại và sửa dòng này.**

### Bẫy #2 — hai kênh chung một Google Cloud project

Quota tính theo project. Chung project = 2 kênh chia nhau 6 upload/ngày, và sẽ gặp
`403 quotaExceeded` vào giữa ngày mà không hiểu vì sao.

### Bẫy #3 — hai node YouTube gán trùng credential

Cả hai kênh đăng vào một chỗ. **Không có cảnh báo nào.** Chỉ phát hiện được bằng cách
mở YouTube Studio của cả hai kênh ở bước chạy thử.

---

## 7. Hỏng thì soi đúng chỗ này

| Triệu chứng | Nguyên nhân hay gặp |
|---|---|
| `redirect_uri_mismatch` | Redirect URI trong Google Cloud lệch với cái n8n hiện — kể cả dấu `/` cuối |
| `403 quotaExceeded` | Quá 6 upload/ngày, hoặc hai kênh dùng chung một project |
| Chạy ngon, một tuần sau lỗi xác thực | App OAuth còn ở Testing → **Publish app** |
| Video lên nhưng rỗng / lỗi file | Node YouTube mất `binaryProperty = video` |
| Hai kênh đăng chung một chỗ | Hai node YouTube gán trùng credential |
| Một bài đăng đi đăng lại | Node chuyển sang `da-dang/` hỏng — Windows thường là chưa đổi `mv` → `move` |
| Không có tin Telegram nào | Chưa gán credential bot, hoặc sai `TELEGRAM_CHAT_ID` |

---

## 8. Nhạc — đã xong, thêm bài được

### Video đã có gì

Nhạc nền tự tổng hợp (`bed-dark` / `bed-light`) + **6 tiếng hiệu ứng** cắt đúng nhịp
storyboard (tick lúc nến đóng, riser trước lúc lộ đáp án), sinh bằng
`video-engine/scripts/make_audio.py`. **Không ai claim bản quyền được.**

Từ 11/09 có thêm **thư viện nhạc thật** chồng lên trên.

### Thêm một bài vào thư viện

```bash
python3 video-engine/scripts/nap_nhac.py duong/dan/bai.mp3 --ten ten-ngan
python3 video-engine/scripts/nap_nhac.py --xem      # xem thư viện đang có gì
```

Bước nạp **chuẩn hoá mọi bài về −20 LUFS**. Không có bước này thì bài tải chỗ này
−8 LUFS, bài chỗ kia −22 — video này nhạc đinh tai, video kia nghe như không có nhạc,
trên cùng một kênh.

Thư viện có bao nhiêu bài thì engine **xoay vòng theo seed** của từng video. Seed cố định
nên render lại ra đúng bài cũ — lô chạy dở bị ngắt không bị nửa bài này nửa bài kia.

### Nhạc ở đâu trong bản mix

| Lớp | Mức |
|---|---|
| Nhạc thật | mức chính |
| Nền tự tổng hợp | **hạ còn 0.22** khi có nhạc thật |
| Tiếng hiệu ứng | **giữ nguyên** |

Có nhạc thật rồi thì nền tổng hợp thành thừa — hai nền nhạc chồng nhau là đục. Nhưng
tiếng hiệu ứng thì giữ: chúng cắt theo storyboard, không bản nhạc nào thay được.

### File nhạc KHÔNG nằm trong git

`.gitignore` chặn `video-engine/public/audio/nhac/*`. Hai lý do: đẩy nhạc thương mại lên
GitHub là **phát tán** nó (khác hẳn dùng trong video của mình), và file âm thanh là thứ
git phình ra rồi không bao giờ nhỏ lại được. **Máy mới clone về phải tự chạy `nap_nhac.py`.**

### Gắn nhạc cho video ĐÃ render xong

```bash
# nghe thử 3 cái — ghi ra thư mục nghe-thu/, không đụng bản gốc
python3 dang-tu-dong/gan_nhac.py video-engine/public/audio/nhac/nhac-01.mp3 \
    video-engine/out/batch/<ngay> --thu 3

# áp cả lô — ghi ra thư mục <ngay>-nhac/, bản gốc vẫn nguyên
python3 dang-tu-dong/gan_nhac.py video-engine/public/audio/nhac/nhac-01.mp3 \
    video-engine/out/batch/<ngay> --muc-nhac 0.6 --muc-cu 0.7
```

**Mặc định không ghi đè.** Nhạc là thứ đổi ý nhiều nhất, mà video gốc thì mất vài tiếng
máy chạy mới render lại được. Đổi ý thì xoá thư mục `-nhac` là xong. Muốn ghi đè thật
thì thêm `--de-len`.

Không render lại — chỉ trộn tiếng, giữ nguyên luồng hình (`-c:v copy`), vài giây/video.
File `.txt` đi kèm được chép sang cùng.

> ⚠️ **Với video đã render, `--muc-cu` là một núm cho CẢ nền lẫn tiếng hiệu ứng** — trong
> file mp4 chúng đã trộn sẵn, không tách ra được nữa. Chỉ video render MỚI mới tách được
> hai lớp như bảng ở trên. Đó là lý do 0.7 chứ không phải 0.22.

### Hàng đợi phải trỏ lại

Sau khi trộn xong, hàng đợi n8n vẫn trỏ vào **bản gốc không nhạc**. Trỏ lại:

```bash
rm -rf lich/hang-doi
python3 dang-tu-dong/tao_lich.py video-engine/out/batch/2026-09-10-nhac --kenh gf
python3 dang-tu-dong/tao_lich.py video-engine/out/batch/2026-09-06-nhac --kenh vt
python3 dang-tu-dong/tao_lich.py video-engine/out/batch/2026-08-31-nhac --kenh vt
```

### ⚠️ Bài `nhac-01` hiện tại — rủi ro Content ID

Bài đang dùng (`viral-22m`) **rip từ YouTube bằng Y2Mate**, gần như chắc chắn là nhạc
thương mại có bản quyền. Đăng lên YouTube thì Content ID sẽ nhận ra.

**Không bị gỡ video** — nhưng doanh thu của những video đó **chảy về chủ bản quyền**, và
vài quốc gia có thể bị chặn. Anh Tuấn Anh đã biết và quyết dùng tạm. Ghi ở đây để phiên
sau không tưởng là đã sạch bản quyền.

Muốn sạch hoàn toàn: **YouTube Audio Library** (miễn phí, đã cấp phép sẵn cho YouTube)
hoặc Uppbeat / Epidemic Sound. Nạp bằng `nap_nhac.py` y hệt.

---

## 9. Việc CHƯA làm — nói rõ để khỏi tưởng đã xong

| Việc | Trạng thái |
|---|---|
| Luồng upload YouTube thật | **Chưa chạy thử** — máy render không có credential của anh. Logic file/hàng đợi thì đã chạy thật (300 bài xếp đúng, không trùng) |
| TikTok | **Chưa nối.** n8n không có node TikTok sẵn, phải dựng bằng HTTP Request + qua audit riêng của TikTok. Chưa audit thì bài bị ép `SELF_ONLY` (chỉ mình mình thấy) |
| Nhạc | **Xong 11/09.** Thư viện 1 bài (`viral-22m`), engine xoay vòng theo seed, 300 video đã trộn ra thư mục `-nhac`. Bài hiện tại có rủi ro Content ID — xem mục 8 |
| Số "7 ngày" ở Bẫy #1 | Chưa tra lại được nguồn — nên tra và sửa |

---

## 10. Một điều về nhạc trending, để phiên sau khỏi đi lại đường cũ

TikTok **không có endpoint API nào chọn sound** — muốn gắn nhạc trending thì phải mở app bấm
tay. *(Nguồn: developers.tiktok.com — tra 2026-09-10.)*

Có luật riêng cho tài khoản Business: chỉ thấy Commercial Music Library, không thấy kho nhạc
phổ thông. **Nhưng luật đó đánh vào nội dung quảng cáo sản phẩm, không đánh vào kênh chia sẻ
kiến thức gây fan.** Anh Tuấn Anh đã đăng thật và **không bị gì** — đó là số thật, thắng suy
luận. **Đừng lấy suy luận pháp lý đi chặn một việc đang chạy được.**
