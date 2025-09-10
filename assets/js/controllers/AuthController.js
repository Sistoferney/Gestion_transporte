/**
 * Controlador de Autenticación - Gestión de login/logout y sesiones
 */
class AuthController extends BaseController {
    constructor() {
        super();
        this.loginForm = null;
        this.setupLoginForm();
    }

    initialize() {
        // No llamar al initialize del padre en este caso
        // ya que este controlador maneja la autenticación
        this.setupEventListeners();
    }

    setupLoginForm() {
        this.loginForm = document.getElementById('loginForm');
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Auto-rellenar campos en desarrollo
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.setupDevelopmentHelpers();
        }
    }

    setupDevelopmentHelpers() {
        // Agregar botones de acceso rápido en desarrollo
        const quickLoginContainer = document.createElement('div');
        quickLoginContainer.style.cssText = 'margin-top: 20px; text-align: center;';
        quickLoginContainer.innerHTML = `
            <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Acceso rápido (desarrollo):</p>
            <button type="button" class="btn" onclick="authController.quickLogin('admin')" 
                    style="margin: 5px; padding: 8px 12px; font-size: 12px;">
                👨‍💼 Admin
            </button>
            <button type="button" class="btn" onclick="authController.quickLogin('conductor1')" 
                    style="margin: 5px; padding: 8px 12px; font-size: 12px;">
                🚛 Conductor 1
            </button>
            <button type="button" class="btn" onclick="authController.quickLogin('conductor2')" 
                    style="margin: 5px; padding: 8px 12px; font-size: 12px;">
                🚛 Conductor 2
            </button>
        `;

        const loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            loginContainer.appendChild(quickLoginContainer);
        }
    }

    quickLogin(username) {
        const defaultPasswords = {
            'admin': 'admin123',
            'conductor1': 'pass123',
            'conductor2': 'pass123'
        };

        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');

        if (usernameField && passwordField) {
            usernameField.value = username;
            passwordField.value = defaultPasswords[username] || '';
            
            // Simular envío del formulario
            this.handleLogin({ 
                preventDefault: () => {},
                target: this.loginForm 
            });
        }
    }

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
            
            // Simular delay de red en desarrollo
            if (window.location.hostname === 'localhost') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Autenticar usuario
            const user = User.authenticate(username, password);
            
            if (user) {
                // Crear sesión
                const sessionData = user.login();
                
                this.showSuccess(`¡Bienvenido, ${user.name}!`);
                
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
    static performLogout() {
        StorageService.clearUserSession();
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
        const navTabs = document.querySelector('.nav-tabs');
        if (navTabs) {
            navTabs.innerHTML = `
                <button class="tab-btn active" onclick="showSection('dashboard')">📊 Mi Dashboard</button>
                <button class="tab-btn" onclick="showSection('documents')">📄 Documentos</button>
                <button class="tab-btn" onclick="showSection('expenses')">💰 Mis Gastos</button>
            `;
        }
        
        // Ocultar secciones de administrador
        const adminSections = ['vehicles', 'drivers', 'reports'];
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
                'manage_documents',
                'view_reports',
                'export_data',
                'manage_users'
            ],
            'driver': [
                'view_dashboard',
                'manage_own_expenses',
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