@echo off
setlocal
title Digital Grid Worker Launcher
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-digital-grid-worker.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" echo Startup failed with exit code %EXIT_CODE%.
pause
exit /b %EXIT_CODE%
