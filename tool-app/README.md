# XAU LAB Studio

Web tool local để tạo project, nạp CSV OHLC, chỉnh kịch bản Việt/Global, tinh chỉnh voice/retention, render và tải output Remotion.

## Mở tool

Double-click `MO-XAU-LAB-STUDIO.bat` ở thư mục gốc. Lần đầu script tự cài dependency, build giao diện, mở `http://127.0.0.1:4173` và giữ renderer chạy trong cửa sổ terminal.

## CSV đầu vào

CSV cần header `time,open,high,low,close` (cũng nhận `timestamp/date/datetime` cho cột thời gian), tối thiểu 8 nến. Dấu phân cách có thể là dấu phẩy, chấm phẩy hoặc tab.

## Routing mặc định

- Việt Nam: Zalo `https://zalo.me/g/vuqtnr406`
- Global / English: Telegram `https://t.me/goldfather_fxhub` (`@goldfather_fxhub`)

Project được lưu local trong `tool-app/data/projects`. Output mới nhất ở `video-engine/out/showcase/case-001`; mỗi job hoàn tất còn được snapshot vào `video-engine/out/projects`.
