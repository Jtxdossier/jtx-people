const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno desde la raíz del proyecto
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar timeouts para prevenir "connection reset"
app.use((req, res, next) => {
    req.setTimeout(30000); // 30 segundos
    res.setTimeout(30000);
    next();
});

// Conectar a MongoDB Atlas
console.log('🔌 Conectando a MongoDB Atlas...');

// Cargar URI desde variable de entorno o usar valor por defecto
const mongodbUri = process.env.MONGODB_ATLAS_URI || 
                   "mongodb+srv://jtxadmin:JTX-People-Secure-2024@cluster0.mpzfkx2.mongodb.net/jtxpeople?retryWrites=true&w=majority";

console.log("🔗 URI MongoDB:", mongodbUri ? "Configurada" : "No configurada");

mongoose.connect(mongodbUri, {
    serverSelectionTimeoutMS: 10000, // 10 segundos para selección de servidor
    socketTimeoutMS: 45000, // 45 segundos para timeout de socket
})
.then(() => {
    console.log('✅ MongoDB Atlas conectado exitosamente');
    
    // Crear usuario admin por defecto si no existe
    createDefaultAdmin();
})
.catch((err) => {
    console.error('❌ Error conectando a MongoDB Atlas:', err.message);
    console.log('📝 Usando base de datos en memoria como respaldo...');
});

// Esquema de usuario para MongoDB
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'employee'],
        default: 'employee'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Modelo de usuario
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Base de datos en memoria como respaldo (solo si MongoDB falla)
const backupUsers = [
    {
        id: 1,
        email: 'admin@jtx.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.PYJc6H8.DBlEhmX/3KQqQ9LfslU.Yq', // admin123
        name: 'Administrador',
        role: 'admin'
    },
    {
        id: 2,
        email: 'empleado@jtx.com',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.PYJc6H8.DBlEhmX/3KQqQ9LfslU.Yq', // empleado123
        name: 'Empleado Ejemplo',
        role: 'employee'
    }
];

// Función para crear usuario admin por defecto
async function createDefaultAdmin() {
    try {
        const adminExists = await User.findOne({ email: 'admin@jtx.com' });
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            const adminUser = new User({
                email: 'admin@jtx.com',
                password: hashedPassword,
                name: 'Administrador',
                role: 'admin'
            });
            
            await adminUser.save();
            console.log('👑 Usuario admin creado por defecto');
        }
    } catch (error) {
        console.error('Error creando usuario admin:', error.message);
    }
}

// Health check
app.get('/', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
        service: 'Auth Service',
        status: 'OK',
        version: '1.0.0',
        database: dbStatus,
        endpoints: ['POST /auth/login', 'GET /health']
    });
});

// Login endpoint - CONEXIÓN A MONGODB ATLAS
app.post('/auth/login', async (req, res) => {
    try {
        // Validar que tenemos body
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Cuerpo de la solicitud vacío'
            });
        }
        
        const { email, password } = req.body;
        
        console.log(`📝 Intento de login para: ${email || 'sin email'}`);
        
        // Validaciones básicas
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email y contraseña son requeridos'
            });
        }
        
        // Verificar si MongoDB está conectado
        const isMongoConnected = mongoose.connection.readyState === 1;
        
        let user;
        let useBackupDB = false;
        
        if (isMongoConnected) {
            // Buscar en MongoDB Atlas
            try {
                user = await User.findOne({ email: email.toLowerCase() }).select('+password');
                console.log(`🔍 Búsqueda en MongoDB para: ${email}`);
            } catch (dbError) {
                console.error('Error consultando MongoDB:', dbError.message);
                useBackupDB = true;
            }
        } else {
            console.log('⚠️ MongoDB desconectado, usando base de datos de respaldo');
            useBackupDB = true;
        }
        
        // Si MongoDB falla, usar base de datos de respaldo
        if (useBackupDB) {
            user = backupUsers.find(u => u.email === email.toLowerCase());
        }
        
        if (!user) {
            console.log(`❌ Usuario no encontrado: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }
        
        // Verificar contraseña
        let isValidPassword = false;
        
        if (isMongoConnected && !useBackupDB) {
            // Comparar con bcrypt para MongoDB
            isValidPassword = await bcrypt.compare(password, user.password);
        } else {
            // Para backup users (contraseña es 'admin123' o 'empleado123' hasheada)
            if (email === 'admin@jtx.com') {
                isValidPassword = password === 'admin123';
            } else if (email === 'empleado@jtx.com') {
                isValidPassword = password === 'empleado123';
            } else {
                isValidPassword = false;
            }
        }
        
        if (!isValidPassword) {
            console.log(`❌ Contraseña incorrecta para: ${email}`);
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }
        
        // Generar token JWT
        const token = jwt.sign(
            {
                id: user._id || user.id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET || 'jtx-super-secret-key-change-in-production-2024',
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );
        
        console.log(`✅ Login exitoso: ${email} (${useBackupDB ? 'respaldo' : 'MongoDB'})`);
        
        // Preparar respuesta
        const userResponse = {
            id: user._id || user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        
        res.json({
            success: true,
            message: 'Login exitoso',
            token: token,
            user: userResponse,
            expiresIn: 86400, // 24h en segundos
            database: useBackupDB ? 'backup' : 'mongodb'
        });
        
    } catch (error) {
        console.error('🔥 Error crítico en login:', error);
        
        // Manejar error específico de JSON parse
        if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
            return res.status(400).json({
                success: false,
                error: 'JSON inválido en la solicitud'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Health endpoint para gateway
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
        status: 'OK',
        service: 'Auth Service',
        database: dbStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Ruta para ver usuarios disponibles (solo desarrollo)
if (process.env.NODE_ENV === 'development') {
    app.get('/debug/users', async (req, res) => {
        try {
            const isMongoConnected = mongoose.connection.readyState === 1;
            
            if (isMongoConnected) {
                const users = await User.find({}, '-password');
                res.json({
                    source: 'mongodb',
                    users: users
                });
            } else {
                const safeUsers = backupUsers.map(user => ({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }));
                res.json({
                    source: 'backup',
                    users: safeUsers
                });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Ruta para crear usuario de prueba
    app.post('/debug/create-user', async (req, res) => {
        try {
            const { email, password, name, role } = req.body;
            
            if (!email || !password || !name) {
                return res.status(400).json({ error: 'Faltan datos requeridos' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const newUser = new User({
                email: email.toLowerCase(),
                password: hashedPassword,
                name: name,
                role: role || 'employee'
            });
            
            await newUser.save();
            
            res.json({
                success: true,
                message: 'Usuario creado',
                user: {
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada'
    });
});

// Middleware de error global
app.use((err, req, res, next) => {
    console.error('💥 Error no manejado:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
    });
});

// Configurar el servidor con timeouts apropiados
const server = app.listen(PORT, () => {
    console.log(`\n✅ Auth Service corriendo en http://localhost:${PORT}`);
    console.log('🔐 Endpoints disponibles:');
    console.log(`   POST /auth/login          - Login de usuarios`);
    console.log(`   GET  /health              - Health check`);
    console.log(`   GET  /debug/users         - Ver usuarios (solo dev)`);
    console.log(`   POST /debug/create-user   - Crear usuario (solo dev)\n`);
    
    console.log('👤 Usuarios de respaldo disponibles:');
    console.log('   admin@jtx.com / admin123');
    console.log('   empleado@jtx.com / empleado123\n');
});

// Configurar timeouts del servidor
server.keepAliveTimeout = 120000; // 120 segundos
server.headersTimeout = 120000;

// Eventos de conexión de MongoDB
mongoose.connection.on('connected', () => {
    console.log('📊 MongoDB Atlas: Conexión establecida');
});

mongoose.connection.on('error', (err) => {
    console.error('📊 MongoDB Atlas Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('📊 MongoDB Atlas: Desconectado');
});

// Manejar señales de cierre
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recibido. Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor HTTP cerrado.');
    });
    
    mongoose.connection.close(false, () => {
        console.log('✅ Conexión MongoDB cerrada.');
        process.exit(0);
    });
});