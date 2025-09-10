/**
 * Application - Clase principal de la aplicación
 * Coordina el router, navegación y componentes principales
 */
class Application {
    constructor() {
        // Usar patrón Singleton para evitar instancias múltiples
        if (window.appInstance) {
            console.log('⚠️ [Application] Ya existe una instancia, devolviendo la existente');
            return window.appInstance;
        }
        
        this.router = null;
        this.navigationManager = null;
        this.isInitialized = false;
        this.userSession = null;
        this.globalControllers = new Map();
        
        // Guardar referencia global
        window.appInstance = this;
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ [Application.initialize] Ya está inicializada, ignorando...');
            return;
        }

        try {
            console.log('🚀 Iniciando aplicación...');

            // Verificar autenticación
            if (!this.checkAuthentication()) return;

            // Inicializar componentes principales
            await this.initializeCore();

            // Configurar aplicación según usuario
            this.setupUserInterface();

            // Inicializar datos de prueba si es necesario
            this.initializeTestData();

            // Configurar manejadores globales
            this.setupGlobalHandlers();

            // Marcar como inicializado
            this.isInitialized = true;

            console.log('✅ Aplicación inicializada correctamente');

        } catch (error) {
            console.error('❌ Error al inicializar aplicación:', error);
            this.handleInitializationError(error);
        }
    }

    checkAuthentication() {
        this.userSession = AuthController.checkAuthentication();
        
        if (!this.userSession) {
            console.log('🔒 Usuario no autenticado, redirigiendo al login');
            window.location.href = './auth.html';
            return false;
        }

        console.log(`👤 Usuario autenticado: ${this.userSession.name} (${this.userSession.type})`);
        return true;
    }

    async initializeCore() {
        // Inicializar router
        this.router = new Router();
        
        // Inicializar navigation manager
        this.navigationManager = new NavigationManager(this.router);
        
        // Configurar referencias globales
        window.app = this;
        window.router = this.router;
        window.navigationManager = this.navigationManager;

        // Inicializar controladores
        await this.initializeControllers();

        // Configurar interfaz según usuario
        AuthController.setupUserInterface(this.userSession);
    }

    async initializeControllers() {
        console.log('🎛️ Inicializando controladores...');
        
        try {
            // Inicializar VehicleController
            if (typeof VehicleController !== 'undefined') {
                this.globalControllers.set('vehicle', new VehicleController());
                window.vehicleController = this.globalControllers.get('vehicle');
                console.log('✅ VehicleController inicializado');
            }
            
            // Inicializar DriverController
            if (typeof DriverController !== 'undefined') {
                this.globalControllers.set('driver', new DriverController());
                window.driverController = this.globalControllers.get('driver');
                console.log('✅ DriverController inicializado');
            }
            
            // Inicializar DocumentController
            if (typeof DocumentController !== 'undefined') {
                try {
                    this.globalControllers.set('document', new DocumentController());
                    window.documentController = this.globalControllers.get('document');
                    console.log('✅ DocumentController inicializado');
                } catch (error) {
                    console.error('❌ Error al inicializar DocumentController:', error);
                    throw error;
                }
            } else {
                console.error('❌ DocumentController no está definido - verificar carga de scripts');
            }
            
            // Inicializar ExpenseController
            if (typeof ExpenseController !== 'undefined') {
                this.globalControllers.set('expense', new ExpenseController());
                window.expenseController = this.globalControllers.get('expense');
                console.log('✅ ExpenseController inicializado');
            }
            
            // Inicializar DashboardController al final (después de que DOM esté listo)
            if (typeof DashboardController !== 'undefined') {
                // Esperar un momento para asegurar que el DOM esté listo
                await new Promise(resolve => setTimeout(resolve, 100));
                this.globalControllers.set('dashboard', new DashboardController());
                window.dashboardController = this.globalControllers.get('dashboard');
                console.log('✅ DashboardController inicializado');
            }
            
            console.log('✅ Todos los controladores inicializados correctamente');
            
        } catch (error) {
            console.error('❌ Error al inicializar controladores:', error);
            throw error;
        }
    }

    setupUserInterface() {
        // Configurar navegación según el tipo de usuario
        if (this.userSession.type === 'driver') {
            this.setupDriverInterface();
        } else {
            this.setupAdminInterface();
        }

        // Aplicar configuraciones guardadas
        this.applyUserSettings();
    }

    setupDriverInterface() {
        console.log('🚛 Configurando interfaz de conductor');
        
        // NavigationManager ya maneja los diferentes tipos de usuario automáticamente
        
        // Ocultar elementos de admin
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => el.style.display = 'none');
    }

    setupAdminInterface() {
        console.log('👨‍💼 Configurando interfaz de administrador');
        
        // Mostrar todos los elementos
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => el.style.display = '');
    }

    applyUserSettings() {
        const settings = StorageService.getUserSettings();
        if (settings) {
            // Aplicar modo oscuro
            if (settings.darkMode) {
                document.body.classList.add('dark-mode');
            }

            // Aplicar otras configuraciones
            try {
                this.navigationManager.applySettings(settings);
            } catch (error) {
                console.warn('⚠️ Error al aplicar configuraciones de navegación:', error);
            }
        }
    }

    initializeTestData() {
        // Solo en desarrollo o si no hay datos
        if (this.shouldInitializeTestData()) {
            console.log('🧪 Inicializando datos de prueba...');
            this.createTestData();
        }
    }

    shouldInitializeTestData() {
        // Verificar si ya hay datos
        const vehicles = Vehicle.getAll();
        const drivers = Driver.getAll();
        
        console.log('🔍 [shouldInitializeTestData] Verificando datos existentes:');
        console.log('   - Vehículos encontrados:', vehicles.length);
        console.log('   - Conductores encontrados:', drivers.length);
        console.log('   - Datos en localStorage vehicles:', localStorage.getItem('vehicles')?.substring(0, 100));
        
        // Inicializar datos solo si no hay vehículos ni conductores
        const shouldInit = vehicles.length === 0 && drivers.length === 0;
        console.log('   - ¿Debe inicializar datos de prueba?', shouldInit);
        
        return shouldInit;
    }

    createTestData() {
        try {
            // Crear vehículos de prueba
            const testVehicles = [
                { plate: 'ABC123', brand: 'Toyota', model: 'Hilux', year: 2020 },
                { plate: 'DEF456', brand: 'Chevrolet', model: 'NPR', year: 2019 },
                { plate: 'GHI789', brand: 'Ford', model: 'Ranger', year: 2021 }
            ];

            testVehicles.forEach(vehicleData => {
                Vehicle.save(vehicleData);
            });

            // Crear conductores de prueba (solo si es admin)
            if (this.userSession.type === 'admin') {
                const vehicles = Vehicle.getAll();
                const testDrivers = [
                    { 
                        name: 'Juan Pérez', 
                        license: '12345678', 
                        phone: '3001234567',
                        email: 'juan@example.com',
                        vehicleId: vehicles[0]?.id,
                        status: 'active'
                    },
                    { 
                        name: 'María González', 
                        license: '87654321', 
                        phone: '3009876543',
                        email: 'maria@example.com',
                        vehicleId: vehicles[1]?.id,
                        status: 'active'
                    }
                ];

                testDrivers.forEach(driverData => {
                    Driver.save(driverData);
                });
            }

            console.log('✅ Datos de prueba creados');

        } catch (error) {
            console.error('❌ Error al crear datos de prueba:', error);
        }
    }

    setupGlobalHandlers() {
        // Manejar errores no capturados
        window.addEventListener('error', (e) => {
            console.error('Error global:', e.error);
            this.handleGlobalError(e.error);
        });

        // Manejar promesas rechazadas
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Promesa rechazada:', e.reason);
            this.handleGlobalError(e.reason);
        });

        // Manejar cambios de visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.handlePageVisible();
            } else {
                this.handlePageHidden();
            }
        });

        // Manejar resize de ventana
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // Configurar actualizaciones automáticas
        this.setupPeriodicUpdates();
    }

    handleGlobalError(error) {
        // Log del error
        console.error('Error global capturado:', error);

        // Mostrar notificación al usuario (no muy técnica)
        if (this.navigationManager) {
            this.navigationManager.showError('Ha ocurrido un error inesperado. Por favor, recarga la página.');
        }
    }

    handlePageVisible() {
        // Verificar sesión cuando la página vuelve a ser visible
        this.checkSessionValidity();
        
        // Actualizar datos si es necesario
        this.refreshCurrentView();
    }

    handlePageHidden() {
        // Guardar estado si es necesario
        this.saveApplicationState();
    }

    handleWindowResize() {
        // Ajustar interfaz responsive
        if (window.innerWidth < 768) {
            document.body.classList.add('mobile-view');
        } else {
            document.body.classList.remove('mobile-view');
        }
    }

    setupPeriodicUpdates() {
        // Verificar sesión cada 5 minutos
        setInterval(() => {
            this.checkSessionValidity();
        }, 5 * 60 * 1000);

        // Actualizar actividad del usuario
        setInterval(() => {
            AuthController.updateLastActivity();
        }, 30 * 1000);
    }

    checkSessionValidity() {
        const currentSession = StorageService.getUserSession();
        
        if (!currentSession) {
            // Sesión perdida
            window.location.href = './auth.html';
        } else if (currentSession.username !== this.userSession.username) {
            // Cambio de usuario
            window.location.reload();
        }
    }

    refreshCurrentView() {
        // Refrescar la vista actual si está disponible
        const currentView = this.router?.getCurrentView();
        if (currentView && currentView.refresh) {
            currentView.refresh();
        }
    }

    saveApplicationState() {
        // Guardar estado de la aplicación
        const state = {
            currentRoute: this.router?.getCurrentRoute(),
            timestamp: new Date().toISOString()
        };
        
        StorageService.setApplicationState(state);
    }

    handleInitializationError(error) {
        // Mostrar error de inicialización
        const errorHTML = `
            <div style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: white; display: flex; align-items: center; justify-content: center;
                flex-direction: column; font-family: Arial, sans-serif; z-index: 10000;
            ">
                <div style="text-align: center; max-width: 500px; padding: 20px;">
                    <h1 style="color: #e74c3c; margin-bottom: 20px;">❌ Error de Inicialización</h1>
                    <p style="margin-bottom: 20px;">
                        La aplicación no pudo iniciarse correctamente. 
                        Por favor, recarga la página o contacta al administrador.
                    </p>
                    <div style="margin-bottom: 20px;">
                        <button onclick="window.location.reload()" style="
                            background: #3498db; color: white; border: none; 
                            padding: 10px 20px; border-radius: 5px; cursor: pointer;
                            margin-right: 10px;
                        ">
                            🔄 Recargar Página
                        </button>
                        <button onclick="window.location.href='./auth.html'" style="
                            background: #95a5a6; color: white; border: none; 
                            padding: 10px 20px; border-radius: 5px; cursor: pointer;
                        ">
                            🏠 Ir al Login
                        </button>
                    </div>
                    <details style="text-align: left; font-size: 12px; color: #666;">
                        <summary>Detalles técnicos</summary>
                        <pre style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 3px;">
${error.stack || error.message || error}
                        </pre>
                    </details>
                </div>
            </div>
        `;

        document.body.innerHTML = errorHTML;
    }

    // Métodos públicos para interacción externa
    getCurrentUser() {
        return this.userSession;
    }

    getRouter() {
        return this.router;
    }

    getNavigationManager() {
        return this.navigationManager;
    }

    navigateTo(route) {
        if (this.router) {
            return this.router.navigateTo(route);
        }
    }

    showNotification(message, type = 'info') {
        if (this.navigationManager) {
            this.navigationManager.showNotification(message, type);
        }
    }

    // Método para reinicializar la aplicación
    async reinitialize() {
        this.isInitialized = false;
        
        // Limpiar componentes existentes
        if (this.router) {
            this.router.cleanupCurrentRoute();
        }

        // Reinicializar
        await this.initialize();
    }

    // Método para limpiar la aplicación
    cleanup() {
        if (this.router) {
            this.router.cleanupCurrentRoute();
        }

        this.globalControllers.clear();
        this.isInitialized = false;
    }
}

// Función global para inicializar la aplicación
async function initializeApplication() {
    try {
        // Crear instancia de la aplicación
        const app = new Application();
        
        // Inicializar
        await app.initialize();
        
        // Hacer disponible globalmente
        window.app = app;
        
        return app;
        
    } catch (error) {
        console.error('Error fatal al inicializar aplicación:', error);
        throw error;
    }
}

// Auto-inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
    // DOM ya está listo
    initializeApplication();
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Application, initializeApplication };
}