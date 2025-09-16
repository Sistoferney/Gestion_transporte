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

                    <div class="security-info">
                        <div class="info-box">
                            <span class="info-icon">🛡️</span>
                            <div class="info-content">
                                <strong>Seguridad:</strong>
                                <p>Las credenciales se almacenan con hash SHA-256 y encriptación local. Nunca se guardan en texto plano.</p>
                            </div>
                        </div>
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

        // Validación en tiempo real de contraseña
        passwordInput?.addEventListener('input', () => {
            this.updatePasswordStrength(passwordInput.value);
            this.validatePasswordMatch();
        });

        confirmInput?.addEventListener('input', () => {
            this.validatePasswordMatch();
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

    static async handleSetupSubmit() {
        const username = document.getElementById('adminUsername')?.value.trim();
        const password = document.getElementById('adminPassword')?.value;
        const confirmPassword = document.getElementById('adminPasswordConfirm')?.value;
        const name = document.getElementById('adminName')?.value.trim() || 'Administrador';

        // Validaciones
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

        const strength = this.calculatePasswordStrength(password);
        if (strength.level === 'weak') {
            if (!confirm('La contraseña es muy débil. ¿Desea continuar de todos modos?')) {
                return;
            }
        }

        try {
            this.showProgress('Configurando administrador...');

            // Configurar credenciales
            await AuthService.setupAdminCredentials(username, password, name);

            this.showNotification('✅ Administrador configurado correctamente', 'success');

            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error configurando admin:', error);
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
            const inputs = form.querySelectorAll('input, button');
            inputs.forEach(input => input.disabled = true);
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
            const inputs = form.querySelectorAll('input, button');
            inputs.forEach(input => input.disabled = false);
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