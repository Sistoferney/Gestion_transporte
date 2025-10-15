/**
 * Modelo Expense - Gestión de gastos
 */
class Expense {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.driverId = data.driverId || null;
        this.vehicleId = data.vehicleId || null;
        this.type = data.type || '';
        this.amount = data.amount || 0;
        this.description = data.description || '';
        this.date = data.date || new Date().toISOString().split('T')[0];
        this.receiptId = data.receiptId || null;
        this.responsibleParty = data.responsibleParty || null; // 'driver' | 'company' | null
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // Validaciones
    validate() {
        const errors = [];

        if (!this.driverId) {
            errors.push('Debe especificar un conductor');
        }

        if (!this.vehicleId) {
            errors.push('Debe especificar un vehículo');
        }

        if (!this.type || this.type.trim().length === 0) {
            errors.push('El tipo de gasto es requerido');
        }

        // Validar responsibleParty si el tipo es 'fine' (multa)
        if (this.type === 'fine') {
            if (!this.responsibleParty) {
                errors.push('Debe especificar quién es responsable de la multa');
            } else if (!['driver', 'company'].includes(this.responsibleParty)) {
                errors.push('El responsable debe ser "conductor" o "empresa"');
            }
        }

        if (!this.amount || this.amount <= 0) {
            errors.push('El monto debe ser mayor a cero');
        }

        if (!this.date) {
            errors.push('La fecha es requerida');
        }

        // Validar que la fecha no sea futura
        const expenseDate = new Date(this.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Permitir fecha de hoy

        if (expenseDate > today) {
            errors.push('La fecha no puede ser futura');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Métodos estáticos para manejo de datos
    static getAll() {
        const expenses = localStorage.getItem('expenses');
        return expenses ? JSON.parse(expenses).map(data => new Expense(data)) : [];
    }

    static getById(id) {
        const expenses = Expense.getAll();
        return expenses.find(expense => expense.id == id);
    }

    static getByDriverId(driverId) {
        const expenses = Expense.getAll();
        return expenses.filter(expense => expense.driverId == driverId);
    }

    static getByVehicleId(vehicleId) {
        const expenses = Expense.getAll();
        return expenses.filter(expense => expense.vehicleId == vehicleId);
    }

    static getByDateRange(startDate, endDate) {
        const expenses = Expense.getAll();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= start && expenseDate <= end;
        });
    }

    static getByType(type) {
        const expenses = Expense.getAll();
        return expenses.filter(expense => expense.type === type);
    }

    static getByResponsibleParty(responsibleParty) {
        const expenses = Expense.getAll();
        return expenses.filter(expense => expense.responsibleParty === responsibleParty);
    }

    static getFinesByResponsible(responsibleParty) {
        const expenses = Expense.getAll();
        return expenses.filter(expense =>
            expense.type === 'fine' && expense.responsibleParty === responsibleParty
        );
    }

    static getMonthly(year, month) {
        const expenses = Expense.getAll();
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getFullYear() === year && 
                   expenseDate.getMonth() === month;
        });
    }

    static getCurrentMonth() {
        const now = new Date();
        return Expense.getMonthly(now.getFullYear(), now.getMonth());
    }

    static getToday() {
        const today = new Date().toISOString().split('T')[0];
        const expenses = Expense.getAll();
        return expenses.filter(expense => expense.date === today);
    }

    static getThisWeek() {
        const expenses = Expense.getAll();
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= weekAgo && expenseDate <= today;
        });
    }

    static save(expenseData) {
        const expenses = Expense.getAll();
        const expense = new Expense(expenseData);
        
        const validation = expense.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        // Verificar si ya existe (actualizar) o es nuevo (crear)
        const existingIndex = expenses.findIndex(e => e.id == expense.id);
        
        if (existingIndex !== -1) {
            expense.updatedAt = new Date().toISOString();
            expenses[existingIndex] = expense;
        } else {
            expenses.push(expense);
        }

        // Usar StorageService para activar sincronización automática
        StorageService.setExpenses(expenses);
        return expense;
    }

    static delete(id) {
        const expenses = Expense.getAll();
        const filteredExpenses = expenses.filter(expense => expense.id != id);
        // Usar StorageService para activar sincronización automática
        StorageService.setExpenses(filteredExpenses);
        return true;
    }

    static getTotalByDriver(driverId) {
        const expenses = Expense.getByDriverId(driverId);
        // Excluir multas del conductor (no son gastos operativos)
        return expenses
            .filter(expense => !(expense.type === 'fine' && expense.responsibleParty === 'driver'))
            .reduce((total, expense) => total + expense.amount, 0);
    }

    static getTotalByVehicle(vehicleId) {
        const expenses = Expense.getByVehicleId(vehicleId);
        // Excluir multas del conductor (no son gastos operativos del vehículo)
        return expenses
            .filter(expense => !(expense.type === 'fine' && expense.responsibleParty === 'driver'))
            .reduce((total, expense) => total + expense.amount, 0);
    }

    static getDriverFinesTotal(driverId) {
        // Obtener SOLO el total de multas del conductor
        const expenses = Expense.getByDriverId(driverId);
        return expenses
            .filter(expense => expense.type === 'fine' && expense.responsibleParty === 'driver')
            .reduce((total, expense) => total + expense.amount, 0);
    }

    static getDriverFines(driverId) {
        // Obtener lista de multas del conductor
        const expenses = Expense.getByDriverId(driverId);
        return expenses.filter(expense => expense.type === 'fine' && expense.responsibleParty === 'driver');
    }

    static getCompanyFines() {
        // Obtener todas las multas de la empresa
        const expenses = Expense.getAll();
        return expenses.filter(expense => expense.type === 'fine' && expense.responsibleParty === 'company');
    }

    static getTotalByType(type) {
        const expenses = Expense.getByType(type);
        return expenses.reduce((total, expense) => total + expense.amount, 0);
    }

    static getStatsByType() {
        const expenses = Expense.getAll();
        const stats = {};
        
        expenses.forEach(expense => {
            if (!stats[expense.type]) {
                stats[expense.type] = {
                    total: 0,
                    count: 0
                };
            }
            stats[expense.type].total += expense.amount;
            stats[expense.type].count += 1;
        });
        
        return stats;
    }

    static search(query) {
        const expenses = Expense.getAll();
        const searchTerm = query.toLowerCase();
        
        return expenses.filter(expense => 
            expense.type.toLowerCase().includes(searchTerm) ||
            expense.description.toLowerCase().includes(searchTerm) ||
            expense.amount.toString().includes(searchTerm) ||
            expense.date.includes(searchTerm)
        );
    }

    // Métodos de instancia
    save() {
        return Expense.save(this);
    }

    delete() {
        return Expense.delete(this.id);
    }

    getDriver() {
        if (!this.driverId) return null;
        
        if (typeof Driver !== 'undefined') {
            return Driver.getById(this.driverId);
        }
        
        // Fallback
        const drivers = JSON.parse(localStorage.getItem('drivers') || '[]');
        return drivers.find(d => d.id == this.driverId);
    }

    getVehicle() {
        if (!this.vehicleId) return null;
        
        if (typeof Vehicle !== 'undefined') {
            return Vehicle.getById(this.vehicleId);
        }
        
        // Fallback
        const vehicles = JSON.parse(localStorage.getItem('vehicles') || '[]');
        return vehicles.find(v => v.id == this.vehicleId);
    }

    getReceipt() {
        if (!this.receiptId) return null;
        
        const receipts = JSON.parse(localStorage.getItem('receipts') || '{}');
        return receipts[this.receiptId] || null;
    }

    hasReceipt() {
        return this.receiptId !== null && this.receiptId !== undefined;
    }

    getFormattedAmount() {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(this.amount);
    }

    getFormattedDate() {
        return new Date(this.date).toLocaleDateString('es-CO');
    }

    toJSON() {
        return {
            id: this.id,
            driverId: this.driverId,
            vehicleId: this.vehicleId,
            type: this.type,
            amount: this.amount,
            description: this.description,
            date: this.date,
            receiptId: this.receiptId,
            responsibleParty: this.responsibleParty,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    toString() {
        return `${this.type}: ${this.getFormattedAmount()} - ${this.getFormattedDate()}`;
    }
}