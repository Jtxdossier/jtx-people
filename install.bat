@echo off
echo Instalando JTX People...

echo Instalando dependencias del proyecto raiz...
npm install

echo Instalando dependencias de auth-service...
cd backend\auth-service
call npm install
cd ..\..

echo Instalando dependencias de users-service...
cd backend\users-service
call npm install
cd ..\..

echo Instalando dependencias de api-gateway...
cd backend\api-gateway
call npm install
cd ..\..

echo Instalacion completada!
echo.
echo Para iniciar todos los servicios:
echo npm start
echo.
echo Para desarrollo:
echo npm run dev
pause