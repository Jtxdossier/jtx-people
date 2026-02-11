const { MongoClient } = require('mongodb');
require('dotenv').config();

// Datos de ejemplo para 130 empleados
const departments = [
  'Recursos Humanos', 'Tecnología', 'Ventas', 'Marketing', 
  'Finanzas', 'Operaciones', 'Servicio al Cliente', 'Logística'
];

const positions = [
  'Desarrollador Senior', 'Desarrollador Junior', 'Analista de Sistemas',
  'Gerente de Proyecto', 'Diseñador UX/UI', 'Administrador de BD',
  'Especialista en Marketing', 'Analista Financiero', 'Representante de Ventas',
  'Coordinador de Operaciones', 'Especialista en RH', 'Gerente de Departamento'
];

function generateRandomEmployee(index) {
  const firstNames = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Laura', 'Pedro', 'Sofía'];
  const lastNames = ['García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Pérez', 'Sánchez'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const department = departments[Math.floor(Math.random() * departments.length)];
  const position = positions[Math.floor(Math.random() * positions.length)];
  
  return {
    employeeId: `EMP-${(1000 + index).toString().padStart(4, '0')}`,
    dni: `${Math.floor(Math.random() * 90000000) + 10000000}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@empresa.com`,
    phone: `+34 ${600000000 + index}`,
    department,
    position,
    hireDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
    salary: Math.floor(Math.random() * 50000) + 30000,
    status: Math.random() > 0.1 ? 'active' : 'inactive',
    address: {
      street: `Calle ${index + 1}`,
      city: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla'][Math.floor(Math.random() * 4)],
      state: 'España',
      zipCode: `${28000 + Math.floor(Math.random() * 1000)}`
    },
    emergencyContact: {
      name: `Contacto ${firstName}`,
      phone: `+34 ${700000000 + index}`,
      relationship: ['Cónyuge', 'Padre', 'Madre', 'Hermano'][Math.floor(Math.random() * 4)]
    }
  };
}

async function seedDatabase() {
  const mongoUri = process.env.MONGODB_ATLAS_URI;
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db();
    const employeesCollection = db.collection('employees');
    
    console.log('🌱 Iniciando seed de base de datos...');
    
    // Limpiar colección existente
    await employeesCollection.deleteMany({});
    console.log('✅ Colección limpiada');
    
    // Generar 130 empleados
    const employees = [];
    for (let i = 1; i <= 130; i++) {
      employees.push({
        ...generateRandomEmployee(i),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Insertar en lote
    const result = await employeesCollection.insertMany(employees);
    console.log(`✅ ${result.insertedCount} empleados insertados`);
    
    // Verificar inserción
    const count = await employeesCollection.countDocuments();
    console.log(`📊 Total empleados en BD: ${count}`);
    
    // Mostrar estadísticas
    const stats = await employeesCollection.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\n📈 Distribución por departamento:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} empleados`);
    });
    
    console.log('\n🎉 Seed completado exitosamente!');
    console.log('💡 Para probar: curl http://localhost:3003/employees');
    
  } catch (error) {
    console.error('❌ Error en seed:', error);
  } finally {
    await client.close();
  }
}

seedDatabase();