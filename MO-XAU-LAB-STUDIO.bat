@echo off
setlocal
cd /d "%~dp0tool-app"
if not exist node_modules call npm install
if errorlevel 1 pause & exit /b 1
call npm run build
if errorlevel 1 pause & exit /b 1
start "" "http://127.0.0.1:4173"
npm start
endlocal
