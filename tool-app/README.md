# XAU LAB Studio

Web tool local để tạo Short, video dài và Shorts theo lô; nạp CSV OHLC, chỉnh kịch bản Việt/Global, tinh chỉnh voice/retention, render và tải output Remotion.

## Mở tool

Double-click `MO-XAU-LAB-STUDIO.bat` ở thư mục gốc. Lần đầu script tự cài dependency, build giao diện, mở `http://127.0.0.1:4173` và giữ renderer chạy trong cửa sổ terminal.

## CSV đầu vào

CSV cần header `time,open,high,low,close` (cũng nhận `timestamp/date/datetime` cho cột thời gian), tối thiểu 8 nến. Dấu phân cách có thể là dấu phẩy, chấm phẩy hoặc tab.

## Ba luồng sử dụng

- `Tạo 1 video Short`: chọn một trong 6 format, sửa hook/kịch bản rồi render VI hoặc EN riêng.
- `Tạo video dài`: chọn 3, 5 hoặc 8 phút; chỉnh narration theo định dạng `giây|phụ đề|cách đọc`, render MP4 1920×1080.
- `Shorts theo lô`: nạp tối đa 50 nội dung từ CSV có header `type,title,topic,hook,locale`. Mỗi dòng thành một project và một job độc lập.

Batch chạy tuần tự để tránh tranh chấp tài nguyên. Một job lỗi không chặn các job còn lại. Các `type` hợp lệ: `market-case`, `candle-pattern`, `candle-anatomy`, `indicator`, `smc`, `fibonacci`.

## Routing mặc định

- Việt Nam: Zalo `https://zalo.me/g/vuqtnr406`
- Global / English: Telegram `https://t.me/goldfather_fxhub` (`@goldfather_fxhub`)

Project được lưu local trong `tool-app/data/projects`. Output mới nhất ở `video-engine/out/showcase/case-001`; mỗi job hoàn tất còn được snapshot vào `video-engine/out/projects`.
