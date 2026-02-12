const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ==============================================
// PROXY CONFIGURATION - DEBE IR ANTES DE express.json()
// ==============================================

// Configuración de servicios

// agregado
// Configuración de servicios (agregar employees)
const services = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    users: process.env.USERS_SERVICE_URL || 'http://localhost:3002',
    employees: process.env.EMPLOYEES_SERVICE_URL || 'http://localhost:3003',
};

console.log('🔧 Gateway - Servicios configurados:');
console.log(`   Auth: ${services.auth}`);
console.log(`   Users: ${services.users}`);
console.log(`   Employees: ${services.employees}`);
//cambio



// Proxy para auth service
app.use('/api/auth', createProxyMiddleware({
    target: services.auth,
    changeOrigin: true,
    proxyTimeout: 30000,
    timeout: 30000,
    headers: {
        'Connection': 'keep-alive'
    },
    pathRewrite: {
        '^/api/auth': '/auth'
    },
    onProxyReq: (proxyReq, req, res) => {
    console.log(`[AUTH PROXY] ${req.method} ${req.originalUrl} → ${services.auth}${proxyReq.path}`);
    if (req.body) {
        let bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
    }
},
    onError: (err, req, res) => {
        console.error('[AUTH PROXY ERROR]', err);
        res.status(500).json({ 
            error: 'Error de conexión con Auth Service',
            details: err.message 
        });
    }
}));

// Proxy para users service (usando /api/people como en frontend)
app.use('/api/people', createProxyMiddleware({
    target: services.users,
    changeOrigin: true,
    pathRewrite: {
        '^/api/people': '/people'
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[USERS PROXY] ${req.method} ${req.originalUrl} → ${services.users}${proxyReq.path}`);
    },
    onError: (err, req, res) => {
        console.error('[USERS PROXY ERROR]', err);
        res.status(500).json({ 
            error: 'Error de conexión con Users Service',
            details: err.message 
        });
    }
}));

//otro proxi

// Proxy para employees service
app.use('/api/employees', createProxyMiddleware({
    target: services.employees,
    changeOrigin: true,
    proxyTimeout: 30000,
    timeout: 30000,
    headers: {
        'Connection': 'keep-alive'
    },
    pathRewrite: {
        '^/api/employees': '/employees'  // /api/employees/* → /* 
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[EMPLOYEES PROXY] ${req.method} ${req.originalUrl} → ${services.employees}${proxyReq.path}`);
        if (req.body) {
            let bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    onError: (err, req, res) => {
        console.error('[EMPLOYEES PROXY ERROR]', err);
        res.status(500).json({ 
            error: 'Error de conexión con Employees Service',
            details: err.message 
        });
    }
}));


// También mantener /api/users para compatibilidad si es necesario
app.use('/api/users', createProxyMiddleware({
    target: services.users,
    changeOrigin: true,
    pathRewrite: {
        '^/api/users': ''
    }
}));

// ==============================================
// CONTINÚA EL RESTO DEL CÓDIGO
// ==============================================

// IMPORTANTE: express.json() DESPUÉS de los proxies
app.use(express.json());

// Middleware de logging detallado
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('  Headers:', req.headers['content-type']);
    console.log('  Origin:', req.headers['origin']);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        gateway: 'JTX People API Gateway',
        timestamp: new Date().toISOString(),
        services: Object.keys(services),
        endpoints: {
            auth: '/api/auth/* → ' + services.auth + '/auth/*',
            users: '/api/people/* → ' + services.users + '/people/*'
        }
    });
});

// Ruta principal
app.get('/api', (req, res) => {
    res.json({
        message: 'Bienvenido a JTX People API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth/*',
            users: '/api/people/*',
            health: '/health'
        },
        mappings: {
            'POST /api/auth/login': '→ ' + services.auth + '/auth/login',
            'GET /api/people': '→ ' + services.users + '/people'
        }
    });
});

// ==============================================
// DIAGNÓSTICO ENDPOINTS
// ==============================================

// Endpoint para diagnóstico
app.get('/api/debug/routes', (req, res) => {
    res.json({
        gateway: `http://localhost:${PORT}`,
        services: services,
        mappings: [
            {
                frontend: 'POST /api/auth/login',
                gateway: 'POST /api/auth/login',
                target: `POST ${services.auth}/auth/login`,
                status: '✓ Configurado'
            },
            {
                frontend: 'GET /api/people',
                gateway: 'GET /api/people', 
                target: `GET ${services.users}/people`,
                status: '✓ Configurado'
            }
        ],
        testEndpoints: [
            `curl -X POST http://localhost:${PORT}/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@jtx.com","password":"admin123"}'`,
            `curl http://localhost:${PORT}/api/people`
        ]
    });
});

// Test endpoint directo
app.post('/api/test/login', async (req, res) => {
    try {
        const response = await fetch(`${services.auth}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json({
            via: 'Direct test from Gateway',
            authService: services.auth,
            response: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.url,
        availableRoutes: [
            '/health',
            '/api',
            '/api/debug/routes',
            '/api/auth/*',
            '/api/people/*',
            '/api/users/*'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Gateway error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`✅ API Gateway corriendo en http://localhost:${PORT}`);
    console.log(`=========================================`);
    console.log('🔗 Servicios configurados:');
    console.log(`   Auth Service:  ${services.auth}`);
    console.log(`   Users Service: ${services.users}`);
    console.log('');
    console.log('📡 Rutas configuradas:');
    console.log(`   POST /api/auth/login  →  ${services.auth}/auth/login`);
    console.log(`   GET  /api/people      →  ${services.users}/people`);
    console.log(`   GET  /api/users/*     →  ${services.users}/*`);
    console.log('');
    console.log('🩺 Endpoints de diagnóstico:');
    console.log(`   GET  /health          - Health check`);
    console.log(`   GET  /api/debug/routes - Ver todas las rutas`);
    console.log(`   POST /api/test/login  - Test directo de login`);
    console.log(`=========================================`);
    console.log('💡 Para probar:');
    console.log(`   curl -X POST http://localhost:${PORT}/api/auth/login \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -d '{"email":"admin@jtx.com","password":"admin123"}'`);
    console.log(`=========================================`);

console.log(`   GET/POST /api/employees/* →  ${services.employees}/*`);

});
