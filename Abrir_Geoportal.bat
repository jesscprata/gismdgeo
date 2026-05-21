@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8765
set URL=http://localhost:%PORT%/

echo.
echo  MDGEO WebGis
echo  Iniciando servidor local...
echo.

REM --- Tenta Python (se existir) em janela separada ---
where py >nul 2>&1
if %errorlevel% equ 0 (
    start "MDGEO-Servidor" /MIN py -m http.server %PORT%
    goto :abrir_navegador
)
where python >nul 2>&1
if %errorlevel% equ 0 (
    start "MDGEO-Servidor" /MIN python -m http.server %PORT%
    goto :abrir_navegador
)

REM --- Sem Python: usa PowerShell (vem no Windows) ---
echo  Python nao encontrado. Usando PowerShell...
start "MDGEO-Servidor" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor-local.ps1" -Porta %PORT%
goto :abrir_navegador

:abrir_navegador
echo  Aguardando servidor...
timeout /t 3 /nobreak >nul

start "" "%URL%"

echo.
echo  Abra no navegador: %URL%
echo  Janela "MDGEO-Servidor" deve permanecer aberta.
echo  Feche essa janela para encerrar o servidor.
echo.
pause
