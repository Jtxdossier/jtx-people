#!/bin/bash
# start-dev.sh - Inicia TODO el entorno de desarrollo con UN solo comando

echo "🚀 Iniciando JTX People Development Environment..."
echo "=============================================="

# Colores para mensajes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para limpiar puertos
clean_ports() {
    echo -e "${BLUE}🔧 Limpiando puertos 3000, 3001, 3002, 8080...${NC}"
    
    # Para Linux/Mac
    if command -v lsof &> /dev/null; then
        for port in 3000 3001 3002 8080; do
            PID=$(lsof -ti:$port 2>/dev/null)
            if [ ! -z "$PID" ]; then
                kill -9 $PID 2>/dev/null
                echo "  Puerto $PORT liberado"
            fi
        done
    fi
    
    # Para Windows (Git Bash)
    if command -v netstat &> /dev/null; then
        echo "  Usando netstat para Windows..."
    fi
    
    sleep 2
}

# Función para verificar dependencias
check_dependencies() {
    echo -e "${BLUE}🔍 Verificando dependencias...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js no encontrado${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm no encontrado${NC}"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        echo -e "${RED}❌ Python no encontrado${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Todas las dependencias están instaladas${NC}"
}

# Función para iniciar backend
start_backend() {
    echo -e "${BLUE}⚙️  Iniciando microservicios backend...${NC}"
    
    # Navegar al directorio del proyecto
    cd "$(dirname "$0")" || exit 1
    
    # Instalar dependencias si es necesario
    if [ ! -d "node_modules" ]; then
        echo "  Instalando dependencias raíz..."
        npm install --silent
    fi
    
    if [ ! -d "backend/auth-service/node_modules" ]; then
        echo "  Instalando dependencias de auth-service..."
        cd backend/auth-service && npm install --silent && cd ../..
    fi
    
    # Iniciar todos los servicios
    echo -e "${GREEN}✅ Iniciando servicios en segundo plano...${NC}"
    
    # Usar screen o tmux para múltiples terminales
    if command -v screen &> /dev/null; then
        screen -dmS jtx-backend npm run dev
        echo "  Servicios iniciados en sesión screen: jtx-backend"
        echo "  Para ver logs: screen -r jtx-backend"
    else
        # Iniciar en background
        npm run dev > backend.log 2>&1 &
        BACKEND_PID=$!
        echo "  Backend PID: $BACKEND_PID"
        echo "  Logs en: backend.log"
    fi
    
    # Esperar a que los servicios estén listos
    echo "  Esperando servicios (10 segundos)..."
    sleep 10
    
    # Verificar servicios
    echo "  Verificando servicios..."
    if curl -s http://localhost:3000/health > /dev/null; then
        echo -e "${GREEN}✅ Gateway funcionando en http://localhost:3000${NC}"
    else
        echo -e "${RED}❌ Gateway no responde${NC}"
    fi
}

# Función para iniciar frontend
start_frontend() {
    echo -e "${BLUE}🎨 Iniciando frontend...${NC}"
    
    cd "$(dirname "$0")" || exit 1
    
    # Iniciar servidor HTTP para frontend
    echo "  Iniciando servidor frontend en puerto 8080..."
    
    if command -v python3 &> /dev/null; then
        python3 -m http.server 8080 --directory frontend > frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo "  Frontend PID: $FRONTEND_PID"
        echo "  Usando Python 3"
    elif command -v python &> /dev/null; then
        python -m http.server 8080 --directory frontend > frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo "  Frontend PID: $FRONTEND_PID"
        echo "  Usando Python"
    else
        echo -e "${RED}❌ No se encontró Python${NC}"
        exit 1
    fi
    
    sleep 2
    
    # Verificar frontend
    if curl -s http://localhost:8080 > /dev/null; then
        echo -e "${GREEN}✅ Frontend funcionando en http://localhost:8080${NC}"
    else
        echo -e "${RED}❌ Frontend no responde${NC}"
    fi
}

# Función para mostrar información
show_info() {
    echo ""
    echo -e "${GREEN}==============================================${NC}"
    echo -e "${GREEN}🚀 ENTORNO DE DESARROLLO INICIADO${NC}"
    echo -e "${GREEN}==============================================${NC}"
    echo ""
    echo -e "${BLUE}🌐 ACCESOS:${NC}"
    echo "  Frontend:    http://localhost:8080"
    echo "  API Gateway: http://localhost:3000"
    echo "  Auth API:    http://localhost:3001"
    echo "  Users API:   http://localhost:3002"
    echo ""
    echo -e "${BLUE}🔧 COMANDOS ÚTILES:${NC}"
    echo "  Ver logs backend:   tail -f backend.log"
    echo "  Ver logs frontend:  tail -f frontend.log"
    echo "  Detener todo:       pkill -f 'node|python'"
    echo ""
    echo -e "${BLUE}🔐 CREDENCIALES DE PRUEBA:${NC}"
    echo "  Email:    admin@jtx.com"
    echo "  Password: admin123"
    echo ""
    echo -e "${GREEN}✅ Listo para desarrollar!${NC}"
    echo ""
}

# Menú principal
main() {
    echo -e "${BLUE}JTX People - Desarrollo Automatizado${NC}"
    echo ""
    
    # Opciones
    if [ "$1" == "clean" ]; then
        clean_ports
    fi
    
    check_dependencies
    clean_ports
    start_backend
    start_frontend
    show_info
    
    # Mantener script corriendo
    echo "Presiona Ctrl+C para detener todos los servicios..."
    wait
}

# Capturar Ctrl+C
trap 'echo -e "\n${RED}🛑 Deteniendo servicios...${NC}"; pkill -f "node|python"; exit 0' INT

# Ejecutar
main "$@"