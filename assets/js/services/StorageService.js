/**
 * Servicio de almacenamiento - Gestión centralizada de localStorage
 */
class StorageService {
    static keys = {
        VEHICLES: 'vehicles',
        DRIVERS: 'drivers',
        EXPENSES: 'expenses',
        RECEIPTS: 'receipts',
        VEHICLE_DOCUMENTS: 'vehicleDocuments',
        DOCUMENT_FILES: 'documentFiles',
        SYSTEM_USERS: 'systemUsers',
        USER_SESSION: 'userSession',
        USER_SETTINGS: 'userSettings',
        APPLICATION_STATE: 'applicationState',
        S3_SYNC_STATUS: 's3SyncStatus',
        LAST_S3_SYNC: 'lastS3Sync'
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
            drivers: this.getDrivers(),
            expenses: this.getExpenses(),
            receipts: this.getReceipts(),
            vehicleDocuments: this.getVehicleDocuments(),
            documentFiles: this.getDocumentFiles(),
            systemUsers: this.getSystemUsers(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        return data;
    }

    static importData(data) {
        try {
            if (data.vehicles) this.setVehicles(data.vehicles);
            if (data.drivers) this.setDrivers(data.drivers);
            if (data.expenses) this.setExpenses(data.expenses);
            if (data.receipts) this.setReceipts(data.receipts);
            if (data.vehicleDocuments) this.setVehicleDocuments(data.vehicleDocuments);
            if (data.documentFiles) this.setDocumentFiles(data.documentFiles);
            if (data.systemUsers) this.setSystemUsers(data.systemUsers);
            
            return true;
        } catch (error) {
            console.error('Error al importar datos:', error);
            return false;
        }
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
                return true;
            }

            console.log('Iniciando sincronización con S3...');
            const result = await S3Service.syncToS3();

            if (result.success) {
                this.set(this.keys.LAST_S3_SYNC, now);
                this.set(this.keys.S3_SYNC_STATUS, {
                    lastSync: now,
                    status: 'success',
                    message: result.message
                });
                console.log('Sincronización con S3 exitosa');
                return true;
            } else {
                this.set(this.keys.S3_SYNC_STATUS, {
                    lastSync: now,
                    status: 'error',
                    message: result.error
                });
                console.error('Error en sincronización con S3:', result.error);
                return false;
            }
        } catch (error) {
            console.error('Error sincronizando con S3:', error);
            this.set(this.keys.S3_SYNC_STATUS, {
                lastSync: Date.now(),
                status: 'error',
                message: error.message
            });
            return false;
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
                this.set(this.keys.S3_SYNC_STATUS, {
                    lastSync: Date.now(),
                    status: 'loaded',
                    message: result.message
                });
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
}

// Asegurar que StorageService esté disponible globalmente
window.StorageService = StorageService;