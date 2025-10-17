/**
 * Servicio de almacenamiento - Gestión centralizada de localStorage
 */
class StorageService {
    static keys = {
        VEHICLES: 'vehicles',
        DRIVERS: 'drivers',
        EXPENSES: 'expenses',
        FREIGHTS: 'freights',
        RECEIPTS: 'receipts',
        VEHICLE_DOCUMENTS: 'vehicleDocuments',
        DOCUMENT_FILES: 'documentFiles',
        SYSTEM_USERS: 'systemUsers',
        USER_SESSION: 'userSession',
        USER_SETTINGS: 'userSettings',
        APPLICATION_STATE: 'applicationState',
        S3_SYNC_STATUS: 's3SyncStatus',
        LAST_S3_SYNC: 'lastS3Sync',
        DELETED_ITEMS: 'deletedItems' // Registro de items eliminados (tombstones)
    };

    static s3Config = {
        autoSync: true,
        autoSyncOnLogin: true, // NUEVO: Auto-sync al login (recomendado)
        syncInterval: 1800000, // 30 minutos (optimizado para costos)
        syncOnChange: true, // CAMBIADO: Habilitado para sincronización inmediata
        consolidateFiles: true, // Usar archivo único consolidado
        useCompression: true, // Comprimir datos JSON
        lastDataHash: null // Para detectar cambios reales
    };

    // Métodos genéricos
    static get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error(`Error al leer ${key} del localStorage:`, error);
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error al guardar ${key} en localStorage:`, error);
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error al eliminar ${key} del localStorage:`, error);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error al limpiar localStorage:', error);
            return false;
        }
    }

    static exists(key) {
        return localStorage.getItem(key) !== null;
    }

    static getSize(key) {
        const data = localStorage.getItem(key);
        return data ? data.length : 0;
    }

    static getTotalSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length;
            }
        }
        return total;
    }

    // ==================== TOMBSTONES (Registro de Eliminaciones) ====================

    /**
     * Registra un item como eliminado (tombstone)
     * @param {string} type - Tipo de entidad (expenses, vehicles, drivers, etc)
     * @param {string|number} itemId - ID del item eliminado
     * @param {string} deletedBy - Usuario que eliminó (opcional)
     */
    static registerDeletion(type, itemId, deletedBy = null) {
        const deletedItems = this.get(this.keys.DELETED_ITEMS, {});

        if (!deletedItems[type]) {
            deletedItems[type] = {};
        }

        deletedItems[type][itemId] = {
            deletedAt: new Date().toISOString(),
            deletedBy: deletedBy || this.getCurrentUser()
        };

        this.set(this.keys.DELETED_ITEMS, deletedItems);
        console.log(`🪦 [Tombstone] Registrado ${type}:${itemId} como eliminado`);
    }

    /**
     * Verifica si un item está marcado como eliminado
     * @param {string} type - Tipo de entidad
     * @param {string|number} itemId - ID del item
     * @returns {boolean}
     */
    static isDeleted(type, itemId) {
        const deletedItems = this.get(this.keys.DELETED_ITEMS, {});
        return deletedItems[type] && deletedItems[type][itemId] !== undefined;
    }

    /**
     * Obtiene todos los items eliminados de un tipo
     * @param {string} type - Tipo de entidad
     * @returns {object}
     */
    static getDeletedItems(type) {
        const deletedItems = this.get(this.keys.DELETED_ITEMS, {});
        return deletedItems[type] || {};
    }

    /**
     * Limpia tombstones antiguos (más de 30 días)
     */
    static cleanOldTombstones() {
        const deletedItems = this.get(this.keys.DELETED_ITEMS, {});
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let cleaned = 0;
        for (const type in deletedItems) {
            for (const itemId in deletedItems[type]) {
                const deletedAt = new Date(deletedItems[type][itemId].deletedAt);
                if (deletedAt < thirtyDaysAgo) {
                    delete deletedItems[type][itemId];
                    cleaned++;
                }
            }
        }

        if (cleaned > 0) {
            this.set(this.keys.DELETED_ITEMS, deletedItems);
            console.log(`🧹 [Tombstones] Limpiados ${cleaned} registros antiguos`);
        }
    }

    /**
     * Obtiene el usuario actual (para registrar quién eliminó)
     */
    static getCurrentUser() {
        const session = this.get(this.keys.USER_SESSION);
        return session ? session.username : 'unknown';
    }

    // ==================== FIN TOMBSTONES ====================

    // Métodos específicos para cada entidad
    static getVehicles() {
        return this.get(this.keys.VEHICLES, []);
    }

    static setVehicles(vehicles) {
        return this.set(this.keys.VEHICLES, vehicles);
    }

    static getDrivers() {
        return this.get(this.keys.DRIVERS, []);
    }

    static setDrivers(drivers) {
        return this.set(this.keys.DRIVERS, drivers);
    }

    static getExpenses() {
        return this.get(this.keys.EXPENSES, []);
    }

    static setExpenses(expenses) {
        return this.set(this.keys.EXPENSES, expenses);
    }

    static getFreights() {
        return this.get(this.keys.FREIGHTS, []);
    }

    static setFreights(freights) {
        return this.set(this.keys.FREIGHTS, freights);
    }

    static getReceipts() {
        return this.get(this.keys.RECEIPTS, {});
    }

    static setReceipts(receipts) {
        return this.set(this.keys.RECEIPTS, receipts);
    }

    static getVehicleDocuments() {
        return this.get(this.keys.VEHICLE_DOCUMENTS, {});
    }

    static setVehicleDocuments(documents) {
        return this.set(this.keys.VEHICLE_DOCUMENTS, documents);
    }

    static getDocumentFiles() {
        return this.get(this.keys.DOCUMENT_FILES, {});
    }

    static setDocumentFiles(files) {
        return this.set(this.keys.DOCUMENT_FILES, files);
    }

    static getSystemUsers() {
        return this.get(this.keys.SYSTEM_USERS, {});
    }

    static setSystemUsers(users) {
        return this.set(this.keys.SYSTEM_USERS, users);
    }

    // Gestión de sesiones
    static getUserSession() {
        try {
            const session = sessionStorage.getItem(this.keys.USER_SESSION);
            return session ? JSON.parse(session) : null;
        } catch (error) {
            console.error('Error al leer sesión:', error);
            return null;
        }
    }

    static setUserSession(sessionData) {
        try {
            sessionStorage.setItem(this.keys.USER_SESSION, JSON.stringify(sessionData));
            return true;
        } catch (error) {
            console.error('Error al guardar sesión:', error);
            return false;
        }
    }

    static clearUserSession() {
        try {
            sessionStorage.removeItem(this.keys.USER_SESSION);
            return true;
        } catch (error) {
            console.error('Error al limpiar sesión:', error);
            return false;
        }
    }

    // Métodos para configuraciones de usuario
    static getUserSettings() {
        return this.get(this.keys.USER_SETTINGS, {});
    }

    static setUserSettings(settings) {
        return this.set(this.keys.USER_SETTINGS, settings);
    }

    // Métodos para estado de la aplicación
    static getApplicationState() {
        return this.get(this.keys.APPLICATION_STATE, {});
    }

    static setApplicationState(state) {
        return this.set(this.keys.APPLICATION_STATE, state);
    }

    // Backup y restore
    static exportData() {
        const data = {
            vehicles: this.getVehicles(),
            drivers: this.getAllDriversForSync(), // NUEVO: Incluir conductores de todas las fuentes
            expenses: this.getExpenses(),
            freights: this.getFreights(),
            receipts: this.getReceipts(),
            vehicleDocuments: this.getVehicleDocuments(),
            documentFiles: this.getDocumentFiles(),
            systemUsers: this.getSystemUsers(),
            deletedItems: this.get(this.keys.DELETED_ITEMS, {}), // TOMBSTONES
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        return data;
    }

    static importData(data) {
        try {
            console.log('📥 [StorageService.importData] Iniciando importación con merge inteligente...');

            // PRIMERO: Importar tombstones (marcas de eliminación)
            if (data.deletedItems) {
                this.mergeTombstones(data.deletedItems);
            }

            // DESPUÉS: Importar datos (respetando tombstones)
            if (data.vehicles) this.mergeVehicles(data.vehicles);
            if (data.drivers) this.mergeDrivers(data.drivers, true); // Prioridad S3
            if (data.expenses) this.mergeExpenses(data.expenses);
            if (data.freights) this.mergeFreights(data.freights);
            if (data.receipts) this.mergeReceipts(data.receipts);
            if (data.vehicleDocuments) this.mergeVehicleDocuments(data.vehicleDocuments);
            if (data.documentFiles) this.mergeDocumentFiles(data.documentFiles);
            if (data.systemUsers) this.setSystemUsers(data.systemUsers); // SystemUsers siempre sobrescribe

            console.log('✅ [StorageService.importData] Importación completada exitosamente');
            return true;
        } catch (error) {
            console.error('❌ [StorageService.importData] Error al importar datos:', error);
            return false;
        }
    }

    static mergeTombstones(s3Tombstones) {
        try {
            const localTombstones = this.get(this.keys.DELETED_ITEMS, {});
            const merged = { ...localTombstones };

            // Merge: agregar tombstones de S3 que no tenemos
            for (const type in s3Tombstones) {
                if (!merged[type]) {
                    merged[type] = {};
                }
                for (const itemId in s3Tombstones[type]) {
                    // Solo agregar si no existe o si el de S3 es más reciente
                    if (!merged[type][itemId]) {
                        merged[type][itemId] = s3Tombstones[type][itemId];
                        console.log(`🪦 [mergeTombstones] Agregado tombstone de S3: ${type}:${itemId}`);
                    }
                }
            }

            this.set(this.keys.DELETED_ITEMS, merged);
            console.log(`✅ [mergeTombstones] Tombstones sincronizados`);
        } catch (error) {
            console.error('❌ [mergeTombstones] Error:', error);
        }
    }

    // ===== SISTEMA DE MERGE INTELIGENTE CON PRIORIDAD S3 =====
    /*
     * PROBLEMA RESUELTO: Evitar pérdida de información al sincronizar entre equipos
     *
     * ANTES:
     * - syncFromS3() sobrescribía datos locales completamente
     * - syncToS3() sobrescribía datos de S3 completamente
     * - Si se iniciaba desde equipo sin datos locales, se perdían datos de S3
     * - Credenciales de conductores NO se sincronizaban con datos de conductores
     *
     * DESPUÉS:
     * - Merge inteligente que combina datos de TODAS las fuentes
     * - S3 tiene prioridad en caso de empate de timestamps
     * - Preserva datos más recientes independiente de su origen
     * - Sistema fail-safe: si falla merge, usa solo datos de S3
     * - NUEVO: Unificación de conductores de localStorage.drivers + localStorage.driver_credentials
     *
     * FUNCIONAMIENTO:
     * 1. Al iniciar sesión: SIEMPRE descarga de S3 primero (merge)
     * 2. Durante operación: Los cambios se suben a S3 inmediatamente
     * 3. Merge por timestamp: El dato más reciente prevalece
     * 4. En empates: S3 tiene prioridad (source of truth)
     * 5. NUEVO: Unificación automática de conductores de múltiples fuentes:
     *    - localStorage.drivers (datos del perfil)
     *    - localStorage.driver_credentials (credenciales de AuthService)
     *    - S3 (datos remotos)
     *    - Resultado: Vista unificada y consistente
     */

    // ===== MÉTODOS DE MERGE INTELIGENTE CON PRIORIDAD S3 =====

    static mergeVehicles(s3Vehicles) {
        try {
            const localVehicles = this.getVehicles();
            const merged = this.mergeByTimestamp(localVehicles, s3Vehicles, 'updatedAt', 'id', 'vehicles');

            console.log(`🚗 [mergeVehicles] Local: ${localVehicles.length}, S3: ${s3Vehicles.length}, Merged: ${merged.length}`);
            this.setVehiclesDirectly(merged); // Evitar auto-sync circular
            return merged;
        } catch (error) {
            console.error('❌ [mergeVehicles] Error:', error);
            this.setVehiclesDirectly(s3Vehicles); // Fallback: usar solo S3
            return s3Vehicles;
        }
    }

    static mergeDrivers(s3Drivers, prioritizeS3 = true) {
        try {
            const localDrivers = this.getDrivers();

            // NUEVO: También obtener conductores de las credenciales de AuthService
            const driverCredentials = this.getDriverCredentialsAsDrivers();

            // Obtener tombstones (conductores eliminados)
            const deletedDrivers = this.getDeletedItems('drivers');
            const deletedDriverIds = Object.keys(deletedDrivers);

            if (prioritizeS3) {
                // MODO PRIORIDAD S3: Merge inteligente con protección contra falsos positivos
                console.log(`👥 [mergeDrivers] PRIORIDAD S3 - Local: ${localDrivers.length}, Credenciales: ${driverCredentials.length}, S3: ${s3Drivers.length}`);
                if (deletedDriverIds.length > 0) {
                    console.log(`🪦 [mergeDrivers] Tombstones detectados: ${deletedDriverIds.length} conductores eliminados`);
                }

                const s3Usernames = new Set(s3Drivers.map(d => d.username));
                const allLocalDrivers = this.combineDriverSources(localDrivers, driverCredentials);

                // Obtener timestamp de última sincronización exitosa
                const lastSyncTime = this.getLastSuccessfulSyncTime();

                // Iniciar con conductores de S3, EXCLUYENDO los eliminados
                const merged = s3Drivers.filter(driver => {
                    if (this.isDeleted('drivers', driver.id)) {
                        console.log(`🪦 [mergeDrivers] Ignorando conductor eliminado de S3: ${driver.username} (ID: ${driver.id})`);
                        return false;
                    }
                    return true;
                });

                // Para cada conductor en S3, usar versión local más reciente si existe
                merged.forEach((s3Driver, index) => {
                    const localVersion = allLocalDrivers.find(d => d.username === s3Driver.username);
                    if (localVersion && this.isMoreRecent(localVersion, s3Driver, 'updatedAt')) {
                        console.log(`📝 [mergeDrivers] Usando versión local más reciente para: ${s3Driver.username}`);
                        merged[index] = localVersion;
                    }
                });

                // ANÁLISIS INTELIGENTE: Conductores locales que no están en S3
                const missingFromS3 = allLocalDrivers.filter(d => !s3Usernames.has(d.username));

                missingFromS3.forEach(localDriver => {
                    const driverCreatedAt = new Date(localDriver.createdAt || localDriver.updatedAt || 0);
                    const driverUpdatedAt = new Date(localDriver.updatedAt || localDriver.createdAt || 0);

                    // REGLA 1: Si el conductor es más nuevo que la última sincronización exitosa, probablemente es nuevo
                    if (lastSyncTime && driverCreatedAt > lastSyncTime) {
                        console.log(`➕ [mergeDrivers] Conservando conductor nuevo no sincronizado: ${localDriver.username} (creado: ${driverCreatedAt.toISOString()})`);
                        merged.push(localDriver);
                    }
                    // REGLA 2: Si nunca hemos sincronizado exitosamente, conservar todos los conductores locales
                    else if (!lastSyncTime) {
                        console.log(`➕ [mergeDrivers] Primera sincronización - conservando conductor local: ${localDriver.username}`);
                        merged.push(localDriver);
                    }
                    // REGLA 3: Si el conductor es anterior a la última sync pero tiene cambios recientes, podría ser eliminado o editado
                    else if (driverUpdatedAt > lastSyncTime) {
                        console.log(`⚠️ [mergeDrivers] Conductor editado localmente pero ausente en S3: ${localDriver.username} - CONSERVANDO por seguridad`);
                        merged.push(localDriver);
                    }
                    // REGLA 4: Solo considerar "eliminado" si es anterior a la última sync y sin cambios recientes
                    else {
                        console.log(`🗑️ [mergeDrivers] Conductor eliminado desde otro equipo: ${localDriver.username} (creado: ${driverCreatedAt.toISOString()}, última sync: ${lastSyncTime.toISOString()})`);
                    }
                });

                console.log(`👥 [mergeDrivers] RESULTADO PRIORIDAD S3 INTELIGENTE: ${merged.length} conductores finales`);
                this.setDriversDirectly(merged);
                return merged;
            } else {
                // MODO MERGE TRADICIONAL: Combinar todas las fuentes
                const allLocalDrivers = this.combineDriverSources(localDrivers, driverCredentials);
                const merged = this.mergeByTimestamp(allLocalDrivers, s3Drivers, 'updatedAt', 'id', 'drivers');

                console.log(`👥 [mergeDrivers] MERGE TRADICIONAL - Local: ${localDrivers.length}, Credenciales: ${driverCredentials.length}, S3: ${s3Drivers.length}, Merged: ${merged.length}`);
                this.setDriversDirectly(merged);
                return merged;
            }
        } catch (error) {
            console.error('❌ [mergeDrivers] Error:', error);
            this.setDriversDirectly(s3Drivers); // Fallback: usar solo S3
            return s3Drivers;
        }
    }

    // NUEVO: Obtener conductores desde las credenciales de AuthService
    static getDriverCredentialsAsDrivers() {
        try {
            if (!window.AuthService) return [];

            const encryptedData = localStorage.getItem('driver_credentials');
            if (!encryptedData) return [];

            const credentials = JSON.parse(window.AuthService.decryptData(encryptedData));
            if (!credentials || typeof credentials !== 'object') return [];

            const drivers = [];

            Object.values(credentials).forEach(cred => {
                if (cred.driverId && cred.name) {
                    // Convertir credencial a formato Driver
                    drivers.push({
                        id: cred.driverId,
                        name: cred.name,
                        username: cred.username,
                        idNumber: cred.idNumber || '',
                        licenseNumber: '',
                        licenseCategory: 'B1',
                        licenseExpiry: '',
                        phone: '',
                        email: '',
                        address: '',
                        vehicleId: null,
                        isActive: cred.isActive !== false,
                        createdAt: cred.createdAt || new Date().toISOString(),
                        updatedAt: cred.updatedAt || cred.createdAt || new Date().toISOString(),
                        source: 'credentials' // Marcar origen
                    });
                }
            });

            return drivers;
        } catch (error) {
            console.warn('⚠️ [getDriverCredentialsAsDrivers] Error obteniendo conductores de credenciales:', error);
            return [];
        }
    }

    // NUEVO: Combinar datos de conductores de múltiples fuentes
    static combineDriverSources(localDrivers, credentialDrivers) {
        const combined = new Map();

        // Primero agregar conductores locales (prioridad baja)
        localDrivers.forEach(driver => {
            if (driver.id) {
                combined.set(driver.id, { ...driver, source: 'local' });
            }
        });

        // Luego agregar/mergear conductores de credenciales (prioridad alta)
        credentialDrivers.forEach(credDriver => {
            const existingDriver = combined.get(credDriver.id);

            if (existingDriver) {
                // Merge: mantener datos locales pero actualizar info de credenciales
                combined.set(credDriver.id, {
                    ...existingDriver,
                    name: credDriver.name, // Nombre de credenciales tiene prioridad
                    username: credDriver.username,
                    idNumber: credDriver.idNumber,
                    isActive: credDriver.isActive,
                    updatedAt: this.isMoreRecent(credDriver, existingDriver, 'updatedAt')
                        ? credDriver.updatedAt
                        : existingDriver.updatedAt,
                    source: 'merged'
                });
            } else {
                // Conductor solo en credenciales
                combined.set(credDriver.id, credDriver);
            }
        });

        return Array.from(combined.values());
    }

    static mergeExpenses(s3Expenses) {
        try {
            const localExpenses = this.getExpenses();
            const merged = this.mergeByTimestamp(localExpenses, s3Expenses, 'updatedAt', 'id', 'expenses');

            console.log(`💰 [mergeExpenses] Local: ${localExpenses.length}, S3: ${s3Expenses.length}, Merged: ${merged.length}`);
            this.setExpensesDirectly(merged); // Evitar auto-sync circular
            return merged;
        } catch (error) {
            console.error('❌ [mergeExpenses] Error:', error);
            this.setExpensesDirectly(s3Expenses); // Fallback: usar solo S3
            return s3Expenses;
        }
    }

    static mergeFreights(s3Freights) {
        try {
            const localFreights = this.getFreights();
            const merged = this.mergeByTimestamp(localFreights, s3Freights, 'updatedAt', 'id', 'freights');

            console.log(`🚛 [mergeFreights] Local: ${localFreights.length}, S3: ${s3Freights.length}, Merged: ${merged.length}`);
            this.setFreightsDirectly(merged); // Evitar auto-sync circular
            return merged;
        } catch (error) {
            console.error('❌ [mergeFreights] Error:', error);
            this.setFreightsDirectly(s3Freights); // Fallback: usar solo S3
            return s3Freights;
        }
    }

    static mergeReceipts(s3Receipts) {
        try {
            const localReceipts = this.getReceipts();
            const merged = { ...localReceipts, ...s3Receipts }; // S3 tiene prioridad

            const localCount = Object.keys(localReceipts).length;
            const s3Count = Object.keys(s3Receipts).length;
            const mergedCount = Object.keys(merged).length;

            console.log(`📄 [mergeReceipts] Local: ${localCount}, S3: ${s3Count}, Merged: ${mergedCount}`);
            this.set(this.keys.RECEIPTS, merged); // Receipts no tienen auto-sync agresivo
            return merged;
        } catch (error) {
            console.error('❌ [mergeReceipts] Error:', error);
            this.set(this.keys.RECEIPTS, s3Receipts); // Fallback: usar solo S3
            return s3Receipts;
        }
    }

    static mergeVehicleDocuments(s3Documents) {
        try {
            const localDocuments = this.getVehicleDocuments();

            // Para documentos, merge por vehículo y tipo, S3 tiene prioridad por timestamp
            const merged = { ...localDocuments };

            Object.keys(s3Documents).forEach(vehicleId => {
                if (!merged[vehicleId]) {
                    merged[vehicleId] = {};
                }

                Object.keys(s3Documents[vehicleId]).forEach(docType => {
                    const s3Doc = s3Documents[vehicleId][docType];
                    const localDoc = merged[vehicleId][docType];

                    // Si S3 tiene documento y (no hay local O S3 es más reciente)
                    if (s3Doc && (!localDoc || this.isMoreRecent(s3Doc, localDoc, 'updatedAt'))) {
                        merged[vehicleId][docType] = s3Doc;
                    }
                });
            });

            const localVehicleCount = Object.keys(localDocuments).length;
            const s3VehicleCount = Object.keys(s3Documents).length;
            const mergedVehicleCount = Object.keys(merged).length;

            console.log(`📋 [mergeVehicleDocuments] Local vehicles: ${localVehicleCount}, S3 vehicles: ${s3VehicleCount}, Merged vehicles: ${mergedVehicleCount}`);
            this.set(this.keys.VEHICLE_DOCUMENTS, merged);
            return merged;
        } catch (error) {
            console.error('❌ [mergeVehicleDocuments] Error:', error);
            this.set(this.keys.VEHICLE_DOCUMENTS, s3Documents); // Fallback: usar solo S3
            return s3Documents;
        }
    }

    static mergeDocumentFiles(s3Files) {
        try {
            const localFiles = this.getDocumentFiles();
            const merged = { ...localFiles, ...s3Files }; // S3 tiene prioridad

            const localCount = Object.keys(localFiles).length;
            const s3Count = Object.keys(s3Files).length;
            const mergedCount = Object.keys(merged).length;

            console.log(`📁 [mergeDocumentFiles] Local: ${localCount}, S3: ${s3Count}, Merged: ${mergedCount}`);
            this.set(this.keys.DOCUMENT_FILES, merged);
            return merged;
        } catch (error) {
            console.error('❌ [mergeDocumentFiles] Error:', error);
            this.set(this.keys.DOCUMENT_FILES, s3Files); // Fallback: usar solo S3
            return s3Files;
        }
    }

    // Método genérico para merge por timestamp CON DETECCIÓN DE ELIMINACIONES
    static mergeByTimestamp(localArray, s3Array, timestampField, uniqueField, entityType = null) {
        const merged = new Map();
        const lastSyncTime = this.getLastSuccessfulSyncTime();
        const deletedItems = entityType ? this.getDeletedItems(entityType) : {};

        console.log(`🔀 [mergeByTimestamp] Iniciando merge - Local: ${localArray.length}, S3: ${s3Array.length}, Última sync: ${lastSyncTime?.toISOString() || 'nunca'}`);
        if (entityType && Object.keys(deletedItems).length > 0) {
            console.log(`🪦 [mergeByTimestamp] Tombstones detectados: ${Object.keys(deletedItems).length} para ${entityType}`);
        }

        // PASO 1: Agregar TODOS los ítems de S3 (base de verdad), EXCEPTO los marcados como eliminados
        s3Array.forEach(s3Item => {
            if (s3Item[uniqueField]) {
                const itemId = s3Item[uniqueField];
                // Verificar si este item está en el registro de eliminaciones
                if (entityType && this.isDeleted(entityType, itemId)) {
                    console.log(`🪦 [mergeByTimestamp] Ignorando item eliminado de S3: ${uniqueField}=${itemId}`);
                    return; // No agregar items eliminados
                }
                merged.set(itemId, s3Item);
            }
        });

        // PASO 2: Procesar ítems locales
        localArray.forEach(localItem => {
            if (!localItem[uniqueField]) return;

            const key = localItem[uniqueField];
            const s3Item = merged.get(key);

            // CASO 1: Ítem existe en S3 - comparar timestamps para usar el más reciente
            if (s3Item) {
                if (this.isMoreRecent(localItem, s3Item, timestampField)) {
                    merged.set(key, localItem);
                    console.log(`📝 [mergeByTimestamp] Local más reciente: ${uniqueField}=${key}`);
                }
                // Si S3 es más reciente o igual, ya está en merged (paso 1)
            }
            // CASO 2: Ítem NO existe en S3 - detectar si es nuevo o fue eliminado
            else {
                // Si nunca hemos sincronizado, conservar todo lo local (primera vez)
                if (!lastSyncTime) {
                    merged.set(key, localItem);
                    console.log(`➕ [mergeByTimestamp] Primera sync - conservando local: ${uniqueField}=${key}`);
                }
                // Si ya hemos sincronizado, verificar si es nuevo o eliminado
                else {
                    const itemCreatedAt = new Date(localItem.createdAt || localItem[timestampField]);
                    const itemUpdatedAt = new Date(localItem.updatedAt || localItem[timestampField]);

                    // Si fue creado DESPUÉS de la última sync, es un ítem nuevo local
                    if (itemCreatedAt > lastSyncTime) {
                        merged.set(key, localItem);
                        console.log(`➕ [mergeByTimestamp] Nuevo local (creado después de sync): ${uniqueField}=${key}`);
                    }
                    // Si fue actualizado DESPUÉS de la última sync pero creado antes, verificar
                    else if (itemUpdatedAt > lastSyncTime) {
                        // Ítem antiguo pero con cambios recientes - conservar por seguridad
                        merged.set(key, localItem);
                        console.log(`⚠️ [mergeByTimestamp] Actualizado localmente después de sync: ${uniqueField}=${key}`);
                    }
                    // Si fue creado ANTES de la última sync y no está en S3 = eliminado remotamente
                    else {
                        console.log(`🗑️ [mergeByTimestamp] ELIMINADO remotamente: ${uniqueField}=${key} (creado: ${itemCreatedAt.toISOString()}, última sync: ${lastSyncTime.toISOString()})`);
                        // NO agregarlo a merged - respetamos la eliminación remota
                    }
                }
            }
        });

        console.log(`✅ [mergeByTimestamp] Merge completado - Resultado: ${merged.size} ítems`);
        return Array.from(merged.values());
    }

    // Comparar timestamps - S3 tiene prioridad en empates
    static isMoreRecent(item1, item2, timestampField) {
        try {
            const timestamp1 = item1[timestampField] ? new Date(item1[timestampField]) : new Date(0);
            const timestamp2 = item2[timestampField] ? new Date(item2[timestampField]) : new Date(0);
            return timestamp1 >= timestamp2; // >= da prioridad a S3 en empates
        } catch (error) {
            console.warn(`⚠️ [isMoreRecent] Error comparando timestamps:`, error);
            return true; // En caso de error, dar prioridad al primer item (S3)
        }
    }

    // NUEVO: Obtener TODOS los conductores para sync (local + credenciales)
    static getAllDriversForSync() {
        try {
            const localDrivers = this.getDrivers();
            const credentialDrivers = this.getDriverCredentialsAsDrivers();
            const allDrivers = this.combineDriverSources(localDrivers, credentialDrivers);

            console.log(`🔄 [getAllDriversForSync] Combinando: Local: ${localDrivers.length}, Credenciales: ${credentialDrivers.length}, Total: ${allDrivers.length}`);
            return allDrivers;
        } catch (error) {
            console.error('❌ [getAllDriversForSync] Error:', error);
            return this.getDrivers(); // Fallback: usar solo locales
        }
    }

    // Métodos directos para evitar auto-sync circular durante merge
    static setVehiclesDirectly(vehicles) {
        return this.set(this.keys.VEHICLES, vehicles);
    }

    static setDriversDirectly(drivers) {
        return this.set(this.keys.DRIVERS, drivers);
    }

    static setExpensesDirectly(expenses) {
        return this.set(this.keys.EXPENSES, expenses);
    }

    static setFreightsDirectly(freights) {
        return this.set(this.keys.FREIGHTS, freights);
    }

    static downloadBackup() {
        const data = this.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_gestion_transporte_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Limpieza y mantenimiento
    static cleanupExpiredSessions() {
        // Limpiar sesiones expiradas si es necesario
        const session = this.getUserSession();
        if (session && session.loginTime) {
            const loginTime = new Date(session.loginTime);
            const now = new Date();
            const hoursElapsed = (now - loginTime) / (1000 * 60 * 60);
            
            // Expirar sesiones después de 24 horas de inactividad
            if (hoursElapsed > 24) {
                this.clearUserSession();
                return true;
            }
        }
        return false;
    }

    static cleanupOldReceipts() {
        const receipts = this.getReceipts();
        const expenses = this.getExpenses();
        const documentFiles = this.getDocumentFiles();
        
        // Obtener IDs de recibos en uso
        const usedReceiptIds = new Set();
        expenses.forEach(expense => {
            if (expense.receiptId) usedReceiptIds.add(expense.receiptId);
        });
        
        // Obtener IDs de archivos de documentos en uso
        const vehicleDocuments = this.getVehicleDocuments();
        Object.values(vehicleDocuments).forEach(vehicleDocs => {
            Object.values(vehicleDocs).forEach(doc => {
                if (doc.fileId) usedReceiptIds.add(doc.fileId);
            });
        });
        
        // Eliminar recibos no utilizados
        let cleanedReceipts = {};
        let cleanedFiles = {};
        let deletedCount = 0;
        
        Object.entries(receipts).forEach(([id, data]) => {
            if (usedReceiptIds.has(id)) {
                cleanedReceipts[id] = data;
            } else {
                deletedCount++;
            }
        });
        
        Object.entries(documentFiles).forEach(([id, data]) => {
            if (usedReceiptIds.has(id)) {
                cleanedFiles[id] = data;
            } else {
                deletedCount++;
            }
        });
        
        if (deletedCount > 0) {
            this.setReceipts(cleanedReceipts);
            this.setDocumentFiles(cleanedFiles);
        }
        
        return deletedCount;
    }

    // Información del almacenamiento
    static getStorageInfo() {
        const info = {
            totalSize: this.getTotalSize(),
            itemCount: localStorage.length,
            items: {}
        };
        
        Object.values(this.keys).forEach(key => {
            if (this.exists(key)) {
                info.items[key] = {
                    size: this.getSize(key),
                    exists: true
                };
            } else {
                info.items[key] = {
                    size: 0,
                    exists: false
                };
            }
        });
        
        return info;
    }

    // Verificar cuota de almacenamiento
    static checkStorageQuota() {
        try {
            const testKey = '__storage_test__';
            const testData = new Array(1024).join('a'); // 1KB de datos
            localStorage.setItem(testKey, testData);
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('Almacenamiento localStorage lleno o no disponible:', error);
            return false;
        }
    }

    // Métodos de sincronización S3
    static async syncWithS3(force = false) {
        if (!window.S3Service) {
            console.error('❌ S3Service no disponible en window. Servicios disponibles:', Object.keys(window).filter(key => key.includes('Service')));
            return false;
        }

        if (!S3Service.isConfigured()) {
            console.warn('⚠️ S3Service no está configurado correctamente');
            return false;
        }

        try {
            const lastSync = this.get(this.keys.LAST_S3_SYNC);
            const now = Date.now();

            // Verificar si es necesario sincronizar
            if (!force && lastSync && (now - lastSync) < this.s3Config.syncInterval) {
                console.log('⏭️ Sincronización omitida - intervalo no alcanzado');
                return true;
            }

            console.log('🔄 [syncWithS3] Iniciando sincronización BIDIRECCIONAL con S3...');

            // PASO 1: Descargar y hacer merge con datos de S3 PRIMERO (evitar sobrescribir cambios remotos)
            console.log('📥 [syncWithS3] Paso 1: Descargando datos de S3 para merge...');
            try {
                await this.loadFromS3();
                console.log('✅ [syncWithS3] Merge con datos de S3 completado');
            } catch (downloadError) {
                console.warn('⚠️ [syncWithS3] Error en merge con S3:', downloadError.message);
                // Continuar con la subida aunque falle el merge (primera vez puede no haber datos)
            }

            // PASO 2: Subir datos combinados a S3
            console.log('📤 [syncWithS3] Paso 2: Subiendo datos combinados a S3...');
            const result = await S3Service.syncToS3();

            if (result.success) {
                this.set(this.keys.LAST_S3_SYNC, now);
                // Usar el método unified para marcar sincronización exitosa
                this.setLastSuccessfulSyncTime(now);
                console.log('✅ [syncWithS3] Sincronización bidireccional exitosa');
                return true;
            } else {
                this.set(this.keys.S3_SYNC_STATUS, {
                    lastSync: now,
                    status: 'error',
                    message: result.error
                });
                console.error('❌ [syncWithS3] Error en sincronización:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ [syncWithS3] Error sincronizando:', error);
            this.set(this.keys.S3_SYNC_STATUS, {
                lastSync: Date.now(),
                status: 'error',
                message: error.message
            });
            return false;
        }
    }

    // Métodos para tracking de sincronización inteligente
    static getLastSuccessfulSyncTime() {
        try {
            const syncStatus = this.get(this.keys.S3_SYNC_STATUS);
            if (syncStatus && (syncStatus.status === 'success' || syncStatus.status === 'loaded') && syncStatus.lastSync) {
                const lastSync = new Date(syncStatus.lastSync);
                console.log(`🕒 [getLastSuccessfulSyncTime] Última sincronización exitosa: ${lastSync.toISOString()}`);
                return lastSync;
            }
            console.log(`🕒 [getLastSuccessfulSyncTime] No hay sincronización exitosa previa`);
            return null;
        } catch (error) {
            console.error('❌ [getLastSuccessfulSyncTime] Error:', error);
            return null;
        }
    }

    static setLastSuccessfulSyncTime(timestamp = Date.now()) {
        try {
            const syncStatus = this.get(this.keys.S3_SYNC_STATUS) || {};
            syncStatus.lastSync = timestamp;
            syncStatus.status = 'success';
            syncStatus.message = 'Sincronización completada exitosamente';
            this.set(this.keys.S3_SYNC_STATUS, syncStatus);
            console.log(`✅ [setLastSuccessfulSyncTime] Marcado: ${new Date(timestamp).toISOString()}`);
        } catch (error) {
            console.error('❌ [setLastSuccessfulSyncTime] Error:', error);
        }
    }

    static async loadFromS3() {
        if (!window.S3Service) {
            console.warn('S3Service no disponible');
            return false;
        }

        try {
            console.log('Cargando datos desde S3...');
            const result = await S3Service.syncFromS3();

            if (result.success) {
                // Marcar como sincronización exitosa para el merge inteligente
                this.setLastSuccessfulSyncTime();
                console.log('Datos cargados desde S3 exitosamente');

                // Disparar evento de actualización
                window.dispatchEvent(new CustomEvent('dataUpdated', {
                    detail: { source: 'S3', message: result.message }
                }));

                return true;
            } else {
                console.error('Error cargando desde S3:', result.error);
                return false;
            }
        } catch (error) {
            console.error('Error cargando desde S3:', error);
            return false;
        }
    }

    static getS3SyncStatus() {
        return this.get(this.keys.S3_SYNC_STATUS, {
            lastSync: null,
            status: 'never',
            message: 'Nunca sincronizado'
        });
    }

    static enableAutoSync() {
        this.s3Config.autoSync = true;
        this.scheduleAutoSync();
    }

    static disableAutoSync() {
        this.s3Config.autoSync = false;
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    static scheduleAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        if (this.s3Config.autoSync) {
            console.log(`⏰ Auto-sync programado cada ${this.s3Config.syncInterval / 60000} minutos`);
            this.syncInterval = setInterval(async () => {
                await this.syncWithS3(false);
            }, this.s3Config.syncInterval);
        }
    }

    // Extender métodos existentes para incluir sincronización automática
    static setVehicles(vehicles) {
        const result = this.set(this.keys.VEHICLES, vehicles);
        if (result && this.s3Config.syncOnChange) {
            console.log('🔄 Auto-sincronizando vehículos...');
            setTimeout(() => this.syncWithS3(true), 1000);
        }
        return result;
    }

    static setDrivers(drivers) {
        const result = this.set(this.keys.DRIVERS, drivers);
        if (result && this.s3Config.syncOnChange) {
            console.log('🔄 Auto-sincronizando conductores...');
            setTimeout(() => {
                this.syncWithS3(true);
            }, 1000);
        }
        return result;
    }

    static setExpenses(expenses) {
        const result = this.set(this.keys.EXPENSES, expenses);
        if (result && this.s3Config.syncOnChange) {
            console.log('🔄 Auto-sincronizando gastos...');
            setTimeout(() => {
                this.syncWithS3(true);
                // También sincronizar recibos mensuales
                this.syncCurrentMonthReceipts();
            }, 1000);
        }
        return result;
    }

    static setFreights(freights) {
        const result = this.set(this.keys.FREIGHTS, freights);
        if (result && this.s3Config.syncOnChange) {
            console.log('🔄 Auto-sincronizando fletes...');
            setTimeout(() => this.syncWithS3(true), 1000);
        }
        return result;
    }

    // Backup completo a S3
    static async createS3Backup() {
        if (!window.S3Service) {
            console.warn('S3Service no disponible');
            return false;
        }

        try {
            const result = await S3Service.uploadBackup();
            return result;
        } catch (error) {
            console.error('Error creando backup en S3:', error);
            return { success: false, error: error.message };
        }
    }

    static async restoreFromS3Backup() {
        if (!window.S3Service) {
            console.warn('S3Service no disponible');
            return false;
        }

        try {
            const result = await S3Service.downloadLatestBackup();

            if (result.success) {
                // Importar los datos del backup
                const imported = this.importData(result.data);

                if (imported) {
                    console.log('Backup restaurado exitosamente desde S3');

                    // Disparar evento de actualización
                    window.dispatchEvent(new CustomEvent('dataUpdated', {
                        detail: {
                            source: 'S3Backup',
                            filename: result.filename,
                            lastModified: result.lastModified
                        }
                    }));

                    return {
                        success: true,
                        filename: result.filename,
                        lastModified: result.lastModified
                    };
                }
            }

            return result;
        } catch (error) {
            console.error('Error restaurando backup desde S3:', error);
            return { success: false, error: error.message };
        }
    }

    // Inicialización
    static initialize() {
        // Verificar disponibilidad de localStorage
        if (!window.localStorage) {
            throw new Error('localStorage no está disponible');
        }

        // Limpiar sesiones expiradas
        this.cleanupExpiredSessions();

        // Verificar cuota
        if (!this.checkStorageQuota()) {
            console.warn('Advertencia: El almacenamiento localStorage está cerca del límite');
        }

        // Inicializar sincronización automática con S3
        if (this.s3Config.autoSync && window.S3Service) {
            this.scheduleAutoSync();
            console.log('Sincronización automática con S3 habilitada');
        }

        return true;
    }

    // ===== INTEGRACIÓN CON SISTEMA MENSUAL DE RECIBOS =====

    // Sincronizar recibos del mes actual
    static async syncCurrentMonthReceipts() {
        if (!window.S3Service || !S3Service.isConfigured()) {
            return { success: false, error: 'S3 no configurado' };
        }

        try {
            return await S3Service.uploadCurrentMonthReceipts();
        } catch (error) {
            console.error('❌ Error sincronizando recibos mensuales:', error);
            return { success: false, error: error.message };
        }
    }

    // Cargar recibos del mes actual desde S3
    static async loadCurrentMonthReceipts() {
        if (!window.S3Service || !S3Service.isConfigured()) {
            return {};
        }

        try {
            return await S3Service.loadCurrentMonthReceipts();
        } catch (error) {
            // Si es NoSuchKey, es normal (estructura mensual no existe aún)
            if (error.code === 'NoSuchKey' || error.message?.includes('NoSuchKey')) {
                console.log('📁 Estructura mensual no encontrada - se creará automáticamente al agregar recibos');
                return {};
            }
            console.error('❌ Error cargando recibos del mes actual:', error);
            return {};
        }
    }

    // Cargar recibos de un mes específico
    static async loadMonthlyReceipts(year, month) {
        if (!window.S3Service || !S3Service.isConfigured()) {
            return {};
        }

        try {
            const receipts = await S3Service.loadMonthlyReceipts(year, month);

            // Combinar con recibos existentes sin sobrescribir
            const existing = this.getReceipts() || {};
            const combined = { ...existing, ...receipts };
            this.setReceipts(combined);

            return receipts;
        } catch (error) {
            console.error(`❌ Error cargando recibos de ${year}-${month}:`, error);
            return {};
        }
    }

    // Obtener lista de meses disponibles en S3
    static async getAvailableReceiptMonths() {
        if (!window.S3Service || !S3Service.isConfigured()) {
            return [];
        }

        try {
            return await S3Service.getAvailableMonths();
        } catch (error) {
            // Si es NoSuchKey, es normal (índice no existe aún)
            if (error.code === 'NoSuchKey' || error.message?.includes('NoSuchKey')) {
                console.log('📁 Índice de meses no encontrado - usa "Migrar a Estructura Mensual" en configuración S3');
                return [];
            }
            console.error('❌ Error obteniendo meses disponibles:', error);
            return [];
        }
    }

    // Migrar recibos existentes a estructura mensual
    static async migrateReceiptsToMonthly() {
        if (!window.S3Service || !S3Service.isConfigured()) {
            return { success: false, error: 'S3 no configurado' };
        }

        try {
            return await S3Service.migrateReceiptsToMonthly();
        } catch (error) {
            console.error('❌ Error en migración de recibos:', error);
            return { success: false, error: error.message };
        }
    }
}

// Asegurar que StorageService esté disponible globalmente
window.StorageService = StorageService;