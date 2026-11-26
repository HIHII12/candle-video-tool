@echo off
REM 100 video QUIZ tieng Viet — cung bo noi dung, logo Van Thang Trading.
cd /d "%~dp0"
node tool\batch.mjs --format quiz --locale vi --count 100 --workers 3
echo.
echo Video nam trong: video-engine\out\batch\
pause
