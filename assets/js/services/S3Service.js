/**
 * Servicio AWS S3 - Gestión de almacenamiento en la nube
 */
class S3Service {
    static config = {
        bucket: 'mi-app-sighu', // Bucket por defecto - se puede cambiar
        region: 'sa-east-1', // Región por defecto - se puede cambiar
        accessKeyId: null, // Se configura dinámicamente
        secretAccessKey: null, // Se configura dinámicamente
        basePrefix: 'gestion-transporte/'
    };

    // Configuración segura de credenciales
    static setCredentials(accessKeyId, secretAccessKey, bucket = null) {
        this.config.accessKeyId = accessKeyId;
        this.config.secretAccessKey = secretAccessKey;
        if (bucket) this.config.bucket = bucket;

        // Guardar encriptado en localStorage
        const credentials = {
            accessKeyId: this.simpleEncrypt(accessKeyId),
            secretAccessKey: this.simpleEncrypt(secretAccessKey),
            bucket: bucket || this.config.bucket,
            configuredAt: new Date().toISOString()
        };

        localStorage.setItem('aws_s3_config', JSON.stringify(credentials));
        console.log('✅ Credenciales AWS configuradas correctamente');
    }

    static loadStoredCredentials() {
        try {
            const stored = localStorage.getItem('aws_s3_config');
            if (stored) {
                const credentials = JSON.parse(stored);
                console.log('🔄 Cargando credenciales almacenadas...');

                try {
                    this.config.accessKeyId = this.simpleDecrypt(credentials.accessKeyId);
                    this.config.secretAccessKey = this.simpleDecrypt(credentials.secretAccessKey);
                    this.config.bucket = credentials.bucket;

                    console.log('✅ Credenciales cargadas:', {
                        accessKeyId: this.config.accessKeyId ? `${this.config.accessKeyId.substring(0, 4)}...` : 'null',
                        hasSecretKey: !!this.config.secretAccessKey,
                        bucket: this.config.bucket
                    });

                    return true;
                } catch (decryptError) {
                    console.error('❌ Error desencriptando credenciales:', decryptError);
                    console.log('Datos corruptos, limpiando...');
                    this.clearCredentials();
                    return false;
                }
            }
        } catch (error) {
            console.error('Error cargando credenciales:', error);
        }
        return false;
    }

    static hasCredentials() {
        const hasAccess = this.config.accessKeyId && this.config.secretAccessKey;
        const isValidAccessKey = this.config.accessKeyId &&
                                typeof this.config.accessKeyId === 'string' &&
                                this.config.accessKeyId.startsWith('AKIA');

        return hasAccess && isValidAccessKey;
    }

    static isConfigured() {
        return this.hasCredentials();
    }

    static clearCredentials() {
        this.config.accessKeyId = null;
        this.config.secretAccessKey = null;
        localStorage.removeItem('aws_s3_config');
        console.log('🗑️ Credenciales AWS removidas');
    }

    static getConfigStatus() {
        const hasStored = localStorage.getItem('aws_s3_config') !== null;
        const hasLoaded = this.hasCredentials();

        // Auto-cargar credenciales si están almacenadas pero no cargadas
        if (hasStored && !hasLoaded) {
            console.log('🔄 Auto-cargando credenciales almacenadas...');
            this.loadStoredCredentials();
        }

        return {
            hasStoredCredentials: hasStored,
            hasLoadedCredentials: this.hasCredentials(),
            bucket: this.config.bucket,
            region: this.config.region
        };
    }

    // Encriptación mejorada para credenciales locales
    static simpleEncrypt(text) {
        // Encriptación simple pero más fuerte que el original
        const shift = 13; // ROT13 modificado
        const salt = 'S3Config'; // Salt fijo para consistencia

        // Aplicar salt + shift
        const saltedText = text + salt;
        const encrypted = saltedText.split('').map(char =>
            String.fromCharCode(char.charCodeAt(0) + shift)
        ).join('');

        return btoa(encrypted);
    }

    static simpleDecrypt(encrypted) {
        try {
            const decoded = atob(encrypted);

            // Verificar si es formato original (shift=7, sin salt)
            if (this.isOriginalFormat(decoded)) {
                const shift = 7;
                return decoded.split('').map(char =>
                    String.fromCharCode(char.charCodeAt(0) - shift)
                ).join('');
            }

            // Verificar si es formato fallback (con shift variable)
            if (decoded.includes(':')) {
                const [shiftStr, data] = decoded.split(':', 2);
                const shift = parseInt(shiftStr);
                return data.split('').map(char =>
                    String.fromCharCode(char.charCodeAt(0) - shift)
                ).join('');
            }

            // Formato nuevo (shift=13 con salt)
            const shift = 13;
            const salt = 'S3Config';
            const decrypted = decoded.split('').map(char =>
                String.fromCharCode(char.charCodeAt(0) - shift)
            ).join('');

            // Remover salt del final
            if (decrypted.endsWith(salt)) {
                return decrypted.slice(0, -salt.length);
            }

            // Si no tiene salt, podría ser formato original con shift diferente
            return this.tryOriginalDecrypt(decoded);

        } catch (error) {
            console.error('Error en desencriptación:', error);
            throw new Error('Credenciales corruptas o inválidas');
        }
    }

    static isOriginalFormat(decoded) {
        // Intentar desencriptar con shift=7 y ver si parece una access key
        try {
            const shift = 7;
            const decrypted = decoded.split('').map(char =>
                String.fromCharCode(char.charCodeAt(0) - shift)
            ).join('');
            return decrypted.startsWith('AKIA') && decrypted.length >= 16;
        } catch {
            return false;
        }
    }

    static tryOriginalDecrypt(decoded) {
        // Último intento: formato original
        const shift = 7;
        return decoded.split('').map(char =>
            String.fromCharCode(char.charCodeAt(0) - shift)
        ).join('');
    }


    static prefixes = {
        VEHICLES: 'vehiculos/',
        DRIVERS: 'conductores/',
        EXPENSES: 'gastos/',
        DOCUMENTS: 'documentos/',
        RECEIPTS: 'recibos/',
        RECEIPTS_MONTHLY: 'recibos/{year}/{month}/',
        RECEIPTS_INDEX: 'recibos/index.json',
        BACKUPS: 'backups/',
        IMAGES: 'imagenes/'
    };

    static async initializeAWS() {
        if (!window.AWS) {
            throw new Error('AWS SDK no está disponible. Asegúrate de incluir el script del SDK.');
        }

        // Cargar credenciales almacenadas si existen
        if (!this.hasCredentials()) {
            const loaded = this.loadStoredCredentials();
            if (!loaded) {
                throw new Error('Credenciales AWS no configuradas. Configúralas primero en el panel de S3.');
            }
        }

        if (!this.hasCredentials()) {
            throw new Error('Credenciales AWS inválidas.');
        }

        console.log('🔄 Inicializando AWS S3 con configuración:', {
            bucket: this.config.bucket,
            region: this.config.region,
            hasCredentials: this.hasCredentials()
        });

        AWS.config.update({
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
            region: this.config.region
        });

        this.s3 = new AWS.S3();

        // Verificar credenciales con una operación simple
        try {
            // Usar listObjectsV2 en lugar de headBucket (requiere menos permisos)
            await this.s3.listObjectsV2({
                Bucket: this.config.bucket,
                MaxKeys: 1
            }).promise();
            console.log('✅ Credenciales AWS válidas y bucket accesible');
        } catch (error) {
            console.error('❌ Error verificando bucket:', error);

            // Dar más información sobre el error
            if (error.code === 'NoSuchBucket') {
                throw new Error(`El bucket '${this.config.bucket}' no existe en la región ${this.config.region}`);
            } else if (error.code === 'AccessDenied' || error.statusCode === 403) {
                throw new Error(`Sin permisos para acceder al bucket '${this.config.bucket}'. Verifica permisos IAM.`);
            } else {
                throw new Error(`Error de conexión S3: ${error.message || error.code}`);
            }
        }

        return true;
    }

    static getFullKey(prefix, filename) {
        return `${this.config.basePrefix}${prefix}${filename}`;
    }

    static async uploadFile(file, prefix, filename) {
        try {
            if (!this.s3) {
                await this.initializeAWS();
            }

            const key = this.getFullKey(prefix, filename);

            const params = {
                Bucket: this.config.bucket,
                Key: key,
                Body: file,
                ContentType: file.type || 'application/octet-stream'
            };

            const result = await this.s3.upload(params).promise();

            return {
                success: true,
                url: result.Location,
                key: result.Key,
                etag: result.ETag
            };
        } catch (error) {
            console.error('Error subiendo archivo a S3:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async uploadJSON(data, prefix, filename) {
        try {
            if (!this.s3) {
                await this.initializeAWS();
            }

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            return await this.uploadFile(blob, prefix, filename);
        } catch (error) {
            console.error('Error subiendo JSON a S3:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async downloadFile(prefix, filename) {
        try {
            if (!this.s3) {
                await this.initializeAWS();
            }

            const key = this.getFullKey(prefix, filename);

            const params = {
                Bucket: this.config.bucket,
                Key: key
            };

            const result = await this.s3.getObject(params).promise();

            return {
                success: true,
                data: result.Body,
                contentType: result.ContentType,
                lastModified: result.LastModified
            };
        } catch (error) {
            console.error('Error descargando archivo de S3:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async downloadJSON(prefix, filename) {
        try {
            const result = await this.downloadFile(prefix, filename);

            if (!result.success) {
                return result;
            }

            const jsonString = new TextDecoder().decode(result.data);
            const data = JSON.parse(jsonString);

            return {
                success: true,
                data: data,
                lastModified: result.lastModified
            };
        } catch (error) {
            console.error('Error descargando JSON de S3:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async deleteFile(prefix, filename) {
        try {
            if (!this.s3) {
                await this.initializeAWS();
            }

            const key = this.getFullKey(prefix, filename);

            const params = {
                Bucket: this.config.bucket,
                Key: key
            };

            await this.s3.deleteObject(params).promise();

            return {
                success: true,
                message: 'Archivo eliminado correctamente'
            };
        } catch (error) {
            console.error('Error eliminando archivo de S3:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async listFiles(prefix) {
        try {
            if (!this.s3) {
                await this.initializeAWS();
            }

            const fullPrefix = `${this.config.basePrefix}${prefix}`;

            const params = {
                Bucket: this.config.bucket,
                Prefix: fullPrefix
            };

            const result = await this.s3.listObjectsV2(params).promise();

            const files = result.Contents.map(obj => ({
                key: obj.Key,
                filename: obj.Key.replace(fullPrefix, ''),
                size: obj.Size,
                lastModified: obj.LastModified,
                etag: obj.ETag
            }));

            return {
                success: true,
                files: files,
                count: files.length
            };
        } catch (error) {
            console.error('Error listando archivos de S3:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async uploadBackup() {
        try {
            const backupData = StorageService.exportData();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_${timestamp}.json`;

            const result = await this.uploadJSON(backupData, this.prefixes.BACKUPS, filename);

            if (result.success) {
                console.log('Backup subido exitosamente a S3:', filename);
                return {
                    success: true,
                    filename: filename,
                    url: result.url
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error creando backup en S3:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async downloadLatestBackup() {
        try {
            const listResult = await this.listFiles(this.prefixes.BACKUPS);

            if (!listResult.success || listResult.files.length === 0) {
                return {
                    success: false,
                    error: 'No se encontraron backups en S3'
                };
            }

            const latestBackup = listResult.files
                .filter(file => file.filename.startsWith('backup_') && file.filename.endsWith('.json'))
                .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))[0];

            if (!latestBackup) {
                return {
                    success: false,
                    error: 'No se encontraron archivos de backup válidos'
                };
            }

            const downloadResult = await this.downloadJSON(this.prefixes.BACKUPS, latestBackup.filename);

            if (downloadResult.success) {
                return {
                    success: true,
                    data: downloadResult.data,
                    filename: latestBackup.filename,
                    lastModified: latestBackup.lastModified
                };
            } else {
                throw new Error(downloadResult.error);
            }
        } catch (error) {
            console.error('Error descargando último backup de S3:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async syncToS3() {
        try {
            console.log('Iniciando sincronización optimizada con S3...');

            // Método optimizado: UN SOLO ARCHIVO consolidado
            const consolidatedData = {
                vehicles: StorageService.getVehicles(),
                drivers: StorageService.getAllDriversForSync(), // NUEVO: Incluir conductores de todas las fuentes
                expenses: StorageService.getExpenses(),
                freights: StorageService.getFreights(), // Incluir fletes
                frequentRoutes: StorageService.getFrequentRoutes(), // Incluir rutas frecuentes
                deletedItems: StorageService.get(StorageService.keys.DELETED_ITEMS, {}), // TOMBSTONES
                // Nota: Los recibos ahora se manejan por separado en estructura mensual
                vehicleDocuments: StorageService.getVehicleDocuments(),
                documentFiles: StorageService.getDocumentFiles(),
                systemUsers: StorageService.getSystemUsers(),
                // Incluir credenciales seguras de conductores
                driverCredentials: window.AuthService ? AuthService.getAllDriverCredentials() : {},
                adminConfig: window.AuthService ? AuthService.isAdminConfigured() : false,
                lastUpdate: new Date().toISOString(),
                version: '2.3' // Actualizada para incluir rutas frecuentes
            };

            // Calcular hash para detectar cambios reales
            const dataString = JSON.stringify(consolidatedData);
            const dataHash = this.calculateHash(dataString);

            // Log para debugging
            console.log(`🔍 [S3Service.syncToS3] Hash actual: ${dataHash}`);
            console.log(`🔍 [S3Service.syncToS3] Hash previo: ${StorageService.s3Config.lastDataHash}`);
            console.log(`🔍 [S3Service.syncToS3] Rutas frecuentes: ${consolidatedData.frequentRoutes?.length || 0}`);

            // Solo sincronizar si hay cambios
            if (StorageService.s3Config.lastDataHash === dataHash) {
                console.log('⏭️ No hay cambios desde la última sincronización');
                return {
                    success: true,
                    message: 'Sin cambios - sincronización omitida',
                    timestamp: new Date().toISOString()
                };
            }

            // UNA SOLA petición S3 en lugar de 7
            const result = await this.uploadJSON(
                consolidatedData,
                this.prefixes.BACKUPS,
                'consolidated_data.json'
            );

            if (result.success) {
                // Guardar hash para futuras comparaciones
                StorageService.s3Config.lastDataHash = dataHash;

                console.log('Sincronización optimizada completada (1 petición S3)');
                return {
                    success: true,
                    message: 'Datos sincronizados en archivo consolidado',
                    timestamp: new Date().toISOString(),
                    requests: 1 // Solo 1 petición vs 7 anterior
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error) {
            console.error('Error en sincronización con S3:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    static calculateHash(string) {
        let hash = 0;
        if (string.length === 0) return hash;
        for (let i = 0; i < string.length; i++) {
            const char = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32bit integer
        }
        return hash.toString();
    }

    static async syncFromS3() {
        try {
            console.log('Iniciando descarga optimizada desde S3...');

            // UNA SOLA descarga del archivo consolidado
            const result = await this.downloadJSON(this.prefixes.BACKUPS, 'consolidated_data.json');

            if (result.success) {
                const data = result.data;

                // Restaurar datos usando el nuevo sistema de merge inteligente con prioridad S3
                console.log('🔄 [S3Service.syncFromS3] Aplicando merge inteligente con prioridad S3...');
                StorageService.importData(data); // Usa el nuevo importData con merge inteligente

                // Restaurar credenciales seguras de conductores si están disponibles
                if (data.driverCredentials && window.AuthService) {
                    try {
                        const encryptedData = AuthService.encryptData(JSON.stringify(data.driverCredentials));
                        localStorage.setItem('driver_credentials', encryptedData);
                        console.log(`✅ Credenciales de conductores restauradas: ${Object.keys(data.driverCredentials).length} conductores`);
                    } catch (error) {
                        console.warn('⚠️ Error al restaurar credenciales de conductores:', error.message);
                    }
                }

                console.log('Descarga optimizada completada (1 petición S3)');

                return {
                    success: true,
                    message: 'Datos descargados desde archivo consolidado',
                    downloadedCount: 1,
                    totalCount: 1,
                    lastUpdate: data.lastUpdate
                };
            } else {
                console.warn('Archivo consolidado no encontrado, intentando método legacy...');
                return await this.syncFromS3Legacy();
            }
        } catch (error) {
            console.error('Error en descarga desde S3:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Método legacy para compatibilidad con datos existentes
    static async syncFromS3Legacy() {
        try {
            console.log('Descarga con método legacy...');

            const downloadPromises = [
                this.downloadJSON(this.prefixes.VEHICLES, 'vehicles.json'),
                this.downloadJSON(this.prefixes.DRIVERS, 'drivers.json'),
                this.downloadJSON(this.prefixes.EXPENSES, 'expenses.json'),
                // Nota: Los recibos ahora se cargan por demanda mensual
                this.downloadJSON(this.prefixes.DOCUMENTS, 'vehicle_documents.json'),
                this.downloadJSON(this.prefixes.DOCUMENTS, 'document_files.json'),
                this.downloadJSON(this.prefixes.DRIVERS, 'system_users.json')
            ];

            const results = await Promise.all(downloadPromises);

            // Aplicar merge inteligente para cada tipo de dato con prioridad S3
            console.log('🔄 [S3Service.syncFromS3Legacy] Aplicando merge inteligente con prioridad S3...');

            if (results[0].success && results[0].data) StorageService.mergeVehicles(results[0].data);
            if (results[1].success && results[1].data) StorageService.mergeDrivers(results[1].data, true); // Prioridad S3
            if (results[2].success && results[2].data) StorageService.mergeExpenses(results[2].data);
            if (results[3].success && results[3].data) StorageService.mergeReceipts(results[3].data);
            if (results[4].success && results[4].data) StorageService.mergeVehicleDocuments(results[4].data);
            if (results[5].success && results[5].data) StorageService.mergeDocumentFiles(results[5].data);
            if (results[6].success && results[6].data) StorageService.setSystemUsers(results[6].data); // SystemUsers siempre sobrescribe

            const successfulDownloads = results.filter(result => result.success).length;

            return {
                success: true,
                message: `${successfulDownloads} archivos descargados (método legacy)`,
                downloadedCount: successfulDownloads,
                totalCount: results.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    static async getS3Status() {
        try {
            if (!this.s3) {
                await this.initializeAWS();
            }

            const listResult = await this.listFiles('');

            if (listResult.success) {
                const filesByType = {};
                Object.values(this.prefixes).forEach(prefix => {
                    filesByType[prefix] = listResult.files.filter(file =>
                        file.key.includes(this.config.basePrefix + prefix)
                    ).length;
                });

                return {
                    success: true,
                    connected: true,
                    totalFiles: listResult.count,
                    filesByType: filesByType,
                    bucket: this.config.bucket,
                    region: this.config.region
                };
            } else {
                throw new Error(listResult.error);
            }
        } catch (error) {
            console.error('Error verificando estado de S3:', error);
            return {
                success: false,
                connected: false,
                error: error.message
            };
        }
    }

    // Función para verificar si el bucket existe independientemente de permisos
    static async checkBucketExists() {
        try {
            const response = await fetch(`https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/`, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            return true; // Si no hay error, el bucket probablemente existe
        } catch (error) {
            console.log('Error verificando bucket via fetch:', error);
            return false;
        }
    }

    // ===== NUEVO SISTEMA DE RECIBOS MENSUALES =====

    static getMonthlyPath(year, month) {
        const monthStr = month.toString().padStart(2, '0');
        return this.prefixes.RECEIPTS_MONTHLY
            .replace('{year}', year)
            .replace('{month}', monthStr);
    }

    static getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    static parseMonthKey(monthKey) {
        const [year, month] = monthKey.split('-');
        return { year: parseInt(year), month: parseInt(month) };
    }

    // Cargar índice de recibos disponibles
    static async loadReceiptsIndex() {
        try {
            const result = await this.downloadJSON('recibos/', 'index.json');
            return result.success ? result.data : {};
        } catch (error) {
            // Error silencioso para primera vez
            if (error.code === 'NoSuchKey' || error.message?.includes('NoSuchKey')) {
                return {}; // Índice vacío
            }
            console.log('📋 Índice de recibos no existe, creando uno nuevo');
            return {};
        }
    }

    // Actualizar índice de recibos
    static async updateReceiptsIndex(monthKey, metadata) {
        try {
            const index = await this.loadReceiptsIndex();
            index[monthKey] = {
                count: Object.keys(metadata).length,
                lastUpdate: new Date().toISOString(),
                size: JSON.stringify(metadata).length
            };

            await this.uploadJSON(index, 'recibos/', 'index.json');
            return true;
        } catch (error) {
            console.error('❌ Error actualizando índice de recibos:', error);
            return false;
        }
    }

    // Subir recibos del mes actual
    static async uploadCurrentMonthReceipts() {
        try {
            const currentKey = this.getCurrentMonthKey();
            const { year, month } = this.parseMonthKey(currentKey);
            const receipts = StorageService.getReceipts() || {};

            // Filtrar recibos del mes actual
            const currentMonthReceipts = {};
            const expenses = StorageService.getExpenses() || [];

            Object.keys(receipts).forEach(receiptId => {
                const expense = expenses.find(e => e.receiptId === receiptId);
                if (expense) {
                    const expenseDate = new Date(expense.date);
                    if (expenseDate.getFullYear() === year &&
                        expenseDate.getMonth() + 1 === month) {
                        currentMonthReceipts[receiptId] = receipts[receiptId];
                    }
                }
            });

            if (Object.keys(currentMonthReceipts).length === 0) {
                console.log(`📁 No hay recibos para subir del mes ${currentKey}`);
                return { success: true, message: 'Sin recibos nuevos' };
            }

            // Subir metadatos del mes
            const monthPath = this.getMonthlyPath(year, month);
            const result = await this.uploadJSON(
                currentMonthReceipts,
                monthPath,
                'metadata.json'
            );

            if (result.success) {
                await this.updateReceiptsIndex(currentKey, currentMonthReceipts);
                console.log(`✅ Recibos del mes ${currentKey} sincronizados: ${Object.keys(currentMonthReceipts).length}`);
            }

            return result;
        } catch (error) {
            console.error('❌ Error subiendo recibos mensuales:', error);
            return { success: false, error: error.message };
        }
    }

    // Cargar recibos de un mes específico
    static async loadMonthlyReceipts(year, month) {
        try {
            const monthPath = this.getMonthlyPath(year, month);
            const result = await this.downloadJSON(monthPath, 'metadata.json');

            if (result.success && result.data) {
                console.log(`📥 Cargados ${Object.keys(result.data).length} recibos de ${year}-${month.toString().padStart(2, '0')}`);
                return result.data;
            } else {
                return {};
            }
        } catch (error) {
            // Error silencioso si el mes no existe
            if (error.code === 'NoSuchKey' || error.message?.includes('NoSuchKey')) {
                return {};
            }
            console.error(`❌ Error cargando recibos de ${year}-${month}:`, error);
            return {};
        }
    }

    // Cargar recibos del mes actual automáticamente
    static async loadCurrentMonthReceipts() {
        const currentKey = this.getCurrentMonthKey();
        const { year, month } = this.parseMonthKey(currentKey);

        const receipts = await this.loadMonthlyReceipts(year, month);

        // Combinar con recibos existentes en localStorage
        const existingReceipts = StorageService.getReceipts() || {};
        const combinedReceipts = { ...existingReceipts, ...receipts };

        StorageService.setReceipts(combinedReceipts);
        return receipts;
    }

    // Obtener lista de meses disponibles
    static async getAvailableMonths() {
        const index = await this.loadReceiptsIndex();
        return Object.keys(index).sort().reverse(); // Más recientes primero
    }

    // Migrar recibos existentes a estructura mensual
    static async migrateReceiptsToMonthly() {
        try {
            console.log('🔄 Iniciando migración de recibos a estructura mensual...');

            const receipts = StorageService.getReceipts() || {};
            const expenses = StorageService.getExpenses() || [];

            if (Object.keys(receipts).length === 0) {
                console.log('📁 No hay recibos para migrar');
                return { success: true, message: 'Sin recibos para migrar' };
            }

            // Agrupar recibos por mes
            const receiptsByMonth = {};

            Object.keys(receipts).forEach(receiptId => {
                const expense = expenses.find(e => e.receiptId === receiptId);
                if (expense) {
                    const expenseDate = new Date(expense.date);
                    const monthKey = `${expenseDate.getFullYear()}-${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}`;

                    if (!receiptsByMonth[monthKey]) {
                        receiptsByMonth[monthKey] = {};
                    }
                    receiptsByMonth[monthKey][receiptId] = receipts[receiptId];
                }
            });

            console.log(`📋 Migrando ${Object.keys(receiptsByMonth).length} meses de recibos...`);

            // Subir cada mes por separado
            for (const [monthKey, monthReceipts] of Object.entries(receiptsByMonth)) {
                const { year, month } = this.parseMonthKey(monthKey);
                const monthPath = this.getMonthlyPath(year, month);

                await this.uploadJSON(monthReceipts, monthPath, 'metadata.json');
                await this.updateReceiptsIndex(monthKey, monthReceipts);

                console.log(`✅ Migrado mes ${monthKey}: ${Object.keys(monthReceipts).length} recibos`);
            }

            console.log('🎉 Migración completada exitosamente');
            return { success: true, message: 'Migración completada' };
        } catch (error) {
            console.error('❌ Error en migración:', error);
            return { success: false, error: error.message };
        }
    }
}

// Asegurar que S3Service esté disponible globalmente
window.S3Service = S3Service;