@echo off
title DM Studio PDF
cd /d "%~dp0"
echo DM Studio PDF se esta ejecutando en http://localhost:5173
echo Cierra esta ventana para detenerlo.
start "" /b python -m http.server 5173 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" http://localhost:5173
pause >nul
