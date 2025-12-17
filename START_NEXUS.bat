@echo off
title NEXUS COMMANDER
color 0b

echo ==================================================
echo      INITIALIZING NEXUS SYSTEM...
echo ==================================================

:: Get the directory where this script is saved
cd /d "%~dp0"

echo.
echo [1/3] Activating Neural Backend (Python/Ollama Link)...
:: Opens a new window, activates venv, runs server
start "NEXUS BRAIN" cmd /k "call .venv\Scripts\activate && uvicorn server:app --reload"

echo.
echo [2/3] Launching Visual Interface (React)...
:: Go into omniweb folder and start react
cd omniweb
start "NEXUS VISUALS" cmd /k "npm start"

echo.
echo [3/3] Deployment Complete.
echo.
echo --------------------------------------------------
echo  TO STOP: Simply close the two new black windows.
echo --------------------------------------------------
timeout /t 5 >nul
exit