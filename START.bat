@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local.ps1" -Action Start
set "result=%errorlevel%"
if not "%~1"=="--no-pause" pause
exit /b %result%
