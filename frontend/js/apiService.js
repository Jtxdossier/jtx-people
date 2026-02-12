// API Service - Conexión con microservicios
console.log("🌐 apiService.js cargado");

class ApiService {
    constructor() {
        // Detectar si estamos en desarrollo local o producción
        const isLocalhost = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            // DESARROLLO LOCAL
            this.baseURL = "http://localhost:3000/api";
            console.log("🌐 MODO: Desarrollo local - API:", this.baseURL);
        } else {
            // PRODUCCIÓN (Render.com)
            this.baseURL = "https://jtx-gateway.onrender.com/api";
            console.log("🌐 MODO: Producción - API:", this.baseURL);
        }
        
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

    // Obtener todos los empleados
    async getEmployees(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = `${this.baseURL}/employees${queryString ? '?' + queryString : ''}`;
            
            const response = await fetch(url, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Error al obtener empleados');
            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Obtener empleado por ID
    async getEmployeeById(id) {
        try {
            const response = await fetch(`${this.baseURL}/employees/${id}`, {
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Empleado no encontrado');
            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Crear empleado
    async createEmployee(employeeData) {
        try {
            const response = await fetch(`${this.baseURL}/employees`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(employeeData)
            });
            
            if (!response.ok) throw new Error('Error al crear empleado');
            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Actualizar empleado
    async updateEmployee(id, employeeData) {
        try {
            const response = await fetch(`${this.baseURL}/employees/${id}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(employeeData)
            });
            
            if (!response.ok) throw new Error('Error al actualizar empleado');
            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Eliminar empleado (inactivar)
    async deleteEmployee(id) {
        try {
            const response = await fetch(`${this.baseURL}/employees/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            
            if (!response.ok) throw new Error('Error al eliminar empleado');
            return await response.json();
        } catch (error) {
            return this.handleError(error);
        }
    }
}

// Crear instancia global
const apiService = new ApiService();
window.apiService = apiService;
console.log("✅ apiService instanciado");
