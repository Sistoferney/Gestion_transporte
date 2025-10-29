/**
 * Controlador de Gastos - Gestión CRUD de gastos y recibos
 */
class ExpenseController extends BaseController {
    constructor() {
        super();
        this.currentDriverId = null;
        this.receiptFiles = {};
        this.expenses = [];
        this.initialize();
    }

    initialize() {
        super.initialize();
        if (!this.requireAuth()) return;
        
        // Configurar según el tipo de usuario
        if (this.currentUser.type === 'driver') {
            this.currentDriverId = this.currentUser.driverId;
            this.setupDriverExpenses();
        }
        
        this.setupExpenseForm();
        this.loadExpenses();
        this.loadReceiptFiles();
    }

    setupDriverExpenses() {
        // Para conductores, configurar automáticamente su información
        setTimeout(() => {
            const driver = Driver.getById(this.currentDriverId);
            if (driver) {
                const vehicleSelect = document.getElementById('expenseVehicle');
                if (vehicleSelect && driver.vehicleId) {
                    vehicleSelect.value = driver.vehicleId;
                    vehicleSelect.disabled = true;
                }
            }
        }, 100);
    }

    setupExpenseForm() {
        const form = document.getElementById('expenseForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleExpenseSubmit(e));
        }

        // Configurar fecha por defecto
        const dateField = document.getElementById('expenseDate');
        if (dateField && !dateField.value) {
            dateField.value = new Date().toISOString().split('T')[0];
        }

        // Configurar manejo de archivos
        const fileInput = document.getElementById('expenseReceipt');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleReceiptSelect(e));
        }

        // Actualizar selectores
        this.updateDriverSelectors();
        this.updateVehicleSelectors();
    }

    updateDriverSelectors() {
        const drivers = Driver.getAll();
        const selectors = ['expenseDriver', 'filterDriver'];
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (select) {
                const currentValue = select.value;
                const defaultOption = selectorId === 'expenseDriver' 
                    ? '<option value="">Seleccionar conductor</option>'
                    : '<option value="">Todos los conductores</option>';
                
                select.innerHTML = defaultOption +
                    drivers.map(driver => 
                        `<option value="${driver.id}">${driver.name}</option>`
                    ).join('');
                
                if (currentValue && drivers.find(d => d.id == currentValue)) {
                    select.value = currentValue;
                }

                // Para conductores, preseleccionar y deshabilitar
                if (this.currentUser.type === 'driver' && selectorId === 'expenseDriver') {
                    select.value = this.currentDriverId;
                    select.disabled = true;
                }
            }
        });
    }

    updateVehicleSelectors() {
        const vehicles = Vehicle.getAll();
        const selectors = ['expenseVehicle', 'filterVehicle'];
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (select && !select.disabled) {
                const currentValue = select.value;
                const defaultOption = selectorId === 'expenseVehicle' 
                    ? '<option value="">Seleccionar vehículo</option>'
                    : '<option value="">Todos los vehículos</option>';
                
                select.innerHTML = defaultOption +
                    vehicles.map(vehicle => 
                        `<option value="${vehicle.id}">${vehicle.plate} - ${vehicle.brand} ${vehicle.model}</option>`
                    ).join('');
                
                if (currentValue && vehicles.find(v => v.id == currentValue)) {
                    select.value = currentValue;
                }
            }
        });
    }

    async handleExpenseSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const expenseData = this.buildExpenseData(formData);

        // Validaciones
        const validation = this.validateExpenseData(expenseData);
        if (!validation.isValid) {
            this.showError(validation.errors.join(', '));
            return;
        }

        try {
            this.showLoading('Guardando gasto...');
            
            // Manejar archivo de recibo si existe
            const receiptFile = document.getElementById('expenseReceipt').files[0];
            if (receiptFile) {
                const receiptId = await this.handleReceiptUpload(receiptFile);
                expenseData.receiptId = receiptId;
            }

            // Guardar gasto
            const expense = Expense.save(expenseData);
            this.expenses.push(expense);
            
            this.hideLoading();
            this.showSuccess('Gasto registrado exitosamente');
            
            // Limpiar formulario y actualizar listas
            this.resetExpenseForm();
            this.loadExpenses();
            
            // Actualizar dashboard si existe
            if (window.dashboardController) {
                window.dashboardController.loadStats();
            }

        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al guardar gasto');
        }
    }

    buildExpenseData(formData) {
        const data = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            date: formData.get('date'),
            description: formData.get('description') || '',
            odometer: formData.get('odometer') ? parseInt(formData.get('odometer')) : null
        };

        if (this.currentUser.type === 'driver') {
            // Para conductores, usar su ID y vehículo asignado
            data.driverId = this.currentDriverId;
            const driver = Driver.getById(this.currentDriverId);
            if (driver && driver.vehicleId) {
                data.vehicleId = driver.vehicleId;
            }
        } else {
            // Para administradores, usar los valores del formulario
            data.driverId = parseInt(formData.get('driverId'));
            data.vehicleId = parseInt(formData.get('vehicleId'));
        }

        return data;
    }

    validateExpenseData(data) {
        const errors = [];
        
        if (!data.type) errors.push('El tipo de gasto es requerido');
        if (!data.amount || data.amount <= 0) errors.push('El monto debe ser mayor a 0');
        if (!data.date) errors.push('La fecha es requerida');
        if (!data.driverId) errors.push('El conductor es requerido');
        if (!data.vehicleId) errors.push('El vehículo es requerido');
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    handleReceiptSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validar archivo
        if (file.size > 5 * 1024 * 1024) {
            this.showError('El archivo es demasiado grande. Máximo 5MB permitido.');
            e.target.value = '';
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG) y PDF.');
            e.target.value = '';
            return;
        }

        this.showInfo(`Recibo seleccionado: ${file.name}`);
    }

    async handleReceiptUpload(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const receiptId = Date.now().toString();
                    const receiptData = {
                        name: file.name,
                        type: file.type,
                        data: e.target.result,
                        uploadDate: new Date().toISOString()
                    };
                    
                    this.receiptFiles[receiptId] = receiptData;
                    StorageService.setReceipts(this.receiptFiles);
                    
                    resolve(receiptId);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    }

    loadExpenses() {
        try {
            if (this.currentUser.type === 'driver') {
                this.expenses = Expense.getByDriverId(this.currentDriverId);
            } else {
                this.expenses = Expense.getAll();
            }
            
            this.updateExpensesList();
        } catch (error) {
            this.handleError(error, 'Error al cargar gastos');
        }
    }

    updateExpensesList() {
        // Esta función será llamada por la vista
        if (window.expenseView) {
            window.expenseView.updateExpensesList(this.expenses);
            window.expenseView.updateExpensesSummary(this.expenses);
        }
    }

    loadReceiptFiles() {
        this.receiptFiles = StorageService.getReceipts();
    }

    // Filtrar gastos
    filterExpenses(filters) {
        try {
            let filteredExpenses = [...this.expenses];

            // Aplicar filtros
            if (filters.type) {
                filteredExpenses = filteredExpenses.filter(e => e.type === filters.type);
            }

            if (filters.driverId) {
                filteredExpenses = filteredExpenses.filter(e => e.driverId == filters.driverId);
            }

            if (filters.vehicleId) {
                filteredExpenses = filteredExpenses.filter(e => e.vehicleId == filters.vehicleId);
            }

            if (filters.dateFrom) {
                const fromDate = new Date(filters.dateFrom + 'T00:00:00');
                filteredExpenses = filteredExpenses.filter(e => new Date(e.createdAt) >= fromDate);
            }

            if (filters.dateTo) {
                const toDate = new Date(filters.dateTo + 'T23:59:59');
                filteredExpenses = filteredExpenses.filter(e => new Date(e.createdAt) <= toDate);
            }

            if (filters.minAmount) {
                filteredExpenses = filteredExpenses.filter(e => e.amount >= filters.minAmount);
            }

            return filteredExpenses;
        } catch (error) {
            this.handleError(error, 'Error al filtrar gastos');
            return [];
        }
    }

    // Editar gasto
    editExpense(expenseId) {
        const expense = Expense.getById(expenseId);
        if (!expense) {
            this.showError('Gasto no encontrado');
            return;
        }

        // Verificar permisos
        if (this.currentUser.type === 'driver' && expense.driverId !== this.currentDriverId) {
            this.showError('No tienes permisos para editar este gasto');
            return;
        }

        // Llenar formulario con datos del gasto
        this.fillExpenseForm(expense);
    }

    fillExpenseForm(expense) {
        document.getElementById('expenseType').value = expense.type;
        document.getElementById('expenseAmount').value = expense.amount;
        document.getElementById('expenseDate').value = expense.date;
        document.getElementById('expenseDescription').value = expense.description || '';
        
        if (expense.odometer) {
            document.getElementById('expenseOdometer').value = expense.odometer;
        }

        if (this.currentUser.type === 'admin') {
            document.getElementById('expenseDriver').value = expense.driverId;
            document.getElementById('expenseVehicle').value = expense.vehicleId;
        }

        // Scroll al formulario
        const form = document.getElementById('expenseForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Eliminar gasto
    deleteExpense(expenseId) {
        const expense = Expense.getById(expenseId);
        if (!expense) {
            this.showError('Gasto no encontrado');
            return;
        }

        // Verificar permisos
        if (this.currentUser.type === 'driver' && expense.driverId !== this.currentDriverId) {
            this.showError('No tienes permisos para eliminar este gasto');
            return;
        }

        this.showConfirmDialog(
            `¿Está seguro de eliminar este gasto de ${this.formatCurrency(expense.amount)}?`,
            () => this.confirmDeleteExpense(expenseId)
        );
    }

    async confirmDeleteExpense(expenseId) {
        try {
            this.showLoading('Eliminando gasto...');
            
            Expense.delete(expenseId);
            this.expenses = this.expenses.filter(e => e.id !== expenseId);
            
            this.hideLoading();
            this.showSuccess('Gasto eliminado exitosamente');
            this.updateExpensesList();

        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al eliminar gasto');
        }
    }

    // Ver recibo
    viewReceipt(receiptId) {
        const receipt = this.receiptFiles[receiptId];
        if (!receipt) {
            this.showError('Recibo no encontrado');
            return;
        }

        let content;
        if (receipt.type.startsWith('image/')) {
            content = `<img src="${receipt.data}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">`;
        } else if (receipt.type === 'application/pdf') {
            content = `<embed src="${receipt.data}" type="application/pdf" style="width: 100%; height: 70vh; border-radius: 8px;">`;
        } else {
            content = `<p>No se puede previsualizar este tipo de archivo: ${receipt.type}</p>`;
        }

        this.showModal('Ver Recibo', content, [
            {
                text: 'Descargar',
                class: 'btn',
                action: () => this.downloadReceipt(receiptId),
                closeModal: false
            },
            {
                text: 'Cerrar',
                class: 'btn btn-danger'
            }
        ]);
    }

    downloadReceipt(receiptId) {
        const receipt = this.receiptFiles[receiptId];
        if (!receipt) return;

        const link = document.createElement('a');
        link.href = receipt.data;
        link.download = receipt.name;
        link.click();
    }

    // Exportar gastos
    exportExpenses() {
        try {
            const data = {
                expenses: this.expenses,
                exportDate: new Date().toISOString(),
                totalExpenses: this.expenses.length,
                totalAmount: this.expenses.reduce((sum, e) => sum + e.amount, 0),
                userType: this.currentUser.type,
                filters: this.getCurrentFilters()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gastos_${this.currentUser.type}_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showSuccess('Datos de gastos exportados exitosamente');
        } catch (error) {
            this.handleError(error, 'Error al exportar gastos');
        }
    }

    getCurrentFilters() {
        return {
            type: document.getElementById('filterType')?.value || '',
            driverId: document.getElementById('filterDriver')?.value || '',
            vehicleId: document.getElementById('filterVehicle')?.value || '',
            dateFrom: document.getElementById('filterDateFrom')?.value || '',
            dateTo: document.getElementById('filterDateTo')?.value || '',
            minAmount: parseFloat(document.getElementById('filterAmount')?.value || 0)
        };
    }

    // Generar estadísticas
    generateExpenseStats() {
        const stats = {
            total: this.expenses.reduce((sum, e) => sum + e.amount, 0),
            count: this.expenses.length,
            byType: {},
            byMonth: {},
            byVehicle: {},
            average: 0,
            highest: null,
            lowest: null
        };

        if (this.expenses.length === 0) return stats;

        stats.average = stats.total / stats.count;

        this.expenses.forEach(expense => {
            // Por tipo
            if (!stats.byType[expense.type]) {
                stats.byType[expense.type] = { count: 0, total: 0 };
            }
            stats.byType[expense.type].count++;
            stats.byType[expense.type].total += expense.amount;

            // Por mes
            const month = new Date(expense.date).toLocaleString('es', { month: 'long', year: 'numeric' });
            if (!stats.byMonth[month]) {
                stats.byMonth[month] = 0;
            }
            stats.byMonth[month] += expense.amount;

            // Por vehículo
            const vehicle = Vehicle.getById(expense.vehicleId);
            const vehicleKey = vehicle ? vehicle.plate : 'Sin vehículo';
            if (!stats.byVehicle[vehicleKey]) {
                stats.byVehicle[vehicleKey] = 0;
            }
            stats.byVehicle[vehicleKey] += expense.amount;

            // Más alto y más bajo
            if (!stats.highest || expense.amount > stats.highest.amount) {
                stats.highest = expense;
            }
            if (!stats.lowest || expense.amount < stats.lowest.amount) {
                stats.lowest = expense;
            }
        });

        return stats;
    }

    resetExpenseForm() {
        const form = document.getElementById('expenseForm');
        if (form) {
            form.reset();
            
            // Restaurar fecha actual
            const dateField = document.getElementById('expenseDate');
            if (dateField) {
                dateField.value = new Date().toISOString().split('T')[0];
            }

            // Para conductores, restaurar valores predefinidos
            if (this.currentUser.type === 'driver') {
                const driverSelect = document.getElementById('expenseDriver');
                if (driverSelect) {
                    driverSelect.value = this.currentDriverId;
                }

                const driver = Driver.getById(this.currentDriverId);
                if (driver && driver.vehicleId) {
                    const vehicleSelect = document.getElementById('expenseVehicle');
                    if (vehicleSelect) {
                        vehicleSelect.value = driver.vehicleId;
                    }
                }
            }
        }
    }

    // Obtener gastos por período
    getExpensesByPeriod(startDate, endDate) {
        return this.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
        });
    }

    // Obtener gastos del mes actual
    getCurrentMonthExpenses() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        return this.getExpensesByPeriod(firstDay, lastDay);
    }
}