@echo off
REM ---------------------------------------------------------------------------
REM  Arranca un servidor web local y abre el simulador en el navegador.
REM  Hace falta porque la aplicacion usa modulos de JavaScript, y los
REM  navegadores no los permiten cargar abriendo el archivo con doble clic.
REM ---------------------------------------------------------------------------
cd /d "%~dp0"
set PUERTO=8000

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PUERTO%/"
  py -m http.server %PUERTO%
  goto :fin
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PUERTO%/"
  python -m http.server %PUERTO%
  goto :fin
)

where node >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:%PUERTO%/"
  npx --yes serve -l %PUERTO% .
  goto :fin
)

echo.
echo  No se ha encontrado Python ni Node.js en este ordenador.
echo  Alternativa: abre la carpeta con Visual Studio Code y usa la
echo  extension "Live Server", o sube la carpeta a cualquier hosting web.
echo.
pause

:fin
