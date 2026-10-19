@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is missing. Install Node.js 22 LTS, then try again.
  echo https://nodejs.org/
  pause
  exit /b 1
)
node "%~dp0scripts\start-local.mjs" %*
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" pause
exit /b %RESULT%
