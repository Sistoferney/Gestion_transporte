/**
 * Controlador de Autenticación - Gestión de login/logout y sesiones
 */
class AuthController extends BaseController {
    constructor() {
        super();
        this.loginForm = null;
        // Inicializar de forma asíncrona
        this.initializeAsync();
    }

    async initializeAsync() {
        await this.checkAdminSetup();
    }

    initialize() {
        // No llamar al initialize del padre en este caso
        // ya que este controlador maneja la autenticación
        this.setupEventListeners();
    }

    async checkAdminSetup() {
        try {
            // Inicializar credenciales desde la nube si están disponibles
            if (window.AuthService) {
                await AuthService.initializeFromCloud();

                // NUEVA FUNCIONALIDAD: Verificar configuración del sistema primero
                const blockStatus = await AuthService.isAdminSetupBlockedGlobally();
                console.log('🔒 Estado del sistema:', blockStatus);

                if (blockStatus === true) {
                    console.log('➡️ Sistema configurado - mostrando login normal');
                    this.setupLoginForm();
                    return;
                }

                // NUEVA FUNCIONALIDAD: Verificar si requiere configuración inicial
                if (blockStatus === 'requires_initial_setup' || blockStatus === 'requires_initial_setup_or_s3_config') {
                    console.log('🔧 Sistema requiere configuración inicial');
                    this.showSetupOptions();
                    return;
                }

                // Fallback: Verificar si requiere login maestro (compatibilidad)
                if (blockStatus === 'requires_master_login') {
                    console.log('🔑 Requiere login maestro (compatibilidad)');

                    // Verificar si login maestro está desactivado
                    if (AuthService.isMasterLoginDisabled()) {
                        console.log('🔒 Login maestro desactivado - mostrando login normal');
                        this.setupLoginForm();
                        return;
                    }

                    // Verificar si ya está validado
                    if (AuthService.isMasterLoginValidated()) {
                        console.log('✅ Login maestro ya validado - configurando sistema');

                        // Auto-configurar S3 si no está configurado
                        if (!window.S3Service || !S3Service.isConfigured()) {
                            console.log('🔧 S3 no configurado, ejecutando auto-configuración...');
                            try {
                                const s3Configured = AuthService.autoConfigureS3();
                                if (!s3Configured) {
                                    console.error('❌ Falló auto-configuración S3');
                                    alert('Error: No se pudo configurar el acceso al sistema.');
                                    return;
                                }
                            } catch (error) {
                                console.error('❌ Error en auto-configuración S3:', error);
                                alert('Error: Sistema no configurado correctamente.');
                                return;
                            }
                        }

                        // Auto-configurar admin preestablecido
                        console.log('🔧 Configurando admin del sistema...');
                        try {
                            const adminConfigured = await AuthService.autoConfigureAdmin();
                            if (!adminConfigured) {
                                console.error('❌ Falló configuración de admin');
                                alert('Error: No se pudo configurar el administrador del sistema.');
                                return;
                            }
                        } catch (error) {
                            console.error('❌ Error en configuración de admin:', error);
                            alert('Error: No se pudo configurar el administrador.');
                            return;
                        }

                        // Sistema configurado: mostrar login normal
                        console.log('✅ Sistema completamente configurado');
                        console.log('➡️ Mostrando login normal - Admin y conductores disponibles');
                        this.setupLoginForm();
                        return;
                    } else {
                        console.log('➡️ Mostrando login maestro');
                        this.showMasterLogin();
                        return;
                    }
                }

                // Verificar si el admin está configurado (ahora async)
                const isConfigured = await AuthService.isAdminConfigured();
                console.log('🔍 Admin configurado?', isConfigured);

                if (!isConfigured) {
                    console.log('➡️ Mostrando configuración inicial de admin');
                    this.showAdminSetup();
                } else {
                    console.log('➡️ Mostrando formulario de login normal');
                    this.setupLoginForm();
                }
            } else {
                console.error('AuthService no disponible');
                this.setupLoginForm();
            }
        } catch (error) {
            console.error('Error verificando configuración de admin:', error);
            this.setupLoginForm();
        }
    }

    showSetupOptions() {
        // Mostrar opciones de configuración
        document.body.innerHTML = `
            <div class="system-setup-container">
                <div class="setup-card">
                    <div class="setup-header">
                        <h1>🔧 Configuración del Sistema</h1>
                        <p>Seleccione cómo desea configurar el acceso al sistema</p>
                    </div>

                    <div class="setup-options">
                        <div class="option-card" onclick="AuthController.prototype.showSystemSetup()">
                            <div class="option-icon">🆕</div>
                            <h3>Configuración Nueva</h3>
                            <p>Primera configuración del sistema completo</p>
                            <ul>
                                <li>Configure credenciales AWS S3</li>
                                <li>Cree cuenta de administrador</li>
                                <li>Establezca contraseña maestra</li>
                            </ul>
                            <button class="btn btn-primary">Configurar Nuevo Sistema</button>
                        </div>

                        <div class="option-card" onclick="AuthController.prototype.showS3Config()">
                            <div class="option-icon">🔗</div>
                            <h3>Conectar a Sistema Existente</h3>
                            <p>Conectar a un sistema ya configurado</p>
                            <ul>
                                <li>Ingrese credenciales AWS S3</li>
                                <li>Descargue configuración existente</li>
                                <li>Acceso automático para conductores</li>
                            </ul>
                            <button class="btn btn-success">Conectar a Sistema</button>
                        </div>
                    </div>

                    <div class="setup-info">
                        <div class="alert alert-info">
                            <strong>💡 ¿Cuál elegir?</strong><br>
                            • <strong>Configuración Nueva:</strong> Si es el primer equipo configurando el sistema<br>
                            • <strong>Conectar a Sistema:</strong> Si ya hay un sistema configurado en otro equipo
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Cargar estilos
        this.loadSetupStyles();
    }

    showSystemSetup() {
        // Mostrar interfaz de configuración inicial del sistema
        document.body.innerHTML = `
            ${SystemSetupView.render()}
        `;

        // Cargar estilos si no están cargados
        this.loadSetupStyles();

        // Configurar eventos
        SystemSetupView.bindEvents();
    }

    showS3Config() {
        // Mostrar solo configuración S3 para conectar a sistema existente
        document.body.innerHTML = `
            <div class="system-setup-container">
                <div class="setup-card">
                    <div class="setup-header">
                        <h1>🔗 Conectar a Sistema Existente</h1>
                        <p>Ingrese las credenciales AWS S3 para conectar al sistema</p>
                        <button onclick="AuthController.prototype.showSetupOptions()" class="btn btn-secondary btn-back">← Volver</button>
                    </div>

                    <form id="s3ConfigForm" class="setup-form">
                        <div class="form-group">
                            <label for="s3AccessKeyId">Access Key ID</label>
                            <input type="text" id="s3AccessKeyId" name="s3AccessKeyId" class="form-control" required>
                        </div>

                        <div class="form-group">
                            <label for="s3SecretAccessKey">Secret Access Key</label>
                            <input type="password" id="s3SecretAccessKey" name="s3SecretAccessKey" class="form-control" required>
                        </div>

                        <div class="form-group">
                            <label for="s3Bucket">Bucket</label>
                            <input type="text" id="s3Bucket" name="s3Bucket" class="form-control" value="mi-app-sighu" required>
                        </div>

                        <div class="form-group">
                            <label for="s3Region">Región</label>
                            <select id="s3Region" name="s3Region" class="form-control">
                                <option value="sa-east-1" selected>South America (São Paulo)</option>
                                <option value="us-east-1">US East (N. Virginia)</option>
                                <option value="us-west-2">US West (Oregon)</option>
                                <option value="eu-west-1">Europe (Ireland)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <button type="button" onclick="AuthController.prototype.testAndConnect()" class="btn btn-success btn-large">
                                🔗 Probar y Conectar
                            </button>
                        </div>

                        <div id="connectionResult" class="setup-messages"></div>
                    </form>
                </div>
            </div>
        `;

        this.loadSetupStyles();
    }

    loadSetupStyles() {
        if (!document.querySelector('#admin-setup-styles')) {
            const link = document.createElement('link');
            link.id = 'admin-setup-styles';
            link.rel = 'stylesheet';
            link.href = './assets/css/admin-setup.css';
            document.head.appendChild(link);
        }
    }

    async testAndConnect() {
        const resultEl = document.getElementById('connectionResult');
        resultEl.innerHTML = '<div class="alert alert-info">🔄 Conectando al sistema...</div>';

        try {
            const accessKeyId = document.getElementById('s3AccessKeyId').value;
            const secretAccessKey = document.getElementById('s3SecretAccessKey').value;
            const bucket = document.getElementById('s3Bucket').value;
            const region = document.getElementById('s3Region').value;

            if (!accessKeyId || !secretAccessKey || !bucket) {
                throw new Error('Complete todos los campos requeridos');
            }

            // Configurar S3Service con las credenciales
            if (window.S3Service) {
                S3Service.config.region = region;
                S3Service.setCredentials(accessKeyId, secretAccessKey, bucket);

                // Probar conexión
                await S3Service.initializeAWS();

                // Intentar cargar configuración existente
                await AuthService.loadCredentialsFromS3();

                resultEl.innerHTML = '<div class="alert alert-success">✅ Conexión exitosa. Recargando sistema...</div>';

                // Recargar página para aplicar configuración
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } else {
                throw new Error('S3Service no disponible');
            }

        } catch (error) {
            resultEl.innerHTML = `<div class="alert alert-error">❌ Error: ${error.message}</div>`;
        }
    }

    showMasterLogin() {
        // Mostrar interfaz de login maestro
        document.body.innerHTML = `
            ${MasterLoginView.render()}
        `;

        // Cargar estilos si no están cargados (reutiliza los de admin setup)
        if (!document.querySelector('#admin-setup-styles')) {
            const link = document.createElement('link');
            link.id = 'admin-setup-styles';
            link.rel = 'stylesheet';
            link.href = './assets/css/admin-setup.css';
            document.head.appendChild(link);
        }

        // Configurar eventos
        MasterLoginView.bindEvents();
    }

    showAdminSetup() {
        // Mostrar interfaz de configuración inicial del admin
        document.body.innerHTML = `
            ${AdminSetupView.render()}
        `;

        // Cargar estilos si no están cargados
        if (!document.querySelector('#admin-setup-styles')) {
            const link = document.createElement('link');
            link.id = 'admin-setup-styles';
            link.rel = 'stylesheet';
            link.href = './assets/css/admin-setup.css';
            document.head.appendChild(link);
        }

        // Configurar eventos según el estado
        if (window.AuthService && AuthService.isAdminSetupBlocked()) {
            AdminSetupView.bindBlockedEvents();
        } else {
            AdminSetupView.bindEvents();
        }
    }

    setupLoginForm() {
        this.loginForm = document.getElementById('loginForm');
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Sistema de producción - sin helpers de desarrollo
    }

    // Métodos de desarrollo removidos para producción

    // Método quickLogin removido para producción

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');

        // Validaciones básicas
        if (!username || !password) {
            this.showError('Por favor, ingrese usuario y contraseña');
            return;
        }

        try {
            this.showLoading('Iniciando sesión...');

            // Autenticar usuario
            const authResult = await User.authenticate(username, password);

            if (authResult) {
                // Crear sesión usando AuthService
                const sessionData = AuthService.createSession(authResult);

                this.showSuccess(`¡Bienvenido, ${authResult.name}!`);
                
                // Redirigir después de un breve delay
                setTimeout(() => {
                    this.redirectToDashboard();
                }, 1500);
            }

        } catch (error) {
            this.hideLoading();
            this.handleLoginError(error);
        }
    }

    handleLoginError(error) {
        let message = 'Error al iniciar sesión';
        
        if (error.message.includes('Usuario no encontrado')) {
            message = 'Usuario no encontrado';
        } else if (error.message.includes('Contraseña incorrecta')) {
            message = 'Contraseña incorrecta';
        } else if (error.message.includes('Usuario inactivo')) {
            message = 'Usuario inactivo. Contacte al administrador';
        } else {
            message = error.message;
        }
        
        this.showError(message);
        
        // Limpiar campo de contraseña
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.value = '';
            passwordField.focus();
        }
    }

    redirectToDashboard() {
        window.location.href = './main.html';
    }

    // Método para logout (llamado desde otros controladores)
    static async performLogout() {
        console.log('🚪 [performLogout] Cerrando sesión y sincronizando datos...');

        // IMPORTANTE: Sincronizar todos los datos con S3 antes de cerrar sesión
        if (window.AuthService && window.S3Service && S3Service.isConfigured()) {
            try {
                console.log('☁️ [performLogout] Sincronizando credenciales con S3...');
                await AuthService.syncCredentialsToS3();
                console.log('✅ [performLogout] Datos sincronizados exitosamente');
            } catch (error) {
                console.warn('⚠️ [performLogout] Error sincronizando con S3:', error.message);
                // Continuar con logout aunque falle la sincronización
            }
        }

        // Limpiar sesión local
        StorageService.clearUserSession();
        console.log('✅ [performLogout] Sesión cerrada');

        // Redirigir a login
        window.location.href = './auth.html';
    }

    // Verificar si el usuario está autenticado
    static checkAuthentication() {
        const session = StorageService.getUserSession();
        
        if (!session) {
            // No hay sesión, redirigir al login
            window.location.href = './auth.html';
            return null;
        }

        // Verificar si la sesión no ha expirado
        if (session.loginTime) {
            const loginTime = new Date(session.loginTime);
            const now = new Date();
            const hoursElapsed = (now - loginTime) / (1000 * 60 * 60);
            
            // Expirar después de 24 horas
            if (hoursElapsed > 24) {
                StorageService.clearUserSession();
                window.location.href = './auth.html';
                return null;
            }
        }

        return session;
    }

    // Configurar interfaz según el rol del usuario
    static setupUserInterface(userSession) {
        if (!userSession) return;

        // Mostrar información del usuario
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.textContent = `👤 ${userSession.name} (${userSession.type === 'admin' ? 'Administrador' : 'Conductor'})`;
        }

        // Configurar navegación según el rol
        if (userSession.type === 'driver') {
            AuthController.setupDriverInterface(userSession);
        } else {
            AuthController.setupAdminInterface(userSession);
        }
    }

    static setupDriverInterface(userSession) {
        // La navegación ahora es manejada completamente por NavigationManager
        // No se necesita generar HTML aquí

        // Ocultar secciones de administrador
        const adminSections = ['vehicles', 'drivers', 'reports', 'email-config'];
        adminSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
    }

    static setupAdminInterface(userSession) {
        // Los administradores ven todo por defecto
        // Aquí se pueden agregar configuraciones específicas para admin
    }

    // Gestión de permisos
    static hasPermission(permission, userSession = null) {
        const session = userSession || StorageService.getUserSession();
        if (!session) return false;

        const permissions = {
            'admin': [
                'view_dashboard',
                'manage_vehicles',
                'manage_drivers',
                'manage_expenses',
                'manage_freights',
                'manage_documents',
                'view_reports',
                'export_data',
                'manage_users'
            ],
            'driver': [
                'view_dashboard',
                'manage_own_expenses',
                'view_own_freights',
                'view_own_documents',
                'view_own_vehicle'
            ]
        };

        const userPermissions = permissions[session.type] || [];
        return userPermissions.includes(permission);
    }

    // Crear nuevo usuario (solo admin)
    static async createUser(userData) {
        const currentUser = StorageService.getUserSession();
        if (!currentUser || currentUser.type !== 'admin') {
            throw new Error('Permisos insuficientes');
        }

        try {
            const user = User.save(userData);
            return user;
        } catch (error) {
            throw new Error(`Error al crear usuario: ${error.message}`);
        }
    }

    // Cambiar contraseña
    static async changePassword(currentPassword, newPassword) {
        const session = StorageService.getUserSession();
        if (!session) {
            throw new Error('No hay sesión activa');
        }

        const user = User.getByUsername(session.username);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        if (user.password !== currentPassword) {
            throw new Error('Contraseña actual incorrecta');
        }

        user.changePassword(newPassword);
        return true;
    }

    // Obtener información del usuario actual
    static getCurrentUserInfo() {
        const session = StorageService.getUserSession();
        if (!session) return null;

        const user = User.getByUsername(session.username);
        return user ? user.toSessionData() : session;
    }

    // Actualizar última actividad
    static updateLastActivity() {
        const session = StorageService.getUserSession();
        if (session) {
            session.lastActivity = new Date().toISOString();
            StorageService.setUserSession(session);
        }
    }

    // Configurar interceptores para actualizar actividad
    static setupActivityTracking() {
        // Actualizar actividad en clicks
        document.addEventListener('click', () => {
            AuthController.updateLastActivity();
        });

        // Actualizar actividad en scroll
        let scrollTimeout;
        document.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                AuthController.updateLastActivity();
            }, 1000);
        });

        // Verificar sesión periódicamente
        setInterval(() => {
            const session = StorageService.getUserSession();
            if (session && session.lastActivity) {
                const lastActivity = new Date(session.lastActivity);
                const now = new Date();
                const minutesInactive = (now - lastActivity) / (1000 * 60);
                
                // Advertir después de 25 minutos de inactividad
                if (minutesInactive > 25 && minutesInactive < 30) {
                    // Mostrar advertencia de sesión próxima a expirar
                    console.warn('Sesión próxima a expirar por inactividad');
                }
            }
        }, 60000); // Verificar cada minuto
    }
}