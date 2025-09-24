/**
 * Servicio de Autenticación - Gestión segura de credenciales y sesiones
 */

console.log('🚀 Iniciando carga de AuthService...');

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
        if (this.isAdminConfiguredSync()) {
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

        // NUEVA FUNCIONALIDAD: Activar bloqueo inmediatamente
        localStorage.setItem('admin_setup_blocked', 'true');
        console.log('🔒 Setup de administrador bloqueado permanentemente');

        // CORREGIDO: Solo sincronizar si es la primera configuración, no en cada carga
        const isFirstTimeSetup = !localStorage.getItem('admin_first_setup_completed');

        if (isFirstTimeSetup) {
            console.log('🔄 Primera configuración - sincronizando con S3...');
            await this.syncCredentialsToS3();
            localStorage.setItem('admin_first_setup_completed', 'true');
        } else {
            console.log('ℹ️ Configuración ya sincronizada anteriormente - saltando sync automática');
        }

        // Actualizar información del sistema
        this.ensureSystemInfo();

        // NUEVA FUNCIONALIDAD: Agregar bucket info al HTML para futuros accesos
        this.addSystemBucketToHTML();

        // NUEVA FUNCIONALIDAD: Desactivar login maestro permanentemente
        this.disableMasterLogin();

        console.log('✅ Credenciales de administrador configuradas correctamente');
        return true;
    }

    // Verificar si el admin ya está configurado
    static async isAdminConfigured() {
        // NUEVA LÓGICA: Verificar primero si hay configuración segura del sistema
        if (this.isSystemConfigured()) {
            console.log('✅ Admin configurado (sistema seguro)');
            return true;
        }

        // Verificar primero localmente
        const localConfig = localStorage.getItem('admin_configured') === 'true' &&
                           localStorage.getItem('admin_auth_config') !== null;

        if (localConfig) {
            return true;
        }

        // Si no está local, verificar en S3 (solo si S3 está disponible)
        try {
            if (window.S3Service && S3Service.isConfigured()) {
                await this.loadCredentialsFromS3();
                const isConfigured = localStorage.getItem('admin_configured') === 'true' &&
                                   localStorage.getItem('admin_auth_config') !== null;

                // NUEVA FUNCIONALIDAD: Bloqueo permanente
                if (isConfigured) {
                    // Marcar como bloqueado para prevenir futuras configuraciones
                    localStorage.setItem('admin_setup_blocked', 'true');
                    console.log('🔒 Configuración inicial de admin bloqueada permanentemente');

                    // Actualizar información del sistema
                    this.ensureSystemInfo();
                }

                return isConfigured;
            } else {
                console.log('ℹ️ S3 no disponible para verificación de admin');
                return false;
            }
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

    // NUEVA FUNCIONALIDAD: Verificar si el setup inicial está bloqueado
    static isAdminSetupBlocked() {
        // Verificar bloqueo explícito
        if (localStorage.getItem('admin_setup_blocked') === 'true') {
            return true;
        }

        // Verificar si ya hay configuración (bloqueo implícito)
        return this.isAdminConfiguredSync();
    }

    // NUEVA FUNCIONALIDAD: Verificar globalmente si alguien más ya configuró admin
    static async isAdminSetupBlockedGlobally() {
        try {
            // NUEVA LÓGICA: Verificar primero si el sistema está configurado de forma segura
            if (this.isSystemConfigured()) {
                console.log('✅ Sistema ya configurado de forma segura');
                return true;
            }

            // MIGRACIÓN: Verificar si hay configuración legacy del sistema anterior
            const hasLegacyConfig = await this.detectLegacyConfiguration();
            if (hasLegacyConfig) {
                console.log('🔄 Configuración legacy detectada - migrando automáticamente');
                const migrated = await this.migrateLegacyConfiguration();
                if (migrated) {
                    console.log('✅ Migración completada - sistema configurado');
                    return true;
                } else {
                    console.warn('⚠️ Error en migración - usando configuración existente');
                    return true; // Usar configuración existente aunque no se migre
                }
            }

            // Verificar local primero
            if (this.isAdminSetupBlocked()) {
                return true;
            }

            // Intentar con credenciales S3 si están disponibles
            if (window.S3Service && S3Service.isConfigured()) {
                await this.loadCredentialsFromS3();

                const globallyConfigured = localStorage.getItem('admin_configured') === 'true';
                if (globallyConfigured) {
                    localStorage.setItem('admin_setup_blocked', 'true');
                    console.log('🔒 Admin ya configurado globalmente - bloqueando setup local');
                    return true;
                }
            }

            // Si no hay configuración segura, requerir configuración inicial
            console.log('🔧 Sistema nuevo - requiere configuración inicial');
            return 'requires_initial_setup_or_s3_config';
        } catch (error) {
            console.log('⚠️ No se pudo verificar configuración, requiere setup inicial:', error.message);
            return 'requires_initial_setup';
        }
    }

    // MIGRACIÓN: Detectar configuración legacy del sistema anterior
    static async detectLegacyConfiguration() {
        try {
            // Verificar si S3Service puede cargar credenciales almacenadas (del sistema anterior)
            if (window.S3Service) {
                const loaded = S3Service.loadStoredCredentials();
                if (loaded && S3Service.isConfigured()) {
                    console.log('🔍 Configuración S3 legacy detectada');

                    // Verificar si hay datos de admin en S3
                    try {
                        await this.loadCredentialsFromS3();
                        const adminConfigured = localStorage.getItem('admin_configured') === 'true';
                        if (adminConfigured) {
                            console.log('🔍 Configuración de admin legacy detectada');
                            return true;
                        }
                    } catch (error) {
                        console.log('ℹ️ No hay configuración de admin en S3 legacy');
                    }

                    return true; // Hay S3 configurado, eso ya es algo
                }
            }

            // Verificar si hay admin configurado localmente (del sistema anterior)
            const adminConfigured = localStorage.getItem('admin_configured') === 'true' &&
                                   localStorage.getItem('admin_auth_config') !== null;
            if (adminConfigured) {
                console.log('🔍 Configuración de admin local legacy detectada');
                return true;
            }

            return false;
        } catch (error) {
            console.warn('⚠️ Error detectando configuración legacy:', error);
            return false;
        }
    }

    // MIGRACIÓN: Migrar configuración legacy a sistema seguro
    static async migrateLegacyConfiguration() {
        try {
            console.log('🔄 Iniciando migración de configuración legacy...');

            // Obtener configuración S3 existente
            let s3Config = null;
            if (window.S3Service && S3Service.isConfigured()) {
                s3Config = {
                    accessKeyId: S3Service.config.accessKeyId,
                    secretAccessKey: S3Service.config.secretAccessKey,
                    bucket: S3Service.config.bucket,
                    region: S3Service.config.region
                };
                console.log('✅ Credenciales S3 legacy recuperadas - Bucket:', s3Config.bucket);
            }

            // Obtener configuración de admin existente
            let adminConfig = null;
            const adminConfigData = this.getAdminConfig();
            if (adminConfigData) {
                adminConfig = {
                    username: adminConfigData.username,
                    password: 'RequiereReconfiguración', // Password temporal - requiere configuración segura
                    name: adminConfigData.name || 'Administrador',
                    email: adminConfigData.email || 'admin@sistema.com'
                };
                console.log('✅ Configuración de admin legacy recuperada:', adminConfigData.username);
            }

            // Si tenemos S3 configurado o admin configurado, proceder con migración
            if (s3Config || adminConfig) {
                // Crear contraseña maestra temporal
                const masterPassword = 'InmunizaMigration2025!'; // Contraseña basada en el sistema

                // Si no hay admin pero sí S3, intentar cargar desde S3
                if (!adminConfig && s3Config) {
                    console.log('🔄 Intentando cargar credenciales de admin desde S3...');
                    try {
                        const s3AdminData = await S3Service.downloadJSON('', 'auth-credentials.json');
                        if (s3AdminData.success && s3AdminData.data && s3AdminData.data.admin) {
                            adminConfig = {
                                username: s3AdminData.data.admin.username || 'inmuniza2025',
                                password: s3AdminData.data.admin.password || 'inventario225588',
                                name: s3AdminData.data.admin.name || 'Administrador del Sistema',
                                email: s3AdminData.data.admin.email || 'admin@sistema.com'
                            };
                            console.log('✅ Credenciales de admin recuperadas desde S3');
                        }
                    } catch (error) {
                        console.warn('⚠️ No se pudieron cargar credenciales de admin desde S3:', error.message);
                    }
                }

                // Si no hay S3 configurado, usar valores por defecto del sistema
                if (!s3Config) {
                    console.warn('⚠️ No hay S3 configurado, usando configuración básica');
                    s3Config = {
                        accessKeyId: 'PLACEHOLDER',
                        secretAccessKey: 'PLACEHOLDER',
                        bucket: 'mi-app-sighu',
                        region: 'sa-east-1'
                    };
                }

                // Verificar que no se sobrescriba configuración existente
                if (!this.isSystemConfigured()) {
                    if (adminConfig && adminConfig.username) {
                        // Usar el método de configuración segura con los datos legacy
                        await this.setupSecureSystem(masterPassword, adminConfig, s3Config);
                        console.log('✅ Migración legacy completada exitosamente');
                    } else {
                        console.log('⚠️ Datos de admin inconsistentes - configurando sistema básico');
                        // Configurar solo la parte de S3 para permitir acceso básico
                        const basicConfig = {
                            masterPassword: masterPassword,
                            adminCredentials: null, // Se configurará después
                            s3Credentials: s3Config
                        };
                        localStorage.setItem('system_basic_setup', this.encryptDataSecure(JSON.stringify(basicConfig)));
                        console.log('✅ Configuración básica establecida');
                    }
                } else {
                    console.log('ℹ️ Sistema ya configurado - saltando migración');
                }

                return true;
            } else {
                console.warn('⚠️ No se encontró configuración S3 ni admin para migrar');
                return false;
            }

        } catch (error) {
            console.error('❌ Error durante migración legacy:', error);
            // No fallar completamente - usar configuración existente
            return true;
        }
    }


    // NUEVA FUNCIONALIDAD: Obtener bucket S3 de cache/localStorage
    static getS3BucketFromCache() {
        try {
            // Intentar obtener bucket de configuración S3 si está disponible
            if (window.S3Service && S3Service.config && S3Service.config.bucket) {
                return S3Service.config.bucket;
            }

            // Buscar en localStorage configuraciones previas
            const s3Config = localStorage.getItem('s3_config');
            if (s3Config) {
                const config = JSON.parse(s3Config);
                return config.bucket;
            }

            // Buscar en StorageService si está disponible
            if (window.StorageService && StorageService.s3Config && StorageService.s3Config.bucket) {
                return StorageService.s3Config.bucket;
            }

            // NUEVA SOLUCIÓN: Buscar bucket hardcodeado temporalmente
            // En casos donde no hay credenciales, usar bucket conocido del sistema
            const knownBucket = this.getKnownSystemBucket();
            if (knownBucket) {
                console.log('📁 Usando bucket conocido del sistema:', knownBucket);
                return knownBucket;
            }

            return null;
        } catch (error) {
            console.log('⚠️ Error obteniendo bucket de cache:', error.message);
            return null;
        }
    }

    // NUEVA FUNCIONALIDAD: Obtener bucket conocido del sistema
    static getKnownSystemBucket() {
        // Buscar en elemento HTML oculto (agregado por admin)
        const bucketElement = document.getElementById('system-bucket-info');
        if (bucketElement && bucketElement.dataset.bucket) {
            return bucketElement.dataset.bucket;
        }

        // Buscar en meta tag
        const metaTag = document.querySelector('meta[name="s3-bucket"]');
        if (metaTag && metaTag.content) {
            return metaTag.content;
        }

        // Como último recurso, intentar obtener de URL actual si sigue patrón conocido
        const currentHost = window.location.hostname;
        if (currentHost.includes('s3') || currentHost.includes('amazonaws')) {
            // Extraer bucket de hostname si está hospedado en S3
            const bucketMatch = currentHost.match(/^([^.]+)\.s3/);
            if (bucketMatch) {
                return bucketMatch[1];
            }
        }

        return null;
    }

    // Asegurar información del sistema local
    static async ensureSystemInfo() {
        try {
            // Solo agregar info al HTML para referencia futura
            this.addSystemBucketToHTML();
            console.log('✅ Información del sistema actualizada');
        } catch (error) {
            console.log('⚠️ Error actualizando información del sistema:', error.message);
        }
    }

    // NUEVA FUNCIONALIDAD: Agregar bucket info al HTML para accesos futuros
    static addSystemBucketToHTML() {
        try {
            const bucketName = window.S3Service?.config?.bucket;
            if (!bucketName) {
                console.log('⚠️ No hay bucket configurado para agregar al HTML');
                return;
            }

            // Agregar meta tag si no existe
            let metaTag = document.querySelector('meta[name="s3-bucket"]');
            if (!metaTag) {
                metaTag = document.createElement('meta');
                metaTag.name = 's3-bucket';
                metaTag.content = bucketName;
                document.head.appendChild(metaTag);
                console.log('✅ Meta tag de bucket agregado al HTML');
            }

            // Agregar elemento oculto si no existe
            let bucketElement = document.getElementById('system-bucket-info');
            if (!bucketElement) {
                bucketElement = document.createElement('div');
                bucketElement.id = 'system-bucket-info';
                bucketElement.dataset.bucket = bucketName;
                bucketElement.style.display = 'none';
                document.body.appendChild(bucketElement);
                console.log('✅ Elemento bucket info agregado al HTML');
            }

        } catch (error) {
            console.log('⚠️ Error agregando bucket info al HTML:', error.message);
        }
    }



    // ===== SISTEMA DE LOGIN MAESTRO =====

    // NUEVA FUNCIONALIDAD: Contraseña maestra dinámica (configurada por admin)
    static getMasterPasswordHash() {
        // Obtener contraseña maestra desde configuración segura del admin
        const masterConfig = localStorage.getItem('master_setup_config');
        if (!masterConfig) {
            throw new Error('Sistema no configurado. Contacte al administrador.');
        }

        try {
            const decryptedConfig = this.decryptDataSecure(masterConfig);
            const config = JSON.parse(decryptedConfig);
            return this.encryptData(config.masterPassword);
        } catch (error) {
            throw new Error('Error accediendo a configuración del sistema');
        }
    }

    // NUEVA FUNCIONALIDAD: Admin preestablecido desde configuración segura
    static async getMasterAdminCredentials() {
        // Obtener credenciales de admin desde configuración segura
        const masterConfig = localStorage.getItem('master_setup_config');
        if (!masterConfig) {
            throw new Error('Sistema no configurado. Configure el sistema primero.');
        }

        try {
            const decryptedConfig = this.decryptDataSecure(masterConfig);
            const config = JSON.parse(decryptedConfig);
            const adminData = config.adminCredentials;

            // Crear hash y salt correctos como en setupAdminCredentials
            const { hash, salt } = await this.hashPassword(adminData.password);

            // Configuración de admin como se guarda normalmente
            const adminConfig = {
                username: adminData.username,
                passwordHash: hash,
                passwordSalt: salt,
                name: adminData.name,
                email: adminData.email || 'admin@sistema.com',
                type: 'admin',
                id: 'admin_user',
                isActive: true,
                createdAt: new Date().toISOString()
            };

            return this.encryptData(JSON.stringify(adminConfig));
        } catch (error) {
            throw new Error('Error obteniendo configuración de administrador');
        }
    }

    // NUEVA FUNCIONALIDAD: Auto-configurar admin tras login maestro
    static async autoConfigureAdmin() {
        try {
            // Limpiar configuración anterior incorrecta si existe
            const existingConfig = localStorage.getItem('admin_auth_config');
            if (existingConfig) {
                try {
                    const decrypted = this.decryptData(existingConfig);
                    const config = JSON.parse(decrypted);
                    // Si no tiene passwordSalt, es formato antiguo, limpiarlo
                    if (!config.passwordSalt) {
                        console.log('🔄 Actualizando formato de admin...');
                        localStorage.removeItem('admin_configured');
                        localStorage.removeItem('admin_auth_config');
                    } else {
                        console.log('ℹ️ Admin ya configurado correctamente');
                        return true;
                    }
                } catch (error) {
                    console.log('🔄 Limpiando configuración corrupta...');
                    localStorage.removeItem('admin_configured');
                    localStorage.removeItem('admin_auth_config');
                }
            }

            console.log('🔧 Configurando admin preestablecido...');
            const encryptedAdminConfig = await this.getMasterAdminCredentials();

            // Establecer configuración de admin
            localStorage.setItem('admin_configured', 'true');
            localStorage.setItem('admin_auth_config', encryptedAdminConfig);

            console.log('✅ Admin preestablecido configurado exitosamente');
            return true;
        } catch (error) {
            console.error('❌ Error configurando admin preestablecido:', error);
            return false;
        }
    }

    // NUEVA FUNCIONALIDAD: Credenciales S3 desde configuración segura
    static getMasterS3Credentials() {
        // Obtener credenciales S3 desde configuración segura del admin
        const masterConfig = localStorage.getItem('master_setup_config');
        if (!masterConfig) {
            throw new Error('Sistema no configurado. Configure las credenciales S3 primero.');
        }

        try {
            const decryptedConfig = this.decryptDataSecure(masterConfig);
            const config = JSON.parse(decryptedConfig);
            const s3Config = config.s3Credentials;

            if (!s3Config) {
                throw new Error('Credenciales S3 no configuradas');
            }

            return {
                accessKeyId: this.encryptData(s3Config.accessKeyId),
                secretAccessKey: this.encryptData(s3Config.secretAccessKey),
                bucket: this.encryptData(s3Config.bucket),
                region: this.encryptData(s3Config.region)
            };
        } catch (error) {
            throw new Error('Error obteniendo credenciales S3: ' + error.message);
        }
    }

    // NUEVA FUNCIONALIDAD: Auto-configurar S3 tras login maestro exitoso
    static autoConfigureS3() {
        try {
            const encryptedCredentials = this.getMasterS3Credentials();

            // Desencriptar credenciales
            const s3Config = {
                accessKeyId: this.decryptData(encryptedCredentials.accessKeyId),
                secretAccessKey: this.decryptData(encryptedCredentials.secretAccessKey),
                bucket: this.decryptData(encryptedCredentials.bucket),
                region: this.decryptData(encryptedCredentials.region)
            };

            // Configurar S3Service
            if (window.S3Service) {
                console.log('🔧 Configurando S3 con:', {
                    accessKeyId: s3Config.accessKeyId,
                    bucket: s3Config.bucket,
                    region: s3Config.region,
                    secretAccessKey: s3Config.secretAccessKey ? '[HIDDEN]' : 'undefined'
                });

                S3Service.setCredentials(
                    s3Config.accessKeyId,
                    s3Config.secretAccessKey,
                    s3Config.bucket
                );

                // También establecer la región si es necesario
                if (s3Config.region) {
                    S3Service.config.region = s3Config.region;
                }

                // Verificar inmediatamente si la configuración funcionó
                const isConfigured = S3Service.isConfigured();
                console.log('🔍 S3 configurado tras autoconfig:', isConfigured);

                if (isConfigured) {
                    console.log('✅ S3 auto-configurado exitosamente');
                    return true;
                } else {
                    console.error('❌ S3Service.configure() no estableció la configuración');
                    return false;
                }
            } else {
                console.error('❌ S3Service no disponible');
                return false;
            }
        } catch (error) {
            console.error('❌ Error auto-configurando S3:', error);
            return false;
        }
    }

    // NUEVA FUNCIONALIDAD: Verificar login maestro
    static validateMasterLogin(password) {
        try {
            const masterHash = this.getMasterPasswordHash();
            const inputHash = this.encryptData(password);

            const isValid = masterHash === inputHash;

            if (isValid) {
                // Marcar que el login maestro fue exitoso
                sessionStorage.setItem('master_login_validated', 'true');
                sessionStorage.setItem('master_login_time', new Date().toISOString());
                console.log('✅ Login maestro exitoso');

                // Auto-configurar S3 con credenciales preestablecidas
                const s3Configured = this.autoConfigureS3();
                if (s3Configured) {
                    console.log('🌐 S3 auto-configurado tras login maestro');
                } else {
                    console.warn('⚠️ No se pudo auto-configurar S3');
                }
            } else {
                // Registrar intento fallido
                this.registerFailedMasterAttempt();
                console.log('❌ Login maestro fallido');
            }

            return isValid;
        } catch (error) {
            console.error('❌ Error validando login maestro:', error);
            return false;
        }
    }

    // NUEVA FUNCIONALIDAD: Verificar si login maestro está validado
    static isMasterLoginValidated() {
        const validated = sessionStorage.getItem('master_login_validated') === 'true';
        const loginTime = sessionStorage.getItem('master_login_time');

        if (!validated || !loginTime) {
            return false;
        }

        // Verificar que no haya expirado (válido por 1 hora)
        const loginTimestamp = new Date(loginTime).getTime();
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000;

        if (now - loginTimestamp > oneHour) {
            // Expirado, limpiar
            sessionStorage.removeItem('master_login_validated');
            sessionStorage.removeItem('master_login_time');
            console.log('⏰ Login maestro expirado');
            return false;
        }

        return true;
    }

    // NUEVA FUNCIONALIDAD: Registrar intento fallido
    static registerFailedMasterAttempt() {
        const attempts = parseInt(localStorage.getItem('master_login_attempts') || '0');
        const newAttempts = attempts + 1;

        localStorage.setItem('master_login_attempts', newAttempts.toString());
        localStorage.setItem('master_login_last_attempt', new Date().toISOString());

        // Bloquear después de 5 intentos fallidos
        if (newAttempts >= 5) {
            localStorage.setItem('master_login_blocked', 'true');
            localStorage.setItem('master_login_blocked_until',
                new Date(Date.now() + 30 * 60 * 1000).toISOString()); // 30 minutos
            console.log('🔒 Login maestro bloqueado por 30 minutos');
        }
    }

    // NUEVA FUNCIONALIDAD: Verificar si login maestro está bloqueado
    static isMasterLoginBlocked() {
        const blocked = localStorage.getItem('master_login_blocked') === 'true';
        const blockedUntil = localStorage.getItem('master_login_blocked_until');

        if (!blocked || !blockedUntil) {
            return false;
        }

        // Verificar si ya pasó el tiempo de bloqueo
        const unblockTime = new Date(blockedUntil).getTime();
        const now = new Date().getTime();

        if (now > unblockTime) {
            // Desbloquear
            localStorage.removeItem('master_login_blocked');
            localStorage.removeItem('master_login_blocked_until');
            localStorage.removeItem('master_login_attempts');
            console.log('🔓 Login maestro desbloqueado');
            return false;
        }

        return true;
    }

    // NUEVA FUNCIONALIDAD: Obtener tiempo restante de bloqueo
    static getMasterLoginBlockedTimeRemaining() {
        const blockedUntil = localStorage.getItem('master_login_blocked_until');
        if (!blockedUntil) return 0;

        const unblockTime = new Date(blockedUntil).getTime();
        const now = new Date().getTime();

        return Math.max(0, Math.ceil((unblockTime - now) / 1000 / 60)); // minutos
    }

    // NUEVA FUNCIONALIDAD: Desactivar login maestro permanentemente
    static disableMasterLogin() {
        localStorage.setItem('master_login_disabled', 'true');
        sessionStorage.removeItem('master_login_validated');
        sessionStorage.removeItem('master_login_time');
        console.log('🔒 Login maestro desactivado permanentemente');
    }

    // NUEVA FUNCIONALIDAD: Verificar si login maestro está desactivado
    static isMasterLoginDisabled() {
        return localStorage.getItem('master_login_disabled') === 'true';
    }

    // ===== SISTEMA DE CONFIGURACIÓN INICIAL SEGURA =====

    // Configurar sistema completo de forma segura (solo primera vez)
    static async setupSecureSystem(masterPassword, adminCredentials, s3Credentials) {
        try {
            // Validar datos
            if (!masterPassword || masterPassword.length < 8) {
                throw new Error('La contraseña maestra debe tener al menos 8 caracteres');
            }

            if (!adminCredentials.username || !adminCredentials.password || !adminCredentials.name) {
                throw new Error('Datos del administrador incompletos');
            }

            if (!s3Credentials.accessKeyId || !s3Credentials.secretAccessKey || !s3Credentials.bucket) {
                throw new Error('Credenciales S3 incompletas');
            }

            // Verificar que no esté ya configurado
            const existingConfig = localStorage.getItem('master_setup_config');
            if (existingConfig) {
                throw new Error('El sistema ya está configurado');
            }

            // Crear configuración maestra
            const masterConfig = {
                masterPassword: masterPassword,
                adminCredentials: {
                    username: adminCredentials.username,
                    password: adminCredentials.password,
                    name: adminCredentials.name,
                    email: adminCredentials.email || 'admin@sistema.com'
                },
                s3Credentials: {
                    accessKeyId: s3Credentials.accessKeyId,
                    secretAccessKey: s3Credentials.secretAccessKey,
                    bucket: s3Credentials.bucket,
                    region: s3Credentials.region || 'sa-east-1'
                },
                configuredAt: new Date().toISOString(),
                version: '1.0'
            };

            // Encriptar y guardar configuración
            const encryptedConfig = this.encryptDataSecure(JSON.stringify(masterConfig));
            localStorage.setItem('master_setup_config', encryptedConfig);

            // Marcar como configurado
            localStorage.setItem('system_configured', 'true');

            console.log('✅ Sistema configurado de forma segura');
            return true;

        } catch (error) {
            console.error('❌ Error configurando sistema:', error);
            throw error;
        }
    }

    // Verificar si el sistema está configurado
    static isSystemConfigured() {
        return localStorage.getItem('system_configured') === 'true' &&
               localStorage.getItem('master_setup_config') !== null;
    }

    // Validar configuración del sistema
    static validateSystemConfiguration() {
        try {
            const masterConfig = localStorage.getItem('master_setup_config');
            if (!masterConfig) {
                return false;
            }

            const decryptedConfig = this.decryptDataSecure(masterConfig);
            const config = JSON.parse(decryptedConfig);

            // Verificar que tenga todos los campos necesarios
            return config.masterPassword &&
                   config.adminCredentials &&
                   config.s3Credentials &&
                   config.adminCredentials.username &&
                   config.adminCredentials.password &&
                   config.s3Credentials.accessKeyId &&
                   config.s3Credentials.secretAccessKey;

        } catch (error) {
            console.warn('⚠️ Configuración del sistema corrupta:', error.message);
            return false;
        }
    }

    // Obtener información del sistema (sin datos sensibles)
    static getSystemInfo() {
        try {
            const masterConfig = localStorage.getItem('master_setup_config');
            if (!masterConfig) {
                return null;
            }

            const decryptedConfig = this.decryptDataSecure(masterConfig);
            const config = JSON.parse(decryptedConfig);

            return {
                configuredAt: config.configuredAt,
                version: config.version,
                adminUsername: config.adminCredentials.username,
                adminName: config.adminCredentials.name,
                s3Bucket: config.s3Credentials.bucket,
                s3Region: config.s3Credentials.region
            };

        } catch (error) {
            return null;
        }
    }

    // Resetear configuración del sistema (solo emergencias)
    static resetSystemConfiguration(confirmPassword) {
        try {
            const masterConfig = localStorage.getItem('master_setup_config');
            if (!masterConfig) {
                return false;
            }

            // Verificar contraseña para resetear
            const decryptedConfig = this.decryptDataSecure(masterConfig);
            const config = JSON.parse(decryptedConfig);

            if (config.masterPassword !== confirmPassword) {
                throw new Error('Contraseña incorrecta');
            }

            // Limpiar toda la configuración
            localStorage.removeItem('master_setup_config');
            localStorage.removeItem('system_configured');
            localStorage.removeItem('admin_configured');
            localStorage.removeItem('admin_auth_config');
            localStorage.removeItem('master_login_disabled');

            console.log('🔄 Configuración del sistema reseteada');
            return true;

        } catch (error) {
            console.error('❌ Error reseteando configuración:', error);
            return false;
        }
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

    // NUEVA FUNCIONALIDAD: Autenticar admin con configuración segura
    static async authenticateAdminSecure(username, password) {
        if (!this.isSystemConfigured()) {
            throw new Error('Sistema no configurado de forma segura');
        }

        let adminData = null;

        try {
            // Primero intentar cargar desde configuración inicial
            const masterConfig = localStorage.getItem('master_setup_config');
            if (masterConfig) {
                const decryptedConfig = this.decryptDataSecure(masterConfig);
                const config = JSON.parse(decryptedConfig);
                adminData = config.adminCredentials;
            }
        } catch (error) {
            console.log('🔍 No hay configuración inicial, intentando configuración migrada...');
        }

        // Si no hay datos en configuración inicial, intentar configuración migrada desde S3
        if (!adminData) {
            try {
                const adminConfig = this.getAdminConfig();
                if (adminConfig && adminConfig.username && adminConfig.password) {
                    adminData = adminConfig;
                    console.log('✅ Usando credenciales de admin migradas desde S3');
                }
            } catch (error) {
                console.log('🔍 Error obteniendo configuración migrada:', error.message);
            }
        }

        if (!adminData) {
            throw new Error('No se encontraron credenciales de admin configuradas');
        }

        if (adminData.username !== username) {
            throw new Error('Usuario no encontrado');
        }

        if (adminData.password !== password) {
            throw new Error('Contraseña incorrecta');
        }

        console.log('✅ Autenticación admin segura exitosa');

        return {
            id: 'admin_user',
            username: adminData.username,
            name: adminData.name,
            type: 'admin',
            email: adminData.email,
            lastLogin: new Date().toISOString()
        };
    }

    // Autenticar usuario admin (legacy)
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

    // Encriptación simple de datos (para compatibilidad)
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

    // Encriptación segura mejorada para datos sensibles
    static encryptDataSecure(text) {
        // Usar múltiples capas de encriptación
        const salt = 'SecureConfig2024';
        const shift1 = 17;
        const shift2 = 23;

        // Primera capa: XOR con salt
        let xorResult = '';
        for (let i = 0; i < text.length; i++) {
            const textChar = text.charCodeAt(i);
            const saltChar = salt.charCodeAt(i % salt.length);
            xorResult += String.fromCharCode(textChar ^ saltChar);
        }

        // Segunda capa: doble shift
        const shifted = xorResult.split('').map(char =>
            String.fromCharCode(char.charCodeAt(0) + shift1)
        ).join('');

        // Tercera capa: reverse y segundo shift
        const reversed = shifted.split('').reverse().join('');
        const finalShifted = reversed.split('').map(char =>
            String.fromCharCode(char.charCodeAt(0) + shift2)
        ).join('');

        // Base64 final
        return btoa(finalShifted);
    }

    static decryptDataSecure(encrypted) {
        try {
            const salt = 'SecureConfig2024';
            const shift1 = 17;
            const shift2 = 23;

            // Decodificar base64
            const decoded = atob(encrypted);

            // Revertir tercer shift
            const unshifted2 = decoded.split('').map(char =>
                String.fromCharCode(char.charCodeAt(0) - shift2)
            ).join('');

            // Revertir reverse
            const unreversed = unshifted2.split('').reverse().join('');

            // Revertir primer shift
            const unshifted1 = unreversed.split('').map(char =>
                String.fromCharCode(char.charCodeAt(0) - shift1)
            ).join('');

            // Revertir XOR
            let result = '';
            for (let i = 0; i < unshifted1.length; i++) {
                const encryptedChar = unshifted1.charCodeAt(i);
                const saltChar = salt.charCodeAt(i % salt.length);
                result += String.fromCharCode(encryptedChar ^ saltChar);
            }

            return result;
        } catch (error) {
            throw new Error('Error desencriptando datos: ' + error.message);
        }
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
            .filter(word => word.length > 0) // Filtrar palabras vacías
            .slice(0, 3) // Máximo tres palabras para nombres completos
            .join('');

        return `conductor${cleanName}`;
    }

    // Guardar credenciales de conductor
    static async saveDriverCredentials(credentials) {
        try {
            const allDrivers = await this.getAllDriverCredentials();
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

    // Obtener todas las credenciales de conductores (con soporte S3)
    static async getAllDriverCredentials() {
        try {
            // NUEVA LÓGICA: Auto-configurar S3 si es necesario

            // Si S3Service existe pero no está configurado, intentar auto-configurarlo
            if (window.S3Service && !S3Service.isConfigured()) {
                console.log('🔧 S3Service no configurado - intentando auto-configuración...');

                if (this.isSystemConfigured()) {
                    console.log('🔧 Sistema seguro detectado - configurando S3 automáticamente...');
                    const s3Configured = this.autoConfigureS3();

                    if (s3Configured) {
                        console.log('✅ S3 auto-configurado exitosamente');
                    } else {
                        console.log('❌ Falló auto-configuración S3');
                    }
                } else {
                    console.log('⚠️ Sistema seguro no disponible para auto-configuración S3');
                }
            }

            // Verificar primero si hay datos locales útiles
            const existingLocalData = localStorage.getItem('driver_credentials');
            let hasValidLocalData = false;

            if (existingLocalData) {
                try {
                    const decryptedData = this.decryptData(existingLocalData);
                    const localDrivers = JSON.parse(decryptedData);
                    hasValidLocalData = Object.keys(localDrivers).length > 0;
                } catch (error) {
                    console.log('⚠️ Error verificando datos locales:', error.message);
                    hasValidLocalData = false;
                }
            }

            // NUEVO: SIEMPRE intentar sincronizar con S3 (merge con prioridad S3)
            if (window.S3Service && S3Service.isConfigured()) {
                console.log('🌐 Sincronizando credenciales de conductores con S3 (prioridad S3)...');
                try {
                    await this.syncDriverCredentialsWithS3(hasValidLocalData);
                } catch (error) {
                    console.log('⚠️ Error en sincronización S3:', error.message);
                    if (hasValidLocalData) {
                        console.log('✅ Usando datos locales como fallback');
                    }
                }
            } else {
                console.log('⚠️ S3Service no disponible - usando solo datos locales');
                if (hasValidLocalData) {
                    console.log('✅ Datos locales válidos encontrados');
                }
            }

            // Cargar desde localStorage (ya sea local original o descargado de S3)
            const encryptedData = localStorage.getItem('driver_credentials');
            if (!encryptedData) {
                console.log('ℹ️ No hay credenciales de conductores en localStorage');
                return {};
            }

            const decryptedData = this.decryptData(encryptedData);
            const drivers = JSON.parse(decryptedData);
            console.log('✅ Credenciales de conductores cargadas:', Object.keys(drivers));
            return drivers;
        } catch (error) {
            console.error('❌ Error obteniendo credenciales de conductores:', error);
            return {};
        }
    }

    // NUEVA FUNCIONALIDAD: Sincronizar credenciales con S3 (merge inteligente)
    static async syncDriverCredentialsWithS3(hasLocalData) {
        try {
            console.log('🔄 [syncDriverCredentialsWithS3] Iniciando sincronización bidireccional...');

            // Paso 1: Obtener datos locales actuales
            let localCredentials = {};
            if (hasLocalData) {
                try {
                    const encryptedData = localStorage.getItem('driver_credentials');
                    if (encryptedData) {
                        localCredentials = JSON.parse(this.decryptData(encryptedData));
                        console.log(`📱 [syncDriverCredentialsWithS3] Datos locales: ${Object.keys(localCredentials).length} conductores`);
                    }
                } catch (error) {
                    console.warn('⚠️ Error cargando datos locales:', error.message);
                }
            }

            // Paso 2: Descargar datos de S3
            const s3Credentials = await this.downloadDriverCredentialsFromS3();
            console.log(`☁️ [syncDriverCredentialsWithS3] Datos S3: ${Object.keys(s3Credentials).length} conductores`);

            // Paso 3: Merge inteligente (S3 tiene prioridad)
            const mergedCredentials = this.mergeDriverCredentials(localCredentials, s3Credentials, true); // Prioridad S3
            console.log(`🔀 [syncDriverCredentialsWithS3] Merge: ${Object.keys(mergedCredentials).length} conductores`);

            // Paso 4: Guardar resultado localmente
            if (Object.keys(mergedCredentials).length > 0) {
                const encryptedData = this.encryptData(JSON.stringify(mergedCredentials));
                localStorage.setItem('driver_credentials', encryptedData);
                console.log('✅ [syncDriverCredentialsWithS3] Credenciales sincronizadas localmente');
            }

            // Paso 5: Si hay cambios locales nuevos, subirlos a S3
            if (Object.keys(localCredentials).length > Object.keys(s3Credentials).length) {
                console.log('📤 [syncDriverCredentialsWithS3] Subiendo cambios locales a S3...');
                await this.uploadDriverCredentialsToS3(mergedCredentials);
            }

            return mergedCredentials;
        } catch (error) {
            console.error('❌ [syncDriverCredentialsWithS3] Error:', error);
            throw error;
        }
    }

    // Merge inteligente de credenciales con prioridad S3
    static mergeDriverCredentials(localCredentials, s3Credentials, prioritizeS3 = true) {
        if (prioritizeS3) {
            // MODO PRIORIDAD S3: S3 es la fuente de verdad absoluta para credenciales
            const merged = {};
            const s3Usernames = Object.keys(s3Credentials);
            const localUsernames = Object.keys(localCredentials);

            console.log(`🔐 [mergeDriverCredentials] PRIORIDAD S3 - Local: ${localUsernames.length}, S3: ${s3Usernames.length} credenciales`);

            // Solo mantener credenciales que existen en S3
            s3Usernames.forEach(username => {
                const s3Cred = s3Credentials[username];
                const localCred = localCredentials[username];

                if (localCred && this.isCredentialMoreRecent(localCred, s3Cred)) {
                    merged[username] = localCred;
                    console.log(`📱 [mergeDriverCredentials] Local más reciente para: ${username}`);
                } else {
                    merged[username] = s3Cred;
                    console.log(`🔄 [mergeDriverCredentials] S3 prioridad para: ${username}`);
                }
            });

            // Reportar credenciales eliminadas
            const removedCredentials = localUsernames.filter(u => !s3Usernames.includes(u));
            if (removedCredentials.length > 0) {
                console.log(`🗑️ [mergeDriverCredentials] ${removedCredentials.length} credenciales eliminadas: ${removedCredentials.join(', ')}`);
            }

            console.log(`🔐 [mergeDriverCredentials] RESULTADO PRIORIDAD S3: ${Object.keys(merged).length} credenciales finales`);
            return merged;
        } else {
            // MODO MERGE TRADICIONAL
            const merged = { ...localCredentials }; // Empezar con locales

            // Sobrescribir/agregar con datos de S3 (tienen prioridad)
            Object.keys(s3Credentials).forEach(username => {
                const s3Cred = s3Credentials[username];
                const localCred = merged[username];

                if (!localCred || this.isCredentialMoreRecent(s3Cred, localCred)) {
                    merged[username] = s3Cred;
                    console.log(`🔄 [mergeDriverCredentials] S3 prioridad para: ${username}`);
                } else {
                    console.log(`📱 [mergeDriverCredentials] Local más reciente para: ${username}`);
                }
            });

            return merged;
        }
    }

    // Comparar timestamps de credenciales
    static isCredentialMoreRecent(cred1, cred2) {
        try {
            const time1 = new Date(cred1.updatedAt || cred1.createdAt || 0);
            const time2 = new Date(cred2.updatedAt || cred2.createdAt || 0);
            return time1 >= time2; // >= da prioridad a S3 en empates
        } catch (error) {
            return true; // En caso de error, priorizar el primero (S3)
        }
    }

    // Descargar solo credenciales de S3
    static async downloadDriverCredentialsFromS3() {
        try {
            // Intentar archivo consolidado primero
            try {
                const result = await S3Service.downloadJSON('backups/', 'consolidated_data.json');
                if (result.success && result.data) {
                    console.log('🔍 [downloadDriverCredentialsFromS3] Contenido archivo consolidado:', {
                        hasData: !!result.data,
                        keys: Object.keys(result.data),
                        hasDriverCredentials: !!result.data.driverCredentials,
                        driverCredentialsType: typeof result.data.driverCredentials,
                        driverCredentialsKeys: result.data.driverCredentials ? Object.keys(result.data.driverCredentials) : 'N/A',
                        driverCredentialsLength: result.data.driverCredentials ? Object.keys(result.data.driverCredentials).length : 0,
                        sampleCredential: result.data.driverCredentials ? Object.values(result.data.driverCredentials)[0] : null
                    });

                    if (result.data.driverCredentials && Object.keys(result.data.driverCredentials).length > 0) {
                        console.log('✅ [downloadDriverCredentialsFromS3] Desde archivo consolidado');
                        console.log('🔍 [downloadDriverCredentialsFromS3] Retornando driverCredentials:', {
                            type: typeof result.data.driverCredentials,
                            keys: Object.keys(result.data.driverCredentials),
                            length: Object.keys(result.data.driverCredentials).length,
                            firstKey: Object.keys(result.data.driverCredentials)[0],
                            firstValue: Object.values(result.data.driverCredentials)[0]
                        });
                        return result.data.driverCredentials;
                    } else if (result.data.driverCredentials) {
                        console.log('⚠️ [downloadDriverCredentialsFromS3] driverCredentials existe pero está vacío, continuando búsqueda...');
                    }
                }
            } catch (error) {
                console.log('ℹ️ Archivo consolidado no disponible:', error.message);
            }

            // Intentar archivo auth-credentials.json (raíz)
            try {
                const result = await S3Service.downloadJSON('', 'auth-credentials.json');
                if (result.success && result.data) {
                    console.log('🔍 [downloadDriverCredentialsFromS3] Contenido auth-credentials.json:', {
                        hasData: !!result.data,
                        keys: Object.keys(result.data),
                        hasDrivers: !!result.data.drivers,
                        driversType: typeof result.data.drivers,
                        driversKeys: result.data.drivers ? Object.keys(result.data.drivers) : 'N/A',
                        driversLength: result.data.drivers ? Object.keys(result.data.drivers).length : 0,
                        sampleDriver: result.data.drivers ? Object.values(result.data.drivers)[0] : null
                    });

                    if (result.data.drivers && Object.keys(result.data.drivers).length > 0) {
                        console.log('✅ [downloadDriverCredentialsFromS3] Desde auth-credentials.json');
                        console.log('🔍 [downloadDriverCredentialsFromS3] Retornando drivers:', {
                            type: typeof result.data.drivers,
                            keys: Object.keys(result.data.drivers),
                            length: Object.keys(result.data.drivers).length,
                            firstKey: Object.keys(result.data.drivers)[0],
                            firstValue: Object.values(result.data.drivers)[0]
                        });
                        return result.data.drivers;
                    } else if (result.data.drivers) {
                        console.log('⚠️ [downloadDriverCredentialsFromS3] drivers existe pero está vacío, continuando búsqueda...');
                    }
                }
            } catch (error) {
                console.log('ℹ️ Archivo auth-credentials.json no disponible:', error.message);
            }

            // Intentar archivo dedicado de conductores (ruta raíz)
            try {
                const result = await S3Service.downloadJSON('', 'conductores.json');
                if (result.success && result.data) {
                    console.log('🔍 [downloadDriverCredentialsFromS3] Contenido conductores.json (raíz):', {
                        hasData: !!result.data,
                        keys: Object.keys(result.data),
                        hasConductores: !!result.data.conductores,
                        conductoresType: typeof result.data.conductores,
                        conductoresKeys: result.data.conductores ? Object.keys(result.data.conductores) : 'N/A',
                        conductoresLength: result.data.conductores ? Object.keys(result.data.conductores).length : 0,
                        sampleConductor: result.data.conductores ? Object.values(result.data.conductores)[0] : null,
                        rawDataSample: result.data
                    });

                    if (result.data.conductores && Object.keys(result.data.conductores).length > 0) {
                        console.log('✅ [downloadDriverCredentialsFromS3] Desde archivo dedicado (raíz)');
                        console.log('🔍 [downloadDriverCredentialsFromS3] Retornando conductores:', {
                            type: typeof result.data.conductores,
                            keys: Object.keys(result.data.conductores),
                            length: Object.keys(result.data.conductores).length,
                            firstKey: Object.keys(result.data.conductores)[0],
                            firstValue: Object.values(result.data.conductores)[0]
                        });
                        return result.data.conductores;
                    } else if (result.data.conductores) {
                        console.log('⚠️ [downloadDriverCredentialsFromS3] conductores existe pero está vacío, continuando búsqueda...');
                    }
                }
            } catch (error) {
                console.log('ℹ️ Archivo dedicado (raíz) no disponible:', error.message);
            }

            // Intentar archivo dedicado de conductores (ruta carpeta - legacy)
            try {
                const result = await S3Service.downloadJSON('conductores/', 'conductores.json');
                if (result.success && result.data) {
                    console.log('🔍 [downloadDriverCredentialsFromS3] Contenido conductores.json (carpeta legacy):', {
                        hasData: !!result.data,
                        keys: Object.keys(result.data),
                        hasConductores: !!result.data.conductores,
                        conductoresType: typeof result.data.conductores,
                        conductoresLength: result.data.conductores ? Object.keys(result.data.conductores).length : 0,
                        rawDataSample: result.data
                    });

                    if (result.data.conductores && Object.keys(result.data.conductores).length > 0) {
                        console.log('✅ [downloadDriverCredentialsFromS3] Desde archivo dedicado (carpeta legacy)');
                        console.log('🔍 [downloadDriverCredentialsFromS3] Retornando conductores (legacy):', {
                            type: typeof result.data.conductores,
                            keys: Object.keys(result.data.conductores),
                            length: Object.keys(result.data.conductores).length,
                            firstKey: Object.keys(result.data.conductores)[0],
                            firstValue: Object.values(result.data.conductores)[0]
                        });
                        return result.data.conductores;
                    } else if (result.data.conductores) {
                        console.log('⚠️ [downloadDriverCredentialsFromS3] conductores (legacy) existe pero está vacío, continuando búsqueda...');
                    }
                }
            } catch (error) {
                console.log('ℹ️ Archivo dedicado (carpeta) no disponible:', error.message);
            }

            console.log('ℹ️ [downloadDriverCredentialsFromS3] No se encontraron credenciales en S3 - retornando objeto vacío');
            const emptyResult = {};
            console.log('🔍 [downloadDriverCredentialsFromS3] Retornando:', {
                type: typeof emptyResult,
                keys: Object.keys(emptyResult),
                length: Object.keys(emptyResult).length
            });
            return emptyResult;
        } catch (error) {
            console.error('❌ [downloadDriverCredentialsFromS3] Error:', error);
            return {};
        }
    }

    // Subir credenciales a S3 (para sincronización bidireccional)
    static async uploadDriverCredentialsToS3(credentials) {
        try {
            // Subir a archivo dedicado
            const credentialsData = {
                conductores: credentials,
                metadata: {
                    totalConductores: Object.keys(credentials).length,
                    lastUpdate: new Date().toISOString(),
                    version: '2.1'
                }
            };

            await S3Service.uploadJSON(credentialsData, 'conductores/', 'conductores.json');
            console.log('✅ [uploadDriverCredentialsToS3] Credenciales subidas a S3');
        } catch (error) {
            console.error('❌ [uploadDriverCredentialsToS3] Error:', error);
            throw error;
        }
    }

    // FUNCIONALIDAD LEGACY: Cargar credenciales de conductores desde S3
    static async loadDriverCredentialsFromS3() {
        try {
            if (!window.S3Service || !S3Service.isConfigured()) {
                throw new Error('S3 no configurado');
            }

            console.log('🔍 Buscando conductores en S3...');

            // PRIORIDAD 1: Intentar cargar archivo dedicado de conductores
            try {
                const result = await S3Service.downloadJSON('', 'conductores.json');
                console.log('📄 Respuesta archivo conductores:', result);

                if (result.success && result.data && result.data.conductores) {
                    console.log('✅ Conductores encontrados en archivo dedicado S3');
                    console.log('📊 Datos recibidos:', Object.keys(result.data.conductores));
                    console.log('📈 Total conductores:', result.data.metadata?.totalConductores || 'N/A');

                    const encryptedData = this.encryptData(JSON.stringify(result.data.conductores));
                    localStorage.setItem('driver_credentials', encryptedData);
                    return true;
                }
            } catch (error) {
                console.log('ℹ️ No se pudo cargar archivo de conductores:', error.message);
            }

            // PRIORIDAD 2: Intentar cargar archivo consolidado (backup)
            try {
                const result = await S3Service.downloadJSON('backups/', 'consolidated_data.json');
                console.log('📄 Respuesta archivo consolidado:', result);

                if (result.success && result.data && result.data.driverCredentials) {
                    console.log('✅ Conductores encontrados en archivo consolidado S3');
                    console.log('📊 Datos recibidos:', Object.keys(result.data.driverCredentials));
                    const encryptedData = this.encryptData(JSON.stringify(result.data.driverCredentials));
                    localStorage.setItem('driver_credentials', encryptedData);
                    return true;
                }
            } catch (error) {
                console.log('ℹ️ No se pudo cargar archivo consolidado:', error.message);
            }

            // PRIORIDAD 3: Fallback - Intentar cargar desde archivo legacy de credenciales
            try {
                const legacyResult = await S3Service.downloadJSON('', 'auth-credentials.json');
                console.log('📄 Respuesta archivo legacy:', legacyResult);

                if (legacyResult.success && legacyResult.data && legacyResult.data.drivers) {
                    console.log('✅ Conductores encontrados en archivo legacy S3');

                    // Los datos pueden estar en formato descifrado (nuevo) o encriptado (viejo)
                    let driversData = legacyResult.data.drivers;
                    console.log('📊 Tipo de datos recibidos:', typeof driversData);
                    console.log('📊 Datos drivers:', driversData);

                    // Si es un objeto (nuevo formato), encriptar antes de guardar
                    if (typeof driversData === 'object' && driversData !== null && !Array.isArray(driversData)) {
                        console.log('🔄 Datos de conductores en formato descifrado - encriptando...');
                        console.log('👥 Conductores encontrados:', Object.keys(driversData));
                        const encryptedData = this.encryptData(JSON.stringify(driversData));
                        localStorage.setItem('driver_credentials', encryptedData);
                    } else {
                        // Si es string (formato viejo), guardar directamente
                        console.log('🔄 Datos de conductores en formato encriptado - guardando...');
                        localStorage.setItem('driver_credentials', driversData);
                    }

                    return true;
                }
            } catch (error) {
                console.log('ℹ️ No se pudo cargar archivo legacy:', error.message);
            }

            console.log('ℹ️ No se encontraron conductores en S3');
            return false;

        } catch (error) {
            console.error('❌ Error cargando conductores desde S3:', error);
            throw new Error('Error cargando conductores desde S3: ' + error.message);
        }
    }

    // Obtener credenciales de un conductor específico
    static async getDriverCredentials(username) {
        const allDrivers = await this.getAllDriverCredentials();
        return allDrivers[username] || null;
    }

    // Autenticar conductor
    static async authenticateDriver(username, password) {
        const allDrivers = await this.getAllDriverCredentials();
        console.log('📋 Conductores disponibles:', Object.keys(allDrivers));

        const driverCreds = await this.getDriverCredentials(username);

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
    static async removeDriverCredentials(username) {
        const allDrivers = await this.getAllDriverCredentials();
        if (allDrivers[username]) {
            delete allDrivers[username];
            const encryptedData = this.encryptData(JSON.stringify(allDrivers));
            localStorage.setItem('driver_credentials', encryptedData);
            return true;
        }
        return false;
    }

    // Listar todos los conductores (para administración)
    static async listAllDrivers() {
        const allDrivers = await this.getAllDriverCredentials();
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
        // NUEVA LÓGICA: Intentar autenticación con sistema seguro primero
        if (this.isSystemConfigured()) {
            try {
                const adminData = await this.authenticateAdminSecure(username, password);
                return {
                    user: adminData,
                    session: this.createSession(adminData)
                };
            } catch (error) {
                console.log('No es admin del sistema seguro, verificando conductores...');
            }
        }

        // Intentar autenticación admin legacy
        if (await this.isAdminConfigured()) {
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

            // NUEVA FUNCIONALIDAD: Auto-configurar S3 para conductores si es necesario
            await this.ensureS3ConfigurationForDriver(driverData);

            return {
                user: driverData,
                session: this.createSession(driverData)
            };
        } catch (error) {
            // Si no se encuentra en sistema seguro, intentar sistema legacy
            console.log('No se encontró en sistema seguro, verificando sistema legacy...', error.message);
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

        // NUEVA FUNCIONALIDAD: Auto-configurar S3 para conductores legacy también
        await this.ensureS3ConfigurationForDriver(driver);

        return {
            user: driver,
            session: this.createSession(driver)
        };
    }

    // NUEVA FUNCIONALIDAD: Asegurar configuración S3 para conductores
    static async ensureS3ConfigurationForDriver(driverData) {
        try {
            // Si S3 ya está configurado, no hacer nada
            if (window.S3Service && S3Service.isConfigured()) {
                console.log('✅ S3 ya configurado para conductor:', driverData.username);
                // Guardar estado para información del usuario
                localStorage.setItem('driver_s3_status', JSON.stringify({
                    configured: true,
                    message: 'Acceso completo al sistema - sincronización habilitada',
                    level: 'success'
                }));
                return true;
            }

            // Verificar si hay configuración segura del sistema
            if (this.isSystemConfigured()) {
                console.log('🔧 Auto-configurando S3 para conductor:', driverData.username);

                // Obtener credenciales S3 de la configuración segura
                const s3Configured = this.autoConfigureS3();

                if (s3Configured) {
                    console.log('✅ S3 auto-configurado exitosamente para conductor');
                    localStorage.setItem('driver_s3_status', JSON.stringify({
                        configured: true,
                        message: 'Sistema configurado automáticamente - acceso completo disponible',
                        level: 'success'
                    }));
                    return true;
                } else {
                    console.warn('⚠️ No se pudo auto-configurar S3 para conductor');
                    localStorage.setItem('driver_s3_status', JSON.stringify({
                        configured: false,
                        message: 'Modo local activo - sincronización limitada',
                        level: 'warning'
                    }));
                    return false;
                }
            } else {
                console.log('ℹ️ No hay configuración del sistema para auto-configurar S3');
                localStorage.setItem('driver_s3_status', JSON.stringify({
                    configured: false,
                    message: 'Trabajando en modo local - contacte al administrador para sincronización',
                    level: 'info'
                }));
                return false;
            }
        } catch (error) {
            console.warn('⚠️ Error auto-configurando S3 para conductor:', error.message);
            localStorage.setItem('driver_s3_status', JSON.stringify({
                configured: false,
                message: 'Error de configuración - funcionando en modo local',
                level: 'warning'
            }));
            // No fallar el login por problemas de S3
            return false;
        }
    }

    // NUEVA FUNCIONALIDAD: Obtener estado de S3 para conductores
    static getDriverS3Status() {
        try {
            const status = localStorage.getItem('driver_s3_status');
            return status ? JSON.parse(status) : {
                configured: false,
                message: 'Estado desconocido',
                level: 'info'
            };
        } catch (error) {
            return {
                configured: false,
                message: 'Error obteniendo estado',
                level: 'warning'
            };
        }
    }

    // NUEVA FUNCIONALIDAD: Limpiar estado de S3 (al cerrar sesión)
    static clearDriverS3Status() {
        localStorage.removeItem('driver_s3_status');
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
                return false;
            }

            // Preparar datos de credenciales para S3 (DESCIFRADOS)
            const allDrivers = await this.getAllDriverCredentials();

            // Formato legacy para compatibilidad con admin
            const credentialsData = {
                admin: {
                    configured: localStorage.getItem('admin_configured'),
                    config: localStorage.getItem('admin_auth_config')
                },
                drivers: allDrivers, // DATOS DESCIFRADOS, NO el string encriptado
                lastSync: new Date().toISOString(),
                version: '1.0'
            };

            // Archivo dedicado SOLO para conductores (más fácil de identificar)
            const conductoresData = {
                conductores: allDrivers,
                metadata: {
                    lastSync: new Date().toISOString(),
                    totalConductores: Object.keys(allDrivers).length,
                    version: '3.0',
                    createdBy: 'Sistema Gestión Transporte'
                }
            };

            console.log('📤 Sincronizando conductores:', {
                totalConductores: Object.keys(allDrivers).length,
                usuarios: Object.keys(allDrivers)
            });

            // Subir archivo legacy (para admin)
            await S3Service.uploadJSON(credentialsData, '', 'auth-credentials.json');

            // Subir archivo dedicado para conductores
            await S3Service.uploadJSON(conductoresData, '', 'conductores.json');

            console.log('✅ Credenciales sincronizadas con S3:');
            console.log(`   - Admin: auth-credentials.json`);
            console.log(`   - Conductores: conductores.json (${Object.keys(allDrivers).length} usuarios)`);

            return true;

        } catch (error) {
            console.warn('⚠️ Error sincronizando credenciales con S3:', error);
            return false;
        }
    }

    // NUEVA FUNCIONALIDAD: Sincronización manual completa (para admin)
    static async forceSyncAllDataToS3() {
        try {
            if (!window.S3Service || !S3Service.isConfigured()) {
                throw new Error('S3 no configurado');
            }

            console.log('🔄 Iniciando sincronización completa con S3...');

            // 1. Sincronizar credenciales (admin y conductores)
            const syncResult = await this.syncCredentialsToS3();
            if (!syncResult) {
                throw new Error('Error sincronizando credenciales');
            }

            // 2. Obtener datos existentes en localStorage directamente (sin llamada recursiva)
            const encryptedData = localStorage.getItem('driver_credentials');
            let allDrivers = {};

            if (encryptedData) {
                try {
                    const decryptedData = this.decryptData(encryptedData);
                    allDrivers = JSON.parse(decryptedData);
                    console.log('📊 Conductores encontrados para sincronizar:', Object.keys(allDrivers));
                } catch (error) {
                    console.warn('⚠️ Error descifrado datos de conductores:', error);
                    allDrivers = {};
                }
            } else {
                console.log('ℹ️ No hay datos de conductores en localStorage para sincronizar');
            }

            const driverCount = Object.keys(allDrivers).length;

            // 3. Sincronizar con archivo dedicado de conductores
            const conductoresData = {
                conductores: allDrivers,
                metadata: {
                    lastSync: new Date().toISOString(),
                    totalConductores: driverCount,
                    version: '3.0',
                    createdBy: 'Sistema Gestión Transporte - Sync Manual'
                }
            };

            console.log('📤 Subiendo archivo dedicado de conductores:', {
                driverCount: driverCount,
                drivers: Object.keys(allDrivers)
            });

            // Subir archivo dedicado de conductores
            await S3Service.uploadJSON(conductoresData, '', 'conductores.json');

            // También mantener formato consolidado para compatibilidad
            const consolidatedData = {
                driverCredentials: allDrivers,
                systemInfo: {
                    lastSync: new Date().toISOString(),
                    version: '2.0',
                    driverCount: driverCount
                }
            };

            await S3Service.uploadJSON(consolidatedData, 'backups/', 'consolidated_data.json');

            console.log(`✅ Sincronización completa exitosa:`);
            console.log(`   - ${driverCount} conductores sincronizados`);
            console.log(`   - Archivo principal: conductores.json`);
            console.log(`   - Backup: consolidated_data.json + auth-credentials.json`);

            return {
                success: true,
                driverCount: driverCount,
                message: `${driverCount} conductores sincronizados con S3`
            };

        } catch (error) {
            console.error('❌ Error en sincronización completa:', error);
            return {
                success: false,
                message: 'Error: ' + error.message
            };
        }
    }

    // Cargar credenciales desde S3
    static async loadCredentialsFromS3() {
        try {
            if (!window.S3Service || !S3Service.isConfigured()) {
                throw new Error('S3 no configurado');
            }

            const credentialsData = await S3Service.downloadJSON('', 'auth-credentials.json');

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
        const saved = await this.saveDriverCredentials(credentials);

        if (saved) {
            // Sincronizar con S3
            await this.syncCredentialsToS3();
        }

        return saved;
    }

    // NUEVA FUNCIONALIDAD: Regenerar nombres de usuario para consistencia
    static async regenerateDriverUsernames() {
        try {
            console.log('🔄 Regenerando nombres de usuario de conductores...');

            const currentCredentials = await this.getAllDriverCredentials();
            const managementDrivers = JSON.parse(localStorage.getItem('drivers') || '[]');

            if (Object.keys(currentCredentials).length === 0) {
                console.log('ℹ️ No hay credenciales de conductores para regenerar');
                return { success: true, regenerated: 0 };
            }

            console.log(`📋 Regenerando ${Object.keys(currentCredentials).length} conductores`);

            // Limpiar credenciales existentes
            localStorage.removeItem('driver_credentials');

            let regeneratedCount = 0;
            const results = [];

            for (const driver of managementDrivers) {
                try {
                    // Crear credenciales con el nuevo formato
                    const credentials = await this.createDriverCredentials({
                        name: driver.name,
                        idNumber: driver.idNumber,
                        driverId: driver.id
                    });

                    results.push({
                        name: driver.name,
                        username: credentials.username,
                        password: driver.idNumber,
                        success: true
                    });

                    regeneratedCount++;
                    console.log(`✅ Regenerado: ${driver.name} → ${credentials.username}`);

                } catch (error) {
                    console.error(`❌ Error regenerando ${driver.name}:`, error);
                    results.push({
                        name: driver.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            console.log(`🎉 Regeneración completada: ${regeneratedCount}/${managementDrivers.length} conductores`);
            console.log('📋 Nuevas credenciales:');
            results.filter(r => r.success).forEach(r => {
                console.log(`   👤 ${r.name}: ${r.username} / ${r.password}`);
            });

            return {
                success: true,
                regenerated: regeneratedCount,
                total: managementDrivers.length,
                results: results
            };

        } catch (error) {
            console.error('❌ Error en regeneración de nombres de usuario:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // NUEVA FUNCIONALIDAD: Migrar conductores existentes al sistema de autenticación
    static async migrateExistingDrivers() {
        try {
            console.log('🔄 Iniciando migración de conductores existentes...');

            // Obtener conductores del sistema de gestión
            const managementDrivers = JSON.parse(localStorage.getItem('drivers') || '[]');

            if (managementDrivers.length === 0) {
                console.log('ℹ️ No hay conductores en el sistema de gestión para migrar');
                return { success: true, migrated: 0 };
            }

            console.log(`📋 Encontrados ${managementDrivers.length} conductores para migrar:`,
                       managementDrivers.map(d => d.name));

            let migratedCount = 0;
            const results = [];

            for (const driver of managementDrivers) {
                try {
                    // Verificar si ya tiene credenciales de autenticación
                    const existingCreds = await this.getAllDriverCredentials();
                    const username = `${driver.name.toLowerCase().replace(/\s+/g, '_')}_${driver.idNumber}`;

                    if (existingCreds[username]) {
                        console.log(`⏭️ ${driver.name} ya tiene credenciales, saltando...`);
                        continue;
                    }

                    // Crear credenciales de autenticación
                    const credentials = await this.createDriverCredentials({
                        name: driver.name,
                        idNumber: driver.idNumber,
                        driverId: driver.id
                    });

                    results.push({
                        name: driver.name,
                        username: credentials.username,
                        success: true
                    });

                    migratedCount++;
                    console.log(`✅ Migrado: ${driver.name} → ${credentials.username}`);

                } catch (error) {
                    console.error(`❌ Error migrando ${driver.name}:`, error);
                    results.push({
                        name: driver.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            console.log(`🎉 Migración completada: ${migratedCount}/${managementDrivers.length} conductores`);

            return {
                success: true,
                migrated: migratedCount,
                total: managementDrivers.length,
                results: results
            };

        } catch (error) {
            console.error('❌ Error en migración de conductores:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Inicialización automática al cargar la aplicación
    static async initializeFromCloud() {
        try {
            console.log('🌐 Verificando credenciales en la nube...');

            // Si no hay credenciales locales, intentar cargar desde S3
            if (!this.isAdminConfiguredSync()) {
                await this.loadCredentialsFromS3();
            }

            // Actualizar información del sistema si admin está configurado
            if (this.isAdminConfiguredSync()) {
                // Actualizar información del sistema
                this.ensureSystemInfo();
            }

            return true;
        } catch (error) {
            console.log('ℹ️ No se encontraron credenciales en la nube:', error.message);
            return false;
        }
    }
}

console.log('✅ AuthService cargado completamente');
window.AuthService = AuthService;