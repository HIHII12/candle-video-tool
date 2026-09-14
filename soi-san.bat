@echo off
REM Soi san toan bo video da render: tran khung, vung bi che, dung hinh, am luong.
cd /d "%~dp0video-engine"
where python >nul 2>nul || (echo Chua co Python. Tai tai https://python.org & pause & exit /b 1)
python scripts\kiem_video.py "out\batch\*\*.mp4" --json out\bao-cao-san.json
echo.
echo Bao cao chi tiet: video-engine\out\bao-cao-san.json
pause
