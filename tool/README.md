# Xuất video — ba cách

Chọn cách nào cũng ra cùng một file MP4 1080×1920 60fps.

---

## Cách 1 — Từ điện thoại, không cài gì (khuyên dùng)

Repo này **chính là công cụ**.

1. Mở GitHub → tab **Actions** → **Render a video**
2. Bấm **Run workflow**
3. Chọn trong menu:
   - **format** — `candle-lesson` / `buy-or-sell-quiz` / `named-setup`
   - **pattern** — mẫu nến (chỉ áp dụng cho `candle-lesson`)
   - **outcome** — `any` (tự nhiên) / `TP` / `SL` (chỉ cho 2 format dữ liệu thật)
4. Đợi vài phút → vào lại lần chạy đó → mục **Artifacts** → tải MP4 về

Miễn phí trong hạn mức GitHub Actions. Không cần AWS, không cần máy tính.

---

## Cách 2 — Trên máy Windows, có giao diện

Cần **Node.js** một lần: https://nodejs.org (bản LTS).

- Nháy đúp **`tool\studio.bat`** → Remotion Studio mở trong trình duyệt.
  Xem trước mọi composition, tua, chỉnh, bấm **Render** khi ưng.

Đây là cách dễ nhìn nhất để **kiểm tra độ ổn định**: xem trước rồi mới render.

---

## Cách 3 — Một lệnh

```bash
node tool/render.mjs --list                                   # xem hết lựa chọn
node tool/render.mjs --format candle-lesson --pattern hammer
node tool/render.mjs --format buy-or-sell-quiz --outcome TP
node tool/render.mjs --format named-setup --outcome any
```

Trên Windows nháy đúp **`tool\render.bat`** (sửa 2 dòng đầu để đổi lựa chọn).

Lần chạy đầu tự cài dependency. Video ra ở `video-engine/out/`.

---

## Cần biết trước

- **Một video mất khoảng 4 phút** trên một máy. 30 video/ngày ≈ 2 tiếng CPU —
  lúc đó mới cần render song song (xem `brain/nang-cap-video.md`).
- **Hai format dùng dữ liệu thật** (`buy-or-sell-quiz`, `named-setup`) gọi
  Yahoo Finance nên **cần mạng**. `candle-lesson` thì không — dữ liệu tự dựng.
- **Yahoo chỉ giữ nến 15m trong ~60 ngày**, nên phần quét lịch sử dùng `60d`.
- **`--outcome TP` là chọn lọc kèo thắng.** Dùng để demo thì được; đăng kênh
  thật nên để `any` cho thắng thua tự nhiên.
- Chưa có âm thanh.
