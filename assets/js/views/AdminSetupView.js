/**
 * Vista de configuración inicial del administrador
 */
class AdminSetupView {
    static render() {
        return `
            <div class="admin-setup-container">
                <div class="setup-card">
                    <div class="setup-header">
                        <div class="setup-icon">🔐</div>
                        <h2>Configuración Inicial del Administrador</h2>
                        <p>Configure las credenciales de acceso de administrador por primera vez</p>
                    </div>
                    <form id="adminSetupForm" class="setup-form">
                        <div class="form-group">
                            <label for="adminUsername">
                                <span class="label-icon">👤</span>
                                Nombre de Usuario Administrador
                            </label>
                            <input
                                type="text"
                                id="adminUsername"
                                class="form-control"
                                placeholder="Ej: admin2024"
                                required
                                minlength="4"
                                maxlength="30"
                                pattern="[a-zA-Z0-9_-]+"
                                title="Solo letras, números, guiones y guiones bajos"
                            >
                            <small class="form-help">Mínimo 4 caracteres. Solo letras, números, - y _</small>
                        </div>

                        <div class="form-group">
                            <label for="adminPassword">
                                <span class="label-icon">🔒</span>
                                Contraseña de Administrador
                            </label>
                            <input
                                type="password"
                                id="adminPassword"
                                class="form-control"
                                placeholder="Contraseña segura"
                                required
                                minlength="8"
                            >
                            <small class="form-help">Mínimo 8 caracteres. Use combinación de letras, números y símbolos</small>
                        </div>

                        <div class="form-group">
                            <label for="adminPasswordConfirm">
                                <span class="label-icon">✅</span>
                                Confirmar Contraseña
                            </label>
                            <input
                                type="password"
                                id="adminPasswordConfirm"
                                class="form-control"
                                placeholder="Confirme la contraseña"
                                required
                                minlength="8"
                            >
                            <small class="form-help">Debe coincidir con la contraseña anterior</small>
                        </div>

                        <div class="form-group">
                            <label for="adminName">
                                <span class="label-icon">📛</span>
                                Nombre Completo (Opcional)
                            </label>
                            <input
                                type="text"
                                id="adminName"
                                class="form-control"
                                placeholder="Ej: Juan Pérez"
                                maxlength="100"
                            >
                            <small class="form-help">Nombre que aparecerá en la interfaz</small>
                        </div>

                        <!-- Configuración S3 para acceso universal -->
                        <div class="s3-config-section">
                            <div class="section-header">
                                <h3>🌐 Configuración de Almacenamiento en la Nube (Opcional)</h3>
                                <p>Configure AWS S3 para acceso universal desde cualquier dispositivo</p>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="enableS3" class="checkbox-input">
                                    <span class="checkbox-label">✅ Habilitar almacenamiento en la nube (S3)</span>
                                </label>
                                <small class="form-help">Permite acceso desde cualquier dispositivo y respaldo automático</small>
                            </div>

                            <div id="s3Fields" class="s3-fields" style="display: none;">
                                <div class="form-group">
                                    <label for="accessKeyId">
                                        <span class="label-icon">🔑</span>
                                        Access Key ID
                                    </label>
                                    <input
                                        type="password"
                                        id="accessKeyId"
                                        class="form-control"
                                        placeholder="AKIA..."
                                    >
                                    <small class="form-help">Su AWS Access Key ID</small>
                                </div>

                                <div class="form-group">
                                    <label for="secretAccessKey">
                                        <span class="label-icon">🗝️</span>
                                        Secret Access Key
                                    </label>
                                    <input
                                        type="password"
                                        id="secretAccessKey"
                                        class="form-control"
                                        placeholder="..."
                                    >
                                    <small class="form-help">Su AWS Secret Access Key</small>
                                </div>

                                <div class="form-group">
                                    <label for="bucketName">
                                        <span class="label-icon">🪣</span>
                                        Nombre del Bucket
                                    </label>
                                    <input
                                        type="text"
                                        id="bucketName"
                                        class="form-control"
                                        placeholder="mi-bucket-transporte"
                                    >
                                    <small class="form-help">Nombre de su bucket de S3</small>
                                </div>

                                <div class="form-group">
                                    <label for="region">
                                        <span class="label-icon">🌍</span>
                                        Región
                                    </label>
                                    <select id="region" class="form-control">
                                        <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                                        <option value="us-east-2">US East (Ohio) - us-east-2</option>
                                        <option value="us-west-1">US West (N. California) - us-west-1</option>
                                        <option value="us-west-2">US West (Oregon) - us-west-2</option>
                                        <option value="eu-west-1">Europe (Ireland) - eu-west-1</option>
                                        <option value="eu-central-1">Europe (Frankfurt) - eu-central-1</option>
                                        <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
                                        <option value="ap-northeast-1">Asia Pacific (Tokyo) - ap-northeast-1</option>
                                        <option value="sa-east-1">South America (São Paulo) - sa-east-1</option>
                                    </select>
                                    <small class="form-help">Región donde está ubicado su bucket</small>
                                </div>

                                <div class="info-box s3-info">
                                    <span class="info-icon">ℹ️</span>
                                    <div class="info-content">
                                        <strong>Información:</strong>
                                        <ul>
                                            <li>Las credenciales se almacenan encriptadas localmente</li>
                                            <li>Se creará automáticamente la estructura de carpetas</li>
                                            <li>Puede configurar S3 más tarde desde el panel de administración</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="password-strength">
                            <div class="strength-label">Fortaleza de la contraseña:</div>
                            <div class="strength-bar">
                                <div id="strengthIndicator" class="strength-fill"></div>
                            </div>
                            <div id="strengthText" class="strength-text">Ingrese una contraseña</div>
                        </div>

                        <div class="warning-box">
                            <span class="warning-icon">⚠️</span>
                            <div class="warning-content">
                                <strong>Importante:</strong>
                                <ul>
                                    <li>Guarde estas credenciales en un lugar seguro</li>
                                    <li>No podrá recuperar la contraseña si la olvida</li>
                                    <li>Podrá cambiar las credenciales más tarde desde el panel de administración</li>
                                </ul>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary btn-large">
                                🔐 Configurar Administrador
                            </button>
                        </div>
                    </form>

                    <!-- Indicador de progreso -->
                    <div id="setupProgress" class="progress-container" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="progress-text">Configurando administrador...</div>
                    </div>
                </div>
            </div>
        `;
    }

    static bindEvents() {
        const form = document.getElementById('adminSetupForm');
        const passwordInput = document.getElementById('adminPassword');
        const confirmInput = document.getElementById('adminPasswordConfirm');
        const enableS3Checkbox = document.getElementById('enableS3');
        const s3Fields = document.getElementById('s3Fields');

        // Validación en tiempo real de contraseña
        passwordInput?.addEventListener('input', () => {
            this.updatePasswordStrength(passwordInput.value);
            this.validatePasswordMatch();
        });

        confirmInput?.addEventListener('input', () => {
            this.validatePasswordMatch();
        });

        // Toggle campos S3
        enableS3Checkbox?.addEventListener('change', (e) => {
            if (e.target.checked) {
                s3Fields.style.display = 'block';
                this.makeS3FieldsRequired(true);
            } else {
                s3Fields.style.display = 'none';
                this.makeS3FieldsRequired(false);
            }
        });

        // Envío del formulario
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSetupSubmit();
        });
    }

    static updatePasswordStrength(password) {
        const strengthIndicator = document.getElementById('strengthIndicator');
        const strengthText = document.getElementById('strengthText');

        if (!strengthIndicator || !strengthText) return;

        const strength = this.calculatePasswordStrength(password);

        // Actualizar barra visual
        strengthIndicator.style.width = `${strength.percentage}%`;
        strengthIndicator.className = `strength-fill strength-${strength.level}`;

        // Actualizar texto
        strengthText.textContent = strength.text;
        strengthText.className = `strength-text strength-${strength.level}`;
    }

    static calculatePasswordStrength(password) {
        if (!password) {
            return { percentage: 0, level: 'none', text: 'Ingrese una contraseña' };
        }

        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[^A-Za-z0-9]/.test(password),
            longLength: password.length >= 12
        };

        // Puntuación
        score += checks.length ? 20 : 0;
        score += checks.lowercase ? 15 : 0;
        score += checks.uppercase ? 15 : 0;
        score += checks.numbers ? 15 : 0;
        score += checks.symbols ? 20 : 0;
        score += checks.longLength ? 15 : 0;

        // Determinar nivel
        let level, text;
        if (score < 30) {
            level = 'weak';
            text = 'Muy débil';
        } else if (score < 50) {
            level = 'fair';
            text = 'Débil';
        } else if (score < 80) {
            level = 'good';
            text = 'Buena';
        } else {
            level = 'strong';
            text = 'Fuerte';
        }

        return { percentage: score, level, text };
    }

    static validatePasswordMatch() {
        const password = document.getElementById('adminPassword')?.value;
        const confirm = document.getElementById('adminPasswordConfirm')?.value;
        const confirmInput = document.getElementById('adminPasswordConfirm');

        if (!confirmInput) return;

        if (confirm && password !== confirm) {
            confirmInput.setCustomValidity('Las contraseñas no coinciden');
            confirmInput.classList.add('error');
        } else {
            confirmInput.setCustomValidity('');
            confirmInput.classList.remove('error');
        }
    }

    static makeS3FieldsRequired(required) {
        const s3Inputs = ['accessKeyId', 'secretAccessKey', 'bucketName'];
        s3Inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.required = required;
            }
        });
    }

    static async handleSetupSubmit() {
        const username = document.getElementById('adminUsername')?.value.trim();
        const password = document.getElementById('adminPassword')?.value;
        const confirmPassword = document.getElementById('adminPasswordConfirm')?.value;
        const name = document.getElementById('adminName')?.value.trim() || 'Administrador';

        // Datos de S3
        const enableS3 = document.getElementById('enableS3')?.checked;
        const s3Config = enableS3 ? {
            accessKeyId: document.getElementById('accessKeyId')?.value.trim(),
            secretAccessKey: document.getElementById('secretAccessKey')?.value.trim(),
            bucketName: document.getElementById('bucketName')?.value.trim(),
            region: document.getElementById('region')?.value
        } : null;

        // Validaciones básicas
        if (!username || !password) {
            this.showNotification('Complete todos los campos requeridos', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('Las contraseñas no coinciden', 'error');
            return;
        }

        if (password.length < 8) {
            this.showNotification('La contraseña debe tener al menos 8 caracteres', 'error');
            return;
        }

        // Validaciones S3
        if (enableS3) {
            if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName) {
                this.showNotification('Complete todos los campos de S3 requeridos', 'error');
                return;
            }
        }

        const strength = this.calculatePasswordStrength(password);
        if (strength.level === 'weak') {
            if (!confirm('La contraseña es muy débil. ¿Desea continuar de todos modos?')) {
                return;
            }
        }

        try {
            this.showProgress('Configurando administrador...');

            // 1. Configurar credenciales de admin
            await AuthService.setupAdminCredentials(username, password, name);
            this.updateProgress('Administrador configurado... ✅');

            // 2. Configurar S3 si está habilitado
            if (enableS3 && s3Config) {
                this.updateProgress('Configurando almacenamiento en la nube...');
                await this.setupS3Configuration(s3Config);
                this.updateProgress('S3 configurado... ✅');

                // 3. Crear estructura inicial en S3
                this.updateProgress('Creando estructura de carpetas...');
                await this.createS3Structure();
                this.updateProgress('Estructura creada... ✅');

                // 4. Realizar primer backup
                this.updateProgress('Realizando backup inicial...');
                await AuthService.syncCredentialsToS3();
                this.updateProgress('Backup completado... ✅');
            }

            this.showNotification('✅ Configuración completada correctamente', 'success');

            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error durante la configuración:', error);
            this.showNotification(`❌ Error: ${error.message}`, 'error');
        } finally {
            this.hideProgress();
        }
    }

    static showProgress(text) {
        const progress = document.getElementById('setupProgress');
        const progressText = progress?.querySelector('.progress-text');

        if (progress) {
            progress.style.display = 'block';
            if (progressText) progressText.textContent = text;
        }

        // Deshabilitar formulario
        const form = document.getElementById('adminSetupForm');
        if (form) {
            const inputs = form.querySelectorAll('input, button, select');
            inputs.forEach(input => input.disabled = true);
        }
    }

    static updateProgress(text) {
        const progressText = document.querySelector('#setupProgress .progress-text');
        if (progressText) {
            progressText.textContent = text;
        }
    }

    static hideProgress() {
        const progress = document.getElementById('setupProgress');
        if (progress) {
            progress.style.display = 'none';
        }

        // Rehabilitar formulario
        const form = document.getElementById('adminSetupForm');
        if (form) {
            const inputs = form.querySelectorAll('input, button, select');
            inputs.forEach(input => input.disabled = false);
        }
    }

    // Configurar S3Service con las credenciales proporcionadas
    static async setupS3Configuration(s3Config) {
        try {
            // Verificar que S3Service esté disponible
            if (!window.S3Service) {
                throw new Error('S3Service no está disponible. Verifique que el script esté cargado.');
            }

            // Configurar S3Service
            await S3Service.configure(s3Config);

            // Probar la conexión
            await S3Service.testConnection();

            console.log('✅ S3 configurado y probado correctamente');
            return true;

        } catch (error) {
            console.error('Error configurando S3:', error);
            throw new Error(`Error configurando S3: ${error.message}`);
        }
    }

    // Crear estructura inicial de carpetas en S3
    static async createS3Structure() {
        try {
            if (!window.S3Service || !S3Service.isConfigured()) {
                throw new Error('S3 no está configurado');
            }

            // Estructura inicial de carpetas/archivos
            const initialStructure = [
                // Archivo de configuración del sistema
                {
                    key: 'config/system-info.json',
                    data: {
                        projectName: 'Sistema de Gestión de Transporte',
                        version: '1.0.0',
                        createdAt: new Date().toISOString(),
                        initialSetup: true
                    }
                },
                // Archivo readme
                {
                    key: 'readme.txt',
                    data: 'Sistema de Gestión de Transporte - Datos almacenados automáticamente\nCreado: ' + new Date().toLocaleString()
                }
            ];

            // Crear archivos iniciales
            for (const item of initialStructure) {
                if (typeof item.data === 'object') {
                    await S3Service.uploadJSON(item.key, item.data);
                } else {
                    await S3Service.uploadFile(item.key, item.data);
                }
            }

            console.log('✅ Estructura inicial de S3 creada');
            return true;

        } catch (error) {
            console.error('Error creando estructura S3:', error);
            throw new Error(`Error creando estructura: ${error.message}`);
        }
    }

    static showNotification(message, type = 'info') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;

        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };

        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            padding: 12px 20px; border-radius: 8px; color: white;
            background: ${colors[type] || colors.info};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Auto-remover
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}