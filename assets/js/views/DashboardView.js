/**
 * Vista del Dashboard - Gestión de la interfaz del dashboard principal
 */
class DashboardView extends BaseView {
    constructor(containerId = 'dashboard') {
        super(containerId);
        this.userType = null;
        this.hasBeenRendered = false; // Flag para tracking de renderizado
        this.initialize();
    }

    initialize() {
        super.initialize();
        const session = StorageService.getUserSession();
        if (session) {
            this.userType = session.type;
        }
    }

    render() {
        const container = this.getContainer();
        if (!container) return '';
        
        // Verificar si ya ha sido renderizado anteriormente
        if (!this.hasBeenRendered) {
            console.log('📊 [DashboardView.render] Generando contenido inicial...');
            const content = this.generateContent();
            container.innerHTML = content;
            this.setupEventListeners();
            this.hasBeenRendered = true; // Marcar como renderizado
        } else {
            console.log('📊 [DashboardView.render] Contenido HTML ya existe, solo actualizando datos...');
            // Si por alguna razón el contenedor está vacío pero ya había sido renderizado,
            // re-renderizar para evitar pantalla en blanco
            if (container.innerHTML.length === 0) {
                console.log('📊 [DashboardView.render] Contenedor vacío detectado, re-renderizando...');
                const content = this.generateContent();
                container.innerHTML = content;
                this.setupEventListeners();
            }
        }
        
        // Siempre cargar/actualizar los datos del dashboard
        this.loadDashboardData();
        return container.innerHTML;
    }

    generateContent() {
        if (this.userType === 'driver') {
            return this.generateDriverDashboard();
        } else {
            return this.generateAdminDashboard();
        }
    }

    generateAdminDashboard() {
        return `
            <h2>📊 Dashboard Administrativo</h2>
            
            <!-- Estadísticas principales -->
            <div class="stats-container">
                <div class="stat-card" style="background-color: #3498db;">
                    <div style="font-size: 2em;">🚚</div>
                    <div class="stat-value" id="totalVehicles"><span class="loading-spinner">⏳</span></div>
                    <div>Vehículos</div>
                </div>
                <div class="stat-card" style="background-color: #2ecc71;">
                    <div style="font-size: 2em;">👥</div>
                    <div class="stat-value" id="totalDrivers"><span class="loading-spinner">⏳</span></div>
                    <div>Conductores</div>
                </div>
                <div class="stat-card" style="background-color: #e74c3c;">
                    <div style="font-size: 2em;">💰</div>
                    <div class="stat-value" id="totalExpenses"><span class="loading-spinner">⏳</span></div>
                    <div>Gastos del Mes</div>
                </div>
                <div class="stat-card" style="background-color: #f39c12;">
                    <div style="font-size: 2em;">📄</div>
                    <div class="stat-value" id="totalReceipts"><span class="loading-spinner">⏳</span></div>
                    <div>Recibos</div>
                </div>
            </div>

            <!-- Sección principal del dashboard -->
            <div class="dashboard-sections">
                <div class="dashboard-section">
                    <div class="card">
                        <h3>📈 Gastos Recientes</h3>
                        <div id="recentExpenses">
                            <p>Cargando gastos recientes...</p>
                        </div>
                    </div>
                </div>

                <div class="dashboard-section">
                    <div class="card">
                        <h3>🚗 Resumen de Vehículos</h3>
                        <div id="vehicleSummary">
                            <p>Cargando resumen de vehículos...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Botones de acción rápida -->
            <div class="quick-actions">
                <button class="btn" onclick="dashboardView.refreshDashboard()">
                    🔄 Actualizar Dashboard
                </button>
                <button class="btn" onclick="dashboardController.exportDashboardData()">
                    📊 Exportar Datos
                </button>
            </div>

            <!-- Configuración de S3 -->
            ${S3ConfigView.render()}
        `;
    }

    generateDriverDashboard() {
        return `
            <h2>📊 Mi Dashboard</h2>
            
            <!-- Estadísticas del conductor -->
            <div class="stats-container">
                <div class="stat-card" style="background-color: #3498db;">
                    <div style="font-size: 2em;">🚚</div>
                    <div class="stat-value" id="totalVehicles"><span class="loading-spinner">⏳</span></div>
                    <div>Mi Vehículo</div>
                </div>
                <div class="stat-card" style="background-color: #2ecc71;">
                    <div style="font-size: 2em;">👤</div>
                    <div class="stat-value" id="totalDrivers">1</div>
                    <div>Mi Perfil</div>
                </div>
                <div class="stat-card" style="background-color: #e74c3c;">
                    <div style="font-size: 2em;">💰</div>
                    <div class="stat-value" id="totalExpenses"><span class="loading-spinner">⏳</span></div>
                    <div>Mis Gastos del Mes</div>
                </div>
                <div class="stat-card" style="background-color: #f39c12;">
                    <div style="font-size: 2em;">📄</div>
                    <div class="stat-value" id="totalReceipts"><span class="loading-spinner">⏳</span></div>
                    <div>Mis Recibos</div>
                </div>
            </div>

            <!-- Sección principal del dashboard del conductor -->
            <div class="dashboard-sections">
                <div class="dashboard-section">
                    <div class="card">
                        <h3>📈 Mis Gastos Recientes</h3>
                        <div id="recentExpenses">
                            <p>Cargando tus gastos recientes...</p>
                        </div>
                    </div>
                </div>

                <div class="dashboard-section">
                    <div class="card">
                        <h3>🚗 Mi Vehículo</h3>
                        <div id="vehicleSummary">
                            <p>Cargando información de tu vehículo...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Acciones rápidas para conductor -->
            <div class="quick-actions">
                <button class="btn" onclick="dashboardView.refreshDashboard()">
                    🔄 Actualizar
                </button>
                <button class="btn" onclick="showSection('expenses')">
                    💰 Agregar Gasto
                </button>
                <button class="btn" onclick="showSection('documents')">
                    📄 Ver Documentos
                </button>
            </div>
        `;
    }

    bindEvents() {
        super.bindEvents();

        // Delegación de eventos para botones dinámicos
        this.delegate('click', '.stat-card', this.handleStatCardClick);
        this.delegate('click', '.quick-action-btn', this.handleQuickAction);

        // Configurar eventos de S3 de manera más robusta
        this.bindS3Events();
    }

    bindS3Events() {
        // Método más robusto para asegurar que los eventos S3 se registren correctamente
        let attempts = 0;
        const maxAttempts = 10; // Reducido a 2 segundos (10 * 200ms)

        const bindEvents = () => {
            attempts++;

            // Información de diagnóstico detallada
            const s3Available = !!window.S3ConfigView;
            const bindMethodAvailable = s3Available && typeof S3ConfigView.bindEvents === 'function';

            console.log(`🔍 Intento ${attempts}/${maxAttempts} - S3ConfigView: ${s3Available}, bindEvents: ${bindMethodAvailable}`);

            if (s3Available && bindMethodAvailable) {
                // Verificar que al menos algunos elementos clave existan antes de bind
                const key_elements = [
                    'syncToS3Btn', 'syncFromS3Btn', 'createS3BackupBtn',
                    'restoreS3BackupBtn', 'checkS3StatusBtn'
                ];

                const elementsExist = key_elements.some(id => document.getElementById(id));
                const availableElements = key_elements.filter(id => document.getElementById(id));

                console.log(`🔍 Elementos disponibles: [${availableElements.join(', ')}]`);

                if (elementsExist) {
                    console.log('🔄 Registrando eventos S3...');
                    S3ConfigView.bindEvents();
                    console.log('✅ Eventos S3 registrados correctamente');
                    return; // Éxito, salir
                } else {
                    console.log(`⏳ Elementos S3 no disponibles aún (intento ${attempts}/${maxAttempts})`);
                }
            } else {
                // Información detallada sobre qué está faltando
                if (!s3Available) {
                    console.warn(`⚠️ S3ConfigView no disponible en window (intento ${attempts}/${maxAttempts})`);
                    console.log('Available classes in window:', Object.keys(window).filter(key => key.includes('View')));
                } else if (!bindMethodAvailable) {
                    console.warn(`⚠️ S3ConfigView.bindEvents no es función (intento ${attempts}/${maxAttempts})`);
                }
            }

            // Reintentar si no hemos llegado al máximo
            if (attempts < maxAttempts) {
                setTimeout(bindEvents, 200);
            } else {
                console.error('❌ Timeout: No se pudo inicializar eventos S3 después de múltiples intentos');
                console.log('💡 Solución temporal: Ejecutar manualmente S3ConfigView.forceRebindEvents() desde la consola');
            }
        };

        // Intentar después de un delay inicial más largo
        setTimeout(bindEvents, 500);
    }

    afterRender() {
        super.afterRender();

        // Cargar datos después del render
        this.loadDashboardData();
    }

    handleStatCardClick(e, target) {
        // Acción opcional al hacer click en las tarjetas de estadísticas
        const statType = target.querySelector('.stat-value')?.id;
        if (statType) {
            console.log(`Clicked on stat: ${statType}`);
        }
    }

    handleQuickAction(e, target) {
        const action = target.dataset.action;
        if (action && this[action]) {
            this[action]();
        }
    }

    async loadDashboardData() {
        try {
            console.log('📊 [DashboardView.loadDashboardData] Cargando datos del dashboard...');
            console.log('📊 [DashboardView.loadDashboardData] DOM state:', document.readyState);
            
            // Asegurar que el DOM esté listo antes de cargar stats
            setTimeout(() => {
                console.log('📊 [DashboardView.loadDashboardData] Ejecutando loadStatsDirectly con delay...');
                this.loadStatsDirectly();
            }, 200);
            
        } catch (error) {
            this.hideLoading();
            this.showError('Error al cargar datos del dashboard');
        }
    }

    // Método para esperar hasta que dashboardController esté disponible
    async waitForDashboardController(maxWaitMs = 5000, checkIntervalMs = 100) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitMs) {
            if (window.dashboardController) {
                console.log('📊 [waitForDashboardController] DashboardController encontrado');
                return window.dashboardController;
            }
            
            // Esperar un poco antes de intentar de nuevo
            await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
        }
        
        console.warn('📊 [waitForDashboardController] Timeout esperando dashboardController');
        return null;
    }

    // Método fallback para cargar estadísticas directamente
    loadStatsDirectly() {
        try {
            console.log('📊 [DashboardView.loadStatsDirectly] Cargando estadísticas directamente...');
            
            const vehicles = Vehicle.getAll();
            const drivers = Driver.getAll();
            const expenses = Expense.getAll();
            const documents = Document.getAll();

            // Calcular gastos del mes actual
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const monthlyExpenses = expenses
                .filter(expense => {
                    const expenseDate = new Date(expense.date);
                    return expenseDate.getMonth() === currentMonth && 
                           expenseDate.getFullYear() === currentYear;
                })
                .reduce((total, expense) => total + expense.amount, 0);

            let stats;
            
            if (this.userType === 'driver') {
                // Para conductores, mostrar solo sus datos
                const session = StorageService.getUserSession();
                let driverExpenses = [];
                let driverVehicleCount = 0;
                
                if (session && session.driverId) {
                    const driver = drivers.find(d => d.id === session.driverId);
                    driverExpenses = expenses.filter(e => e.driverId === session.driverId);
                    driverVehicleCount = (driver && driver.vehicleId) ? 1 : 0;
                    
                    // Calcular gastos del mes actual solo del conductor
                    const driverMonthlyExpenses = driverExpenses
                        .filter(expense => {
                            const expenseDate = new Date(expense.date);
                            return expenseDate.getMonth() === currentMonth && 
                                   expenseDate.getFullYear() === currentYear;
                        })
                        .reduce((total, expense) => total + expense.amount, 0);
                    
                    stats = {
                        vehicles: driverVehicleCount,
                        drivers: 1, // Siempre 1 para conductores
                        totalExpenses: driverMonthlyExpenses,
                        receipts: driverExpenses.filter(e => e.receiptId).length
                    };
                } else {
                    stats = {
                        vehicles: 0,
                        drivers: 1,
                        totalExpenses: 0,
                        receipts: 0
                    };
                }
            } else {
                // Para administradores, mostrar datos globales
                stats = {
                    vehicles: vehicles.length,
                    drivers: drivers.length,
                    totalExpenses: monthlyExpenses,
                    receipts: expenses.filter(e => e.receiptId).length
                };
            }

            // Actualizar las tarjetas directamente
            this.updateStats(stats);

            // Obtener gastos recientes (últimos 5)
            let recentExpenses;
            
            if (this.userType === 'driver') {
                // Para conductores, mostrar solo sus gastos
                const session = StorageService.getUserSession();
                if (session && session.driverId) {
                    recentExpenses = expenses
                        .filter(e => e.driverId === session.driverId)
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .slice(0, 5);
                } else {
                    recentExpenses = [];
                }
            } else {
                // Para administradores, mostrar gastos de todos
                recentExpenses = expenses
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5);
            }
            
            // Actualizar gastos recientes (siempre llamar, incluso si está vacío)
            this.updateRecentExpenses(recentExpenses);
            console.log('📊 [DashboardView.loadStatsDirectly] Gastos recientes actualizados:', recentExpenses.length);

            // Preparar resumen de vehículos
            if (this.userType === 'driver') {
                // Para conductores, mostrar su vehículo
                const session = StorageService.getUserSession();
                if (session && session.driverId) {
                    const driver = drivers.find(d => d.id === session.driverId);
                    if (driver && driver.vehicleId) {
                        const vehicle = vehicles.find(v => v.id === driver.vehicleId);
                        if (vehicle) {
                            const vehicleExpenses = expenses.filter(e => e.vehicleId === vehicle.id);
                            const totalExpenses = vehicleExpenses.reduce((sum, e) => sum + e.amount, 0);
                            
                            const vehicleData = {
                                ...vehicle,
                                totalExpenses: totalExpenses,
                                expenseCount: vehicleExpenses.length
                            };
                            this.updateVehicleSummary(vehicleData);
                        } else {
                            this.updateVehicleSummary(null); // No se encontró el vehículo
                        }
                    } else {
                        this.updateVehicleSummary(null); // Conductor sin vehículo asignado
                    }
                } else {
                    this.updateVehicleSummary(null); // No hay sesión de conductor
                }
            } else {
                // Para administradores, mostrar resumen de todos los vehículos
                const vehicleSummary = vehicles.map(vehicle => {
                    const vehicleExpenses = expenses.filter(e => e.vehicleId === vehicle.id);
                    const total = vehicleExpenses.reduce((sum, e) => sum + e.amount, 0);
                    return {
                        vehicle: vehicle,
                        total: total,
                        count: vehicleExpenses.length
                    };
                }).sort((a, b) => b.total - a.total).slice(0, 5); // Top 5 por gastos
                
                this.updateVehicleSummary(vehicleSummary);
                console.log('📊 [DashboardView.loadStatsDirectly] Resumen de vehículos actualizado:', vehicleSummary.length);
            }
            
            console.log('📊 [DashboardView.loadStatsDirectly] Dashboard actualizado completamente');
            
        } catch (error) {
            console.error('📊 [DashboardView.loadStatsDirectly] Error:', error);
        }
    }

    async refreshDashboard() {
        const controller = await this.waitForDashboardController(2000); // Menos tiempo para refresh
        if (controller) {
            controller.refreshDashboard();
        } else {
            this.loadDashboardData();
        }
    }

    updateStats(stats) {
        console.log('📊 [DashboardView.updateStats] Actualizando estadísticas:', stats);
        
        if (!stats) {
            console.warn('📊 [DashboardView.updateStats] Stats es null o undefined');
            return;
        }

        // Actualizar valores de las tarjetas de estadísticas
        this.updateStatCard('totalVehicles', stats.vehicles || 0);
        this.updateStatCard('totalDrivers', stats.drivers || 0);
        this.updateStatCard('totalExpenses', this.formatCurrency(stats.totalExpenses || 0));
        this.updateStatCard('totalReceipts', stats.receipts || 0);
        
        console.log('📊 [DashboardView.updateStats] Todas las tarjetas procesadas');
    }

    updateStatCard(cardId, value) {
        console.log(`📊 [DashboardView.updateStatCard] Actualizando ${cardId} con valor:`, value);
        const element = document.getElementById(cardId);
        console.log(`📊 [DashboardView.updateStatCard] Elemento ${cardId}:`, element ? 'encontrado' : 'NO encontrado');
        
        if (element) {
            console.log(`📊 [DashboardView.updateStatCard] ${cardId} contenido anterior:`, element.textContent);
            // Animación de actualización
            element.style.transform = 'scale(1.1)';
            setTimeout(() => {
                element.textContent = value;
                element.style.transform = 'scale(1)';
                console.log(`📊 [DashboardView.updateStatCard] ${cardId} actualizado a:`, value);
            }, 150);
        } else {
            console.warn(`📊 [DashboardView.updateStatCard] Elemento ${cardId} no encontrado`);
            // Debug: listar todos los elementos disponibles con id que contengan 'total'
            const allElements = document.querySelectorAll('[id*="total"]');
            console.log('📊 [DashboardView.updateStatCard] Elementos disponibles con "total":', Array.from(allElements).map(el => el.id));
        }
    }

    updateRecentExpenses(expenses) {
        const container = document.getElementById('recentExpenses');
        if (!container) return;

        if (!expenses || expenses.length === 0) {
            container.innerHTML = '<p>No hay gastos registrados</p>';
            return;
        }

        const expensesHTML = expenses.map(expense => `
            <div class="expense-item" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <div class="expense-header">
                    <strong>${this.formatCurrency(expense.amount)}</strong>
                    <span style="color: #666;">${expense.type}</span>
                </div>
                <p><small>${expense.description || 'Sin descripción'} - ${this.formatDate(expense.date)}</small></p>
            </div>
        `).join('');

        container.innerHTML = expensesHTML;
    }

    updateVehicleSummary(vehicleData) {
        const container = document.getElementById('vehicleSummary');
        if (!container) return;

        if (!vehicleData || (Array.isArray(vehicleData) && vehicleData.length === 0)) {
            const message = this.userType === 'driver' 
                ? 'No tienes vehículo asignado' 
                : 'No hay vehículos registrados';
            container.innerHTML = `<p>${message}</p>`;
            return;
        }

        let summaryHTML = '';
        
        if (this.userType === 'driver') {
            // Para conductores, mostrar información de su vehículo
            const vehicle = vehicleData;
            summaryHTML = `
                <div class="vehicle-summary-item">
                    <strong>${vehicle.plate} - ${vehicle.brand} ${vehicle.model}</strong>
                    <p>Año: ${vehicle.year}</p>
                    <p>Total gastos: ${this.formatCurrency(vehicle.totalExpenses || 0)}</p>
                    <p>Número de gastos: ${vehicle.expenseCount || 0}</p>
                </div>
            `;
        } else {
            // Para administradores, mostrar resumen de todos los vehículos
            summaryHTML = vehicleData.map(item => `
                <div class="vehicle-summary-item" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                    <strong>${item.vehicle.plate} - ${item.vehicle.brand}</strong>
                    <p>${this.formatCurrency(item.total)} (${item.count} gastos)</p>
                </div>
            `).join('');
        }

        container.innerHTML = summaryHTML;
    }

    showDocumentAlerts(alerts) {
        if (!alerts || alerts.length === 0) return;

        // Crear o actualizar sección de alertas
        let alertsContainer = this.container.querySelector('.document-alerts');
        
        if (!alertsContainer) {
            alertsContainer = this.createElement('div', 'card document-alerts');
            alertsContainer.style.marginTop = '20px';
            this.container.appendChild(alertsContainer);
        }

        let alertsHTML = '<h3>⚠️ Alertas de Documentos</h3>';
        
        alerts.forEach(alert => {
            const color = alert.type === 'error' ? '#e74c3c' : '#f39c12';
            alertsHTML += `
                <div style="padding: 10px; margin: 5px 0; border-left: 4px solid ${color}; background: rgba(255,255,255,0.1);">
                    ${alert.message}
                </div>
            `;
        });

        alertsContainer.innerHTML = alertsHTML;
        
        // Animar entrada de alertas
        this.fadeIn(alertsContainer);
    }

    hideDocumentAlerts() {
        const alertsContainer = this.container.querySelector('.document-alerts');
        if (alertsContainer) {
            this.fadeOut(alertsContainer, 300);
            setTimeout(() => alertsContainer.remove(), 300);
        }
    }

    // Métodos de utilidad específicos del dashboard
    createStatsWidget(title, value, icon, color = '#3498db') {
        return `
            <div class="stat-card" style="background-color: ${color};">
                <div style="font-size: 2em;">${icon}</div>
                <div class="stat-value">${value}</div>
                <div>${title}</div>
            </div>
        `;
    }

    createQuickActionButton(text, action, icon = '') {
        return `
            <button class="btn quick-action-btn" data-action="${action}">
                ${icon} ${text}
            </button>
        `;
    }

    // Mostrar gráficos (preparado para implementación futura)
    showExpenseChart(data) {
        const chartContainer = document.getElementById('expenseChart');
        if (chartContainer && data) {
            // Aquí se implementaría la lógica para mostrar gráficos
            // usando Chart.js o similar
            chartContainer.innerHTML = '<p>Gráfico de gastos (por implementar)</p>';
        }
    }

    // Exportar vista del dashboard como imagen
    async exportDashboardImage() {
        try {
            // Implementación futura para exportar screenshot del dashboard
            this.showInfo('Funcionalidad de exportar imagen será implementada próximamente');
        } catch (error) {
            this.showError('Error al exportar imagen del dashboard');
        }
    }
}

// Asegurar que la clase está disponible globalmente
window.DashboardView = DashboardView;
console.log('✅ DashboardView cargada y disponible globalmente');