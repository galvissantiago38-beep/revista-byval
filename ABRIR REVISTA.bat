@echo off
title Revista digital
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No encontre Node.js en este computador.
  echo   Descargalo gratis en https://nodejs.org  ^(boton LTS^) y vuelve a intentar.
  echo.
  pause
  exit /b
)

start "" http://localhost:5173/index.html
node servidor.js
pause
