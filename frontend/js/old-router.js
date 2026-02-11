// router.js - Sistema de enrutamiento para SPA
console.log("📍 router.js cargado");

class Router {
    constructor() {
        this.routes = {
            'dashboard': { 
                title: 'Dashboard', 
                icon: 'fas fa-tachometer-alt',
                file: 'pages/dashboard.html'
            },
            'employees': { 
                title: 'Empleados', 
                icon: 'fas fa-users',
                file: 'pages/employees.html'
            },
            'reports': { 
                title: 'Reportes', 
                icon: 'fas fa-chart-bar',
                file: 'pages/reports.html'
            },
            'settings': { 
                title: 'Configuración', 
                icon: 'fas fa-cog',
                file: 'pages/settings.html'
            }
        };
        
        this.currentRoute = 'dashboard';
        this.init();
    }

    init() {
        console.log("🔄 Router inicializado");
        this.setupNavigation();
        this.navigate('dashboard');
    }

    // Configurar navegación
    setupNavigation() {
        const navMenu = document.getElementById('nav-menu');
        if (!navMenu) return;

        // Crear items del menú
        Object.entries(this.routes).forEach(([key, route]) => {
            const menuItem = document.createElement('a');
            menuItem.href = '#';
            menuItem.className = 'nav-item';
            menuItem.dataset.route = key;
            menuItem.innerHTML = `
                <i class="${route.icon}"></i>
                <span>${route.title}</span>
            `;
            
            menuItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(key);
            });
            
            navMenu.appendChild(menuItem);
        });
    }

    // Navegar a una ruta
    navigate(route) {
        if (!this.routes[route]) {
            console.error(`Ruta no encontrada: ${route}`);
            route = 'dashboard';
        }

        this.currentRoute = route;
        console.log(`➡️ Navegando a: ${route}`);
        
        // Actualizar título
        document.title = `${this.routes[route].title} - JTX People`;
        
        // Cargar contenido
        this.loadPage(route);
        
        // Actualizar navegación activa
        this.updateActiveNav();
    }

    // Cargar página
    async loadPage(route) {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;

        try {
            // Mostrar carga
            dashboard.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Cargando ${this.routes[route].title}...</p>
                </div>
            `;

            // Cargar contenido del archivo
            const response = await fetch(this.routes[route].file);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const content = await response.text();
            dashboard.innerHTML = content;
            
            // Inicializar componentes específicos de la página
            this.initPageComponents(route);
            
        } catch (error) {
            console.error(`Error cargando ${route}:`, error);
            dashboard.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar la página</h3>
                    <p>${error.message}</p>
                    <button onclick="window.router.navigate('dashboard')" class="btn btn-primary">
                        <i class="fas fa-home"></i> Volver al Dashboard
                    </button>
                </div>
            `;
        }
    }

    // Inicializar componentes específicos de cada página
    initPageComponents(route) {
        console.log(`🎨 Inicializando componentes de: ${route}`);
        
        switch(route) {
            case 'dashboard':
                this.initDashboard();
                break;
            case 'employees':
                this.initEmployees();
                break;
            case 'reports':
                this.initReports();
                break;
            case 'settings':
                this.initSettings();
                break;
        }
    }

    // Inicializar dashboard
    initDashboard() {
        console.log("📊 Inicializando dashboard...");
        
        // Cargar datos del usuario
        const user = JSON.parse(localStorage.getItem('jtx_user') || '{}');
        document.getElementById('user-name').textContent = user.name || 'Usuario';
        
        // Configurar botones
        document.getElementById('btn-manage-employees').addEventListener('click', () => {
            this.navigate('employees');
        });
        
        document.getElementById('btn-add-employee').addEventListener('click', () => {
            alert('Funcionalidad en desarrollo: Agregar empleado');
        });
        
        // Cargar estadísticas (simuladas por ahora)
        this.loadDashboardStats();
    }

    // Cargar estadísticas del dashboard
    async loadDashboardStats() {
        try {
            const token = localStorage.getItem('jtx_token');
            if (!token) return;

            // Simular datos por ahora - luego se conectarán al API
            document.getElementById('total-employees').textContent = '130';
            document.getElementById('active-employees').textContent = '124';
            document.getElementById('total-departments').textContent = '8';
            document.getElementById('avg-salary').textContent = '$3,450';
            
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    // Inicializar página de empleados
    initEmployees() {
        console.log("👥 Inicializando gestión de empleados...");
        
        // Aquí cargarías la lista de empleados del API
        const employeesList = document.getElementById('employees-list');
        if (employeesList) {
            employeesList.innerHTML = `
                <div class="info-message">
                    <i class="fas fa-users"></i>
                    <h3>Gestión de Empleados</h3>
                    <p>Conectando con el Employees Service...</p>
                    <p>Total de empleados en la base de datos: 130</p>
                </div>
            `;
        }
    }

    // Inicializar reportes
    initReports() {
        console.log("📈 Inicializando reportes...");
        // Por implementar
    }

    // Inicializar configuración
    initSettings() {
        console.log("⚙️ Inicializando configuración...");
        // Por implementar
    }

    // Actualizar navegación activa
    updateActiveNav() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.dataset.route === this.currentRoute) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Crear instancia global
window.router = new Router();
