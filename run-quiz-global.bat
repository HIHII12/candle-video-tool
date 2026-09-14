@echo off
REM 100 video QUIZ tieng Anh (global) — giai phau nen, co logo GoldFather FX.
REM
REM 50 noi dung khac nhau, moi noi dung 2 ban:
REM   33 mau nen  -> hoi "BUY hay SELL?"
REM   17 cap de nham -> hoi "cai nao la ... ? TREN hay DUOI?"
REM
REM Khong can mang. Chay lai lenh nay se BO QUA video da render xong,
REM nen may co tat giua chung thi cu chay lai.
cd /d "%~dp0"
node tool\batch.mjs --format quiz --locale en --count 100 --brand goldfather-fx.png --workers 3
echo.
echo Video nam trong: video-engine\out\batch\
pause
