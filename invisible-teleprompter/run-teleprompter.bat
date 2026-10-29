@echo off
title Influgent Stealth Teleprompter
cd /d "%~dp0"

echo ==============================================================================
echo Influgent Stealth Desktop Teleprompter
echo Invisible to OBS, Zoom, Teams, Loom, and Screen Shares
echo ==============================================================================
echo.

where pythonw >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Starting stealth teleprompter with pythonw (background windowless mode)...
    start "" pythonw teleprompter.py
    exit /b 0
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Starting stealth teleprompter with python...
    start "" python teleprompter.py
    exit /b 0
)

echo ERROR: Python is not found in system PATH.
echo Please install Python 3 or add it to PATH.
pause

