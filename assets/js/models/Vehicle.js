/**
 * Modelo Vehicle - Gestión de vehículos
 */
class Vehicle {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.plate = data.plate || '';
        this.brand = data.brand || '';
        this.model = data.model || '';
        this.year = data.year || new Date().getFullYear();
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // Validaciones
    validate() {
        const errors = [];
        
        if (!this.plate || this.plate.trim().length === 0) {
            errors.push('La placa es requerida');
        }
        
        if (!this.brand || this.brand.trim().length === 0) {
            errors.push('La marca es requerida');
        }
        
        if (!this.model || this.model.trim().length === 0) {
            errors.push('El modelo es requerido');
        }
        
        if (!this.year || this.year < 1900 || this.year > new Date().getFullYear() + 1) {
            errors.push('El año debe ser válido');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Métodos estáticos para manejo de datos
    static getAll() {
        const vehiclesData = localStorage.getItem('vehicles');
        const vehicles = vehiclesData ? JSON.parse(vehiclesData).map(data => new Vehicle(data)) : [];
        console.log('📋 [Vehicle.getAll] Cargando vehículos desde localStorage:', vehicles.length, 'encontrados');
        return vehicles;
    }

    static getById(id) {
        const vehicles = Vehicle.getAll();
        return vehicles.find(vehicle => vehicle.id == id);
    }

    static save(vehicleData) {
        const vehicles = Vehicle.getAll();
        const vehicle = new Vehicle(vehicleData);
        
        const validation = vehicle.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        // Verificar si ya existe (actualizar) o es nuevo (crear)
        const existingIndex = vehicles.findIndex(v => v.id == vehicle.id);
        
        if (existingIndex !== -1) {
            vehicle.updatedAt = new Date().toISOString();
            vehicles[existingIndex] = vehicle;
        } else {
            vehicles.push(vehicle);
        }

        // Usar StorageService para activar sincronización automática
        StorageService.setVehicles(vehicles);
        console.log('💾 [Vehicle.save] Vehículo guardado. Total en localStorage:', vehicles.length);
        return vehicle;
    }

    static delete(id) {
        const vehicles = Vehicle.getAll();
        const filteredVehicles = vehicles.filter(vehicle => vehicle.id != id);

        // Registrar tombstone (marca de eliminación)
        if (window.StorageService && StorageService.registerDeletion) {
            StorageService.registerDeletion('vehicles', id);
        }

        // Usar StorageService para activar sincronización automática
        StorageService.setVehicles(filteredVehicles);
        return true;
    }

    static search(query) {
        const vehicles = Vehicle.getAll();
        const searchTerm = query.toLowerCase();
        
        return vehicles.filter(vehicle => 
            vehicle.plate.toLowerCase().includes(searchTerm) ||
            vehicle.brand.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm) ||
            vehicle.year.toString().includes(searchTerm)
        );
    }

    // Métodos de instancia
    save() {
        return Vehicle.save(this);
    }

    delete() {
        return Vehicle.delete(this.id);
    }

    toJSON() {
        return {
            id: this.id,
            plate: this.plate,
            brand: this.brand,
            model: this.model,
            year: this.year,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    toString() {
        return `${this.plate} - ${this.brand} ${this.model} (${this.year})`;
    }
}