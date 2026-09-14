@echo off
REM ==========================================================
REM  Render 100 video short (mau nen), xong thi TAT MAY.
REM
REM  Vi sao rieng mot file: 100 video la ~3 tieng, nen no duoc
REM  viet de chay qua dem va tu tat. Muon huy tat may thi bam
REM  Ctrl+C trong 60 giay cuoi, hoac chay:  shutdown /a
REM
REM  Chi dung mau nen: format nay khong can mang, nen mot cu
REM  rot mang luc 3 gio sang khong lam hong ca dem.
REM ==========================================================
if not exist "%~dp0tool\batch.mjs" (
  echo [X] File nay dang nam SAI CHO.
  echo     No phai nam trong thu muc candle-video-tool, canh 2 thu muc
  echo     "tool" va "video-engine".
  pause ^& exit /b 1
)
cd /d "%~dp0"

where node >nul 2>nul || (
  echo [X] Chua co Node.js. Tai ban LTS tai https://nodejs.org roi chay lai file nay.
  pause ^& exit /b 1
)
where python >nul 2>nul || (
  echo [X] Chua co Python. Tai tai https://python.org
  echo     Khi cai NHO TICK o "Add Python to PATH".
  pause ^& exit /b 1
)

if not exist "video-engine\node_modules" (
  echo === Lan dau chay: dang cai dependency, doi vai phut ===
  cd video-engine
  call npm install
  cd ..
)

echo === Render 100 video. Du kien 2.5 - 3.5 tieng ===
node tool\batch.mjs --format candle-lesson --count 100 --workers 2
set RENDER_EXIT=%ERRORLEVEL%

echo.
echo === Soi san toan bo ===
cd video-engine
python scripts\kiem_video.py "out\batch\*\*.mp4" --json out\bao-cao-san.json
cd ..

echo.
if not "%RENDER_EXIT%"=="0" (
  echo [!] Co video loi. Xem manifest.json trong thu muc out\batch\
  echo     KHONG tat may, de anh xem lai.
  pause
  exit /b %RENDER_EXIT%
)

echo Xong. May se tat sau 60 giay.
echo Muon huy: mo cua so lenh moi va go   shutdown /a
shutdown /s /t 60 /c "Render xong 100 video"
