const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// inicio aqui actualiza Actualiza auth-service para usar Atlas
// Edita backend/auth-service/server.js:

// Al inicio del archivo, después de los requires
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Conexión a MongoDB Atlas
const mongoUri = process.env.MONGODB_ATLAS_URI;
let db;
async function connectToDatabase() {
  if (db) return db;
  
  const client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db();
  console.log('✅ Auth Service conectado a MongoDB Atlas');
  return db;
}
// Luego modifica donde guardas usuarios, usa:
const database = await connectToDatabase();
const usersCollection = database.collection('users');

// hasta aqui actualiza Actualiza auth-service para usar Atlas
// Edita backend/auth-service/server.js:


const app = express();

const PORT = process.env.AUTH_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/login', limiter);

// Base de datos simulada
const users = [
    {
        id: '1',
        email: 'admin@jtx.com',
        password: bcrypt.hashSync('admin123', 10),
        name: 'Administrador',
        role: 'admin'
    }
];

// Rutas
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }
        
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            id: (users.length + 1).toString(),
            email,
            password: hashedPassword,
            name,
            role: 'user',
            createdAt: new Date()
        };
        
        users.push(newUser);
        
        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET || 'jtx-secret-key',
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role
            }
        });
        
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'jtx-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/auth/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jtx-secret-key');
        
        const user = users.find(u => u.id === decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        });
        
    } catch (error) {
        console.error('Error en verificación:', error);
        res.status(401).json({ error: 'Token inválido' });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'auth-service',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`✅ Auth Service corriendo en http://localhost:${PORT}`);
});