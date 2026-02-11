// AUTH.JS - VERSIÓN INTEGRADA CON ROUTER
console.log("✅ auth.js cargado");

class AuthManager {
    constructor() {
        console.log("✅ AuthManager creado");
        this.apiGateway = "http://localhost:3000/api";
    }

    async login(email, password) {
        console.log("🔐 Login intentado:", email);
        try {
            const response = await fetch(this.apiGateway + "/auth/login", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            console.log("📊 Status:", response.status);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: "Error desconocido" }));
                return { success: false, error: error.error || "Error en login" };
            }

            const data = await response.json();
            console.log("✅ Login exitoso");

            // Guardar token y usuario
            localStorage.setItem("jtx_token", data.token);
            localStorage.setItem("jtx_user", JSON.stringify(data.user));

            // ACTUALIZAR UI INMEDIATAMENTE
            this.updateUIAfterLogin(data.user);
            
            // Mostrar mensaje de éxito
                       alert("✅ ¡Login exitoso! Redirigiendo...");
            // Recargar página para actualizar interfaz completa
            setTimeout(() => {
                window.location.reload();
            }, 500);
            // Recargar para aplicar cambios
            setTimeout(() => location.reload(), 1000);

            return { success: true, data };
        } catch (error) {
            console.error("❌ Error:", error);
            alert("❌ Error de conexión: " + error.message);
            return { success: false, error: error.message };
        }
    }

    // FUNCIÓN MEJORADA: Actualizar UI después de login
    updateUIAfterLogin(user) {
        console.log("🔄 Actualizando UI para:", user.email);
        
        // 1. Ocultar formulario de login
        const authForms = document.getElementById('auth-forms');
        if (authForms) {
            authForms.style.display = 'none';
        }
        
        // 2. Mostrar dashboard CON ROUTER
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
            
            // Inicializar router si existe
            if (window.router) {
                window.router.init();
            } else {
                // Fallback si el router no está cargado
                dashboard.innerHTML = `
                    <div class="dashboard-content">
                        <h3><i class="fas fa-user-check"></i> Bienvenido, ${user.name}!</h3>
                        <div class="user-card">
                            <p><strong>Email:</strong> ${user.email}</p>
                            <p><strong>Rol:</strong> ${user.role}</p>
                            <p><strong>ID:</strong> ${user.id}</p>
                        </div>
                        <div class="dashboard-actions">
                            <button class="btn btn-primary" onclick="window.showUsersPanel()">
                                <i class="fas fa-users"></i> Gestionar Usuarios
                            </button>
                            <button class="btn btn-secondary" onclick="window.auth.logout()">
                                <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                            </button>
                        </div>
                    </div>
                `;
            }
        }
        
        // 3. Actualizar navbar
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <span class="user-email">
                    <i class="fas fa-user-circle"></i> ${user.email}
                </span>
                <button class="btn-logout" onclick="window.auth.logout()">
                    <i class="fas fa-sign-out-alt"></i> Salir
                </button>
            `;
        }
    }

    // Verificar si ya está autenticado al cargar la página
    checkAuthStatus() {
        const token = localStorage.getItem("jtx_token");
        const userStr = localStorage.getItem("jtx_user");
        
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                console.log("👤 Usuario ya autenticado:", user.email);
                this.updateUIAfterLogin(user);
                return true;
            } catch (e) {
                console.error("Error parsing user data:", e);
                this.clearAuth();
            }
        }
        return false;
    }

    // Cerrar sesión
    logout() {
        if (confirm("¿Estás seguro de cerrar sesión?")) {
            this.clearAuth();
            alert("Sesión cerrada correctamente");
            location.reload();
        }
    }

    // Limpiar autenticación
    clearAuth() {
        localStorage.removeItem("jtx_token");
        localStorage.removeItem("jtx_user");
    }
}

// INICIALIZACIÓN GLOBAL
console.log("🔧 Asignando window.auth...");
window.auth = new AuthManager();
console.log("✅ window.auth asignado:", !!window.auth);

// FUNCIÓN PARA MOSTRAR FORMULARIO DE LOGIN
window.showLoginForm = function() {
    console.log("📝 Mostrando formulario...");
    const authForms = document.getElementById("auth-forms");
    if (authForms) {
        authForms.innerHTML = `
            <div class="login-form">
                <h3><i class="fas fa-sign-in-alt"></i> Iniciar Sesión</h3>
                <div class="form-group">
                    <input type="email" id="email" placeholder="Correo electrónico" 
                           value="admin@jtx.com" class="form-input">
                </div>
                <div class="form-group">
                    <input type="password" id="password" placeholder="Contraseña" 
                           value="admin123" class="form-input">
                </div>
                <button id="login-btn" class="btn-login">
                    <i class="fas fa-lock"></i> Iniciar Sesión
                </button>
                <p class="form-note">Usa: admin@jtx.com / admin123</p>
            </div>
        `;

        // Asignar evento al botón
        document.getElementById("login-btn").onclick = async function() {
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            console.log("🖱️ Botón clickeado:", email);
            
            if (window.auth && window.auth.login) {
                const result = await window.auth.login(email, password);
                console.log("Resultado del login:", result);
            } else {
                alert("❌ ERROR: Sistema de autenticación no disponible");
            }
        };
    }
};

// FUNCIÓN PARA MOSTRAR PANEL DE USUARIOS (placeholder)
window.showUsersPanel = function() {
    alert("🚀 Función de gestión de usuarios - Próximamente");
};

// EJECUTAR AL CARGAR LA PÁGINA
console.log("⏳ Configurando carga automática...");
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        console.log("✅ DOM cargado");
        // Verificar si ya está autenticado
        if (!window.auth.checkAuthStatus()) {
            window.showLoginForm();
        }
    });
} else {
    console.log("✅ DOM ya cargado");
    setTimeout(() => {
        if (!window.auth.checkAuthStatus()) {
            window.showLoginForm();
        }
    }, 100);
}

console.log("✅ auth.js completamente cargado");