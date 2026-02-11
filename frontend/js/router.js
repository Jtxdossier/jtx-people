// ROUTER SIMPLE Y FUNCIONAL
console.log("📍 router.js cargado");

class Router {
    constructor() {
        console.log("✅ Router inicializado");
        this.routes = {
            'dashboard': { title: 'Dashboard', file: 'pages/dashboard.html' },
            'employees': { title: 'Empleados', file: 'pages/employees.html' },
            'reports': { title: 'Reportes', file: 'pages/reports.html' },
            'settings': { title: 'Configuración', file: 'pages/settings.html' }
        };
        this.currentPage = 'dashboard';
    }

    // Navegar a una página
    navigate(route) {
        console.log(`🔄 Navegando a: ${route}`);
        if (!this.routes[route]) return;
        
        this.currentPage = route;
        this.loadPage(route);
        this.updateMenu(route);
    }

    // Cargar página
    async loadPage(route) {
        const pageInfo = this.routes[route];
        const container = document.getElementById('page-content');
        
        if (!container) return;
        
        try {
            const response = await fetch(pageInfo.file);
            const html = await response.text();
            container.innerHTML = html;
            document.title = `${pageInfo.title} - JTX People`;
            
            // Inicializar componentes de la página
            this.initPage(route);
            
        } catch (error) {
            console.error('❌ Error cargando página:', error);
            container.innerHTML = `<div class="error">Error cargando ${pageInfo.title}</div>`;
        }
    }

    // Actualizar menú activo
    updateMenu(activeRoute) {
        document.querySelectorAll('.nav-item').forEach(item => {
            const route = item.dataset.route;
            if (route === activeRoute) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Inicializar página específica
    initPage(route) {
        console.log(`🎨 Inicializando: ${route}`);
        
        if (route === 'employees') {
            this.initEmployeesPage();
        }
    }

    // Inicializar página de empleados
    initEmployeesPage() {
        console.log("👥 Inicializando página de empleados");
        
        // Configurar botón "Nuevo Empleado"
        const addBtn = document.getElementById('btn-add-new');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showEmployeeForm();
            });
        }
        
        // Cargar empleados
        this.loadEmployees();
    }

    // Cargar empleados
    async loadEmployees() {
        console.log("📊 Cargando empleados...");
        const tbody = document.getElementById('employees-list');
        
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';
        
        try {
            // Usar apiService si está disponible
            if (typeof apiService !== 'undefined') {
                const response = await apiService.getEmployees();
                this.renderEmployees(response.data || []);
            } else {
                // Datos de ejemplo
                this.renderEmployees([
                    {
                        _id: 'EMP-001',
                        firstName: 'Carlos',
                        lastName: 'Fernández',
                        email: 'carlos@empresa.com',
                        department: 'TECNOLOGÍA',
                        position: 'Desarrollador',
                        salary: 35000,
                        status: 'active'
                    },
                    {
                        _id: 'EMP-002',
                        firstName: 'Ana',
                        lastName: 'García',
                        email: 'ana@empresa.com',
                        department: 'OPERACIONES',
                        position: 'Diseñadora',
                        salary: 42000,
                        status: 'active'
                    }
                ]);
            }
        } catch (error) {
            console.error('❌ Error cargando empleados:', error);
            tbody.innerHTML = '<tr><td colspan="8">Error cargando empleados</td></tr>';
        }
    }

    // Renderizar empleados en tabla
    renderEmployees(employees) {
        const tbody = document.getElementById('employees-list');
        if (!tbody || !employees.length) {
            tbody.innerHTML = '<tr><td colspan="8">No hay empleados</td></tr>';
            return;
        }
        
        const rows = employees.map(emp => `
            <tr>
                <td>${emp._id?.substring(0, 8) || 'EMP'}</td>
                <td>${emp.firstName} ${emp.lastName}</td>
                <td>${emp.email}</td>
                <td>${emp.department}</td>
                <td>${emp.position}</td>
                <td>$${emp.salary?.toLocaleString() || '0'}</td>
                <td>${emp.status || 'Activo'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" onclick="router.viewEmployee('${emp._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" onclick="router.editEmployee('${emp._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="router.deleteEmployee('${emp._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        tbody.innerHTML = rows;
    }

    // Mostrar formulario de empleado - VERSIÓN CORREGIDA
    showEmployeeForm(employee = null) {
        const isEdit = employee !== null;
        
        const formHTML = `
            <div class="simple-modal">
                <h3>${isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
                <form onsubmit="event.preventDefault(); window.router.saveEmployee(this, ${isEdit ? `'${employee._id}'` : 'null'});">
                    <input type="text" placeholder="Nombre" value="${employee?.firstName || ''}" required>
                    <input type="text" placeholder="Apellido" value="${employee?.lastName || ''}" required>
                    <input type="email" placeholder="Email" value="${employee?.email || ''}" required>
                    <select>
                        <option value="TECNOLOGÍA" ${employee?.department === 'TECNOLOGÍA' ? 'selected' : ''}>Tecnología</option>
                        <option value="OPERACIONES" ${employee?.department === 'OPERACIONES' ? 'selected' : ''}>Operaciones</option>
                        <option value="SERVICIO AL CLIENTE" ${employee?.department === 'SERVICIO AL CLIENTE' ? 'selected' : ''}>Servicio al Cliente</option>
                    </select>
                    <input type="text" placeholder="Posición" value="${employee?.position || ''}" required>
                    <input type="number" placeholder="Salario" value="${employee?.salary || ''}" required>
                    <div>
                        <button type="button" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
                        <button type="submit">${isEdit ? 'Actualizar' : 'Guardar'}</button>
                    </div>
                </form>
            </div>
        `;
        
        // Crear overlay (esto es lo que estaba faltando)
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = formHTML;
        document.body.appendChild(overlay);
    }

    // Guardar empleado
    async saveEmployee(form, employeeId = null) {
        const formData = {
            firstName: form[0].value,
            lastName: form[1].value,
            email: form[2].value,
            department: form[3].value,
            position: form[4].value,
            salary: parseFloat(form[5].value)
        };
        
        try {
            if (employeeId) {
                await apiService.updateEmployee(employeeId, formData);
                alert('✅ Empleado actualizado');
            } else {
                await apiService.createEmployee(formData);
                alert('✅ Empleado creado');
            }
            
            // Cerrar modal y recargar
            const overlay = document.querySelector('.modal-overlay');
            if (overlay) overlay.remove();
            this.loadEmployees();
            
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    }

    // Ver empleado
    async viewEmployee(id) {
        try {
            const employee = await apiService.getEmployeeById(id);
            alert(`👤 ${employee.firstName} ${employee.lastName}\n📧 ${employee.email}\n🏢 ${employee.department}`);
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    }

    // Editar empleado
    async editEmployee(id) {
        try {
            const employee = await apiService.getEmployeeById(id);
            this.showEmployeeForm(employee);
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    }

    // Eliminar empleado
    async deleteEmployee(id) {
        if (confirm('¿Eliminar este empleado?')) {
            try {
                await apiService.deleteEmployee(id);
                alert('✅ Empleado eliminado');
                this.loadEmployees();
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }
    }
}

// Crear instancia global
const router = new Router();

// SOLUCIÓN SIMPLE: Ocultar overlay y mostrar login si no hay token
document.addEventListener('DOMContentLoaded', function() {
    // Ocultar overlay de carga
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            console.log('✅ Overlay ocultado');
        }, 500);
    }
    
    // Verificar si hay token
    const hasToken = localStorage.getItem('jtx_token') || localStorage.getItem('auth_token');
    
    if (!hasToken) {
        console.log('⚠️ No hay token, mostrando formulario de login');
        // Esperar un momento para que se cargue showLoginForm
        setTimeout(() => {
            if (typeof window.showLoginForm === 'function') {
                window.showLoginForm();
            } else {
                console.error('❌ showLoginForm no disponible');
                // Mostrar formulario manualmente si no funciona
                const pageContent = document.getElementById('page-content');
                if (pageContent) {
                    pageContent.innerHTML = `
                        <div style="max-width: 400px; margin: 100px auto; padding: 30px; background: white; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
                            <h3 style="text-align: center;"><i class="fas fa-sign-in-alt"></i> Iniciar Sesión</h3>
                            <p style="text-align: center; color: #666;">Usa: admin@jtx.com / admin123</p>
                            <button onclick="window.location.reload()" style="width: 100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 5px; margin-top: 20px;">
                                Recargar para intentar de nuevo
                            </button>
                        </div>
                    `;
                }
            }
        }, 100);
    } else {
        console.log('✅ Token encontrado, navegando a dashboard');
        const initialRoute = window.location.hash.substring(1) || 'dashboard';
        router.navigate(initialRoute);
    }
});

// Configurar navegación del menú
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = e.currentTarget.dataset.route;
        if (route) {
            router.navigate(route);
        }
    });
});

console.log("✅ Router completamente cargado");

// Debug adicional
console.log("🔄 Router listo para usar");
console.log("📁 Rutas disponibles:", Object.keys(router.routes));

// Exponer router globalmente
window.router = router;

// Función de prueba rápida
window.testEmployees = function() {
    console.log("🧪 Probando página de empleados...");
    router.navigate('employees');
    setTimeout(() => {
        const table = document.querySelector('.data-table');
        const buttons = document.querySelectorAll('.btn-action');
        console.log("📊 Tabla encontrada:", !!table);
        console.log("🎯 Botones encontrados:", buttons.length);
        if (table) {
            console.log("🔍 Filas en tabla:", table.querySelectorAll('tr').length);
        }
    }, 500);
};

// ==================== FUNCIONES DE DEBUG ====================

// Función para debuggear empleados
window.debugEmployees = function() {
    console.log("🚀 DEBUG: Navegando a empleados...");
    router.navigate('employees');
    
    // Verificar después de 1 segundo
    setTimeout(() => {
        console.log("🔍 DEBUG: Verificando página...");
        const pageContent = document.getElementById('page-content');
        console.log("- page-content:", pageContent);
        if (pageContent) {
            console.log("- HTML interno (primeros 500 chars):", pageContent.innerHTML.substring(0, 500) + "...");
        } else {
            console.log("- page-content NO encontrado");
        }
        
        const table = document.querySelector('.data-table');
        console.log("- Tabla encontrada:", !!table);
        
        if (table) {
            const buttons = table.querySelectorAll('.btn-action');
            console.log("- Botones encontrados:", buttons.length);
            console.log("- Filas en tabla:", table.querySelectorAll('tr').length);
        }
    }, 1000);
};

console.log("✅ debugEmployees function added");

// Función para mostrar/ocultar columnas y hacer visible la columna de acciones
window.showActionsColumn = function() {
    const table = document.querySelector('.data-table');
    if (!table) {
        alert("No se encontró la tabla");
        return;
    }
    
    // Encontrar la columna de acciones
    const actionColumn = table.querySelector('th:last-child');
    const actionCells = table.querySelectorAll('td:last-child');
    
    if (actionColumn) {
        // Hacer scroll a la derecha
        const container = document.querySelector('.table-container');
        if (container) {
            container.scrollLeft = container.scrollWidth;
        }
        
        // Resaltar la columna
        actionColumn.style.backgroundColor = '#ffeb3b';
        actionColumn.style.color = '#000';
        
        actionCells.forEach(cell => {
            cell.style.backgroundColor = '#fffde7';
        });
        
        alert("✅ Columna de acciones resaltada. Haz scroll horizontal para verla.");
    } else {
        alert("❌ No se encontró la columna de acciones");
    }
};

console.log("✅ showActionsColumn function added");