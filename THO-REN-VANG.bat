@echo off
chcp 65001 >nul
title THO REN VANG - may lam video
cd /d "%~dp0"

echo.
echo  ============================================
echo     THO REN VANG - lam video Shorts vang
echo  ============================================
echo.
set SO=
set /p SO=  Hom nay lam bao nhieu video? (go so roi Enter, bo trong = 10): 
if "%SO%"=="" set SO=10

echo.
set GIA=
set /p GIA=  Gia vang hien tai (vi du 4120, xem tren TradingView; bo trong = giu muc cu): 
if not "%GIA%"=="" set THO_REN_GIA=%GIA%

REM Ngay theo gio may (gio Viet Nam). Truyen cung mot ngay cho ca buoc lam
REM video lan buoc soi loi: de tu lay thi node lay gio UTC, chay luc 0-7h sang
REM se ra thu muc ngay hom qua va buoc soi loi khong tim thay video.
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set NGAY=%%d
set THUMUC=video-engine\out\batch\%NGAY%

echo.
echo  [1/3] Dang lam %SO% video... (moi video khoang 2-4 phut, cu de may chay)
echo.
node tool\batch.mjs --format tho-ren --locale vi --brand tho-ren-vang.png --count %SO% --workers 2 --date %NGAY%
if errorlevel 1 (
  echo.
  echo  !! Co loi khi lam video. Chup man hinh nay gui cho anh quan ly.
  pause
  exit /b 1
)

echo.
echo  [2/3] Dang soi loi tung video...
echo.
python tool\soi-lo.py "%THUMUC%"

echo.
echo  [3/3] Mo thu muc video...
explorer "%THUMUC%"

echo.
echo  ============================================
echo   XONG. Video SACH nam trong:
echo   %THUMUC%
echo   Moi video co 1 file .txt cung ten = tieu de + mo ta + hashtag.
echo   Video LOI (neu co) nam trong thu muc LOI-DUNG-DANG - KHONG dang.
echo  ============================================
echo.
pause
