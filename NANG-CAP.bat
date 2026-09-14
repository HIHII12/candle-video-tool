@echo off
REM Keo ban moi nhat tu git roi cai lai toan bo. Giu nguyen video da render.
cd /d "%~dp0"
python cai-dat.py --nang-cap
echo.
pause
