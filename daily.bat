@echo off
REM Đặt lịch chạy file này bằng Windows Task Scheduler.
if not exist "%~dp0tool\batch.mjs" (
  echo [X] File nay dang nam SAI CHO.
  echo     No phai nam trong thu muc candle-video-tool, canh 2 thu muc
  echo     "tool" va "video-engine".
  echo.
  echo     Neu vua tai zip ve: chuot phai vao file zip, chon Extract All,
  echo     mo thu muc vua giai nen ra, roi chay lai file nay o TRONG do.
  pause ^& exit /b 1
)
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js chua duoc cai. Tai o https://nodejs.org & exit /b 1)
node tool\batch.mjs --workers 2
