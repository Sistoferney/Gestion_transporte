/**
 * Vista de configuración de S3 - Panel de sincronización con la nube
 */
class S3ConfigView {
    static render() {
        const syncStatus = StorageService.getS3SyncStatus();
        const configStatus = S3Service.getConfigStatus();
        const now = new Date();
        const lastSyncDate = syncStatus.lastSync ? new Date(syncStatus.lastSync) : null;
        const lastSyncText = lastSyncDate
            ? `${lastSyncDate.toLocaleDateString()} ${lastSyncDate.toLocaleTimeString()}`
            : 'Nunca';

        return `
            <div class="s3-config-section">
                <!-- Configuración de credenciales AWS -->
                ${this.renderCredentialsConfig(configStatus)}

                <div class="card">
                    <h3>☁️ Sincronización con AWS S3</h3>

                    <div class="s3-status">
                        <div class="status-item">
                            <strong>Estado:</strong>
                            <span class="status-badge status-${syncStatus.status}">
                                ${this.getStatusText(syncStatus.status)}
                            </span>
                        </div>

                        <div class="status-item">
                            <strong>Última sincronización:</strong>
                            <span>${lastSyncText}</span>
                        </div>

                        <div class="status-item">
                            <strong>Mensaje:</strong>
                            <span>${syncStatus.message || 'Sin información'}</span>
                        </div>
                    </div>

                    <div class="s3-actions">
                        <div class="action-group">
                            <h4>🔄 Sincronización Manual</h4>
                            <p>Sincronizar datos con la nube manualmente</p>
                            <div class="button-row">
                                <button id="syncToS3Btn" class="btn btn-primary">
                                    📤 Subir a S3
                                </button>
                                <button id="syncFromS3Btn" class="btn btn-secondary">
                                    📥 Descargar de S3
                                </button>
                            </div>
                        </div>

                        <div class="action-group">
                            <h4>💾 Backup y Restore</h4>
                            <p>Crear y restaurar copias de seguridad completas</p>
                            <div class="button-row">
                                <button id="createS3BackupBtn" class="btn btn-success">
                                    🗄️ Crear Backup
                                </button>
                                <button id="restoreS3BackupBtn" class="btn btn-warning">
                                    🔄 Restaurar Backup
                                </button>
                            </div>
                        </div>

                        <div class="action-group">
                            <h4>⚙️ Configuración Automática</h4>
                            <p>Control de sincronización automática</p>
                            <div class="toggle-container">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="autoSyncToggle" ${StorageService.s3Config.autoSync ? 'checked' : ''}>
                                    <span class="toggle-slider"></span>
                                    <span class="toggle-label">Sincronización automática (cada 5 min)</span>
                                </label>
                            </div>
                            <div class="toggle-container">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="syncOnChangeToggle" ${StorageService.s3Config.syncOnChange ? 'checked' : ''}>
                                    <span class="toggle-slider"></span>
                                    <span class="toggle-label">Sincronizar al guardar cambios</span>
                                </label>
                            </div>
                        </div>

                        <div class="action-group">
                            <h4>📊 Información S3</h4>
                            <p>Estado de la conexión y archivos en la nube</p>
                            <button id="checkS3StatusBtn" class="btn btn-info">
                                🔍 Verificar Estado S3
                            </button>
                            <div id="s3StatusInfo" class="s3-info-container">
                                <!-- Se llena dinámicamente -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Indicador de progreso -->
                <div id="s3ProgressIndicator" class="progress-indicator" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">Procesando...</div>
                </div>
            </div>
        `;
    }

    static getStatusText(status) {
        const statusMap = {
            'success': '✅ Sincronizado',
            'error': '❌ Error',
            'loaded': '📥 Cargado',
            'never': '⏸️ Sin sincronizar',
            'syncing': '🔄 Sincronizando...'
        };
        return statusMap[status] || status;
    }

    static renderCredentialsConfig(configStatus) {
        const isConfigured = configStatus.hasStoredCredentials;

        if (isConfigured) {
            return `
                <div class="card aws-config-card configured">
                    <h3>🔑 Configuración AWS S3</h3>
                    <div class="aws-status-configured">
                        <div class="status-indicator success">
                            <span class="status-icon">✅</span>
                            <div class="status-text">
                                <strong>AWS S3 Configurado</strong>
                                <p>Bucket: ${configStatus.bucket} (${configStatus.region})</p>
                            </div>
                        </div>
                        <div class="aws-actions-configured">
                            <button id="reconfigureAWSBtn" class="btn btn-secondary">
                                ⚙️ Reconfigurar
                            </button>
                            <button id="clearAWSBtn" class="btn btn-danger">
                                🗑️ Remover
                            </button>
                            <button id="testAWSBtn" class="btn btn-info">
                                🔍 Probar Conexión
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="card aws-config-card not-configured">
                    <h3>🔑 Configurar AWS S3</h3>
                    <div class="aws-config-form">
                        <div class="config-warning">
                            <span class="warning-icon">⚠️</span>
                            <p><strong>Credenciales AWS requeridas</strong><br>
                            Configure sus credenciales AWS para habilitar la sincronización en la nube.</p>
                        </div>

                        <form id="awsConfigForm">
                            <div class="form-group">
                                <label for="awsAccessKey">Access Key ID:</label>
                                <input type="text" id="awsAccessKey" class="form-control"
                                       placeholder="AKIA..." required>
                                <small class="form-help">Su AWS Access Key ID</small>
                            </div>

                            <div class="form-group">
                                <label for="awsSecretKey">Secret Access Key:</label>
                                <input type="password" id="awsSecretKey" class="form-control"
                                       placeholder="Secret..." required>
                                <small class="form-help">Su AWS Secret Access Key</small>
                            </div>

                            <div class="form-group">
                                <label for="awsBucket">Bucket S3 (opcional):</label>
                                <input type="text" id="awsBucket" class="form-control"
                                       placeholder="${configStatus.bucket}"
                                       value="${configStatus.bucket}">
                                <small class="form-help">Deje en blanco para usar el bucket predeterminado</small>
                            </div>

                            <div class="security-notice">
                                <span class="security-icon">🔒</span>
                                <p><strong>Seguridad:</strong> Las credenciales se almacenan encriptadas solo en su navegador local. Nunca se envían a servidores externos.</p>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">
                                    💾 Guardar Configuración
                                </button>
                                <button type="button" id="validateAWSBtn" class="btn btn-info">
                                    ✅ Probar Credenciales
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
    }

    static bindEvents() {
        // Formulario de configuración AWS
        document.getElementById('awsConfigForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSaveAWSConfig();
        });

        // Botón para probar credenciales
        document.getElementById('validateAWSBtn')?.addEventListener('click', async () => {
            await this.handleValidateAWS();
        });

        // Botones de configuración AWS (cuando ya está configurado)
        document.getElementById('reconfigureAWSBtn')?.addEventListener('click', () => {
            this.handleReconfigureAWS();
        });

        document.getElementById('clearAWSBtn')?.addEventListener('click', () => {
            this.handleClearAWS();
        });

        document.getElementById('testAWSBtn')?.addEventListener('click', async () => {
            await this.handleTestAWS();
        });

        // Botón para subir a S3
        document.getElementById('syncToS3Btn')?.addEventListener('click', async () => {
            await this.handleSyncToS3();
        });

        // Botón para descargar de S3
        document.getElementById('syncFromS3Btn')?.addEventListener('click', async () => {
            await this.handleSyncFromS3();
        });

        // Botón para crear backup
        document.getElementById('createS3BackupBtn')?.addEventListener('click', async () => {
            await this.handleCreateBackup();
        });

        // Botón para restaurar backup
        document.getElementById('restoreS3BackupBtn')?.addEventListener('click', async () => {
            await this.handleRestoreBackup();
        });

        // Toggle de sincronización automática
        document.getElementById('autoSyncToggle')?.addEventListener('change', (e) => {
            if (e.target.checked) {
                StorageService.enableAutoSync();
                this.showNotification('Sincronización automática activada', 'success');
            } else {
                StorageService.disableAutoSync();
                this.showNotification('Sincronización automática desactivada', 'info');
            }
        });

        // Toggle de sincronización en cambios
        document.getElementById('syncOnChangeToggle')?.addEventListener('change', (e) => {
            StorageService.s3Config.syncOnChange = e.target.checked;
            const message = e.target.checked
                ? 'Sincronización al guardar activada'
                : 'Sincronización al guardar desactivada';
            this.showNotification(message, 'info');
        });

        // Botón para verificar estado S3
        document.getElementById('checkS3StatusBtn')?.addEventListener('click', async () => {
            await this.handleCheckS3Status();
        });

        // Escuchar eventos de actualización de datos
        window.addEventListener('dataUpdated', (event) => {
            this.handleDataUpdated(event.detail);
        });
    }

    static async handleSyncToS3() {
        this.showProgress('Subiendo datos a S3...');

        try {
            const result = await StorageService.syncWithS3(true);

            if (result) {
                this.showNotification('Datos sincronizados exitosamente con S3', 'success');
                this.refreshSyncStatus();
            } else {
                this.showNotification('Error al sincronizar con S3', 'error');
            }
        } catch (error) {
            console.error('Error en sincronización:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    static async handleSyncFromS3() {
        if (!confirm('¿Desea descargar y sobrescribir los datos locales con los de S3?')) {
            return;
        }

        this.showProgress('Descargando datos de S3...');

        try {
            const result = await StorageService.loadFromS3();

            if (result) {
                this.showNotification('Datos cargados exitosamente desde S3', 'success');
                this.refreshSyncStatus();

                // Refrescar la página para mostrar los nuevos datos
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                this.showNotification('Error al cargar datos desde S3', 'error');
            }
        } catch (error) {
            console.error('Error en carga:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    static async handleCreateBackup() {
        this.showProgress('Creando backup en S3...');

        try {
            const result = await StorageService.createS3Backup();

            if (result.success) {
                this.showNotification(`Backup creado: ${result.filename}`, 'success');
            } else {
                this.showNotification(`Error creando backup: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error creando backup:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    static async handleRestoreBackup() {
        if (!confirm('¿Desea restaurar el último backup? Esto sobrescribirá todos los datos actuales.')) {
            return;
        }

        this.showProgress('Restaurando backup desde S3...');

        try {
            const result = await StorageService.restoreFromS3Backup();

            if (result.success) {
                this.showNotification(`Backup restaurado: ${result.filename}`, 'success');

                // Refrescar la página para mostrar los datos restaurados
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                this.showNotification(`Error restaurando backup: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error restaurando backup:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    static async handleCheckS3Status() {
        this.showProgress('Verificando estado de S3...');

        try {
            const status = await S3Service.getS3Status();
            const infoContainer = document.getElementById('s3StatusInfo');

            if (status.success) {
                infoContainer.innerHTML = `
                    <div class="s3-status-details">
                        <p><strong>✅ Conectado a S3</strong></p>
                        <p><strong>Bucket:</strong> ${status.bucket}</p>
                        <p><strong>Región:</strong> ${status.region}</p>
                        <p><strong>Total archivos:</strong> ${status.totalFiles}</p>
                        <div class="files-by-type">
                            <h5>Archivos por tipo:</h5>
                            ${Object.entries(status.filesByType).map(([type, count]) =>
                                `<span class="file-type-badge">${type}: ${count}</span>`
                            ).join('')}
                        </div>
                    </div>
                `;
                this.showNotification('Estado S3 verificado correctamente', 'success');
            } else {
                infoContainer.innerHTML = `
                    <div class="s3-status-error">
                        <p><strong>❌ Error de conexión:</strong></p>
                        <p>${status.error}</p>
                    </div>
                `;
                this.showNotification('Error verificando estado S3', 'error');
            }
        } catch (error) {
            console.error('Error verificando S3:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    static handleDataUpdated(detail) {
        const message = `Datos actualizados desde ${detail.source}`;
        this.showNotification(message, 'info');
        this.refreshSyncStatus();
    }

    static refreshSyncStatus() {
        const syncStatus = StorageService.getS3SyncStatus();
        const statusBadge = document.querySelector('.status-badge');
        const lastSyncDate = syncStatus.lastSync ? new Date(syncStatus.lastSync) : null;
        const lastSyncText = lastSyncDate
            ? `${lastSyncDate.toLocaleDateString()} ${lastSyncDate.toLocaleTimeString()}`
            : 'Nunca';

        if (statusBadge) {
            statusBadge.className = `status-badge status-${syncStatus.status}`;
            statusBadge.textContent = this.getStatusText(syncStatus.status);
        }

        // Actualizar otros elementos de estado si existen
        const statusItems = document.querySelectorAll('.s3-status .status-item span');
        if (statusItems.length >= 3) {
            statusItems[1].textContent = lastSyncText;
            statusItems[2].textContent = syncStatus.message || 'Sin información';
        }
    }

    static showProgress(text) {
        const indicator = document.getElementById('s3ProgressIndicator');
        const textElement = indicator?.querySelector('.progress-text');

        if (indicator) {
            indicator.style.display = 'block';
            if (textElement) textElement.textContent = text;
        }
    }

    static hideProgress() {
        const indicator = document.getElementById('s3ProgressIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    static showNotification(message, type = 'info') {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            padding: 12px 20px; border-radius: 8px; color: white;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;

        // Agregar estilos de animación si no existen
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .notification button {
                    background: none; border: none; color: white;
                    font-size: 18px; margin-left: 10px; cursor: pointer;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Métodos para manejar configuración AWS
    static async handleSaveAWSConfig() {
        const accessKey = document.getElementById('awsAccessKey')?.value.trim();
        const secretKey = document.getElementById('awsSecretKey')?.value.trim();
        const bucket = document.getElementById('awsBucket')?.value.trim();

        if (!accessKey || !secretKey) {
            this.showNotification('Por favor complete todos los campos requeridos', 'error');
            return;
        }

        try {
            this.showProgress('Guardando configuración AWS...');

            // Guardar credenciales
            S3Service.setCredentials(accessKey, secretKey, bucket);

            // Probar conexión
            await S3Service.initializeAWS();
            const status = await S3Service.getS3Status();

            if (status.success) {
                this.showNotification('✅ Configuración AWS guardada y probada correctamente', 'success');

                // Recargar la vista para mostrar el estado configurado
                setTimeout(() => {
                    this.refreshView();
                }, 1500);
            } else {
                S3Service.clearCredentials();
                this.showNotification(`❌ Error probando credenciales: ${status.error}`, 'error');
            }
        } catch (error) {
            S3Service.clearCredentials();
            this.showNotification(`❌ Error: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    static async handleValidateAWS() {
        const accessKey = document.getElementById('awsAccessKey')?.value.trim();
        const secretKey = document.getElementById('awsSecretKey')?.value.trim();
        const bucket = document.getElementById('awsBucket')?.value.trim();

        if (!accessKey || !secretKey) {
            this.showNotification('Complete los campos de credenciales para probar', 'error');
            return;
        }

        try {
            this.showProgress('Probando credenciales AWS...');

            // Configurar temporalmente
            const originalConfig = {
                accessKeyId: S3Service.config.accessKeyId,
                secretAccessKey: S3Service.config.secretAccessKey,
                bucket: S3Service.config.bucket
            };

            S3Service.config.accessKeyId = accessKey;
            S3Service.config.secretAccessKey = secretKey;
            if (bucket) S3Service.config.bucket = bucket;

            await S3Service.initializeAWS();
            const status = await S3Service.getS3Status();

            // Restaurar configuración original
            S3Service.config.accessKeyId = originalConfig.accessKeyId;
            S3Service.config.secretAccessKey = originalConfig.secretAccessKey;
            S3Service.config.bucket = originalConfig.bucket;

            if (status.success) {
                this.showNotification('✅ Credenciales válidas - Conexión exitosa', 'success');
            } else {
                this.showNotification(`❌ Error probando credenciales: ${status.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`❌ Error: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    static handleReconfigureAWS() {
        if (confirm('¿Desea reconfigurar las credenciales AWS? Esto requerirá ingresar nuevamente sus credenciales.')) {
            S3Service.clearCredentials();
            this.refreshView();
        }
    }

    static handleClearAWS() {
        if (confirm('¿Está seguro de que desea remover la configuración AWS? Se deshabilitará la sincronización en la nube.')) {
            S3Service.clearCredentials();
            this.showNotification('Configuración AWS removida', 'info');
            this.refreshView();
        }
    }

    static async handleTestAWS() {
        try {
            this.showProgress('Probando conexión AWS...');
            const status = await S3Service.getS3Status();

            if (status.success) {
                this.showNotification(`✅ Conexión exitosa - ${status.totalFiles} archivos en bucket`, 'success');
            } else {
                this.showNotification(`❌ Error de conexión: ${status.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`❌ Error: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    static refreshView() {
        // Recargar toda la sección S3
        const container = document.querySelector('.s3-config-section');
        if (container) {
            const syncStatus = StorageService.getS3SyncStatus();
            const configStatus = S3Service.getConfigStatus();
            const now = new Date();
            const lastSyncDate = syncStatus.lastSync ? new Date(syncStatus.lastSync) : null;
            const lastSyncText = lastSyncDate
                ? `${lastSyncDate.toLocaleDateString()} ${lastSyncDate.toLocaleTimeString()}`
                : 'Nunca';

            container.innerHTML = this.render().replace('<div class="s3-config-section">', '').replace('</div>\n        ', '');
            this.bindEvents();
        }
    }
}