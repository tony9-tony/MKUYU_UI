@echo off
title MKUYU website on a phone (ngrok)
rem Opens the public website on a phone through ngrok.
rem 1. Start the MKUYU system first: start-mkuyu.bat in RealEstate-System.org.
rem 2. Double-click this file. Open the https://....ngrok-free.app address it
rem    shows ("Forwarding") on the phone. Close both windows to stop.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org and try again.
  pause
  exit /b 1
)
start "MKUYU website (port 5500)" cmd /k node serve.mjs
timeout /t 2 /nobreak >nul
ngrok http 5500
if errorlevel 1 echo ngrok is not installed or not signed in. Install it from https://ngrok.com/download
pause
