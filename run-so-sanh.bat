@echo off
REM Render rieng format SO SANH hai mau nen de nham — 12 video tieng Viet.
REM Khong can mang.
cd /d "%~dp0"
node tool\batch.mjs --format candle-compare --count 12 --locale vi --workers 2
echo.
pause
