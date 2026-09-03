@echo off
REM Render rieng format KIEN THUC — Fibonacci, SMC, Vai Dau Vai, di ngang...
REM 14 video tieng Viet. Khong can mang.
cd /d "%~dp0"
node tool\batch.mjs --format concept-lesson --count 14 --locale vi --workers 2
echo.
pause
