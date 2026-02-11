// API Service - Conexión con microservicios
console.log("🌐 apiService.js cargado");

class ApiService {
    constructor() {
        this.baseURL = "http://localhost:3000/api"; // Employees Service
        this.authToken = localStorage.getItem('jtx_token');
    }

    // Headers comunes para todas las peticiones
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        return headers;
    }

    // Manejo de errores
    handleError(error) {
        console.error('API Error:', error);
        throw error;
    }

    // ==================== EMPLOYEES API ====================

    // Obtener todos los empleados (con paginación y filtros)
    async getEmployees(page = 1, limit = 20, filters = {}) {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...filters
            });

            const response = await fetch(`${this.baseURL}/employees?${queryParams}`, {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.handleError(error);
        }
    }

    // Eliminar empleado
    async deleteEmployee(id) {
        try {
            const response = await fetch(`${this.baseURL}/employees/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error eliminando empleado:', error);
            throw error;
        }
    }

    // Obtener estadísticas
    async getDashboardStats() {
        try {
            const response = await fetch(`${this.baseURL}/employees`, {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                totalEmployees: data.pagination?.total || 0,
                activeEmployees: data.statistics?.reduce((sum, dept) => sum + dept.count, 0) || 0,
                totalDepartments: data.metadata?.departments?.length || 0,
                avgSalary: data.statistics?.[0]?.avgSalary || 0
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    // ==================== NUEVOS MÉTODOS ====================

    // Obtener un empleado por ID
    async getEmployeeById(id) {
        try {
            const response = await fetch(`${this.baseURL}/employees/${id}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.error('❌ Error obteniendo empleado:', error);
            throw error;
        }
    }

    // Crear nuevo empleado
    async createEmployee(employeeData) {
        try {
            const response = await fetch(`${this.baseURL}/employees`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(employeeData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error creando empleado:', error);
            throw error;
        }
    }

    // Actualizar empleado existente
    async updateEmployee(id, employeeData) {
        try {
            const response = await fetch(`${this.baseURL}/employees/${id}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(employeeData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error actualizando empleado:', error);
            throw error;
        }
    }
}

// Crear instancia global
const apiService = new ApiService();
