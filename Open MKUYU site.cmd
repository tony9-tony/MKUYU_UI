@echo off
rem Starts the MKUYU public website locally and opens it in the browser.
rem Double-click this file. Close this window to stop the site.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org and try again.
  pause
  exit /b 1
)
echo Starting the MKUYU public website at http://localhost:5500
echo Close this window to stop it.
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:5500"
node serve.mjs
