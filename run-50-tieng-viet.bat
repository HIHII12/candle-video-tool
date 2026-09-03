@echo off
REM ==========================================================
REM  Render 50 video short TIENG VIET (co logo kenh).
REM  Khoang 1.5 - 2 tieng. Khong tu tat may.
REM ==========================================================
if not exist "%~dp0tool\batch.mjs" (
  echo [X] File nay dang nam SAI CHO — phai nam trong thu muc candle-video-tool.
  pause ^& exit /b 1
)
cd /d "%~dp0"
where node >nul 2>nul || (echo [X] Chua co Node.js. Tai tai https://nodejs.org & pause & exit /b 1)
where python >nul 2>nul || (echo [X] Chua co Python. Tai tai https://python.org, NHO TICK "Add Python to PATH" & pause & exit /b 1)

if not exist "video-engine\node_modules" (
  echo === Lan dau chay: dang cai dependency ===
  cd video-engine
  call npm install
  cd ..
)

echo === Render 50 video tieng Viet ===
node tool\batch.mjs --format candle-lesson --locale vi --count 50 --workers 2
set RC=%ERRORLEVEL%

echo.
echo === Soi san ===
cd video-engine
python scripts\kiem_video.py "out\batch\*\vi-*.mp4"
cd ..
echo.
echo Video nam trong: video-engine\out\batch\
pause
exit /b %RC%
