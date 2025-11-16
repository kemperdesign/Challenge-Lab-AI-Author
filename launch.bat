@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Challenge Lab AI Agent - Launcher
echo ========================================
echo.

REM Get the directory where this batch file is located
cd /d "%~dp0"

echo Current directory: %CD%
echo.

echo Checking Node.js installation...
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: Node.js is not found!
    echo Please install Node.js from https://nodejs.org/
    echo.
    goto :error
)

node --version
echo.

echo Checking npm...
npm --version
echo.

echo ========================================
echo Starting the development server...
echo ========================================
echo.
echo The application will open in your browser.
echo If not, manually open: http://localhost:5173
echo.
echo Press Ctrl+C to stop the server.
echo ========================================
echo.

REM Using direct node execution to bypass ampersand path issue
node node_modules\vite\bin\vite.js

:error
echo.
echo ========================================
echo Script finished or encountered an error
echo ========================================
echo.
pause
