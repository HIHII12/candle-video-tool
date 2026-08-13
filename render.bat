@echo off
REM Double-click to render a video. Edit the two values below to change what
REM gets made; run "node tool\render.mjs --list" to see every option.
setlocal
set FORMAT=candle-lesson
set PATTERN=hammer

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
where node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org and run this again. & pause & exit /b 1)
node tool\render.mjs --format %FORMAT% --pattern %PATTERN%
echo.
pause
