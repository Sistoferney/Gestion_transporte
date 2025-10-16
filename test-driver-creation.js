/**
 * Script de prueba para verificar la creación de conductores
 * Ejecutar en la consola del navegador después de hacer login como admin
 */

async function testDriverCreation() {
    console.log('🧪 Iniciando prueba de creación de conductor...');

    // 1. Verificar estado inicial
    console.log('\n📊 Estado inicial:');
    const initialCredentials = localStorage.getItem('driver_credentials');
    if (initialCredentials) {
        const decrypted = AuthService.decryptData(initialCredentials);
        const parsed = JSON.parse(decrypted);
        console.log('Conductores actuales:', Object.keys(parsed));
    } else {
        console.log('No hay credenciales en localStorage');
    }

    // 2. Crear credenciales de prueba
    console.log('\n🔧 Creando credenciales de prueba...');
    const testDriver = {
        name: 'Test Conductor Prueba',
        idNumber: '123456789',
        driverId: 'test_' + Date.now()
    };

    const credentials = await AuthService.createDriverCredentials(testDriver);
    console.log('✅ Credenciales creadas:', credentials);

    // 3. Verificar en localStorage
    console.log('\n📱 Verificando localStorage:');
    const afterLocal = localStorage.getItem('driver_credentials');
    if (afterLocal) {
        const decrypted = AuthService.decryptData(afterLocal);
        const parsed = JSON.parse(decrypted);
        console.log('Conductores después de crear:', Object.keys(parsed));
        console.log('Nuevo conductor encontrado:', parsed[credentials.username] ? '✅' : '❌');
    }

    // 4. Verificar en S3
    console.log('\n☁️ Verificando S3...');
    if (window.S3Service && S3Service.isConfigured()) {
        try {
            const s3Data = await S3Service.downloadJSON('', 'auth-credentials.json');
            console.log('Datos en S3:', s3Data);
            if (s3Data.success && s3Data.data && s3Data.data.drivers) {
                console.log('Conductores en S3:', Object.keys(s3Data.data.drivers));
                console.log('Nuevo conductor en S3:', s3Data.data.drivers[credentials.username] ? '✅' : '❌');
            }
        } catch (error) {
            console.error('Error verificando S3:', error);
        }
    } else {
        console.log('S3 no configurado');
    }

    // 5. Simular login
    console.log('\n🔐 Simulando login con nuevas credenciales...');
    try {
        const loginTest = await AuthService.authenticateDriver(
            credentials.username,
            testDriver.idNumber
        );
        console.log('✅ Login exitoso:', loginTest);
    } catch (error) {
        console.error('❌ Login falló:', error.message);
    }

    console.log('\n🎉 Prueba completada');
}

// Ejecutar la prueba
console.log('Para probar, ejecuta: testDriverCreation()');
