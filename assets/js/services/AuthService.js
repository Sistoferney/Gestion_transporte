/**
 * Servicio de Autenticación - Gestión segura de credenciales y sesiones
 */
class AuthService {
    static config = {
        adminConfigured: false,
        saltRounds: 10,
        sessionTimeout: 24 * 60 * 60 * 1000 // 24 horas
    };

    // Hash simple para contraseñas (alternativa a bcrypt para frontend)
    static async hashPassword(password, salt = null) {
        if (!salt) {
            salt = this.generateSalt();
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return {
            hash: hashHex,
            salt: salt
        };
    }

    static generateSalt() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    static async verifyPassword(password, storedHash, storedSalt) {
        const { hash } = await this.hashPassword(password, storedSalt);
        return hash === storedHash;
    }

    // Configuración inicial del administrador
    static async setupAdminCredentials(username, password, name = 'Administrador') {
        if (this.isAdminConfigured()) {
            throw new Error('Las credenciales de administrador ya están configuradas');
        }

        const { hash, salt } = await this.hashPassword(password);

        const adminConfig = {
            username: username,
            passwordHash: hash,
            passwordSalt: salt,
            name: name,
            type: 'admin',
            id: 'admin_user',
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };

        // Guardar configuración encriptada localmente
        const encryptedConfig = this.encryptData(JSON.stringify(adminConfig));
        localStorage.setItem('admin_auth_config', encryptedConfig);
        localStorage.setItem('admin_configured', 'true');

        // Sincronizar con S3 para acceso universal
        await this.syncCredentialsToS3();

        console.log('✅ Credenciales de administrador configuradas correctamente');
        return true;
    }

    // Verificar si el admin ya está configurado
    static async isAdminConfigured() {
        // Verificar primero localmente
        const localConfig = localStorage.getItem('admin_configured') === 'true' &&
                           localStorage.getItem('admin_auth_config') !== null;

        if (localConfig) {
            return true;
        }

        // Si no está local, verificar en S3
        try {
            await this.loadCredentialsFromS3();
            return localStorage.getItem('admin_configured') === 'true' &&
                   localStorage.getItem('admin_auth_config') !== null;
        } catch (error) {
            console.log('No se pudieron cargar credenciales desde S3:', error.message);
            return false;
        }
    }

    // Verificación síncrona para compatibilidad
    static isAdminConfiguredSync() {
        return localStorage.getItem('admin_configured') === 'true' &&
               localStorage.getItem('admin_auth_config') !== null;
    }

    // Obtener configuración del admin
    static getAdminConfig() {
        try {
            const encryptedConfig = localStorage.getItem('admin_auth_config');
            if (!encryptedConfig) return null;

            const decryptedConfig = this.decryptData(encryptedConfig);
            return JSON.parse(decryptedConfig);
        } catch (error) {
            console.error('Error obteniendo configuración admin:', error);
            return null;
        }
    }

    // Autenticar usuario admin
    static async authenticateAdmin(username, password) {
        const adminConfig = this.getAdminConfig();

        if (!adminConfig) {
            throw new Error('Administrador no configurado');
        }

        if (adminConfig.username !== username) {
            throw new Error('Usuario no encontrado');
        }

        if (!adminConfig.isActive) {
            throw new Error('Usuario inactivo');
        }

        const isValidPassword = await this.verifyPassword(
            password,
            adminConfig.passwordHash,
            adminConfig.passwordSalt
        );

        if (!isValidPassword) {
            throw new Error('Contraseña incorrecta');
        }

        // Actualizar último login
        adminConfig.lastLogin = new Date().toISOString();
        const encryptedConfig = this.encryptData(JSON.stringify(adminConfig));
        localStorage.setItem('admin_auth_config', encryptedConfig);

        return {
            id: adminConfig.id,
            username: adminConfig.username,
            name: adminConfig.name,
            type: adminConfig.type,
            lastLogin: adminConfig.lastLogin
        };
    }

    // Cambiar credenciales admin
    static async changeAdminCredentials(currentPassword, newUsername, newPassword) {
        const adminConfig = this.getAdminConfig();

        if (!adminConfig) {
            throw new Error('Administrador no configurado');
        }

        // Verificar contraseña actual
        const isValidPassword = await this.verifyPassword(
            currentPassword,
            adminConfig.passwordHash,
            adminConfig.passwordSalt
        );

        if (!isValidPassword) {
            throw new Error('Contraseña actual incorrecta');
        }

        // Generar nuevo hash para la nueva contraseña
        const { hash, salt } = await this.hashPassword(newPassword);

        adminConfig.username = newUsername;
        adminConfig.passwordHash = hash;
        adminConfig.passwordSalt = salt;
        adminConfig.updatedAt = new Date().toISOString();

        // Guardar configuración actualizada
        const encryptedConfig = this.encryptData(JSON.stringify(adminConfig));
        localStorage.setItem('admin_auth_config', encryptedConfig);

        console.log('✅ Credenciales de administrador actualizadas');
        return true;
    }

    // Resetear configuración admin (solo para emergencias)
    static resetAdminConfig() {
        if (confirm('¿Está SEGURO de que desea resetear la configuración de administrador? Esto requerirá configurar nuevamente las credenciales.')) {
            localStorage.removeItem('admin_auth_config');
            localStorage.removeItem('admin_configured');
            console.log('🔄 Configuración de administrador reseteada');
            return true;
        }
        return false;
    }

    // Encriptación simple de datos
    static encryptData(text) {
        const shift = 13; // ROT13 mejorado
        return btoa(text.split('').map(char => {
            const code = char.charCodeAt(0);
            return String.fromCharCode(code + shift);
        }).join(''));
    }

    static decryptData(encrypted) {
        const shift = 13;
        return atob(encrypted).split('').map(char => {
            const code = char.charCodeAt(0);
            return String.fromCharCode(code - shift);
        }).join('');
    }

    // Gestión de sesiones
    static createSession(userdata) {
        const session = {
            ...userdata,
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + this.config.sessionTimeout).toISOString()
        };

        sessionStorage.setItem('userSession', JSON.stringify(session));
        return session;
    }

    static getSession() {
        try {
            const session = sessionStorage.getItem('userSession');
            if (!session) return null;

            const sessionData = JSON.parse(session);

            // Verificar expiración
            if (new Date() > new Date(sessionData.expiresAt)) {
                this.clearSession();
                return null;
            }

            return sessionData;
        } catch (error) {
            console.error('Error obteniendo sesión:', error);
            return null;
        }
    }

    static clearSession() {
        sessionStorage.removeItem('userSession');
    }

    // Estado del servicio
    static getAuthStatus() {
        return {
            adminConfigured: this.isAdminConfigured(),
            hasActiveSession: this.getSession() !== null,
            adminConfig: this.isAdminConfigured() ? {
                username: this.getAdminConfig()?.username,
                lastLogin: this.getAdminConfig()?.lastLogin
            } : null
        };
    }

    // ===== GESTIÓN SEGURA DE CONDUCTORES =====

    // Crear conductor con credenciales automáticas y hash
    static async createDriverCredentials(driverData) {
        const { name, idNumber, driverId } = driverData;

        if (!name || !idNumber) {
            throw new Error('Nombre y número de documento son requeridos');
        }

        // Generar username automáticamente
        const username = this.generateDriverUsername(name);

        // La contraseña es el número de documento (como en la lógica original)
        const password = idNumber;

        // Crear hash seguro de la contraseña
        const { hash, salt } = await this.hashPassword(password);

        const driverCredentials = {
            username: username,
            passwordHash: hash,
            passwordSalt: salt,
            name: name,
            type: 'driver',
            driverId: driverId,
            idNumber: idNumber,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            autoGenerated: true // Marca para identificar credenciales auto-generadas
        };

        // Guardar en almacenamiento seguro de conductores con sincronización
        await this.saveDriverCredentialsWithSync(driverCredentials);

        console.log(`✅ Credenciales seguras creadas para conductor: ${username}`);

        return {
            username: username,
            originalPassword: password, // Solo para mostrar al admin una vez
            success: true
        };
    }

    // Generar nombre de usuario para conductor (misma lógica que antes)
    static generateDriverUsername(fullName) {
        const cleanName = fullName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remover acentos
            .replace(/[^a-z\s]/g, '') // Solo letras y espacios
            .trim()
            .split(' ')
            .slice(0, 2) // Máximo dos palabras
            .join('');

        return `conductor${cleanName}`;
    }

    // Guardar credenciales de conductor
    static saveDriverCredentials(credentials) {
        try {
            const allDrivers = this.getAllDriverCredentials();
            allDrivers[credentials.username] = credentials;

            // Guardar encriptado
            const encryptedData = this.encryptData(JSON.stringify(allDrivers));
            localStorage.setItem('driver_credentials', encryptedData);

            return true;
        } catch (error) {
            console.error('Error guardando credenciales de conductor:', error);
            return false;
        }
    }

    // Obtener todas las credenciales de conductores
    static getAllDriverCredentials() {
        try {
            const encryptedData = localStorage.getItem('driver_credentials');
            if (!encryptedData) return {};

            const decryptedData = this.decryptData(encryptedData);
            return JSON.parse(decryptedData);
        } catch (error) {
            console.error('Error obteniendo credenciales de conductores:', error);
            return {};
        }
    }

    // Obtener credenciales de un conductor específico
    static getDriverCredentials(username) {
        const allDrivers = this.getAllDriverCredentials();
        return allDrivers[username] || null;
    }

    // Autenticar conductor
    static async authenticateDriver(username, password) {
        const driverCreds = this.getDriverCredentials(username);

        if (!driverCreds) {
            throw new Error('Usuario no encontrado');
        }

        if (!driverCreds.isActive) {
            throw new Error('Usuario inactivo');
        }

        const isValidPassword = await this.verifyPassword(
            password,
            driverCreds.passwordHash,
            driverCreds.passwordSalt
        );

        if (!isValidPassword) {
            throw new Error('Contraseña incorrecta');
        }

        // Actualizar último login
        driverCreds.lastLogin = new Date().toISOString();
        await this.saveDriverCredentialsWithSync(driverCreds);

        return {
            id: driverCreds.driverId,
            username: driverCreds.username,
            name: driverCreds.name,
            type: driverCreds.type,
            driverId: driverCreds.driverId,
            lastLogin: driverCreds.lastLogin
        };
    }

    // Actualizar contraseña de conductor
    static async changeDriverPassword(username, currentPassword, newPassword) {
        const driverCreds = this.getDriverCredentials(username);

        if (!driverCreds) {
            throw new Error('Conductor no encontrado');
        }

        // Verificar contraseña actual
        const isValidPassword = await this.verifyPassword(
            currentPassword,
            driverCreds.passwordHash,
            driverCreds.passwordSalt
        );

        if (!isValidPassword) {
            throw new Error('Contraseña actual incorrecta');
        }

        // Generar nuevo hash
        const { hash, salt } = await this.hashPassword(newPassword);

        driverCreds.passwordHash = hash;
        driverCreds.passwordSalt = salt;
        driverCreds.updatedAt = new Date().toISOString();

        await this.saveDriverCredentialsWithSync(driverCreds);

        console.log(`✅ Contraseña actualizada para conductor: ${username}`);
        return true;
    }

    // Eliminar credenciales de conductor
    static removeDriverCredentials(username) {
        const allDrivers = this.getAllDriverCredentials();
        if (allDrivers[username]) {
            delete allDrivers[username];
            const encryptedData = this.encryptData(JSON.stringify(allDrivers));
            localStorage.setItem('driver_credentials', encryptedData);
            return true;
        }
        return false;
    }

    // Listar todos los conductores (para administración)
    static listAllDrivers() {
        const allDrivers = this.getAllDriverCredentials();
        return Object.values(allDrivers).map(driver => ({
            username: driver.username,
            name: driver.name,
            driverId: driver.driverId,
            isActive: driver.isActive,
            lastLogin: driver.lastLogin,
            createdAt: driver.createdAt
        }));
    }

    // Método de autenticación unificado
    static async authenticate(username, password) {
        // Intentar autenticación admin primero
        if (this.isAdminConfigured()) {
            try {
                const adminData = await this.authenticateAdmin(username, password);
                return {
                    user: adminData,
                    session: this.createSession(adminData)
                };
            } catch (error) {
                // Si no es admin, continuar con conductores
                console.log('No es admin, verificando conductores...');
            }
        }

        // Intentar autenticación de conductor con sistema seguro
        try {
            const driverData = await this.authenticateDriver(username, password);
            return {
                user: driverData,
                session: this.createSession(driverData)
            };
        } catch (error) {
            // Si no se encuentra en sistema seguro, intentar sistema legacy
            console.log('No se encontró en sistema seguro, verificando sistema legacy...');
        }

        // Fallback: Sistema legacy de conductores (solo para compatibilidad)
        const drivers = this.getDefaultDriverUsers();
        const driver = drivers.find(d => d.username === username);

        if (!driver) {
            throw new Error('Usuario no encontrado');
        }

        if (!driver.isActive) {
            throw new Error('Usuario inactivo');
        }

        if (driver.password !== password) {
            throw new Error('Contraseña incorrecta');
        }

        driver.lastLogin = new Date().toISOString();

        return {
            user: driver,
            session: this.createSession(driver)
        };
    }

    // Integración con sistema existente de usuarios (solo para fallback)
    static getDefaultDriverUsers() {
        // Solo para compatibilidad con datos existentes
        return [];
    }

    // ===== SINCRONIZACIÓN CON S3 PARA ACCESO UNIVERSAL =====

    // Sincronizar credenciales a S3
    static async syncCredentialsToS3() {
        try {
            if (!window.S3Service || !S3Service.isConfigured()) {
                console.log('ℹ️ S3 no configurado, guardando solo localmente');
                return;
            }

            // Preparar datos de credenciales para S3
            const credentialsData = {
                admin: {
                    configured: localStorage.getItem('admin_configured'),
                    config: localStorage.getItem('admin_auth_config')
                },
                drivers: localStorage.getItem('driver_credentials'),
                lastSync: new Date().toISOString(),
                version: '1.0'
            };

            // Subir a S3
            await S3Service.uploadJSON('auth-credentials.json', credentialsData);
            console.log('✅ Credenciales sincronizadas con S3');

        } catch (error) {
            console.warn('⚠️ Error sincronizando credenciales con S3:', error);
            // No fallar si S3 no funciona
        }
    }

    // Cargar credenciales desde S3
    static async loadCredentialsFromS3() {
        try {
            if (!window.S3Service || !S3Service.isConfigured()) {
                throw new Error('S3 no configurado');
            }

            const credentialsData = await S3Service.downloadJSON('auth-credentials.json');

            if (credentialsData && credentialsData.admin) {
                // Restaurar credenciales de admin
                if (credentialsData.admin.configured) {
                    localStorage.setItem('admin_configured', credentialsData.admin.configured);
                }
                if (credentialsData.admin.config) {
                    localStorage.setItem('admin_auth_config', credentialsData.admin.config);
                }

                // Restaurar credenciales de conductores
                if (credentialsData.drivers) {
                    localStorage.setItem('driver_credentials', credentialsData.drivers);
                }

                console.log('✅ Credenciales cargadas desde S3');
                return true;
            }

        } catch (error) {
            throw new Error(`Error cargando credenciales desde S3: ${error.message}`);
        }
    }

    // Sincronizar automáticamente cuando se crean/modifican conductores
    static async saveDriverCredentialsWithSync(credentials) {
        // Guardar localmente primero
        const saved = this.saveDriverCredentials(credentials);

        if (saved) {
            // Sincronizar con S3
            await this.syncCredentialsToS3();
        }

        return saved;
    }

    // Inicialización automática al cargar la aplicación
    static async initializeFromCloud() {
        try {
            console.log('🌐 Verificando credenciales en la nube...');

            // Si no hay credenciales locales, intentar cargar desde S3
            if (!this.isAdminConfiguredSync()) {
                await this.loadCredentialsFromS3();
            }

            return true;
        } catch (error) {
            console.log('ℹ️ No se encontraron credenciales en la nube:', error.message);
            return false;
        }
    }
}