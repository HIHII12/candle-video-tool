@echo off
REM ==========================================================
REM  Nhay dup file nay de render 30 video.
REM  Lan dau se tu cai dependency, mat vai phut.
REM ==========================================================
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

where node >nul 2>nul || (
  echo [X] Chua co Node.js. Tai ban LTS tai https://nodejs.org roi chay lai file nay.
  pause & exit /b 1
)
where python >nul 2>nul || (
  echo [X] Chua co Python. Tai tai https://python.org
  echo     Khi cai NHO TICK o "Add Python to PATH".
  pause & exit /b 1
)

if not exist "video-engine\node_modules" (
  echo === Lan dau chay: dang cai dependency, doi vai phut ===
  cd video-engine
  call npm install
  cd ..
)

echo === Bat dau render 30 video. Du kien ~60-75 phut ===
node tool\batch.mjs --count 30 --workers 2
echo.
echo Video nam trong: video-engine\out\batch\
pause
