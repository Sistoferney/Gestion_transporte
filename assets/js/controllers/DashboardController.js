/**
 * Controlador del Dashboard - Gestión de estadísticas y vista principal
 */
class DashboardController extends BaseController {
    constructor() {
        super();
        this.stats = {};
        this.alerts = [];
        this.initialize();
    }

    initialize() {
        super.initialize();
        if (!this.requireAuth()) return;
        
        this.setupDashboard();
        this.loadStats();
        this.setupAutoRefresh();
    }

    setupDashboard() {
        // Configurar según el tipo de usuario
        if (this.currentUser.type === 'driver') {
            this.setupDriverDashboard();
        } else {
            this.setupAdminDashboard();
        }
    }

    setupDriverDashboard() {
        // Personalizar dashboard para conductores
        this.updateDriverStats();
        this.updateDriverRecentExpenses();
        this.updateDriverVehicleSummary();
        this.updateDocumentAlerts();
    }

    setupAdminDashboard() {
        // Dashboard completo para administradores
        this.updateStats();
        this.updateRecentExpenses();
        this.updateVehicleSummary();
        this.updateDocumentAlerts();
    }

    loadStats() {
        try {
            const vehicles = Vehicle.getAll();
            const drivers = Driver.getAll();
            const expenses = Expense.getAll();
            const documents = Document.getAll();

            this.stats = {
                vehicles: vehicles.length,
                drivers: drivers.length,
                totalExpenses: this.calculateMonthlyExpenses(expenses),
                receipts: expenses.filter(e => e.receiptId).length,
                expiredDocuments: documents.filter(d => d.getStatus() === 'expired').length,
                expiringDocuments: documents.filter(d => d.getStatus() === 'warning').length
            };

        } catch (error) {
            this.handleError(error, 'Error al cargar estadísticas');
        }
    }

    calculateMonthlyExpenses(expenses) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return expenses
            .filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.getMonth() === currentMonth && 
                       expenseDate.getFullYear() === currentYear;
            })
            .reduce((total, expense) => total + expense.amount, 0);
    }

    calculateStats() {
        try {
            console.log('📊 [DashboardController] Calculando estadísticas...');
            
            const vehicles = Vehicle.getAll();
            const drivers = Driver.getAll();
            const expenses = Expense.getAll();
            const documents = Document.getAll();

            this.stats = {
                vehicles: vehicles.length,
                drivers: drivers.length,
                totalExpenses: this.calculateMonthlyExpenses(expenses),
                receipts: expenses.filter(e => e.receiptId).length,
                expiredDocuments: documents.filter(d => d.getStatus() === 'expired').length,
                expiringDocuments: documents.filter(d => d.getStatus() === 'warning').length
            };
            
            console.log('✅ [DashboardController] Estadísticas calculadas:', this.stats);
            
        } catch (error) {
            console.error('❌ [DashboardController] Error calculando estadísticas:', error);
            this.stats = {
                vehicles: 0,
                drivers: 0,
                totalExpenses: 0,
                receipts: 0,
                expiredDocuments: 0,
                expiringDocuments: 0
            };
        }
    }

    updateStats() {
        // Verificar que stats está inicializado
        if (!this.stats || typeof this.stats !== 'object') {
            console.warn('⚠️ [DashboardController] Stats no inicializado, calculando...');
            this.calculateStats();
        }

        // Actualizar tarjetas de estadísticas principales
        this.updateStatCard('totalVehicles', this.stats.vehicles || 0, 'Vehículos');
        this.updateStatCard('totalDrivers', this.stats.drivers || 0, 'Conductores');
        this.updateStatCard('totalExpenses', this.formatCurrency(this.stats.totalExpenses || 0), 'Gastos del Mes');
        this.updateStatCard('totalReceipts', this.stats.receipts || 0, 'Recibos');
    }

    updateDriverStats() {
        const driver = Driver.getById(this.currentUser.driverId);
        const driverExpenses = Expense.getByDriverId(this.currentUser.driverId);
        const monthlyExpenses = this.calculateMonthlyExpenses(driverExpenses);
        const receipts = driverExpenses.filter(e => e.receiptId).length;

        this.updateStatCard('totalVehicles', driver && driver.vehicleId ? '1' : '0', 'Mi Vehículo');
        this.updateStatCard('totalDrivers', '1', 'Mi Perfil');
        this.updateStatCard('totalExpenses', this.formatCurrency(monthlyExpenses), 'Mis Gastos del Mes');
        this.updateStatCard('totalReceipts', receipts, 'Mis Recibos');
    }

    updateStatCard(elementId, value, label) {
        const valueElement = document.getElementById(elementId);
        const labelElement = valueElement?.parentElement?.querySelector('div:last-child');
        
        if (valueElement) {
            valueElement.textContent = value;
        }
        if (labelElement) {
            labelElement.textContent = label;
        }
    }

    updateRecentExpenses() {
        const container = document.getElementById('recentExpenses');
        if (!container) return;

        try {
            const expenses = Expense.getAll()
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);

            if (expenses.length === 0) {
                container.innerHTML = '<p>No hay gastos registrados</p>';
                return;
            }

            container.innerHTML = expenses.map(expense => {
                const driver = Driver.getById(expense.driverId);
                return `
                    <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                        <strong>${this.formatCurrency(expense.amount)}</strong> - ${expense.type}
                        <br><small>${driver?.name || 'N/A'} - ${this.formatDate(expense.date)}</small>
                    </div>
                `;
            }).join('');

        } catch (error) {
            container.innerHTML = '<p>Error al cargar gastos recientes</p>';
            this.handleError(error, 'Error al cargar gastos recientes');
        }
    }

    updateDriverRecentExpenses() {
        const container = document.getElementById('recentExpenses');
        if (!container) return;

        try {
            const expenses = Expense.getByDriverId(this.currentUser.driverId)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);

            if (expenses.length === 0) {
                container.innerHTML = '<p>No tienes gastos registrados</p>';
                return;
            }

            container.innerHTML = expenses.map(expense => `
                <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                    <strong>${this.formatCurrency(expense.amount)}</strong> - ${expense.type}
                    <br><small>${expense.description || 'Sin descripción'} - ${this.formatDate(expense.date)}</small>
                </div>
            `).join('');

        } catch (error) {
            container.innerHTML = '<p>Error al cargar tus gastos</p>';
            this.handleError(error, 'Error al cargar gastos del conductor');
        }
    }

    updateVehicleSummary() {
        const container = document.getElementById('vehicleSummary');
        if (!container) return;

        try {
            const vehicles = Vehicle.getAll();
            const expenses = Expense.getAll();

            if (vehicles.length === 0) {
                container.innerHTML = '<p>No hay vehículos registrados</p>';
                return;
            }

            const summary = vehicles.map(vehicle => {
                const vehicleExpenses = expenses.filter(e => e.vehicleId === vehicle.id);
                const total = vehicleExpenses.reduce((sum, e) => sum + e.amount, 0);
                
                return {
                    vehicle,
                    total,
                    count: vehicleExpenses.length
                };
            }).sort((a, b) => b.total - a.total);

            container.innerHTML = summary.map(item => `
                <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                    <strong>${item.vehicle.plate}</strong> - ${item.vehicle.brand}
                    <br>${this.formatCurrency(item.total)} (${item.count} gastos)
                </div>
            `).join('');

        } catch (error) {
            container.innerHTML = '<p>Error al cargar resumen de vehículos</p>';
            this.handleError(error, 'Error al cargar resumen de vehículos');
        }
    }

    updateDriverVehicleSummary() {
        const container = document.getElementById('vehicleSummary');
        if (!container) return;

        try {
            const driver = Driver.getById(this.currentUser.driverId);
            if (!driver || !driver.vehicleId) {
                container.innerHTML = '<p>No tienes vehículo asignado</p>';
                return;
            }

            const vehicle = Vehicle.getById(driver.vehicleId);
            if (!vehicle) {
                container.innerHTML = '<p>Vehículo no encontrado</p>';
                return;
            }

            const expenses = Expense.getByDriverId(this.currentUser.driverId)
                .filter(e => e.vehicleId === vehicle.id);
            const total = expenses.reduce((sum, e) => sum + e.amount, 0);

            container.innerHTML = `
                <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                    <strong>${vehicle.plate} - ${vehicle.brand} ${vehicle.model}</strong>
                    <br>${this.formatCurrency(total)} (${expenses.length} gastos)
                    <br><small>Año: ${vehicle.year}</small>
                </div>
            `;

        } catch (error) {
            container.innerHTML = '<p>Error al cargar información del vehículo</p>';
            this.handleError(error, 'Error al cargar vehículo del conductor');
        }
    }

    updateDocumentAlerts() {
        try {
            let alerts = [];
            
            if (window.documentController) {
                alerts = window.documentController.generateDocumentAlerts();
            } else {
                // Fallback si no hay controlador de documentos
                alerts = this.generateBasicDocumentAlerts();
            }

            if (alerts.length > 0) {
                this.displayDocumentAlerts(alerts);
            } else {
                this.removeDocumentAlerts();
            }

            // Procesar alertas por email si está configurado
            this.processEmailAlerts();

        } catch (error) {
            this.handleError(error, 'Error al cargar alertas de documentos');
        }
    }

    generateBasicDocumentAlerts() {
        const alerts = [];
        const documents = Document.getAll();
        const vehicles = Vehicle.getAll();

        // Filtrar por conductor si es necesario
        let relevantDocuments = documents;
        if (this.currentUser.type === 'driver') {
            const driver = Driver.getById(this.currentUser.driverId);
            if (driver) {
                relevantDocuments = documents.filter(d => d.vehicleId === driver.vehicleId);
            }
        }

        relevantDocuments.forEach(doc => {
            if (doc.type === 'seal' && doc.applies === 'no') return;

            const status = doc.getStatus();
            const vehicle = vehicles.find(v => v.id === doc.vehicleId);
            
            if (!vehicle) return;

            if (status === 'expired') {
                alerts.push({
                    type: 'error',
                    message: `${doc.getTypeName()} del vehículo ${vehicle.plate} VENCIDO hace ${Math.abs(doc.getDaysToExpiry())} días`
                });
            } else if (status === 'warning') {
                let message = `${doc.getTypeName()} del vehículo ${vehicle.plate} vence en ${doc.getDaysToExpiry()} días`;
                
                if (doc.type === 'tax') {
                    message += '. Confirme la fecha exacta con la entidad territorial correspondiente.';
                }
                
                alerts.push({
                    type: 'warning',
                    message: message
                });
            }
        });

        return alerts;
    }

    displayDocumentAlerts(alerts) {
        // Remover alertas anteriores
        this.removeDocumentAlerts();

        const dashboardSection = document.getElementById('dashboard');
        if (!dashboardSection) return;

        const alertsContainer = document.createElement('div');
        alertsContainer.className = 'card document-alerts';
        alertsContainer.style.marginTop = '20px';

        let alertsHTML = '<h3>⚠️ Alertas de Documentos</h3>';

        alerts.forEach(alert => {
            const color = alert.type === 'error' ? '#e74c3c' : '#f39c12';
            let message = alert.message;
            
            // Mensaje especial para impuesto vehicular
            if (alert.message.includes('Confirme la fecha exacta')) {
                const parts = alert.message.split('. Confirme');
                message = parts[0];
                if (parts[1]) {
                    message += `<br><small style="color: #856404;">⚠️ Confirme${parts[1]}</small>`;
                }
            }

            alertsHTML += `
                <div style="padding: 10px; margin: 5px 0; border-left: 4px solid ${color}; background: rgba(255,255,255,0.1);">
                    ${message}
                </div>
            `;
        });

        alertsContainer.innerHTML = alertsHTML;
        dashboardSection.appendChild(alertsContainer);
    }

    removeDocumentAlerts() {
        const existingAlerts = document.querySelector('.document-alerts');
        if (existingAlerts) {
            existingAlerts.remove();
        }
    }

    setupAutoRefresh() {
        // Actualizar estadísticas cada 5 minutos
        setInterval(() => {
            this.loadStats();
            if (this.currentUser.type === 'driver') {
                this.updateDriverStats();
            } else {
                this.updateStats();
            }
            this.updateDocumentAlerts();
        }, 5 * 60 * 1000);
    }

    // Métodos para actualización manual
    async refreshDashboard() {
        try {
            this.showLoading('Actualizando dashboard...');
            
            this.loadStats();
            
            if (this.currentUser.type === 'driver') {
                this.setupDriverDashboard();
            } else {
                this.setupAdminDashboard();
            }
            
            this.hideLoading();
            this.showSuccess('Dashboard actualizado');
            
        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al actualizar dashboard');
        }
    }

    // Obtener datos para gráficos (si se implementan en el futuro)
    getExpensesByMonth() {
        const expenses = this.currentUser.type === 'driver' 
            ? Expense.getByDriverId(this.currentUser.driverId)
            : Expense.getAll();

        const monthlyData = {};
        const currentYear = new Date().getFullYear();

        // Inicializar todos los meses
        for (let i = 0; i < 12; i++) {
            const monthName = new Date(currentYear, i, 1).toLocaleString('es', { month: 'long' });
            monthlyData[monthName] = 0;
        }

        expenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            if (expenseDate.getFullYear() === currentYear) {
                const monthName = expenseDate.toLocaleString('es', { month: 'long' });
                monthlyData[monthName] += expense.amount;
            }
        });

        return monthlyData;
    }

    getExpensesByCategory() {
        const expenses = this.currentUser.type === 'driver' 
            ? Expense.getByDriverId(this.currentUser.driverId)
            : Expense.getAll();

        const categoryData = {};
        
        expenses.forEach(expense => {
            if (!categoryData[expense.type]) {
                categoryData[expense.type] = 0;
            }
            categoryData[expense.type] += expense.amount;
        });

        return categoryData;
    }

    getVehicleExpenseComparison() {
        if (this.currentUser.type === 'driver') return null;

        const vehicles = Vehicle.getAll();
        const expenses = Expense.getAll();

        return vehicles.map(vehicle => {
            const vehicleExpenses = expenses.filter(e => e.vehicleId === vehicle.id);
            const total = vehicleExpenses.reduce((sum, e) => sum + e.amount, 0);
            
            return {
                vehicle: `${vehicle.plate} - ${vehicle.brand}`,
                total: total,
                count: vehicleExpenses.length
            };
        }).sort((a, b) => b.total - a.total);
    }

    // Exportar datos del dashboard
    exportDashboardData() {
        try {
            const data = {
                stats: this.stats,
                expensesByMonth: this.getExpensesByMonth(),
                expensesByCategory: this.getExpensesByCategory(),
                vehicleComparison: this.getVehicleExpenseComparison(),
                alerts: this.alerts,
                generatedAt: new Date().toISOString(),
                userType: this.currentUser.type
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard_${this.currentUser.type}_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showSuccess('Datos del dashboard exportados exitosamente');
        } catch (error) {
            this.handleError(error, 'Error al exportar datos del dashboard');
        }
    }

    // Métodos de utilidad para widgets del dashboard
    createStatWidget(title, value, icon, color = '#3498db') {
        return `
            <div class="stat-card" style="background-color: ${color};">
                <div style="font-size: 2em;">${icon}</div>
                <div class="stat-value">${value}</div>
                <div>${title}</div>
            </div>
        `;
    }

    createAlertWidget(message, type = 'info') {
        const colors = {
            info: '#3498db',
            warning: '#f39c12',
            error: '#e74c3c',
            success: '#27ae60'
        };

        return `
            <div style="padding: 10px; margin: 5px 0; border-left: 4px solid ${colors[type]}; background: rgba(255,255,255,0.1);">
                ${message}
            </div>
        `;
    }

    // Procesar alertas por email
    async processEmailAlerts() {
        try {
            if (window.emailService && window.emailService.isConfigured()) {
                await window.emailService.processDocumentAlerts();
            }
        } catch (error) {
            console.error('Error al procesar alertas por email:', error);
        }
    }

    // Configurar dashboard personalizado según preferencias del usuario
    setupPersonalizedDashboard() {
        // En el futuro se pueden agregar preferencias de usuario
        // como widgets personalizables, orden de secciones, etc.
    }
}