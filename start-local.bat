@echo off
echo ========================================
echo   Stranger Things E-commerce - Local
echo ========================================
echo.
echo Iniciando servidor local na porta 3000...
echo Abrindo http://localhost:3000
echo.
echo Para parar: Ctrl+C
echo.
cd /d "%~dp0"
node dev-server.js
pause
