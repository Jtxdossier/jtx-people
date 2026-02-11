@echo off
REM start-dev.bat - Iniciando JTX People Development Environment...
echo 🚀 Iniciando JTX People Development Environment...
echo ==============================================

REM Limpiar TODOS los puertos relevantes
echo 🔧 Limpiando puertos...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3003') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3004') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3005') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3006') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5432') do taskkill /F /PID %%a 2>nul

REM Limpiar todos los procesos node.exe por si acaso
echo 🗑️  Limpiando procesos Node.js...
taskkill /F /IM node.exe 2>nul

REM Esperar un momento
timeout /t 2 /nobreak >nul

REM Verificar Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js no encontrado
    pause
    exit /b 1
)

REM Verificar npm
where npm >nul 2>nul
if errorlevel 1 (
    echo ❌ npm no encontrado
    pause
    exit /b 1
)

REM Iniciar backend
echo ⚙️  Iniciando microservicios backend...
cd /d "%~dp0"
start "JTX Backend" cmd /k "npm run dev"

REM Esperar 15 segundos para que los servicios backend inicien
echo ⏳ Esperando que los servicios backend inicien (15 segundos)...
timeout /t 15 /nobreak >nul

REM Verificar que los servicios estén corriendo
echo 🔍 Verificando servicios...
curl -s http://localhost:3001/health >nul 2>&1 && echo ✅ Auth Service (3001): OK || echo ❌ Auth Service (3001): NO RESPONDE
curl -s http://localhost:3004/health >nul 2>&1 && echo ✅ Employees Service (3004): OK || echo ❌ Employees Service (3004): NO RESPONDE
curl -s http://localhost:3000/health >nul 2>&1 && echo ✅ API Gateway (3000): OK || echo ❌ API Gateway (3000): NO RESPONDE

REM Iniciar frontend
echo 🎨 Iniciando frontend...
cd /d "%~dp0\frontend"
start "JTX Frontend" cmd /k "python -m http.server 8080"

REM Esperar
timeout /t 3 /nobreak >nul

REM Mostrar información
echo.
echo ==============================================
echo 🚀 ENTORNO DE DESARROLLO INICIADO
echo ==============================================
echo.
echo 🌐 ACCESOS:
echo   Frontend:         http://localhost:8080
echo   API Gateway:      http://localhost:3000
echo   Auth Service:     http://localhost:3001
echo   Employees Service: http://localhost:3004
echo.
echo 🔐 CREDENCIALES DE PRUEBA:
echo   Email:    admin@jtx.com
echo   Password: admin123
echo.
echo 📊 STATUS: 
echo   Usa 'curl http://localhost:3001/health' para verificar Auth Service
echo   Usa 'curl http://localhost:3004/health' para verificar Employees Service
echo.
echo ⚠️  Si el Auth Service falla, revisa: backend/auth-service/server.js
echo.
echo ✅ Listo para desarrollar!
echo.
pause