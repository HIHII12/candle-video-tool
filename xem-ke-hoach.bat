@echo off
REM Xem hom nay se render nhung gi, KHONG render. Chay trong 1 giay.
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
node tool\batch.mjs --dry-run --count 30
pause
