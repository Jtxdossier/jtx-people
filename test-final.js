const { MongoClient } = require('mongodb');

// PEGA AQUÍ tu connection string COMPLETO con contraseña
const uri = "mongodb+srv://jtxadmin:JTX-People-Secure-2024@cluster0.mpzfkx2.mongodb.net/?appName=Cluster0";

async function test() {
  console.log("🔌 Probando conexión a tu Cluster0...");
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("✅ ¡CONEXIÓN EXITOSA A ATLAS!");
    
    // Crear base de datos para tu proyecto
    const db = client.db('jtxpeople');
    console.log(`📊 Base de datos 'jtxpeople' lista`);
    
    // Crear colección de prueba
    const testCol = db.collection('test_connection');
    await testCol.insertOne({ 
      message: 'Conexión exitosa',
      timestamp: new Date(),
      project: 'JTX People'
    });
    
    console.log("✅ Escritura en Atlas funcionando");
    
    // Leer para verificar
    const result = await testCol.findOne({});
    console.log("✅ Lectura verificada:", result.message);
    
    // Limpiar
    await testCol.deleteMany({});
    console.log("✅ Limpieza completada");
    
    console.log("\n🎉 ¡MONGODB ATLAS CONFIGURADO CORRECTAMENTE!");
    console.log("📍 Cluster: Cluster0 (M0 Sandbox - FREE)");
    console.log("👤 Usuario: jtxadmin");
    console.log("💾 Base de datos: jtxpeople");
    
  } catch (error) {
    console.log("❌ ERROR:", error.message);
    console.log("\n💡 SOLUCIÓN:");
    console.log("1. Verifica que la contraseña sea correcta");
    console.log("2. URL-encode caracteres especiales (! @ # $)");
    console.log("3. Espera 2-3 minutos después de crear usuario");
  } finally {
    await client.close();
  }
}

test();