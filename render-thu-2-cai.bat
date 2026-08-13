@echo off
REM Chay thu 2 video truoc khi lam ca 30. Mat ~5 phut.
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
if not exist "video-engine\node_modules" (cd video-engine && call npm install && cd ..)
node tool\batch.mjs --count 2 --workers 2
echo.
pause
