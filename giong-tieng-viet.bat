@echo off
REM Cai giong doc tieng Viet (tai tu Hugging Face) roi doc thu mot cau.
cd /d "%~dp0"
python cai-dat.py --giong --track vi
echo.
pause
