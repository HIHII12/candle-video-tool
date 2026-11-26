@echo off
REM Cai dat toan bo tool. Chay 1 lan tren may moi.
REM Muon nang cap ve sau: bam doi NANG-CAP.bat
cd /d "%~dp0"
python cai-dat.py %*
echo.
pause
