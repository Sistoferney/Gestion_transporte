/**
 * Vista de Configuración Inicial del Sistema - Setup seguro sin credenciales hardcodeadas
 */
class SystemSetupView {
    static render() {
        return `
            <div class="system-setup-container">
                <div class="setup-card">
                    <div class="setup-header">
                        <h1>🔧 Configuración Inicial del Sistema</h1>
                        <p>Configure su sistema de gestión de transporte de forma segura</p>
                    </div>

                    <form id="systemSetupForm" class="setup-form">
                        <!-- Paso 1: Contraseña Maestra -->
                        <div class="setup-step active" id="step1">
                            <h3>Paso 1: Contraseña Maestra del Sistema</h3>
                            <p>Esta contraseña se utilizará para configuraciones del sistema y recuperación</p>

                            <div class="form-group">
                                <label for="masterPassword">Contraseña Maestra</label>
                                <input type="password"
                                       id="masterPassword"
                                       name="masterPassword"
                                       class="form-control"
                                       minlength="8"
                                       required>
                                <small class="form-text">Mínimo 8 caracteres. Use una contraseña fuerte.</small>
                            </div>

                            <div class="form-group">
                                <label for="masterPasswordConfirm">Confirmar Contraseña Maestra</label>
                                <input type="password"
                                       id="masterPasswordConfirm"
                                       name="masterPasswordConfirm"
                                       class="form-control"
                                       minlength="8"
                                       required>
                            </div>

                            <button type="button" class="btn btn-primary" onclick="SystemSetupView.nextStep(2)">
                                Siguiente →
                            </button>
                        </div>

                        <!-- Paso 2: Administrador -->
                        <div class="setup-step" id="step2">
                            <h3>Paso 2: Cuenta del Administrador</h3>
                            <p>Configure la cuenta principal de administrador</p>

                            <div class="form-group">
                                <label for="adminUsername">Usuario Administrador</label>
                                <input type="text"
                                       id="adminUsername"
                                       name="adminUsername"
                                       class="form-control"
                                       placeholder="admin"
                                       required>
                            </div>

                            <div class="form-group">
                                <label for="adminPassword">Contraseña del Administrador</label>
                                <input type="password"
                                       id="adminPassword"
                                       name="adminPassword"
                                       class="form-control"
                                       minlength="6"
                                       required>
                            </div>

                            <div class="form-group">
                                <label for="adminName">Nombre Completo</label>
                                <input type="text"
                                       id="adminName"
                                       name="adminName"
                                       class="form-control"
                                       placeholder="Nombre del Administrador"
                                       required>
                            </div>

                            <div class="form-group">
                                <label for="adminEmail">Email (opcional)</label>
                                <input type="email"
                                       id="adminEmail"
                                       name="adminEmail"
                                       class="form-control"
                                       placeholder="admin@empresa.com">
                            </div>

                            <div class="step-buttons">
                                <button type="button" class="btn btn-secondary" onclick="SystemSetupView.prevStep(1)">
                                    ← Anterior
                                </button>
                                <button type="button" class="btn btn-primary" onclick="SystemSetupView.nextStep(3)">
                                    Siguiente →
                                </button>
                            </div>
                        </div>

                        <!-- Paso 3: Configuración S3 -->
                        <div class="setup-step" id="step3">
                            <h3>Paso 3: Configuración de Almacenamiento S3</h3>
                            <p>Configure el acceso a Amazon S3 para sincronización de datos</p>

                            <div class="form-group">
                                <label for="s3AccessKeyId">Access Key ID</label>
                                <input type="text"
                                       id="s3AccessKeyId"
                                       name="s3AccessKeyId"
                                       class="form-control"
                                       placeholder="AKIA..."
                                       required>
                                <small class="form-text">Obtenga estas credenciales desde AWS Console</small>
                            </div>

                            <div class="form-group">
                                <label for="s3SecretAccessKey">Secret Access Key</label>
                                <input type="password"
                                       id="s3SecretAccessKey"
                                       name="s3SecretAccessKey"
                                       class="form-control"
                                       required>
                            </div>

                            <div class="form-group">
                                <label for="s3Bucket">Nombre del Bucket</label>
                                <input type="text"
                                       id="s3Bucket"
                                       name="s3Bucket"
                                       class="form-control"
                                       placeholder="mi-bucket-transporte"
                                       required>
                            </div>

                            <div class="form-group">
                                <label for="s3Region">Región</label>
                                <select id="s3Region" name="s3Region" class="form-control" required>
                                    <option value="us-east-1">US East (N. Virginia)</option>
                                    <option value="us-west-2">US West (Oregon)</option>
                                    <option value="eu-west-1">Europe (Ireland)</option>
                                    <option value="sa-east-1" selected>South America (São Paulo)</option>
                                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <button type="button"
                                        class="btn btn-outline-primary"
                                        onclick="SystemSetupView.testS3Connection()">
                                    🧪 Probar Conexión S3
                                </button>
                                <span id="s3TestResult" class="test-result"></span>
                            </div>

                            <div class="step-buttons">
                                <button type="button" class="btn btn-secondary" onclick="SystemSetupView.prevStep(2)">
                                    ← Anterior
                                </button>
                                <button type="button" class="btn btn-primary" onclick="SystemSetupView.nextStep(4)">
                                    Siguiente →
                                </button>
                            </div>
                        </div>

                        <!-- Paso 4: Confirmación -->
                        <div class="setup-step" id="step4">
                            <h3>Paso 4: Confirmación y Finalización</h3>
                            <p>Revise la configuración antes de completar el setup</p>

                            <div class="setup-summary">
                                <div class="summary-item">
                                    <strong>Administrador:</strong>
                                    <span id="summaryAdmin"></span>
                                </div>
                                <div class="summary-item">
                                    <strong>Bucket S3:</strong>
                                    <span id="summaryS3Bucket"></span>
                                </div>
                                <div class="summary-item">
                                    <strong>Región:</strong>
                                    <span id="summaryS3Region"></span>
                                </div>
                            </div>

                            <div class="alert alert-info">
                                <strong>⚠️ Importante:</strong><br>
                                - Una vez completado, esta configuración se guardará de forma encriptada<br>
                                - Los conductores podrán acceder automáticamente sin configurar S3<br>
                                - Guarde la contraseña maestra en un lugar seguro
                            </div>

                            <div class="step-buttons">
                                <button type="button" class="btn btn-secondary" onclick="SystemSetupView.prevStep(3)">
                                    ← Anterior
                                </button>
                                <button type="submit" class="btn btn-success btn-lg">
                                    ✅ Completar Configuración
                                </button>
                            </div>
                        </div>
                    </form>

                    <div id="setupProgress" class="setup-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 25%"></div>
                        </div>
                        <div class="progress-steps">
                            <span class="step active">1</span>
                            <span class="step">2</span>
                            <span class="step">3</span>
                            <span class="step">4</span>
                        </div>
                    </div>

                    <!-- Loading overlay -->
                    <div id="setupLoading" class="loading-overlay" style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Configurando sistema...</p>
                    </div>

                    <!-- Messages -->
                    <div id="setupMessages" class="setup-messages"></div>
                </div>
            </div>
        `;
    }

    static bindEvents() {
        const form = document.getElementById('systemSetupForm');
        if (form) {
            form.addEventListener('submit', SystemSetupView.handleSetup);
        }

        // Validación en tiempo real
        document.getElementById('masterPasswordConfirm')?.addEventListener('input', SystemSetupView.validatePasswordMatch);

        // Auto-actualizar resumen
        ['adminUsername', 'adminName', 's3Bucket', 's3Region'].forEach(fieldId => {
            document.getElementById(fieldId)?.addEventListener('input', SystemSetupView.updateSummary);
        });
    }

    static nextStep(stepNumber) {
        if (stepNumber === 2 && !SystemSetupView.validateStep1()) return;
        if (stepNumber === 3 && !SystemSetupView.validateStep2()) return;
        if (stepNumber === 4 && !SystemSetupView.validateStep3()) return;

        // Ocultar paso actual
        document.querySelectorAll('.setup-step').forEach(step => {
            step.classList.remove('active');
        });

        // Mostrar nuevo paso
        document.getElementById(`step${stepNumber}`).classList.add('active');

        // Actualizar progreso
        SystemSetupView.updateProgress(stepNumber);

        if (stepNumber === 4) {
            SystemSetupView.updateSummary();
        }
    }

    static prevStep(stepNumber) {
        // Ocultar paso actual
        document.querySelectorAll('.setup-step').forEach(step => {
            step.classList.remove('active');
        });

        // Mostrar paso anterior
        document.getElementById(`step${stepNumber}`).classList.add('active');

        // Actualizar progreso
        SystemSetupView.updateProgress(stepNumber);
    }

    static updateProgress(step) {
        const progressFill = document.querySelector('.progress-fill');
        const progressSteps = document.querySelectorAll('.progress-steps .step');

        const percentage = (step / 4) * 100;
        progressFill.style.width = `${percentage}%`;

        progressSteps.forEach((stepEl, index) => {
            if (index < step) {
                stepEl.classList.add('active');
            } else {
                stepEl.classList.remove('active');
            }
        });
    }

    static validateStep1() {
        const password = document.getElementById('masterPassword').value;
        const confirm = document.getElementById('masterPasswordConfirm').value;

        if (password.length < 8) {
            SystemSetupView.showMessage('La contraseña maestra debe tener al menos 8 caracteres', 'error');
            return false;
        }

        if (password !== confirm) {
            SystemSetupView.showMessage('Las contraseñas no coinciden', 'error');
            return false;
        }

        return true;
    }

    static validateStep2() {
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        const name = document.getElementById('adminName').value;

        if (!username || username.length < 3) {
            SystemSetupView.showMessage('El usuario debe tener al menos 3 caracteres', 'error');
            return false;
        }

        if (!password || password.length < 6) {
            SystemSetupView.showMessage('La contraseña del administrador debe tener al menos 6 caracteres', 'error');
            return false;
        }

        if (!name || name.trim().length === 0) {
            SystemSetupView.showMessage('El nombre es requerido', 'error');
            return false;
        }

        return true;
    }

    static validateStep3() {
        const accessKeyId = document.getElementById('s3AccessKeyId').value;
        const secretAccessKey = document.getElementById('s3SecretAccessKey').value;
        const bucket = document.getElementById('s3Bucket').value;

        if (!accessKeyId || !accessKeyId.startsWith('AKIA')) {
            SystemSetupView.showMessage('Access Key ID inválido (debe comenzar con AKIA)', 'error');
            return false;
        }

        if (!secretAccessKey || secretAccessKey.length < 20) {
            SystemSetupView.showMessage('Secret Access Key inválido', 'error');
            return false;
        }

        if (!bucket || bucket.length < 3) {
            SystemSetupView.showMessage('Nombre del bucket inválido', 'error');
            return false;
        }

        return true;
    }

    static validatePasswordMatch() {
        const password = document.getElementById('masterPassword').value;
        const confirm = document.getElementById('masterPasswordConfirm').value;
        const confirmInput = document.getElementById('masterPasswordConfirm');

        if (confirm.length > 0) {
            if (password === confirm) {
                confirmInput.classList.remove('error');
                confirmInput.classList.add('success');
            } else {
                confirmInput.classList.remove('success');
                confirmInput.classList.add('error');
            }
        }
    }

    static updateSummary() {
        const adminUsername = document.getElementById('adminUsername').value;
        const adminName = document.getElementById('adminName').value;
        const s3Bucket = document.getElementById('s3Bucket').value;
        const s3Region = document.getElementById('s3Region').value;

        document.getElementById('summaryAdmin').textContent = `${adminName} (${adminUsername})`;
        document.getElementById('summaryS3Bucket').textContent = s3Bucket;
        document.getElementById('summaryS3Region').textContent = s3Region;
    }

    static async testS3Connection() {
        const resultEl = document.getElementById('s3TestResult');
        resultEl.textContent = '🔄 Probando...';
        resultEl.className = 'test-result testing';

        try {
            const accessKeyId = document.getElementById('s3AccessKeyId').value;
            const secretAccessKey = document.getElementById('s3SecretAccessKey').value;
            const bucket = document.getElementById('s3Bucket').value;
            const region = document.getElementById('s3Region').value;

            if (!accessKeyId || !secretAccessKey || !bucket) {
                throw new Error('Complete todos los campos S3 primero');
            }

            // Configurar S3 temporalmente para prueba
            if (window.S3Service) {
                S3Service.config.region = region;
                S3Service.setCredentials(accessKeyId, secretAccessKey, bucket);

                await S3Service.initializeAWS();

                resultEl.textContent = '✅ Conexión exitosa';
                resultEl.className = 'test-result success';
            } else {
                throw new Error('S3Service no disponible');
            }
        } catch (error) {
            resultEl.textContent = `❌ Error: ${error.message}`;
            resultEl.className = 'test-result error';
        }
    }

    static async handleSetup(e) {
        e.preventDefault();

        try {
            SystemSetupView.showLoading(true);
            SystemSetupView.clearMessages();

            // Recopilar todos los datos
            const masterPassword = document.getElementById('masterPassword').value;
            const adminCredentials = {
                username: document.getElementById('adminUsername').value,
                password: document.getElementById('adminPassword').value,
                name: document.getElementById('adminName').value,
                email: document.getElementById('adminEmail').value
            };
            const s3Credentials = {
                accessKeyId: document.getElementById('s3AccessKeyId').value,
                secretAccessKey: document.getElementById('s3SecretAccessKey').value,
                bucket: document.getElementById('s3Bucket').value,
                region: document.getElementById('s3Region').value
            };

            // Configurar sistema usando AuthService
            if (!window.AuthService) {
                throw new Error('AuthService no disponible');
            }

            await AuthService.setupSecureSystem(masterPassword, adminCredentials, s3Credentials);

            SystemSetupView.showMessage('✅ Sistema configurado exitosamente', 'success');

            // Redirigir al login después de un delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            SystemSetupView.showMessage(`❌ Error: ${error.message}`, 'error');
        } finally {
            SystemSetupView.showLoading(false);
        }
    }

    static showLoading(show) {
        const loadingEl = document.getElementById('setupLoading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'flex' : 'none';
        }
    }

    static showMessage(message, type = 'info') {
        const messagesEl = document.getElementById('setupMessages');
        if (messagesEl) {
            messagesEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;

            // Auto-clear después de 5 segundos para mensajes no críticos
            if (type === 'info') {
                setTimeout(() => {
                    messagesEl.innerHTML = '';
                }, 5000);
            }
        }
    }

    static clearMessages() {
        const messagesEl = document.getElementById('setupMessages');
        if (messagesEl) {
            messagesEl.innerHTML = '';
        }
    }
}

// Hacer disponible globalmente
window.SystemSetupView = SystemSetupView;