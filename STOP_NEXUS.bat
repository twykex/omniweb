@echo off
color 0c
echo ==================================================
echo      SHUTTING DOWN NEXUS...
echo ==================================================

echo Killing Python Backend...
taskkill /F /IM python.exe /T >nul 2>&1

echo Killing React Frontend...
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo System Offline.
pause