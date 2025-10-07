/**
 * Modelo Freight - Gestión de fletes y servicios de transporte
 */
class Freight {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.driverId = data.driverId || null;
        this.vehicleId = data.vehicleId || null;
        this.origin = data.origin || '';
        this.destination = data.destination || '';
        this.distance = data.distance || null; // Calculado automáticamente con Google Maps
        this.tonnage = data.tonnage || 0; // Cantidad en toneladas
        this.price = data.price || 0;
        this.serviceDate = data.serviceDate || new Date().toISOString().split('T')[0];
        this.serviceTime = data.serviceTime || '';
        this.clientName = data.clientName || '';
        this.clientPhone = data.clientPhone || '';
        this.observations = data.observations || '';
        this.status = data.status || 'programmed'; // programmed, in_progress, completed, cancelled
        this.actualStartTime = data.actualStartTime || null;
        this.actualEndTime = data.actualEndTime || null;
        this.completedBy = data.completedBy || null; // ID del conductor que marcó como completado
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // Validaciones
    validate() {
        const errors = [];

        if (!this.driverId) {
            errors.push('Debe especificar un conductor');
        }

        if (!this.origin || this.origin.trim().length === 0) {
            errors.push('El origen es requerido');
        }

        if (!this.destination || this.destination.trim().length === 0) {
            errors.push('El destino es requerido');
        }

        if (!this.price || this.price <= 0) {
            errors.push('El precio debe ser mayor a cero');
        }

        if (!this.tonnage || this.tonnage <= 0) {
            errors.push('La cantidad en toneladas debe ser mayor a cero');
        }

        if (!this.serviceDate) {
            errors.push('La fecha del servicio es requerida');
        }

        if (!this.serviceTime) {
            errors.push('La hora del servicio es requerida');
        }

        if (!this.clientName || this.clientName.trim().length === 0) {
            errors.push('El nombre del cliente es requerido');
        }

        if (!this.clientPhone || this.clientPhone.trim().length === 0) {
            errors.push('El teléfono del cliente es requerido');
        }

        // Validar estado
        const validStatuses = ['programmed', 'in_progress', 'completed', 'cancelled'];
        if (!this.status || !validStatuses.includes(this.status)) {
            errors.push('El estado debe ser válido');
        }

        // Validar que la fecha no sea muy antigua (más de 1 año atrás)
        const serviceDate = new Date(this.serviceDate);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        if (serviceDate < oneYearAgo) {
            errors.push('La fecha del servicio no puede ser tan antigua');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Métodos estáticos para manejo de datos
    static getAll() {
        const freights = localStorage.getItem('freights');
        return freights ? JSON.parse(freights).map(data => new Freight(data)) : [];
    }

    static getById(id) {
        const freights = Freight.getAll();
        return freights.find(freight => freight.id == id);
    }

    static getByDriverId(driverId) {
        const freights = Freight.getAll();
        return freights.filter(freight => freight.driverId == driverId);
    }

    static getByVehicleId(vehicleId) {
        const freights = Freight.getAll();
        return freights.filter(freight => freight.vehicleId == vehicleId);
    }

    static getByStatus(status) {
        const freights = Freight.getAll();
        return freights.filter(freight => freight.status === status);
    }

    static getByDateRange(startDate, endDate) {
        const freights = Freight.getAll();
        const start = new Date(startDate);
        const end = new Date(endDate);

        return freights.filter(freight => {
            const freightDate = new Date(freight.serviceDate);
            return freightDate >= start && freightDate <= end;
        });
    }

    static getToday() {
        const today = new Date().toISOString().split('T')[0];
        const freights = Freight.getAll();
        return freights.filter(freight => freight.serviceDate === today);
    }

    static getThisWeek() {
        const freights = Freight.getAll();
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        return freights.filter(freight => {
            const freightDate = new Date(freight.serviceDate);
            return freightDate >= weekAgo && freightDate <= today;
        });
    }

    static getCurrentMonth() {
        const now = new Date();
        const freights = Freight.getAll();
        return freights.filter(freight => {
            const freightDate = new Date(freight.serviceDate);
            return freightDate.getFullYear() === now.getFullYear() &&
                   freightDate.getMonth() === now.getMonth();
        });
    }

    static getPendingForDriver(driverId) {
        const freights = Freight.getByDriverId(driverId);
        return freights.filter(freight =>
            freight.status === 'programmed' || freight.status === 'in_progress'
        );
    }

    static save(freightData) {
        const freights = Freight.getAll();
        const freight = new Freight(freightData);

        const validation = freight.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        // Auto-asignar vehículo basado en el conductor
        if (freight.driverId && !freight.vehicleId) {
            const driver = Driver.getById(freight.driverId);
            if (driver && driver.vehicleId) {
                freight.vehicleId = driver.vehicleId;
            }
        }

        // Verificar si ya existe (actualizar) o es nuevo (crear)
        const existingIndex = freights.findIndex(f => f.id == freight.id);

        if (existingIndex !== -1) {
            freight.updatedAt = new Date().toISOString();
            freights[existingIndex] = freight;
        } else {
            freights.push(freight);
        }

        // Usar StorageService para activar sincronización automática
        StorageService.setFreights(freights);
        return freight;
    }

    static delete(id) {
        const freights = Freight.getAll();
        const filteredFreights = freights.filter(freight => freight.id != id);
        StorageService.setFreights(filteredFreights);
        return true;
    }

    // Métodos de cálculo y estadísticas
    static getTotalRevenueByDriver(driverId) {
        const freights = Freight.getByDriverId(driverId);
        return freights
            .filter(f => f.status === 'completed')
            .reduce((total, freight) => total + freight.price, 0);
    }

    static getTotalRevenueByVehicle(vehicleId) {
        const freights = Freight.getByVehicleId(vehicleId);
        return freights
            .filter(f => f.status === 'completed')
            .reduce((total, freight) => total + freight.price, 0);
    }

    static getRevenueByDateRange(startDate, endDate) {
        const freights = Freight.getByDateRange(startDate, endDate);
        return freights
            .filter(f => f.status === 'completed')
            .reduce((total, freight) => total + freight.price, 0);
    }

    static getStatsByStatus() {
        const freights = Freight.getAll();
        const stats = {};

        freights.forEach(freight => {
            if (!stats[freight.status]) {
                stats[freight.status] = {
                    count: 0,
                    revenue: 0
                };
            }
            stats[freight.status].count += 1;
            if (freight.status === 'completed') {
                stats[freight.status].revenue += freight.price;
            }
        });

        return stats;
    }

    static search(query) {
        const freights = Freight.getAll();
        const searchTerm = query.toLowerCase();

        return freights.filter(freight =>
            freight.origin.toLowerCase().includes(searchTerm) ||
            freight.destination.toLowerCase().includes(searchTerm) ||
            freight.clientName.toLowerCase().includes(searchTerm) ||
            freight.clientPhone.includes(searchTerm) ||
            freight.price.toString().includes(searchTerm) ||
            freight.tonnage.toString().includes(searchTerm) ||
            freight.serviceDate.includes(searchTerm)
        );
    }

    // Métodos de instancia
    save() {
        return Freight.save(this);
    }

    delete() {
        return Freight.delete(this.id);
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

    // Métodos para el conductor
    markAsInProgress(driverId) {
        if (this.driverId != driverId) {
            throw new Error('Solo el conductor asignado puede marcar el servicio como en progreso');
        }

        this.status = 'in_progress';
        this.actualStartTime = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        return this.save();
    }

    markAsCompleted(driverId) {
        if (this.driverId != driverId) {
            throw new Error('Solo el conductor asignado puede completar el servicio');
        }

        this.status = 'completed';
        this.actualEndTime = new Date().toISOString();
        this.completedBy = driverId;
        this.updatedAt = new Date().toISOString();
        return this.save();
    }

    cancel(reason = '') {
        this.status = 'cancelled';
        this.observations += (this.observations ? '\n' : '') + `Cancelado: ${reason}`;
        this.updatedAt = new Date().toISOString();
        return this.save();
    }

    // Métodos de formato
    getFormattedPrice() {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(this.price);
    }

    getFormattedTonnage() {
        return `${this.tonnage} ton`;
    }

    getFormattedServiceDate() {
        return new Date(this.serviceDate).toLocaleDateString('es-CO');
    }

    getFormattedServiceDateTime() {
        return `${this.getFormattedServiceDate()} ${this.serviceTime}`;
    }

    getStatusText() {
        const statusMap = {
            'programmed': 'Programado',
            'in_progress': 'En Progreso',
            'completed': 'Completado',
            'cancelled': 'Cancelado'
        };
        return statusMap[this.status] || this.status;
    }

    getRoute() {
        return `${this.origin} → ${this.destination}`;
    }

    getDuration() {
        if (!this.actualStartTime || !this.actualEndTime) return null;

        const start = new Date(this.actualStartTime);
        const end = new Date(this.actualEndTime);
        const diffMs = end - start;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return `${diffHours}h ${diffMinutes}m`;
    }

    // Información para el conductor (campos limitados)
    getDriverInfo() {
        return {
            id: this.id,
            serviceDate: this.serviceDate,
            serviceTime: this.serviceTime,
            origin: this.origin,
            destination: this.destination,
            distance: this.distance,
            tonnage: this.tonnage,
            formattedTonnage: this.getFormattedTonnage(),
            clientName: this.clientName,
            clientPhone: this.clientPhone,
            status: this.status,
            route: this.getRoute(),
            formattedDate: this.getFormattedServiceDate(),
            statusText: this.getStatusText()
        };
    }

    toJSON() {
        return {
            id: this.id,
            driverId: this.driverId,
            vehicleId: this.vehicleId,
            origin: this.origin,
            destination: this.destination,
            distance: this.distance,
            tonnage: this.tonnage,
            price: this.price,
            serviceDate: this.serviceDate,
            serviceTime: this.serviceTime,
            clientName: this.clientName,
            clientPhone: this.clientPhone,
            observations: this.observations,
            status: this.status,
            actualStartTime: this.actualStartTime,
            actualEndTime: this.actualEndTime,
            completedBy: this.completedBy,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    toString() {
        return `${this.getRoute()} - ${this.getFormattedPrice()} - ${this.getFormattedServiceDate()}`;
    }
}