const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// ==============================================
// CONFIGURACIÓN DE SEGURIDAD Y MIDDLEWARE
// ==============================================

// Rate limiting para prevenir abusos
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: 'Demasiadas peticiones desde esta IP, intenta más tarde.'
});

app.use(helmet());
app.use(express.json());

// ==============================================
// CONFIGURACIÓN CORS PARA DESARROLLO Y PRODUCCIÓN
// ==============================================

const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    process.env.FRONTEND_URL || 'https://jtx-people.netlify.app',
    'https://*.netlify.app'
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Permitir requests sin origin (Postman, curl, etc.)
        if (!origin) return callback(null, true);
        
        // Verificar si el origen está permitido
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed.includes('*')) {
                const pattern = allowed.replace('*', '.*');
                return new RegExp(pattern).test(origin);
            }
            return allowed === origin;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`🚫 CORS: Origen no permitido: ${origin}`);
            callback(new Error(`Origen no permitido por CORS: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
}));

console.log('🔒 CORS configurado con orígenes:', allowedOrigins);

// app.use(express.json());
app.use(limiter);

// ==============================================
// CONEXIÓN A MONGODB ATLAS
// ==============================================

const mongoUri = process.env.MONGODB_ATLAS_URI;
let db;
let client;

async function connectToDatabase() {
  if (db) return { db, client };
  
  try {
    client = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority'
    });
    
    await client.connect();
    db = client.db();
    
    console.log(`✅ Employees Service conectado a MongoDB Atlas`);
    console.log(`📊 Base de datos: ${db.databaseName}`);
    
    // Crear índices optimizados
    await createIndexes(db);
    
    return { db, client };
  } catch (error) {
    console.error('❌ Error conectando a MongoDB Atlas:', error);
    throw error;
  }
}

async function createIndexes(database) {
  const employees = database.collection('employees');
  
  // Índices para búsquedas rápidas
  await employees.createIndex({ employeeId: 1 }, { unique: true, name: 'idx_employeeId_unique' });
  await employees.createIndex({ email: 1 }, { unique: true, name: 'idx_email_unique' });
  await employees.createIndex({ dni: 1 }, { unique: true, sparse: true, name: 'idx_dni_unique' });
  await employees.createIndex({ department: 1, status: 1 }, { name: 'idx_department_status' });
  await employees.createIndex({ lastName: 1, firstName: 1 }, { name: 'idx_name_sort' });
  await employees.createIndex({ hireDate: -1 }, { name: 'idx_hire_date' });
  await employees.createIndex({ salary: 1 }, { name: 'idx_salary' });
  
  // Índice de texto para búsqueda full-text
  await employees.createIndex(
    { 
      firstName: 'text', 
      lastName: 'text', 
      email: 'text',
      department: 'text',
      position: 'text'
    },
    { 
      name: 'idx_text_search',
      weights: {
        firstName: 3,
        lastName: 3,
        email: 2,
        department: 1,
        position: 1
      },
      default_language: 'spanish'
    }
  );
  
  console.log('✅ Índices creados para performance óptimo');
}

// ==============================================
// MIDDLEWARE DE CONEXIÓN A BD
// ==============================================

app.use(async (req, res, next) => {
  try {
    const { db } = await connectToDatabase();
    req.db = db;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error de conexión a la base de datos' });
  }
});

// ==============================================
// VALIDACIONES Y UTILIDADES
// ==============================================

function validateEmployeeData(employee) {
  const errors = [];
  
  if (!employee.firstName || employee.firstName.trim().length < 2) {
    errors.push('Nombre debe tener al menos 2 caracteres');
  }
  
  if (!employee.lastName || employee.lastName.trim().length < 2) {
    errors.push('Apellido debe tener al menos 2 caracteres');
  }
  
  if (!employee.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
    errors.push('Email inválido');
  }
  
  if (!employee.department || employee.department.trim().length === 0) {
    errors.push('Departamento es requerido');
  }
  
  if (!employee.position || employee.position.trim().length === 0) {
    errors.push('Cargo es requerido');
  }
  
  if (employee.salary && (isNaN(employee.salary) || employee.salary < 0)) {
    errors.push('Salario debe ser un número positivo');
  }
  
  return errors;
}

function generateEmployeeId() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EMP-${timestamp}${random}`;
}

// ==============================================
// ENDPOINTS - API REST COMPLETA
// ==============================================

// 1. HEALTH CHECK
app.get('/health', async (req, res) => {
  try {
    await req.db.command({ ping: 1 });
    res.json({
      status: 'OK',
      service: 'Employees Service',
      database: 'MongoDB Atlas Connected',
      timestamp: new Date().toISOString(),
      collections: await req.db.listCollections().toArray()
    });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// 2. OBTENER TODOS LOS EMPLEADOS (con paginación, filtros y ordenamiento)
app.get('/employees', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      department,
      status = 'active',
      sortBy = 'lastName',
      sortOrder = 'asc',
      search
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Construir filtro
    const filter = {};
    
    if (department && department !== 'all') {
      filter.department = department;
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Búsqueda por texto
    if (search && search.trim() !== '') {
      filter.$text = { $search: search };
    }
    
    const employeesCollection = req.db.collection('employees');
    
    // Obtener total para paginación
    const total = await employeesCollection.countDocuments(filter);
    
    // Configurar ordenamiento
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortDirection };
    
    // Obtener datos
    const employees = await employeesCollection
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .toArray();
    
    // Obtener estadísticas
    const stats = await employeesCollection.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          avgSalary: { $avg: '$salary' },
          totalSalary: { $sum: '$salary' }
        }
      }
    ]).toArray();
    
    res.json({
      success: true,
      data: employees,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: {
        department,
        status,
        search
      },
      statistics: stats,
      metadata: {
        totalEmployees: total,
        activeEmployees: await employeesCollection.countDocuments({ ...filter, status: 'active' }),
        departments: await employeesCollection.distinct('department')
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener empleados',
      details: error.message 
    });
  }
});

// 3. OBTENER EMPLEADO POR ID
app.get('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let filter;
    if (ObjectId.isValid(id)) {
      filter = { _id: new ObjectId(id) };
    } else {
      filter = { employeeId: id };
    }
    
    const employeesCollection = req.db.collection('employees');
    const employee = await employeesCollection.findOne(filter);
    
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        error: 'Empleado no encontrado' 
      });
    }
    
    res.json({
      success: true,
      data: employee
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener empleado' 
    });
  }
});

// 4. CREAR NUEVO EMPLEADO
app.post('/employees', async (req, res) => {
  try {
    const employeeData = req.body;
    
    // Validar datos
    const errors = validateEmployeeData(employeeData);
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        errors 
      });
    }
    
    const employeesCollection = req.db.collection('employees');
    
    // Verificar si email ya existe
    const existingEmployee = await employeesCollection.findOne({ 
      email: employeeData.email 
    });
    
    if (existingEmployee) {
      return res.status(409).json({ 
        success: false, 
        error: 'El email ya está registrado' 
      });
    }
    
    // Preparar datos completos
    const completeEmployee = {
      ...employeeData,
      employeeId: generateEmployeeId(),
      status: employeeData.status || 'active',
      hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insertar en la base de datos
    const result = await employeesCollection.insertOne(completeEmployee);
    
    res.status(201).json({
      success: true,
      message: 'Empleado creado exitosamente',
      data: {
        ...completeEmployee,
        _id: result.insertedId
      }
    });
    
  } catch (error) {
    console.error('Error creando empleado:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al crear empleado',
      details: error.message 
    });
  }
});

// 5. ACTUALIZAR EMPLEADO
app.put('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Validar datos de actualización
    const errors = validateEmployeeData(updateData);
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        errors 
      });
    }
    
    let filter;
    if (ObjectId.isValid(id)) {
      filter = { _id: new ObjectId(id) };
    } else {
      filter = { employeeId: id };
    }
    
    const employeesCollection = req.db.collection('employees');
    
    // Verificar si existe
    const existingEmployee = await employeesCollection.findOne(filter);
    if (!existingEmployee) {
      return res.status(404).json({ 
        success: false, 
        error: 'Empleado no encontrado' 
      });
    }
    
    // Verificar si el nuevo email ya existe en otro empleado
    if (updateData.email && updateData.email !== existingEmployee.email) {
      const emailExists = await employeesCollection.findOne({ 
        email: updateData.email,
        _id: { $ne: existingEmployee._id }
      });
      
      if (emailExists) {
        return res.status(409).json({ 
          success: false, 
          error: 'El email ya está registrado en otro empleado' 
        });
      }
    }
    
    // Preparar datos de actualización
    const updatedEmployee = {
      ...updateData,
      updatedAt: new Date()
    };
    
    // Actualizar
    const result = await employeesCollection.updateOne(
      filter,
      { $set: updatedEmployee }
    );
    
    // Obtener empleado actualizado
    const employee = await employeesCollection.findOne(filter);
    
    res.json({
      success: true,
      message: 'Empleado actualizado exitosamente',
      data: employee
    });
    
  } catch (error) {
    console.error('Error actualizando empleado:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al actualizar empleado' 
    });
  }
});

// 6. ELIMINAR/INACTIVAR EMPLEADO (soft delete)
app.delete('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let filter;
    if (ObjectId.isValid(id)) {
      filter = { _id: new ObjectId(id) };
    } else {
      filter = { employeeId: id };
    }
    
    const employeesCollection = req.db.collection('employees');
    
    // Soft delete: marcar como inactivo
    const result = await employeesCollection.updateOne(
      filter,
      { 
        $set: { 
          status: 'inactive',
          updatedAt: new Date(),
          deactivatedAt: new Date()
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Empleado no encontrado' 
      });
    }
    
    res.json({
      success: true,
      message: 'Empleado marcado como inactivo'
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al eliminar empleado' 
    });
  }
});

// 7. BÚSQUEDA AVANZADA
app.get('/employees/search/advanced', async (req, res) => {
  try {
    const { 
      query, 
      department, 
      minSalary, 
      maxSalary,
      hireDateFrom,
      hireDateTo 
    } = req.query;
    
    const filter = {};
    
    // Búsqueda por texto
    if (query) {
      filter.$text = { $search: query };
    }
    
    // Filtros adicionales
    if (department && department !== 'all') {
      filter.department = department;
    }
    
    if (minSalary || maxSalary) {
      filter.salary = {};
      if (minSalary) filter.salary.$gte = parseFloat(minSalary);
      if (maxSalary) filter.salary.$lte = parseFloat(maxSalary);
    }
    
    if (hireDateFrom || hireDateTo) {
      filter.hireDate = {};
      if (hireDateFrom) filter.hireDate.$gte = new Date(hireDateFrom);
      if (hireDateTo) filter.hireDate.$lte = new Date(hireDateTo);
    }
    
    const employeesCollection = req.db.collection('employees');
    const employees = await employeesCollection
      .find(filter)
      .limit(50)
      .toArray();
    
    res.json({
      success: true,
      data: employees,
      count: employees.length,
      filtersApplied: Object.keys(filter).length
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error en búsqueda avanzada' 
    });
  }
});

// 8. ESTADÍSTICAS Y REPORTES
app.get('/employees/stats/summary', async (req, res) => {
  try {
    const employeesCollection = req.db.collection('employees');
    
    const stats = await employeesCollection.aggregate([
      {
        $facet: {
          totalEmployees: [{ $count: 'count' }],
          byDepartment: [
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          salaryStats: [
            { 
              $group: {
                _id: null,
                avgSalary: { $avg: '$salary' },
                maxSalary: { $max: '$salary' },
                minSalary: { $min: '$salary' },
                totalSalary: { $sum: '$salary' }
              }
            }
          ],
          recentHires: [
            { $sort: { hireDate: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]).toArray();
    
    res.json({
      success: true,
      data: stats[0],
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al generar estadísticas' 
    });
  }
});

// 9. EXPORTAR DATOS
app.get('/employees/export/csv', async (req, res) => {
  try {
    const employeesCollection = req.db.collection('employees');
    const employees = await employeesCollection
      .find({})
      .project({
        employeeId: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        department: 1,
        position: 1,
        salary: 1,
        status: 1,
        hireDate: 1
      })
      .toArray();
    
    // Convertir a CSV
    const headers = ['ID', 'Nombre', 'Apellido', 'Email', 'Departamento', 'Cargo', 'Salario', 'Estado', 'Fecha Contratación'];
    const csvRows = employees.map(emp => [
      emp.employeeId,
      emp.firstName,
      emp.lastName,
      emp.email,
      emp.department,
      emp.position,
      emp.salary || '',
      emp.status,
      emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=empleados_export.csv');
    res.send(csvContent);
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Error al exportar datos' 
    });
  }
});

// ==============================================
// ERROR HANDLING
// ==============================================

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    availableEndpoints: [
      'GET  /health',
      'GET  /employees',
      'GET  /employees/:id',
      'POST /employees',
      'PUT  /employees/:id',
      'DELETE /employees/:id',
      'GET  /employees/search/advanced',
      'GET  /employees/stats/summary',
      'GET  /employees/export/csv'
    ]
  });
});

app.use((error, req, res, next) => {
  console.error('Error en servidor:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// ==============================================
// INICIAR SERVIDOR
// ==============================================

async function startServer() {
  try {
    // Conectar a la base de datos primero
    await connectToDatabase();
    
    app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(`✅ Employees Service corriendo en http://localhost:${PORT}`);
      console.log(`📊 Conectado a MongoDB Atlas`);
      console.log(`🔧 Endpoints disponibles:`);
      console.log(`   GET  /health                    - Health check`);
      console.log(`   GET  /employees                 - Listar empleados (paginated)`);
      console.log(`   GET  /employees/:id             - Obtener empleado`);
      console.log(`   POST /employees                 - Crear empleado`);
      console.log(`   PUT  /employees/:id             - Actualizar empleado`);
      console.log(`   DELETE /employees/:id           - Inactivar empleado`);
      console.log(`   GET  /employees/search/advanced - Búsqueda avanzada`);
      console.log(`   GET  /employees/stats/summary   - Estadísticas`);
      console.log(`   GET  /employees/export/csv      - Exportar a CSV`);
      console.log(`=========================================`);
    });
    
  } catch (error) {
    console.error('❌ No se pudo iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejar cierre limpio
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
  process.exit(0);
});

// Iniciar servidor
startServer();
