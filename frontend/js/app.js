// APP.JS - VERSIÓN PROFESIONAL CON MANEJO DE ESTADOS
console.log("📱 app.js cargado");

class JTXApp {
    constructor() {
        console.log("✅ JTXApp inicializada");
        this.apiGateway = "http://localhost:3000";
        this.services = {
            gateway: this.apiGateway,
            auth: "http://localhost:3001",
            users: "http://localhost:3002"
        };
        this.checkInterval = null;
    }

    // Verificar estado de todos los servicios
    async checkServices() {
        console.log("🔍 Verificando servicios...");
        
        try {
            // Verificar Gateway
            const gatewayOk = await this.checkService(`${this.apiGateway}/health`, "Gateway");
            
            if (gatewayOk) {
                this.updateApiStatus('Conectado', 'green');
                
                // Verificar Auth Service (directo)
                await this.checkService(this.services.auth, "Auth Service");
                
                // Verificar Users Service (directo)  
                await this.checkService(this.services.users, "Users Service");
                
                console.log("✅ Todos los servicios verificados");
            } else {
                this.updateApiStatus('Desconectado', 'red');
                console.warn("⚠️ Gateway no disponible");
            }
        } catch (error) {
            console.error("❌ Error verificando servicios:", error);
            this.updateApiStatus('Error', 'orange');
        }
    }

     // Verificar un servicio individual - VERSIÓN CORREGIDA
    async checkService(url, serviceName) {
        try {
            // Crear timeout manual (compatible con todos los navegadores)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const isOk = response.ok || response.status === 404 || response.status === 405;
            console.log(`${isOk ? '✅' : '❌'} ${serviceName}: ${isOk ? 'OK' : 'ERROR'}`);
            return isOk;
        } catch (error) {
            console.log(`⚠️ ${serviceName}: ${error.message}`);
            return false;
        }
    }

    // Actualizar estado en la UI
    updateApiStatus(status, color) {
        const statusElement = document.getElementById('api-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.style.color = color;
            statusElement.style.fontWeight = 'bold';
            
            // Agregar icono según estado
            const icon = color === 'green' ? '🟢' : color === 'red' ? '🔴' : '🟡';
            statusElement.textContent = `${icon} ${status}`;
        }
    }

    // Iniciar monitoreo continuo
    startMonitoring() {
        console.log("📡 Iniciando monitoreo de servicios...");
        this.checkServices();
        
        // Verificar cada 30 segundos
        this.checkInterval = setInterval(() => {
            this.checkServices();
        }, 60000);
    }

    // Detener monitoreo
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            console.log("⏹️ Monitoreo detenido");
        }
    }

    // Cargar datos iniciales
    async loadInitialData() {
        console.log("📊 Cargando datos iniciales...");
        
        // Si está autenticado, cargar datos del usuario
        const token = localStorage.getItem("jtx_token");
        if (token) {
            console.log("👤 Usuario autenticado, cargando datos...");
            // Aquí podrías cargar más datos del usuario
        }
    }

    // Función para mostrar notificaciones
    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Crear notificación en UI si se desea
        const types = {
            'success': { bg: '#27ae60', icon: '✅' },
            'error': { bg: '#e74c3c', icon: '❌' },
            'info': { bg: '#3498db', icon: 'ℹ️' },
            'warning': { bg: '#f39c12', icon: '⚠️' }
        };
        
        const config = types[type] || types.info;
        console.log(`${config.icon} ${message}`);
    }
}

// INICIALIZACIÓN DE LA APLICACIÓN
document.addEventListener('DOMContentLoaded', () => {
    console.log("📄 DOM cargado, inicializando aplicación...");
    
    // Crear instancia global
    window.JTXApp = new JTXApp();
    
    // Iniciar monitoreo de servicios
    window.JTXApp.startMonitoring();
    
    // Cargar datos iniciales
    window.JTXApp.loadInitialData();
    
    console.log("✅ Aplicación completamente inicializada");
    
    // Mostrar mensaje de bienvenida
    setTimeout(() => {
        const token = localStorage.getItem("jtx_token");
        if (!token) {
            window.JTXApp.showNotification(
                "Usa admin@jtx.com / admin123 para iniciar sesión", 
                'info'
            );
        }
    }, 2000);
});

// Manejar cierre de la página
window.addEventListener('beforeunload', () => {
    if (window.JTXApp) {
        window.JTXApp.stopMonitoring();
    }
});

console.log("✅ app.js completamente cargado");