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
            if (!(await this.checkAuthentication())) return;

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

            // Ocultar loader después de inicializar
            this.hideAppLoader();

        } catch (error) {
            console.error('❌ Error al inicializar aplicación:', error);
            this.hideAppLoader();
            this.handleInitializationError(error);
        }
    }

    async checkAuthentication() {
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
        // IMPORTANTE: Cargar datos desde S3 ANTES de inicializar componentes
        await this.performAutoSync();

        // Inicializar controladores ANTES del router para que estén listos
        await this.initializeControllers();

        // Inicializar router DESPUÉS de los controladores (pero SIN navegar todavía)
        this.router = new Router();

        // Inicializar navigation manager
        this.navigationManager = new NavigationManager(this.router);

        // Configurar referencias globales
        window.app = this;
        window.router = this.router;
        window.navigationManager = this.navigationManager;

        // Configurar interfaz según usuario
        AuthController.setupUserInterface(this.userSession);

        // IMPORTANTE: Iniciar navegación DESPUÉS de que todo esté listo
        this.router.startNavigation();
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

        // Configurar sincronización periódica para admin
        this.setupPeriodicSync();
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
        
        // Inicializar datos solo si no hay vehículos ni conductores
        const shouldInit = vehicles.length === 0 && drivers.length === 0;
        
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

            // Los conductores se crean dinámicamente por el administrador
            // ya no se necesitan datos de prueba hardcodeados

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

    // Auto-sync inteligente al login
    async performAutoSync() {
        // Verificar si el auto-sync al login está habilitado
        if (StorageService.s3Config.autoSyncOnLogin === false) {
            return;
        }

        // Dar tiempo a que S3Service se cargue y configure
        const s3Ready = await this.waitForS3Configuration();

        if (!s3Ready) {
            console.log('ℹ️ S3 no disponible, omitiendo auto-sync al login');
            return;
        }

        console.log('🔄 Auto-sync al login...');

        try {
            const userRole = this.userSession.type;

            if (userRole === 'driver') {
                // Conductores: Solo descargar datos (no subir)
                await this.smartSyncForDriver();
            } else if (userRole === 'admin') {
                // Admin: Sincronización completa
                await this.smartSyncForAdmin();
            } else {
                console.log('⚠️ Rol de usuario desconocido:', userRole);
            }

        } catch (error) {
            console.warn('⚠️ Auto-sync falló (no crítico):', error.message);
            // No bloquear el login si falla el sync
        }
    }

    async smartSyncForDriver() {
        try {
            const result = await StorageService.loadFromS3();
            if (result) {
                // También cargar recibos del mes actual
                await StorageService.loadCurrentMonthReceipts();
                this.showAutoSyncNotification('Datos actualizados desde la nube', 'info');
            }
        } catch (error) {
            console.warn('⚠️ Error descargando datos para conductor:', error.message);
        }
    }

    async smartSyncForAdmin() {
        try {
            console.log('🔄 [smartSyncForAdmin] Iniciando sincronización con prioridad S3...');

            // PASO 1: SIEMPRE descargar datos de S3 primero (merge inteligente)
            console.log('📥 [smartSyncForAdmin] Paso 1: Descargando datos de S3...');
            await StorageService.loadFromS3();

            // PASO 2: Cargar recibos del mes actual
            console.log('📄 [smartSyncForAdmin] Paso 2: Cargando recibos mensuales...');
            await StorageService.loadCurrentMonthReceipts();

            // PASO 3: Subir cualquier cambio local que sea más reciente
            console.log('📤 [smartSyncForAdmin] Paso 3: Sincronizando cambios locales...');
            const uploadResult = await StorageService.syncWithS3(false); // false = no forzar si no hay cambios

            // PASO 4: Sincronizar recibos del mes
            console.log('📄 [smartSyncForAdmin] Paso 4: Sincronizando recibos del mes...');
            await StorageService.syncCurrentMonthReceipts();

            // Marcar timestamp de sincronización exitosa para el merge inteligente
            StorageService.setLastSuccessfulSyncTime();

            this.showAutoSyncNotification('Datos sincronizados con prioridad S3', 'success');
            console.log('✅ [smartSyncForAdmin] Sincronización completada exitosamente');

        } catch (error) {
            console.warn('⚠️ [smartSyncForAdmin] Error en sincronización admin:', error.message);
            this.showAutoSyncNotification('Error en sincronización automática', 'warning');
        }
    }

    showAutoSyncNotification(message, type = 'info') {
        // Notificación no intrusiva para auto-sync
        const notification = document.createElement('div');
        notification.className = `auto-sync-notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✅' : 'ℹ️'}</span>
            <span>${message}</span>
        `;

        notification.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 9999;
            padding: 8px 16px; border-radius: 6px; color: white; font-size: 14px;
            background: ${type === 'success' ? '#27ae60' : '#3498db'};
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
        `;

        // Agregar estilos de animación si no existen
        if (!document.querySelector('#auto-sync-styles')) {
            const styles = document.createElement('style');
            styles.id = 'auto-sync-styles';
            styles.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto-remover después de 3 segundos con animación
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    // Función para esperar a que S3Service se configure
    async waitForS3Configuration(maxAttempts = 10) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (window.S3Service) {
                if (S3Service.isConfigured()) {
                    return true;
                } else {
                    // Intentar cargar credenciales almacenadas
                    try {
                        S3Service.loadStoredCredentials();
                        if (S3Service.isConfigured()) {
                            return true;
                        }
                    } catch (error) {
                        console.warn('Error cargando credenciales S3:', error.message);
                    }
                }
            }

            // Esperar antes del siguiente intento
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        return false;
    }

    // ===== SINCRONIZACIÓN PERIÓDICA PARA TIEMPO REAL =====

    setupPeriodicSync() {
        // Solo para admins y si S3 está configurado
        if (!this.user || this.user.role !== 'admin' || !window.S3Service || !S3Service.isConfigured()) {
            console.log('⏭️ [setupPeriodicSync] Omitiendo sincronización periódica (admin/S3 no disponible)');
            return;
        }

        // Evitar múltiples intervalos
        if (this.periodicSyncInterval) {
            clearInterval(this.periodicSyncInterval);
        }

        console.log('🔄 [setupPeriodicSync] Configurando sincronización periódica cada 30 segundos...');

        this.periodicSyncInterval = setInterval(async () => {
            try {
                console.log('🔄 [periodicSync] Verificando actualizaciones...');

                // Sincronización silenciosa (solo descarga, no notificaciones)
                const result = await StorageService.loadFromS3();

                if (result) {
                    console.log('🔄 [periodicSync] Datos actualizados desde S3');
                    // El evento dataUpdated ya se dispara automáticamente en loadFromS3
                }
            } catch (error) {
                console.warn('⚠️ [periodicSync] Error en sincronización silenciosa:', error.message);
            }
        }, 30000); // 30 segundos

        console.log('✅ [setupPeriodicSync] Sincronización periódica configurada');
    }

    // Limpiar recursos cuando se cierre la aplicación
    cleanup() {
        if (this.periodicSyncInterval) {
            clearInterval(this.periodicSyncInterval);
            this.periodicSyncInterval = null;
            console.log('🧹 [cleanup] Sincronización periódica detenida');
        }
    }

    // Función para ocultar el loader de la aplicación
    hideAppLoader() {
        // Llamar a la función global de hideLoader si existe
        if (typeof window.hideLoader === 'function') {
            // Pequeño delay para que la aplicación se vea lista
            setTimeout(() => {
                window.hideLoader();
            }, 500);
        } else {
            // Fallback: ocultar directamente
            const loader = document.getElementById('appLoader');
            if (loader) {
                setTimeout(() => {
                    loader.classList.add('hidden');
                    console.log('✅ Loader ocultado (fallback)');
                }, 500);
            }
        }
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

// Auto-inicialización DESHABILITADA - se llama manualmente desde main.html
// Esto evita la doble inicialización
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initializeApplication);
// } else {
//     // DOM ya está listo
//     initializeApplication();
// }

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Application, initializeApplication };
}