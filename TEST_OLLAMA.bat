@echo off
title NEXUS DIAGNOSTIC
color 0e
cd /d "%~dp0"

echo Activating Python Environment...
call .venv\Scripts\activate

python check_brain.py