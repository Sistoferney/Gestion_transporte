/**
 * Vista de Login Maestro - Verificación inicial para equipos nuevos
 */
class MasterLoginView {
    static render() {
        // Verificar si está bloqueado
        if (AuthService.isMasterLoginBlocked()) {
            return MasterLoginView.renderBlocked();
        }

        const attemptsCount = parseInt(localStorage.getItem('master_login_attempts') || '0');
        const remainingAttempts = Math.max(0, 5 - attemptsCount);

        return `
            <div class="master-login-container">
                <div class="master-login-card">
                    <div class="master-login-header">
                        <div class="master-login-icon">🔐</div>
                        <h2>Verificación de Acceso al Sistema</h2>
                        <p>Este equipo requiere autorización para configurar el administrador</p>
                    </div>

                    <div class="master-login-warning">
                        <div class="warning-icon">⚠️</div>
                        <div class="warning-text">
                            <strong>Acceso Restringido:</strong> Se requiere la contraseña maestra del sistema para continuar.
                        </div>
                    </div>

                    <form id="masterLoginForm" class="master-login-form">
                        <div class="form-group">
                            <label for="masterPassword">
                                <span class="label-icon">🔑</span>
                                Contraseña Maestra del Sistema
                            </label>
                            <input
                                type="password"
                                id="masterPassword"
                                class="form-control"
                                placeholder="Ingrese la contraseña maestra"
                                required
                                autocomplete="off"
                            >
                            <small class="form-help">
                                Contraseña proporcionada por el administrador del sistema
                            </small>
                        </div>

                        <div class="attempts-info">
                            <span class="attempts-icon">🎯</span>
                            <span>Intentos restantes: <strong>${remainingAttempts}</strong></span>
                        </div>

                        <div class="master-login-actions">
                            <button type="submit" class="btn btn-primary btn-block">
                                🔓 Verificar Acceso
                            </button>
                        </div>
                    </form>

                    <div class="master-login-help">
                        <details>
                            <summary>¿No tienes la contraseña maestra?</summary>
                            <div class="help-content">
                                <p><strong>La contraseña maestra es necesaria para:</strong></p>
                                <ul>
                                    <li>Configurar el primer administrador del sistema</li>
                                    <li>Prevenir accesos no autorizados</li>
                                    <li>Mantener la seguridad de la configuración</li>
                                </ul>
                                <p><strong>Contacta:</strong></p>
                                <ul>
                                    <li>Al administrador de sistemas de tu organización</li>
                                    <li>Al responsable de TI que instaló el sistema</li>
                                    <li>Al proveedor del software para obtener acceso</li>
                                </ul>
                            </div>
                        </details>
                    </div>
                </div>
            </div>

            <style>
                .master-login-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .master-login-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    padding: 40px;
                    max-width: 500px;
                    width: 100%;
                    border: 3px solid #e74c3c;
                }

                .master-login-header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .master-login-icon {
                    font-size: 48px;
                    margin-bottom: 15px;
                }

                .master-login-header h2 {
                    color: #2c3e50;
                    margin: 0 0 10px 0;
                    font-size: 24px;
                    font-weight: 600;
                }

                .master-login-header p {
                    color: #7f8c8d;
                    margin: 0;
                    font-size: 16px;
                }

                .master-login-warning {
                    display: flex;
                    align-items: center;
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 25px;
                }

                .warning-icon {
                    font-size: 24px;
                    margin-right: 15px;
                }

                .warning-text {
                    flex: 1;
                    color: #856404;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .master-login-form {
                    margin-bottom: 25px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    margin-bottom: 8px;
                    color: #2c3e50;
                    font-weight: 500;
                    font-size: 14px;
                }

                .label-icon {
                    margin-right: 8px;
                    font-size: 16px;
                }

                .form-control {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 16px;
                    transition: border-color 0.3s ease;
                    box-sizing: border-box;
                }

                .form-control:focus {
                    outline: none;
                    border-color: #3498db;
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
                }

                .form-help {
                    display: block;
                    margin-top: 5px;
                    color: #7f8c8d;
                    font-size: 12px;
                }

                .attempts-info {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #e8f4f8;
                    border-radius: 6px;
                    padding: 10px;
                    margin-bottom: 20px;
                    color: #2c3e50;
                    font-size: 14px;
                }

                .attempts-icon {
                    margin-right: 8px;
                }

                .btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-decoration: none;
                    display: inline-block;
                    text-align: center;
                }

                .btn-primary {
                    background: #3498db;
                    color: white;
                }

                .btn-primary:hover {
                    background: #2980b9;
                    transform: translateY(-1px);
                }

                .btn-block {
                    width: 100%;
                }

                .master-login-help {
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }

                .master-login-help details {
                    cursor: pointer;
                }

                .master-login-help summary {
                    color: #3498db;
                    font-weight: 500;
                    padding: 10px;
                    border-radius: 6px;
                    background: #f8f9fa;
                }

                .help-content {
                    margin-top: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 6px;
                    font-size: 14px;
                    line-height: 1.6;
                }

                .help-content ul {
                    margin: 10px 0;
                    padding-left: 20px;
                }

                .help-content li {
                    margin-bottom: 5px;
                }

                @media (max-width: 768px) {
                    .master-login-container {
                        padding: 10px;
                    }

                    .master-login-card {
                        padding: 25px;
                    }

                    .master-login-header h2 {
                        font-size: 20px;
                    }
                }
            </style>
        `;
    }

    static renderBlocked() {
        const timeRemaining = AuthService.getMasterLoginBlockedTimeRemaining();

        return `
            <div class="master-login-container">
                <div class="master-login-card blocked">
                    <div class="master-login-header">
                        <div class="master-login-icon">🚫</div>
                        <h2>Acceso Temporalmente Bloqueado</h2>
                        <p>Demasiados intentos fallidos de verificación</p>
                    </div>

                    <div class="blocked-info">
                        <div class="blocked-icon">⏰</div>
                        <div class="blocked-text">
                            <h3>Tiempo restante de bloqueo:</h3>
                            <div class="countdown">
                                <span id="blockedCountdown">${timeRemaining}</span> minutos
                            </div>
                            <p>El acceso se restablecerá automáticamente cuando termine el tiempo de espera.</p>
                        </div>
                    </div>

                    <div class="blocked-actions">
                        <button id="refreshBlockedBtn" class="btn btn-secondary">
                            🔄 Verificar Estado
                        </button>
                    </div>

                    <div class="security-notice">
                        <h4>⚠️ Aviso de Seguridad</h4>
                        <p>Este bloqueo se activa después de múltiples intentos fallidos para proteger el sistema contra accesos no autorizados.</p>
                        <p>Si eres un usuario autorizado, espera a que termine el bloqueo o contacta al administrador del sistema.</p>
                    </div>
                </div>
            </div>

            <style>
                .master-login-card.blocked {
                    border-color: #e74c3c;
                    background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
                }

                .blocked-info {
                    display: flex;
                    align-items: flex-start;
                    background: #fee;
                    border: 2px solid #fcc;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 25px;
                }

                .blocked-icon {
                    font-size: 32px;
                    margin-right: 15px;
                    margin-top: 5px;
                }

                .blocked-text h3 {
                    margin: 0 0 10px 0;
                    color: #c0392b;
                    font-size: 18px;
                }

                .countdown {
                    font-size: 24px;
                    font-weight: bold;
                    color: #e74c3c;
                    margin: 10px 0;
                }

                .blocked-actions {
                    text-align: center;
                    margin-bottom: 25px;
                }

                .btn-secondary {
                    background: #95a5a6;
                    color: white;
                }

                .btn-secondary:hover {
                    background: #7f8c8d;
                }

                .security-notice {
                    background: #f8f9fa;
                    border-left: 4px solid #e74c3c;
                    padding: 15px;
                    border-radius: 0 6px 6px 0;
                }

                .security-notice h4 {
                    margin: 0 0 10px 0;
                    color: #c0392b;
                    font-size: 16px;
                }

                .security-notice p {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #2c3e50;
                }

                .security-notice p:last-child {
                    margin-bottom: 0;
                }
            </style>

            <script>
                // Actualizar countdown cada minuto
                setInterval(() => {
                    const remaining = AuthService.getMasterLoginBlockedTimeRemaining();
                    const countdown = document.getElementById('blockedCountdown');
                    if (countdown) {
                        countdown.textContent = remaining;
                        if (remaining <= 0) {
                            window.location.reload();
                        }
                    }
                }, 60000);
            </script>
        `;
    }

    static bindEvents() {
        const form = document.getElementById('masterLoginForm');
        const refreshBtn = document.getElementById('refreshBlockedBtn');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await MasterLoginView.handleMasterLogin();
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }

    static async handleMasterLogin() {
        const passwordInput = document.getElementById('masterPassword');
        const submitBtn = document.querySelector('button[type="submit"]');

        if (!passwordInput || !submitBtn) return;

        const password = passwordInput.value.trim();

        if (!password) {
            MasterLoginView.showError('Por favor ingrese la contraseña maestra');
            return;
        }

        // Deshabilitar botón durante validación
        submitBtn.disabled = true;
        submitBtn.textContent = '🔍 Verificando...';

        try {
            const isValid = AuthService.validateMasterLogin(password);

            if (isValid) {
                MasterLoginView.showSuccess('✅ Acceso autorizado - Redirigiendo...');

                // Esperar un momento y recargar para mostrar configuración de admin
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const remaining = Math.max(0, 5 - parseInt(localStorage.getItem('master_login_attempts') || '0'));

                if (remaining > 0) {
                    MasterLoginView.showError(`❌ Contraseña incorrecta. Intentos restantes: ${remaining}`);
                    passwordInput.value = '';
                    passwordInput.focus();
                } else {
                    MasterLoginView.showError('❌ Demasiados intentos fallidos. Acceso bloqueado.');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Error en login maestro:', error);
            MasterLoginView.showError('❌ Error del sistema. Intente nuevamente.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '🔓 Verificar Acceso';
        }
    }

    static showError(message) {
        MasterLoginView.showNotification(message, 'error');
    }

    static showSuccess(message) {
        MasterLoginView.showNotification(message, 'success');
    }

    static showNotification(message, type = 'info') {
        // Remover notificación anterior si existe
        const existing = document.querySelector('.master-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = `master-notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;

        // Colores según tipo
        switch (type) {
            case 'error':
                notification.style.background = '#e74c3c';
                break;
            case 'success':
                notification.style.background = '#27ae60';
                break;
            default:
                notification.style.background = '#3498db';
        }

        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);

        // Agregar animaciones CSS si no existen
        if (!document.getElementById('masterNotificationStyles')) {
            const style = document.createElement('style');
            style.id = 'masterNotificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Asegurar que la clase esté disponible globalmente
window.MasterLoginView = MasterLoginView;
console.log('✅ MasterLoginView cargada y disponible globalmente');