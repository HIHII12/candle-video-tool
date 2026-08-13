@echo off
REM ==========================================================
REM  Cai giong doc (chay 1 lan duy nhat, can mang, ~90 MB).
REM  Chay xong thi run-30.bat se tu them giong doc vao video.
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

where python >nul 2>nul || (
  echo [X] Chua co Python. Tai tai https://python.org
  echo     Khi cai NHO TICK o "Add Python to PATH".
  pause & exit /b 1
)

cd video-engine
python scripts\setup_voice.py
cd ..
echo.
echo Xong. Tu gio run-30.bat se tu them giong doc.
echo Muon tat giong doc: chay  node tool\batch.mjs --no-voice
pause
