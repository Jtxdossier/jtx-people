const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.USERS_PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Base de datos de usuarios (simulada)
let users = [
    {
        id: '1',
        name: 'Admin Principal',
        email: 'admin@jtx.com',
        role: 'admin',
        department: 'IT',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: '2',
        name: 'Juan Pérez',
        email: 'juan@jtx.com',
        role: 'manager',
        department: 'Ventas',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: '3',
        name: 'María García',
        email: 'maria@jtx.com',
        role: 'user',
        department: 'Marketing',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

// Rutas de usuarios
app.get('/users', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const resultUsers = users.slice(startIndex, endIndex);
    
    res.json({
        data: resultUsers,
        pagination: {
            page,
            limit,
            total: users.length,
            totalPages: Math.ceil(users.length / limit)
        }
    });
});

app.get('/users/:id', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(user);
});

app.post('/users', (req, res) => {
    const { name, email, role, department } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }
    
    if (users.some(u => u.email === email)) {
        return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    const newUser = {
        id: (users.length + 1).toString(),
        name,
        email,
        role: role || 'user',
        department: department || 'General',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
    };
    
    users.push(newUser);
    
    res.status(201).json({
        message: 'Usuario creado exitosamente',
        user: newUser
    });
});

app.put('/users/:id', (req, res) => {
    const userIndex = users.findIndex(u => u.id === req.params.id);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const updatedUser = {
        ...users[userIndex],
        ...req.body,
        updatedAt: new Date()
    };
    
    users[userIndex] = updatedUser;
    
    res.json({
        message: 'Usuario actualizado exitosamente',
        user: updatedUser
    });
});

app.delete('/users/:id', (req, res) => {
    const userIndex = users.findIndex(u => u.id === req.params.id);
    
    if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const deletedUser = users[userIndex];
    users.splice(userIndex, 1);
    
    res.json({ 
        message: 'Usuario eliminado exitosamente',
        user: deletedUser
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'users-service',
        timestamp: new Date().toISOString(),
        totalUsers: users.length
    });
});

app.listen(PORT, () => {
    console.log(`✅ Users Service corriendo en http://localhost:${PORT}`);
});