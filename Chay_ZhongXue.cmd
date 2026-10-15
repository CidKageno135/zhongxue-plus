@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
if not exist "node_modules\next\dist\bin\next" (
  echo Installing app dependencies...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
node scripts/launch.cjs
if errorlevel 1 pause
