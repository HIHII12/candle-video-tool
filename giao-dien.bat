@echo off
REM ==========================================================
REM  Mo bang dieu khien trong trinh duyet.
REM  De day chay trong luc render - KHONG bi dong bang khi
REM  lo click chuot nhu cua so CMD.
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
  echo [X] Chua co Node.js. Tai ban LTS tai https://nodejs.org roi chay lai.
  pause ^& exit /b 1
)

if not exist "video-engine\node_modules" (
  echo === Lan dau chay: dang cai dependency, doi vai phut ===
  cd video-engine
  call npm install
  cd ..
)

echo.
echo  Dang mo bang dieu khien... Neu trinh duyet khong tu mo,
echo  vao dia chi:  http://localhost:4321
echo.
echo  DUNG DONG cua so nay trong luc render.
echo.
node tool\ui.mjs
pause
