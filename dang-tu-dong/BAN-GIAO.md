# BÀN GIAO — Đăng YouTube tự động 2 kênh

> **File này tự chứa đủ.** Một phiên mới chưa biết gì đọc file này là triển được ngay.
> Cập nhật: **2026-09-10**

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

## 4. ⛔ Đọc trước khi cài — n8n Cloud KHÔNG chạy được

Hai lý do, cái nào cũng đủ để tắc:

1. Node **Execute Command không có trên n8n Cloud** — họ chặn vì hạ tầng dùng chung.
   Workflow này dùng 4 node đó để lấy bài và chuyển thẻ.
2. 300 video nằm trên **ổ cứng máy anh**. n8n Cloud chạy máy khác, không nhìn thấy ổ đó.
   Kể cả có Execute Command thì cũng không có file để đăng.

→ Bắt buộc **n8n cài trên máy anh** (`npx n8n` hoặc n8n Desktop), hoặc **VPS có chứa video**.

*Nguồn: docs.n8n.io — tra ngày 2026-09-10.*

---

## 5. Cài đặt — 6 giai đoạn

### 01 · Google Cloud — **hai project riêng** (làm 2 lần)

> **Vì sao hai project:** quota YouTube là **10.000 đơn vị/ngày tính theo project**, không
> phải theo kênh. Mỗi upload tốn **1.600** → khoảng **6 video/ngày/project**. Nhét hai kênh
> vào một project là hai kênh chia nhau 6 suất đó.
> *Nguồn: docs Google YouTube Data API v3 — tra ngày 2026-09-10.*

1. [console.cloud.google.com](https://console.cloud.google.com) → **New Project**.
   Đặt tên `yt-goldfather` / `yt-vanthang`. Đăng nhập bằng đúng tài khoản sở hữu kênh đó.
2. **APIs & Services → Library** → `YouTube Data API v3` → **Enable**.
   *Quên bước này thì mọi thứ sau đó báo 403 mà không nói rõ vì sao.*
3. **OAuth consent screen** → **External** → Create. Điền App name, User support email,
   Developer contact email (ba ô bắt buộc, còn lại bỏ trống được).
4. Màn **Scopes** → Add or Remove Scopes → thêm `.../auth/youtube.upload` và `.../auth/youtube`.
5. Màn **Test users** → thêm chính email sở hữu kênh.
6. Quay lại **OAuth consent screen** → bấm **PUBLISH APP** → Confirm. ← **xem Bẫy #1**
7. **Credentials → Create Credentials → OAuth client ID** → **Web application**.
8. **Chưa bấm Create** — sang giai đoạn 02 lấy Redirect URI rồi quay lại dán vào.

### 02 · Nối n8n với Google (làm 2 lần)

1. n8n → **Credentials → Add credential** → **YouTube OAuth2 API**.
2. Copy dòng **OAuth Redirect URL** n8n hiện ra
   (thường là `http://localhost:5678/rest/oauth2-credential/callback`).
3. Về Google Cloud → dán vào **Authorized redirect URIs** → **Create**.
   *Phải khớp từng ký tự, kể cả dấu `/` cuối. Lệch một ký tự là `redirect_uri_mismatch`.*
4. Copy **Client ID** + **Client Secret** → dán ngược vào n8n.
5. **Connect my account** → chọn tài khoản Google của kênh → Cho phép.
   *Gặp "Google hasn't verified this app" thì **Advanced → Go to (tên app)**. App của mình, không sao.*
6. Đặt tên credential: kênh English → **`YT GoldFather`** · kênh Việt → **`YT Van Thang`**.
7. **Lặp lại toàn bộ 01 + 02 cho kênh thứ hai.** Project mới, OAuth client mới, credential mới.

### 03 · Hai biến môi trường

| Biến | Giá trị |
|---|---|
| `THU_MUC_TOOL` | Đường dẫn tới thư mục `candle-video-tool` |
| `TELEGRAM_CHAT_ID` | ID chat để n8n báo mỗi lần đăng xong / hỏng |

**Windows + `npx n8n`** — chạy trong PowerShell, khởi động n8n *trong chính cửa sổ đó*:

```powershell
$env:THU_MUC_TOOL = "D:\duong\dan\candle-video-tool"
$env:TELEGRAM_CHAT_ID = "123456789"
npx n8n
```

**Docker** — nhớ **mount ổ chứa video vào container**:

```bash
docker run -it --rm -p 5678:5678 \
  -e THU_MUC_TOOL=/data/candle-video-tool \
  -e TELEGRAM_CHAT_ID=123456789 \
  -e N8N_ENCRYPTION_KEY=chuoi-bi-mat \
  -v /duong/dan/candle-video-tool:/data/candle-video-tool \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

> 🔒 **Ranh giới cứng:** Client Secret và token **không bao giờ** nằm dạng chữ thường trong
> repo, trong vault, hay trong file commit lên git. n8n giữ trong credential store đã mã hoá —
> nhưng chỉ khi đặt `N8N_ENCRYPTION_KEY` ở biến môi trường máy. Không đặt thì n8n tự sinh khoá
> và cất cùng chỗ với dữ liệu, tức là gần như không mã hoá gì.

### 04 · Nạp workflow

1. **Workflows → Import from File** → `dang-tu-dong/n8n-dang-youtube.json`.
2. Node **`YouTube GoldFather`** → gán credential `YT GoldFather`.
3. Node **`YouTube Van Thang`** → gán credential `YT Van Thang`.
4. Hai node **Telegram** → gán credential bot Telegram.
5. **Chạy trên Windows?** Sửa lệnh trong 4 node (node nào cũng có ghi chú sẵn):

| Node | Sửa từ | Thành |
|---|---|---|
| Lay bai ke tiep | `ls` | `dir /b` |
| Doc the bai | `cat` | `type` |
| Chuyen sang da-dang | `mv` | `move` |
| Chuyen sang loi | `mv` | `move` |

> **Hai node YouTube riêng là bắt buộc** — một node YouTube chỉ giữ được một credential.
> Dùng chung là cả hai kênh đăng vào một chỗ, và **không có gì trong lần chạy báo cho biết**.

### 05 · Chạy thử — một bài, để riêng tư

> Lần chạy đầu là lúc dễ lộ nhất: sai credential thì video tiếng Việt rơi lên kênh English và
> **khán giả nhìn thấy trước khi kịp xoá**. Đăng riêng tư thì sai bao nhiêu lần cũng không ai biết.

1. Cả hai node YouTube → đổi `privacyStatus` từ `public` → **`private`**.
2. Bấm **Execute Workflow** (chạy tay, chưa bật lịch).
3. Đợi 1–2 phút → YouTube Studio **cả hai kênh** → mỗi kênh phải có đúng **1 video mới**.
   *Hai video cùng rơi vào một kênh = gán nhầm credential, quay lại 04.*
4. Kiểm tiêu đề và mô tả đúng nội dung, không phải tên file.
5. Kiểm video có ra dạng **Shorts** không. *(1080×1920 dài 35s thì YouTube tự nhận, không cần `#Shorts`.)*
6. `lich/da-dang/` phải có 2 thẻ vừa chuyển sang.
   *Còn ở `hang-doi/` nghĩa là node chuyển file chưa chạy — sẽ đăng lại đúng bài đó lần sau.*
7. Xoá 2 video thử → kéo 2 thẻ từ `da-dang/` ngược về `hang-doi/`.
8. Đổi `privacyStatus` về **`public`**.

### 06 · Bật lịch

1. Gạt công tắc **Active** góc trên phải.
2. Để máy chạy n8n **không tắt**. *n8n tắt thì lịch không chạy, và **không đăng bù** lúc bật lại.*
3. Sáng hôm sau kiểm Telegram: phải có **6 tin** (3 bài × 2 kênh).

Lịch **8h · 13h · 20h**, mỗi lần 1 bài/kênh. Hết hàng đợi thì workflow **dừng im lặng**,
không báo lỗi giả — hết bài không phải là hỏng.

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

## 8. Nhạc — đang nghiên cứu, script đã sẵn sàng

**Video hiện đã CÓ nhạc rồi**, không phải im lặng: nền nhạc (`bed-dark` / `bed-light`) +
6 tiếng hiệu ứng (tick · thud · whoosh · riser · win · loss), **tự tổng hợp** bằng
`video-engine/scripts/make_audio.py` → **không ai claim bản quyền được**, và các tiếng đó
**bắn đúng nhịp storyboard** (tick lúc nến đóng, riser trước lúc lộ đáp án).

**Điểm yếu thật:** 300 video chia nhau đúng **2 nền nhạc** → nghe quen là thấy giống nhau.

Anh Tuấn Anh sẽ gửi một bản nhạc. Khi có file, bỏ vào `nhac/` rồi:

```bash
# nghe thử 3 cái trước — KHÔNG đụng vào bản gốc, ghi ra thư mục nghe-thu/
python3 dang-tu-dong/gan_nhac.py nhac/bai-cua-anh.mp3 video-engine/out/batch/<ngay> --thu 3

# ưng thì bỏ --thu, áp cho cả lô
python3 dang-tu-dong/gan_nhac.py nhac/bai-cua-anh.mp3 video-engine/out/batch/<ngay>
```

**Không render lại** — chỉ trộn tiếng, giữ nguyên luồng hình (`-c:v copy`), vài giây/video.
Nhạc nền cũ và tiếng hiệu ứng được **giữ lại và hạ xuống dưới**, không bị thay thế.
Chỉnh: `--muc-nhac 0.55` (nhạc mới) · `--muc-cu 0.75` (giữ bao nhiêu phần cũ).

**Đã test thật** trên 1 video: trộn xong vẫn qua `kiem_video.py`, −13.7 LUFS, đúng chuẩn nền tảng.

---

## 9. Việc CHƯA làm — nói rõ để khỏi tưởng đã xong

| Việc | Trạng thái |
|---|---|
| Luồng upload YouTube thật | **Chưa chạy thử** — máy render không có credential của anh. Logic file/hàng đợi thì đã chạy thật (300 bài xếp đúng, không trùng) |
| TikTok | **Chưa nối.** n8n không có node TikTok sẵn, phải dựng bằng HTTP Request + qua audit riêng của TikTok. Chưa audit thì bài bị ép `SELF_ONLY` (chỉ mình mình thấy) |
| Nhạc mới | Đang chờ file của anh Tuấn Anh. Script đã sẵn và đã test |
| Số "7 ngày" ở Bẫy #1 | Chưa tra lại được nguồn — nên tra và sửa |

---

## 10. Một điều về nhạc trending, để phiên sau khỏi đi lại đường cũ

TikTok **không có endpoint API nào chọn sound** — muốn gắn nhạc trending thì phải mở app bấm
tay. *(Nguồn: developers.tiktok.com — tra 2026-09-10.)*

Có luật riêng cho tài khoản Business: chỉ thấy Commercial Music Library, không thấy kho nhạc
phổ thông. **Nhưng luật đó đánh vào nội dung quảng cáo sản phẩm, không đánh vào kênh chia sẻ
kiến thức gây fan.** Anh Tuấn Anh đã đăng thật và **không bị gì** — đó là số thật, thắng suy
luận. **Đừng lấy suy luận pháp lý đi chặn một việc đang chạy được.**
