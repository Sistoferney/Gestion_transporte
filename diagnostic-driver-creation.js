/**
 * Script de diagnóstico para verificar el flujo de creación de conductores
 * Copiar y pegar en la consola del navegador (como admin)
 */

// Guardar las funciones originales
const originalCreateDriverCredentials = AuthService.createDriverCredentials;
const originalSaveDriverCredentials = AuthService.saveDriverCredentials;
const originalSaveDriverCredentialsWithSync = AuthService.saveDriverCredentialsWithSync;
const originalUploadDriverCredentialsToS3 = AuthService.uploadDriverCredentialsToS3;

// Interceptar createDriverCredentials
AuthService.createDriverCredentials = async function(...args) {
    console.log('🔍 [DIAGNOSTIC] createDriverCredentials called with:', args);
    const result = await originalCreateDriverCredentials.apply(this, args);
    console.log('🔍 [DIAGNOSTIC] createDriverCredentials result:', result);
    return result;
};

// Interceptar saveDriverCredentials
AuthService.saveDriverCredentials = async function(...args) {
    console.log('🔍 [DIAGNOSTIC] saveDriverCredentials called with:', args);
    const result = await originalSaveDriverCredentials.apply(this, args);
    console.log('🔍 [DIAGNOSTIC] saveDriverCredentials result:', result);
    return result;
};

// Interceptar saveDriverCredentialsWithSync
AuthService.saveDriverCredentialsWithSync = async function(...args) {
    console.log('🔍 [DIAGNOSTIC] saveDriverCredentialsWithSync called with:', args);
    const result = await originalSaveDriverCredentialsWithSync.apply(this, args);
    console.log('🔍 [DIAGNOSTIC] saveDriverCredentialsWithSync result:', result);
    return result;
};

// Interceptar uploadDriverCredentialsToS3
AuthService.uploadDriverCredentialsToS3 = async function(...args) {
    console.log('🔍 [DIAGNOSTIC] uploadDriverCredentialsToS3 called with:', args);
    const result = await originalUploadDriverCredentialsToS3.apply(this, args);
    console.log('🔍 [DIAGNOSTIC] uploadDriverCredentialsToS3 result:', result);
    return result;
};

console.log('✅ Interceptores de diagnóstico instalados');
console.log('Ahora crea un conductor y observa los logs detallados');
console.log('');
console.log('Para desactivar los interceptores, ejecuta:');
console.log('AuthService.createDriverCredentials = originalCreateDriverCredentials;');
console.log('AuthService.saveDriverCredentials = originalSaveDriverCredentials;');
console.log('AuthService.saveDriverCredentialsWithSync = originalSaveDriverCredentialsWithSync;');
console.log('AuthService.uploadDriverCredentialsToS3 = originalUploadDriverCredentialsToS3;');
