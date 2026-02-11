const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Configuración de servicios
const services = {
    auth: 'http://localhost:3001',
    users: 'http://localhost:3002',
};

// Middleware de logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        gateway: 'JTX People API Gateway',
        timestamp: new Date().toISOString(),
        services: Object.keys(services)
    });
});

// Proxy para auth service
app.use('/api/auth', createProxyMiddleware({
    target: services.auth,
    changeOrigin: true,
    pathRewrite: {
        '^/api/auth': ''
    }
}));

// Proxy para users service
app.use('/api/users', createProxyMiddleware({
    target: services.users,
    changeOrigin: true,
    pathRewrite: {
        '^/api/users': ''
    }
}));

// Ruta principal
app.get('/api', (req, res) => {
    res.json({
        message: 'Bienvenido a JTX People API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            health: '/health'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.url
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Gateway error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log(`✅ API Gateway corriendo en http://localhost:${PORT}`);
    console.log('🔗 Servicios configurados:');
    console.log(`   Auth Service: ${services.auth}`);
    console.log(`   Users Service: ${services.users}`);
});