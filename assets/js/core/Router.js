/**
 * Router - Sistema de enrutamiento para la aplicación SPA
 */
class Router {
    constructor() {
        // Usar patrón Singleton para Router también
        if (window.routerInstance) {
            console.log('⚠️ [Router] Ya existe una instancia de Router, devolviendo la existente');
            return window.routerInstance;
        }
        
        this.routes = new Map();
        this.currentRoute = null;
        this.currentView = null;
        this.currentController = null;
        this.defaultRoute = 'dashboard';
        this.userSession = null;
        this.viewInstances = new Map(); // Cache de instancias de vistas
        this.controllerInstances = new Map(); // Cache de instancias de controladores
        this.isNavigating = false; // Flag para prevenir navegación múltiple
        
        // Guardar referencia global
        window.routerInstance = this;
        
        this.initialize();
    }

    initialize() {
        // Configurar rutas principales
        this.setupRoutes();
        
        // Verificar autenticación
        this.checkAuthentication();
        
        // Configurar listeners
        this.setupEventListeners();
        
        // Navegar a la ruta inicial
        this.navigateToInitialRoute();
    }

    setupRoutes() {
        // Rutas para administradores
        this.addRoute('dashboard', {
            title: 'Dashboard',
            controller: 'DashboardController',
            view: 'DashboardView',
            container: 'dashboard',
            permissions: ['view_dashboard'],
            icon: '📊'
        });

        this.addRoute('vehicles', {
            title: 'Vehículos',
            controller: 'VehicleController',
            view: 'VehicleView',
            container: 'vehicles',
            permissions: ['manage_vehicles'],
            icon: '🚚'
        });

        this.addRoute('drivers', {
            title: 'Conductores',
            controller: 'DriverController',
            view: 'DriverView',
            container: 'drivers',
            permissions: ['manage_drivers'],
            icon: '👥',
            adminOnly: true
        });

        this.addRoute('documents', {
            title: 'Documentos',
            controller: 'DocumentController',
            view: 'DocumentView',
            container: 'documents',
            permissions: ['manage_documents', 'view_own_documents'],
            icon: '📄'
        });

        this.addRoute('expenses', {
            title: 'Gastos',
            controller: 'ExpenseController',
            view: 'ExpenseView',
            container: 'expenses',
            permissions: ['manage_expenses', 'manage_own_expenses'],
            icon: '💰'
        });

        this.addRoute('freights', {
            title: 'Fletes',
            controller: 'FreightController',
            view: 'FreightView',
            container: 'freights',
            permissions: ['manage_freights', 'view_own_freights'],
            icon: '🚛'
        });

        this.addRoute('reports', {
            title: 'Reportes',
            controller: 'ReportController',
            view: 'ReportView',
            container: 'reports',
            permissions: ['view_reports'],
            icon: '📊',
            adminOnly: true
        });

        this.addRoute('email-config', {
            title: 'Configuración de Email',
            controller: null,
            view: 'EmailConfigView',
            container: 'email-config',
            permissions: ['view_dashboard'],
            icon: '📧',
            adminOnly: true
        });
    }

    addRoute(name, config) {
        this.routes.set(name, {
            name,
            ...config,
            isActive: false
        });
    }

    checkAuthentication() {
        this.userSession = AuthController.checkAuthentication();
        if (!this.userSession) {
            // Redirigir al login si no hay sesión
            window.location.href = './auth.html';
            return false;
        }
        return true;
    }

    setupEventListeners() {
        // Interceptar clicks en elementos de navegación
        document.addEventListener('click', (e) => {
            const navButton = e.target.closest('[data-route]');
            if (navButton) {
                e.preventDefault();
                const routeName = navButton.dataset.route;
                this.navigateTo(routeName);
            }
        });

        // Manejar botones de navegación legacy
        window.showSection = (sectionName) => {
            this.navigateTo(sectionName);
        };

        // Escuchar cambios en la sesión
        window.addEventListener('storage', (e) => {
            if (e.key === 'userSession') {
                this.handleSessionChange();
            }
        });

        // NOTA: El botón de logout se maneja directamente en el HTML con onclick="navigationManager.logout()"
        // No necesitamos un listener adicional aquí para evitar ejecuciones duplicadas
        // El NavigationManager ya maneja la confirmación con un modal personalizado
    }

    navigateToInitialRoute() {
        // Determinar ruta inicial basada en hash o defaultRoute
        const hash = window.location.hash.substring(1);
        const initialRoute = hash || this.defaultRoute;
        
        // Validar que la ruta existe y el usuario tiene permisos
        if (this.canAccessRoute(initialRoute)) {
            this.navigateTo(initialRoute);
        } else {
            // Navegar a la primera ruta accesible
            const accessibleRoute = this.getFirstAccessibleRoute();
            this.navigateTo(accessibleRoute);
        }
    }

    getFirstAccessibleRoute() {
        for (const [routeName, route] of this.routes) {
            if (this.canAccessRoute(routeName)) {
                return routeName;
            }
        }
        return 'dashboard'; // Fallback
    }

    canAccessRoute(routeName) {
        const route = this.routes.get(routeName);
        if (!route) return false;

        // Verificar si es solo para admin
        if (route.adminOnly && this.userSession.type !== 'admin') {
            return false;
        }

        // Verificar permisos específicos
        if (route.permissions && route.permissions.length > 0) {
            return route.permissions.some(permission => 
                AuthController.hasPermission(permission, this.userSession)
            );
        }

        return true;
    }

    async navigateTo(routeName) {
        console.log(`🧭 [Router.navigateTo] Navegando a: ${routeName}`);
        
        // Prevenir navegación duplicada a la misma ruta
        if (this.currentRoute === routeName) {
            console.log(`🧭 [Router.navigateTo] Ya estás en la ruta: ${routeName}, ignorando`);
            return;
        }

        // Prevenir navegación múltiple simultánea
        if (this.isNavigating) {
            console.log(`🧭 [Router.navigateTo] Navegación en progreso, ignorando nueva navegación a: ${routeName}`);
            return;
        }
        
        this.isNavigating = true;
        
        // Validar ruta y permisos
        if (!this.canAccessRoute(routeName)) {
            console.warn(`No se puede acceder a la ruta: ${routeName}`);
            this.showError('No tienes permisos para acceder a esta sección');
            this.isNavigating = false;
            return;
        }

        const route = this.routes.get(routeName);
        if (!route) {
            console.error(`Ruta no encontrada: ${routeName}`);
            this.isNavigating = false;
            return;
        }

        try {
            // Mostrar loading
            this.showLoadingState();

            // Limpiar ruta anterior
            this.cleanupCurrentRoute();

            // Actualizar estado
            this.currentRoute = routeName;
            window.location.hash = routeName;

            // Ocultar todas las secciones
            this.hideAllSections();

            // Mostrar sección actual
            this.showSection(route.container);
            

            // Actualizar navegación
            this.updateNavigation(routeName);

            // Instanciar controlador y vista
            await this.loadRouteComponents(route);

            // Actualizar título de la página
            this.updatePageTitle(route.title);

            // Ocultar loading
            this.hideLoadingState();

            console.log(`Navegado a: ${routeName}`);

        } catch (error) {
            this.hideLoadingState();
            console.error(`Error al navegar a ${routeName}:`, error);
            this.showError(`Error al cargar la sección ${route.title}`);
        } finally {
            // Liberar flag de navegación
            this.isNavigating = false;
        }
    }

    async loadRouteComponents(route) {
        console.log(`🔧 [Router.loadRouteComponents] Cargando componentes para:`, route.title);
        
        // Reutilizar controlador existente o crear nuevo
        if (route.controller && window[route.controller]) {
            if (!this.controllerInstances.has(route.controller)) {
                console.log(`🔧 [Router.loadRouteComponents] Creando nueva instancia de controlador: ${route.controller}`);
                this.controllerInstances.set(route.controller, new window[route.controller]());
            } else {
                console.log(`🔧 [Router.loadRouteComponents] Reutilizando instancia existente de controlador: ${route.controller}`);
            }
            
            this.currentController = this.controllerInstances.get(route.controller);
        }

        // Reutilizar vista existente o crear nueva
        if (route.view && window[route.view]) {
            console.log(`🔧 [Router.loadRouteComponents] Verificando vista: "${route.view}"`);
            console.log(`🔧 [Router.loadRouteComponents] ViewInstances size: ${this.viewInstances.size}`);
            const keys = Array.from(this.viewInstances.keys());
            console.log(`🔧 [Router.loadRouteComponents] ViewInstances keys:`, keys);
            console.log(`🔧 [Router.loadRouteComponents] Comparando claves:`);
            keys.forEach((key, index) => {
                console.log(`  Key[${index}]: "${key}" === "${route.view}" ? ${key === route.view}`);
                console.log(`  Key[${index}] length: ${key.length}, route.view length: ${route.view.length}`);
            });
            console.log(`🔧 [Router.loadRouteComponents] ¿Has route.view?`, this.viewInstances.has(route.view));
            console.log(`🔧 [Router.loadRouteComponents] Tipo de route.view:`, typeof route.view);
            
            // Verificar si ya existe una instancia de esta vista
            if (!this.viewInstances.has(route.view)) {
                console.log(`🔧 [Router.loadRouteComponents] Creando nueva instancia de: ${route.view}`);
                this.viewInstances.set(route.view, new window[route.view](route.container));
                console.log(`🔧 [Router.loadRouteComponents] Instancia creada. Nuevas keys:`, Array.from(this.viewInstances.keys()));
            } else {
                console.log(`🔧 [Router.loadRouteComponents] Reutilizando instancia existente de: ${route.view}`);
            }
            
            this.currentView = this.viewInstances.get(route.view);
            
            // Renderizar la vista - siempre renderizar para asegurar datos actualizados
            if (this.currentView.render) {
                const container = document.getElementById(route.container);
                if (container) {
                    console.log(`🔧 [Router.loadRouteComponents] Renderizando/Actualizando vista para: ${route.title}`);
                    this.currentView.render();
                    
                    // Configurar event listeners si existen
                    if (this.currentView.setupEventListeners) {
                        this.currentView.setupEventListeners();
                    }
                }
            }
        } else if (route.view) {
            console.warn(`Vista no encontrada: ${route.view}`);
        }

        // Configurar variables globales para compatibilidad
        this.setupGlobalReferences(route);
    }

    setupGlobalReferences(route) {
        // Crear referencias globales para compatibilidad con código legacy
        const controllerName = route.controller?.replace('Controller', '').toLowerCase() + 'Controller';
        const viewName = route.view?.replace('View', '').toLowerCase() + 'View';

        if (this.currentController) {
            window[controllerName] = this.currentController;
        }

        if (this.currentView) {
            window[viewName] = this.currentView;
        }
    }

    cleanupCurrentRoute() {
        // Llamar método cleanup de la vista actual antes de cambiar
        if (this.currentView && typeof this.currentView.cleanup === 'function') {
            console.log(`🧹 [Router.cleanupCurrentRoute] Ejecutando cleanup para vista actual...`);
            this.currentView.cleanup();
        }

        // No limpiar instancias en cache, solo limpiar referencias actuales
        // Las instancias se mantienen para reutilizar estado y datos

        // Limpiar referencias globales
        this.cleanupGlobalReferences();

        this.currentController = null;
        this.currentView = null;
    }

    cleanupGlobalReferences() {
        // Lista de posibles referencias globales a limpiar
        const possibleRefs = [
            'dashboardController', 'dashboardView',
            'vehicleController', 'vehicleView',
            'driverController', 'driverView',
            'documentController', 'documentView',
            'expenseController', 'expenseView',
            'reportController', 'reportView'
        ];

        possibleRefs.forEach(ref => {
            if (window[ref]) {
                delete window[ref];
            }
        });
    }

    hideAllSections() {
        const sections = document.querySelectorAll('main > section');
        sections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });
    }

    showSection(containerId) {
        const section = document.getElementById(containerId);
        if (section) {
            section.style.display = 'block';
            section.classList.add('active');
        }
    }

    updateNavigation(activeRoute) {
        // Remover clase active de todos los botones de navegación
        const navButtons = document.querySelectorAll('.tab-btn, .nav-btn');
        navButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        // Agregar clase active al botón correspondiente
        const activeButton = document.querySelector(`[data-route="${activeRoute}"]`) ||
                            document.querySelector(`[onclick*="${activeRoute}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Actualizar estado de las rutas
        this.routes.forEach((route, name) => {
            route.isActive = (name === activeRoute);
        });
    }

    updatePageTitle(title) {
        document.title = `${title} - Sistema de Gestión de Transporte`;
    }

    showLoadingState() {
        // Mostrar indicador de carga global
        let loader = document.getElementById('globalLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'globalLoader';
            loader.className = 'global-loader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="spinner"></div>
                    <p>Cargando...</p>
                </div>
            `;
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    hideLoadingState() {
        const loader = document.getElementById('globalLoader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    handleLogout() {
        // El NavigationManager ya maneja la confirmación con un modal personalizado
        // No necesitamos confirm() aquí
        if (window.navigationManager) {
            window.navigationManager.logout();
        } else {
            // Fallback si navigationManager no está disponible
            // Limpiar estado actual
            this.cleanupCurrentRoute();

            // Realizar logout
            AuthController.performLogout();
        }
    }

    handleSessionChange() {
        // Verificar si la sesión cambió
        const newSession = StorageService.getUserSession();
        
        if (!newSession) {
            // Sesión terminada, redirigir al login
            window.location.href = './auth.html';
        } else if (newSession.username !== this.userSession?.username) {
            // Cambio de usuario, recargar página
            window.location.reload();
        }
    }

    showError(message) {
        // Mostrar error temporal
        const errorDiv = document.createElement('div');
        errorDiv.className = 'router-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        // Remover después de 5 segundos
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Métodos públicos para interacción externa
    getCurrentRoute() {
        return this.currentRoute;
    }

    getCurrentView() {
        return this.currentView;
    }

    getCurrentController() {
        return this.currentController;
    }

    getAvailableRoutes() {
        const availableRoutes = [];
        this.routes.forEach((route, name) => {
            if (this.canAccessRoute(name)) {
                availableRoutes.push({
                    name,
                    title: route.title,
                    icon: route.icon,
                    isActive: route.isActive
                });
            }
        });
        return availableRoutes;
    }

    // Método para generar navegación dinámica
    generateNavigation() {
        const availableRoutes = this.getAvailableRoutes();
        
        return availableRoutes.map(route => `
            <button class="tab-btn ${route.isActive ? 'active' : ''}" 
                    data-route="${route.name}">
                ${route.icon} ${route.title}
            </button>
        `).join('');
    }

    // Método para actualizar la navegación en tiempo real
    updateNavigationUI() {
        const navContainer = document.querySelector('.nav-tabs');
        if (navContainer) {
            navContainer.innerHTML = this.generateNavigation();
        }
    }

    // Configurar navegación según el tipo de usuario
    setupUserNavigation() {
        if (this.userSession.type === 'driver') {
            this.setupDriverNavigation();
        } else {
            this.setupAdminNavigation();
        }
    }

    setupDriverNavigation() {
        const navTabs = document.querySelector('.nav-tabs');
        if (navTabs) {
            navTabs.innerHTML = `
                <button class="tab-btn active" data-route="dashboard">📊 Mi Dashboard</button>
                <button class="tab-btn" data-route="freights">🚛 Mis Fletes</button>
                <button class="tab-btn" data-route="documents">📄 Documentos</button>
                <button class="tab-btn" data-route="expenses">💰 Mis Gastos</button>
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

    setupAdminNavigation() {
        const navTabs = document.querySelector('.nav-tabs');
        if (navTabs) {
            navTabs.innerHTML = this.generateNavigation();
        }
    }

    // Método para refrescar la ruta actual
    refresh() {
        if (this.currentRoute) {
            this.navigateTo(this.currentRoute);
        }
    }

    // Método para ir hacia atrás (si se implementa historia)
    goBack() {
        // Implementación básica - ir al dashboard
        this.navigateTo('dashboard');
    }
}

// La instancia del router se crea en Application.js
// window.router se asigna desde allí

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}