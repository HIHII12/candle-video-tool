@echo off
REM ==========================================================
REM  Doi logo kenh cho luong tieng Viet.
REM
REM  Cach dung: keo file logo (.png) tha thang vao file .bat nay.
REM  Hoac chay:  doi-logo.bat "C:\duong\dan\logo-moi.png"
REM
REM  Script se cat nen gia ra khoi anh roi luu thanh
REM  video-engine\public\brand\van-thang-trading.png
REM  — dung ten ma batch dang goi, nen khong phai sua gi them.
REM ==========================================================
cd /d "%~dp0"
if "%~1"=="" (
  echo Keo file logo .png tha vao file nay, hoac:
  echo    doi-logo.bat "C:\duong\dan\logo.png"
  pause ^& exit /b 1
)
where python >nul 2>nul || (echo Chua co Python. Tai tai https://python.org & pause & exit /b 1)

cd video-engine
python -m pip install --quiet pillow numpy
python scripts\lam_sach_logo.py "%~1" --out public\brand\van-thang-trading.png
echo.
echo Xong. Render lai luong tieng Viet de thay logo moi:
echo    node tool\batch.mjs --format candle-lesson --locale vi --count 50 --workers 2
pause
