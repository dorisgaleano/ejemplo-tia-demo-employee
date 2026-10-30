@echo off
REM ==========================================================================
REM  Menu de ejecucion de las pruebas automatizadas handleLeaveCreate (OrangeHRM)
REM  - Verifica Node.js, dependencias y navegador antes de ejecutar.
REM  - Antes de cada corrida valida el Excel (prepare-data) y los pasos (dry-run).
REM  - Lo que escribe el usuario viaja en variables de entorno y se valida en Node.
REM  - No contiene secretos: la clave del Admin esta en el archivo .env.
REM ==========================================================================
chcp 65001 >nul
setlocal
set "LAST_RC=0"
cd /d "%~dp0"
title Pruebas handleLeaveCreate - OrangeHRM

:MENU
set "FILTRO_CASO="
set "FILTRO_FILA="
set "FILTRO_TAG="
set "PERFIL=default"
cls
echo ==========================================================
echo    PRUEBAS AUTOMATIZADAS - handleLeaveCreate (OrangeHRM)
echo ==========================================================
echo    1. Ejecutar todas las filas habilitadas
echo    2. Ejecutar un caso especifico
echo    3. Ejecutar una fila especifica (IdFila)
echo    4. Ejecutar por tag
echo    5. Ejecutar todo en modo visible (ver el navegador)
echo    6. Abrir el ultimo reporte HTML
echo    7. Abrir la carpeta de evidencias de la ultima ejecucion
echo    8. Abrir el trace de una fila
echo    9. Abrir la plantilla Excel
echo   10. Instalar o actualizar dependencias (primera vez)
echo    0. Salir
echo ==========================================================
set "OPCION="
set /p "OPCION=Elige una opcion: "
if "%OPCION%"=="1" goto RUN
if "%OPCION%"=="2" goto CASO
if "%OPCION%"=="3" goto FILA
if "%OPCION%"=="4" goto TAG
if "%OPCION%"=="5" goto HEADED
if "%OPCION%"=="6" goto OPEN_REPORT
if "%OPCION%"=="7" goto OPEN_EVIDENCE
if "%OPCION%"=="8" goto OPEN_TRACE
if "%OPCION%"=="9" goto OPEN_EXCEL
if "%OPCION%"=="10" goto INSTALL
if "%OPCION%"=="0" goto END
echo Opcion no valida.
pause
goto MENU

:CASO
call :CHECK_ENV || goto BACK
echo Casos disponibles:
node scripts\menu-helper.js cases
set /p "FILTRO_CASO=Escribe el ID del caso (ej. HLC-TC-004): "
node scripts\menu-helper.js check-caso || goto BACK
goto RUN

:FILA
call :CHECK_ENV || goto BACK
set /p "FILTRO_FILA=Escribe el IdFila (ej. HLC-TC-004-01): "
node scripts\menu-helper.js check-fila || goto BACK
goto RUN

:TAG
call :CHECK_ENV || goto BACK
set /p "FILTRO_TAG=Escribe el tag o expresion (ej. @HLC-TC-004): "
node scripts\menu-helper.js check-tag || goto BACK
goto RUN

:HEADED
set "PERFIL=headed"
goto RUN

:RUN
call :CHECK_ENV || goto BACK
echo.
echo [1/4] Validando el Excel de datos...
node scripts\prepare-data.js
if errorlevel 1 goto FAIL_PREP
echo [2/4] Verificando que todos los pasos esten definidos...
call npx cucumber-js --profile dryrun
if errorlevel 1 goto FAIL_DRY
echo [3/4] Ejecutando las pruebas (perfil %PERFIL%)...
call npx cucumber-js --profile %PERFIL%
set "RC=%ERRORLEVEL%"
set "LAST_RC=%RC%"
echo [4/4] Generando resultados.xlsx...
node scripts\build-report.js
if "%RC%"=="0" (
  echo RESULTADO: todas las filas ejecutadas pasaron.
) else (
  echo RESULTADO: hubo filas con fallos. Revisa el reporte HTML ^(opcion 6^).
)
goto BACK

:FAIL_PREP
echo.
echo No se ejecuto la prueba: corrige el Excel segun los mensajes de arriba.
goto BACK

:FAIL_DRY
echo.
echo No se ejecuto la prueba: hay pasos sin definir o ambiguos ^(ver arriba^).
goto BACK

:OPEN_REPORT
node scripts\menu-helper.js open-report
goto BACK

:OPEN_EVIDENCE
node scripts\menu-helper.js open-evidence
goto BACK

:OPEN_TRACE
call :CHECK_ENV || goto BACK
set /p "FILTRO_FILA=IdFila cuyo trace quieres ver (ej. HLC-TC-004-01): "
node scripts\menu-helper.js open-trace
goto BACK

:OPEN_EXCEL
if not exist "data\input\datos_pruebas.xlsx" (
  echo No existe la plantilla. Usa la opcion 10 para prepararla.
  goto BACK
)
start "" "data\input\datos_pruebas.xlsx"
goto BACK

:INSTALL
where node >nul 2>&1 || (echo Instala Node.js 20 o superior desde https://nodejs.org y vuelve a intentar. & goto BACK)
echo Instalando dependencias...
call npm install
if errorlevel 1 (echo Fallo la instalacion de dependencias. & goto BACK)
echo Instalando el navegador Chromium de Playwright...
call npx playwright install chromium
if errorlevel 1 (echo Fallo la instalacion del navegador. & goto BACK)
if not exist "data\input\datos_pruebas.xlsx" call npm run template
if not exist ".env" echo IMPORTANTE: copia .env.example como .env y completa usuario y clave.
echo Instalacion terminada.
goto BACK

REM ---- Verificaciones previas; devuelve 1 si falta algo ---------------------
:CHECK_ENV
where node >nul 2>&1 || (echo Falta Node.js. Instalalo ^(version 20 o superior^) desde https://nodejs.org & exit /b 1)
for /f "tokens=1 delims=v." %%a in ('node -v') do set "NODE_MAJOR=%%a"
if %NODE_MAJOR% LSS 20 (echo Node.js %NODE_MAJOR% es muy antiguo: se requiere 20 o superior. & exit /b 1)
if not exist "node_modules" (echo Faltan las dependencias. Usa la opcion 10. & exit /b 1)
node scripts\menu-helper.js browsers || (echo Usa la opcion 10 para instalarlo. & exit /b 1)
if not exist ".env" (echo Falta el archivo .env. Copia .env.example como .env y completalo. & exit /b 1)
exit /b 0

:BACK
echo.
pause
goto MENU

:END
endlocal & exit /b %LAST_RC%
