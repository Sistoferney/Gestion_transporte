/**
 * NavigationManager - Gestiona la interfaz de navegación y menús
 */
class NavigationManager {
    constructor(router) {
        // Usar patrón Singleton para NavigationManager también
        if (window.navigationManagerInstance) {
            console.log('⚠️ [NavigationManager] Ya existe una instancia, devolviendo la existente');
            return window.navigationManagerInstance;
        }
        
        this.router = router;
        this.userSession = null;
        this.menuItems = new Map();
        this.eventListenersSetup = false;
        
        // Guardar referencia global
        window.navigationManagerInstance = this;
        
        this.initialize();
    }

    initialize() {
        this.userSession = StorageService.getUserSession();
        this.setupMenuItems();
        this.renderNavigation();
        
        // Configurar event listeners solo si no se han configurado antes
        if (!this.eventListenersSetup) {
            this.setupEventListeners();
            this.eventListenersSetup = true;
        }
    }

    setupMenuItems() {
        // Elementos de menú para administradores
        this.addMenuItem('dashboard', {
            title: 'Dashboard',
            icon: '📊',
            order: 1,
            roles: ['admin', 'driver']
        });

        this.addMenuItem('vehicles', {
            title: 'Vehículos',
            icon: '🚚',
            order: 2,
            roles: ['admin']
        });

        this.addMenuItem('drivers', {
            title: 'Conductores',
            icon: '👥',
            order: 3,
            roles: ['admin']
        });

        this.addMenuItem('documents', {
            title: 'Documentos',
            icon: '📄',
            order: 4,
            roles: ['admin', 'driver'],
            driverTitle: 'Mis Documentos'
        });

        this.addMenuItem('expenses', {
            title: 'Gastos',
            icon: '💰',
            order: 5,
            roles: ['admin', 'driver'],
            driverTitle: 'Mis Gastos'
        });

        this.addMenuItem('freights', {
            title: 'Fletes',
            icon: '🚛',
            order: 6,
            roles: ['admin', 'driver'],
            driverTitle: 'Mis Servicios'
        });

        this.addMenuItem('reports', {
            title: 'Reportes',
            icon: '📊',
            order: 7,
            roles: ['admin']
        });

        this.addMenuItem('email-config', {
            title: 'Config. Email',
            icon: '📧',
            order: 8,
            roles: ['admin']
        });
    }

    addMenuItem(id, config) {
        this.menuItems.set(id, config);
    }

    renderNavigation() {
        this.renderMainNavigation();
        this.renderUserInfo();
        this.renderBreadcrumb();
    }

    renderMainNavigation() {
        const navContainer = document.querySelector('.nav-tabs');
        if (!navContainer) return;

        const menuHTML = this.generateMenuHTML();
        navContainer.innerHTML = menuHTML;
        
        // Configurar event listeners para los botones de navegación
        this.setupNavigationEventListeners();
    }

    setupNavigationEventListeners() {
        const navContainer = document.querySelector('.nav-tabs');
        if (!navContainer) return;

        // Remover event listeners existentes para evitar duplicados
        const existingHandler = navContainer._navigationHandler;
        if (existingHandler) {
            navContainer.removeEventListener('click', existingHandler);
        }

        // Crear nuevo event listener
        const navigationHandler = (e) => {
            const button = e.target.closest('.tab-btn');
            if (!button) return;

            const route = button.getAttribute('data-route');
            console.log('🔗 [NavigationManager] Click en botón:', route);
            
            if (route && this.router) {
                // Prevenir múltiples clicks
                if (button.disabled) {
                    console.log('🔗 [NavigationManager] Botón deshabilitado, ignorando');
                    return;
                }
                button.disabled = true;
                
                console.log('🔗 [NavigationManager] Navegando a:', route);
                this.router.navigateTo(route);
                
                // Re-habilitar el botón después de un breve delay
                setTimeout(() => {
                    button.disabled = false;
                }, 500);
            }
        };

        navContainer.addEventListener('click', navigationHandler);
        navContainer._navigationHandler = navigationHandler; // Guardar referencia para limpieza
    }

    generateMenuHTML() {
        const accessibleItems = this.getAccessibleMenuItems();
        
        return accessibleItems.map(item => {
            const isActive = this.router.getCurrentRoute() === item.id;
            const title = this.getMenuTitle(item);
            
            return `
                <button class="tab-btn ${isActive ? 'active' : ''}" 
                        data-route="${item.id}"
                        title="${title}">
                    ${item.icon} ${title}
                </button>
            `;
        }).join('');
    }

    getAccessibleMenuItems() {
        const accessible = [];
        
        this.menuItems.forEach((item, id) => {
            if (this.canAccessMenuItem(item)) {
                accessible.push({ id, ...item });
            }
        });

        // Ordenar por orden especificado
        return accessible.sort((a, b) => a.order - b.order);
    }

    canAccessMenuItem(item) {
        if (!this.userSession) return false;
        
        return item.roles.includes(this.userSession.type);
    }

    getMenuTitle(item) {
        if (this.userSession.type === 'driver' && item.driverTitle) {
            return item.driverTitle;
        }
        return item.title;
    }

    renderUserInfo() {
        const userInfoContainer = document.getElementById('userInfo');
        if (!userInfoContainer || !this.userSession) return;

        const userTypeDisplay = this.userSession.type === 'admin' ? 'Administrador' : 'Conductor';
        
        userInfoContainer.innerHTML = `
            <div class="user-info-content">
                <span class="user-name">👤 ${this.userSession.name}</span>
                <span class="user-type">(${userTypeDisplay})</span>
                <button id="userMenuBtn" class="user-menu-btn" onclick="navigationManager.toggleUserMenu()">
                    ⚙️
                </button>
            </div>
            <div id="userMenu" class="user-menu hidden">
                <button onclick="navigationManager.showProfile()">👤 Mi Perfil</button>
                <button onclick="navigationManager.showSettings()">⚙️ Configuración</button>
                <hr>
                <button onclick="navigationManager.logout()" class="logout-btn">🚪 Cerrar Sesión</button>
            </div>
        `;
    }

    renderBreadcrumb() {
        const breadcrumbContainer = document.querySelector('.breadcrumb');
        if (!breadcrumbContainer) return;

        const currentRoute = this.router.getCurrentRoute();
        const menuItem = this.menuItems.get(currentRoute);
        
        if (menuItem) {
            const title = this.getMenuTitle(menuItem);
            breadcrumbContainer.innerHTML = `
                <span class="breadcrumb-item">🏠 Inicio</span>
                <span class="breadcrumb-separator">›</span>
                <span class="breadcrumb-item active">${menuItem.icon} ${title}</span>
            `;
        }
    }

    setupEventListeners() {
        // Escuchar cambios de ruta para actualizar navegación
        document.addEventListener('routeChanged', (e) => {
            this.onRouteChanged(e.detail.route);
        });

        // Cerrar menú de usuario al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-info-content')) {
                this.hideUserMenu();
            }
        });

        // Manejar responsive navigation
        this.setupResponsiveNavigation();
    }

    setupResponsiveNavigation() {
        // Crear botón de menú móvil si no existe
        let mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (!mobileMenuBtn) {
            mobileMenuBtn = document.createElement('button');
            mobileMenuBtn.id = 'mobileMenuBtn';
            mobileMenuBtn.className = 'mobile-menu-btn';
            mobileMenuBtn.innerHTML = '☰';
            mobileMenuBtn.onclick = () => this.toggleMobileMenu();
            
            const header = document.querySelector('header');
            if (header) {
                header.insertBefore(mobileMenuBtn, header.firstChild);
            }
        }

        // Agregar clase móvil a la navegación
        const navTabs = document.querySelector('.nav-tabs');
        if (navTabs) {
            navTabs.classList.add('nav-tabs-responsive');
        }
    }

    toggleMobileMenu() {
        const navTabs = document.querySelector('.nav-tabs');
        if (navTabs) {
            navTabs.classList.toggle('mobile-open');
        }
    }

    hideMobileMenu() {
        const navTabs = document.querySelector('.nav-tabs');
        if (navTabs) {
            navTabs.classList.remove('mobile-open');
        }
    }

    onRouteChanged(newRoute) {
        // Actualizar navegación activa
        this.updateActiveNavigation(newRoute);
        
        // Actualizar breadcrumb
        this.renderBreadcrumb();
        
        // Ocultar menú móvil si está abierto
        this.hideMobileMenu();
        
        // Actualizar título de la ventana
        this.updateWindowTitle(newRoute);
    }

    updateActiveNavigation(activeRoute) {
        const navButtons = document.querySelectorAll('.tab-btn');
        navButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.route === activeRoute) {
                btn.classList.add('active');
            }
        });
    }

    updateWindowTitle(route) {
        const menuItem = this.menuItems.get(route);
        if (menuItem) {
            const title = this.getMenuTitle(menuItem);
            document.title = `${title} - Sistema de Gestión de Transporte`;
        }
    }

    toggleUserMenu() {
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.classList.toggle('hidden');
        }
    }

    hideUserMenu() {
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.classList.add('hidden');
        }
    }

    showProfile() {
        this.hideUserMenu();
        this.showProfileModal();
    }

    showProfileModal() {
        if (!this.userSession) return;

        const modalHTML = `
            <div class="profile-modal">
                <h3>👤 Mi Perfil</h3>
                <div class="profile-info">
                    <div class="profile-field">
                        <label>Nombre:</label>
                        <span>${this.userSession.name}</span>
                    </div>
                    <div class="profile-field">
                        <label>Usuario:</label>
                        <span>${this.userSession.username}</span>
                    </div>
                    <div class="profile-field">
                        <label>Tipo:</label>
                        <span>${this.userSession.type === 'admin' ? 'Administrador' : 'Conductor'}</span>
                    </div>
                    <div class="profile-field">
                        <label>Última conexión:</label>
                        <span>${this.formatDate(this.userSession.loginTime)}</span>
                    </div>
                </div>
                <div class="profile-actions">
                    <button class="btn" onclick="navigationManager.showChangePassword()">
                        🔒 Cambiar Contraseña
                    </button>
                </div>
            </div>
        `;

        this.showModal('Mi Perfil', modalHTML);
    }

    showChangePassword() {
        const modalHTML = `
            <div class="change-password-modal">
                <h3>🔒 Cambiar Contraseña</h3>
                <form id="changePasswordForm">
                    <div class="form-group">
                        <label for="currentPassword">Contraseña actual:</label>
                        <input type="password" id="currentPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="newPassword">Nueva contraseña:</label>
                        <input type="password" id="newPassword" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirmar contraseña:</label>
                        <input type="password" id="confirmPassword" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn">💾 Cambiar</button>
                        <button type="button" class="btn btn-secondary" onclick="document.querySelector('.modal').remove()">
                            ❌ Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.showModal('Cambiar Contraseña', modalHTML);
        
        // Configurar formulario
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
            this.handlePasswordChange(e);
        });
    }

    async handlePasswordChange(e) {
        e.preventDefault();
        
        const form = e.target;
        const currentPassword = form.currentPassword.value;
        const newPassword = form.newPassword.value;
        const confirmPassword = form.confirmPassword.value;

        if (newPassword !== confirmPassword) {
            this.showError('Las contraseñas no coinciden');
            return;
        }

        try {
            await AuthController.changePassword(currentPassword, newPassword);
            this.showSuccess('Contraseña cambiada exitosamente');
            document.querySelector('.modal').remove();
        } catch (error) {
            this.showError(error.message);
        }
    }

    showSettings() {
        this.hideUserMenu();
        this.showSettingsModal();
    }

    showSettingsModal() {
        const modalHTML = `
            <div class="settings-modal">
                <h3>⚙️ Configuración</h3>
                <div class="settings-section">
                    <h4>Apariencia</h4>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="darkMode" ${this.isDarkMode() ? 'checked' : ''}>
                            Modo oscuro
                        </label>
                    </div>
                </div>
                <div class="settings-section">
                    <h4>Notificaciones</h4>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="documentAlerts" ${this.getNotificationSetting('documents') ? 'checked' : ''}>
                            Alertas de documentos
                        </label>
                    </div>
                </div>
                <div class="settings-actions">
                    <button class="btn" onclick="navigationManager.saveSettings()">💾 Guardar</button>
                    <button class="btn btn-secondary" onclick="document.querySelector('.modal').remove()">❌ Cerrar</button>
                </div>
            </div>
        `;

        this.showModal('Configuración', modalHTML);
    }

    saveSettings() {
        const darkMode = document.getElementById('darkMode').checked;
        const documentAlerts = document.getElementById('documentAlerts').checked;

        // Guardar configuraciones
        const settings = {
            darkMode,
            notifications: {
                documents: documentAlerts
            }
        };

        StorageService.setUserSettings(settings);
        
        // Aplicar configuraciones
        this.applySettings(settings);
        
        this.showSuccess('Configuración guardada');
        document.querySelector('.modal').remove();
    }

    applySettings(settings) {
        // Aplicar modo oscuro
        if (settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    isDarkMode() {
        const settings = StorageService.getUserSettings();
        return settings?.darkMode || false;
    }

    getNotificationSetting(type) {
        const settings = StorageService.getUserSettings();
        return settings?.notifications?.[type] || true;
    }

    logout() {
        this.hideUserMenu();
        
        // Confirmar logout
        const confirmHTML = `
            <div class="logout-confirm">
                <h3>🚪 Cerrar Sesión</h3>
                <p>¿Está seguro que desea cerrar sesión?</p>
                <div class="confirm-actions">
                    <button class="btn btn-danger" onclick="navigationManager.confirmLogout()">
                        Sí, cerrar sesión
                    </button>
                    <button class="btn btn-secondary" onclick="navigationManager.cancelLogout()">
                        Cancelar
                    </button>
                </div>
            </div>
        `;

        this.showModal('Cerrar Sesión', confirmHTML);
    }

    confirmLogout() {
        const modal = document.querySelector('.modal');
        if (modal) {
            // Limpiar event listeners
            if (modal.escapeHandler) {
                document.removeEventListener('keydown', modal.escapeHandler);
            }
            modal.remove();
        }
        AuthController.performLogout();
    }

    cancelLogout() {
        console.log('🚪 [NavigationManager.cancelLogout] Iniciando cancelación de logout...');
        const modal = document.querySelector('.modal');
        if (modal) {
            // Limpiar event listeners
            if (modal.escapeHandler) {
                document.removeEventListener('keydown', modal.escapeHandler);
            }
            modal.remove();
            console.log('🚪 [NavigationManager.cancelLogout] Modal removido exitosamente');
        } else {
            console.warn('⚠️ [NavigationManager.cancelLogout] No se encontró modal para remover');
        }
        console.log('✅ [NavigationManager.cancelLogout] Logout cancelado por el usuario - sesión mantiene activa');
    }

    // Utilidades
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('es-CO');
    }

    showModal(title, content) {
        // Remover modal existente
        const existingModal = document.querySelector('.modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white; padding: 20px; border-radius: 8px; max-width: 500px; max-height: 80vh;
            overflow-y: auto; margin: 20px;
        `;

        const closeButtonHandler = isLogoutModal ?
            "navigationManager.cancelLogout()" :
            "this.closest('.modal').remove()";

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="${closeButtonHandler}"
                        style="float: right; background: none; border: none; font-size: 20px;">×</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Configurar eventos del modal
        const isLogoutModal = content.includes('logout-confirm');

        // Cerrar al hacer click fuera del modal SOLO si no es modal de logout
        if (!isLogoutModal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        // Manejar tecla ESC - solo cerrar si no es logout modal
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !isLogoutModal) {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };

        document.addEventListener('keydown', handleEscape);

        // Guardar referencia para cleanup
        modal.escapeHandler = handleEscape;
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;

        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remover después de 5 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Método para actualizar la navegación cuando cambie el estado
    refresh() {
        this.userSession = StorageService.getUserSession();
        this.renderNavigation();
    }
}

// Crear instancia global
window.navigationManager = null;

// Función para inicializar el navigation manager
function initializeNavigationManager(router) {
    window.navigationManager = new NavigationManager(router);
    return window.navigationManager;
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
}