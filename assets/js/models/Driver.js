/**
 * Modelo Driver - Gestión de conductores
 */
class Driver {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.name = data.name || '';
        this.idNumber = data.idNumber || '';
        this.phone = data.phone || '';
        this.email = data.email || null;
        this.vehicleId = data.vehicleId || null;
        this.status = data.status || 'active';
        this.address = data.address || null;
        this.notes = data.notes || null;
        this.username = data.username || '';
        this.password = data.password || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // Validaciones
    validate(options = {}) {
        const { skipCredentials = false } = options;
        const errors = [];
        
        if (!this.name || this.name.trim().length === 0) {
            errors.push('El nombre es requerido');
        }
        
        if (!this.idNumber || this.idNumber.trim().length === 0) {
            errors.push('La cédula es requerida');
        }
        
        if (!this.phone || this.phone.trim().length === 0) {
            errors.push('El teléfono es requerido');
        }
        
        // Validar status
        const validStatuses = ['active', 'inactive', 'suspended'];
        if (!this.status || !validStatuses.includes(this.status)) {
            errors.push('El estado debe ser uno de: activo, inactivo, suspendido');
        }
        
        // vehicleId es opcional, un conductor puede no tener vehículo asignado
        
        // Solo validar credenciales si no se omiten (para creación de nuevos conductores)
        if (!skipCredentials) {
            if (!this.username || this.username.trim().length === 0) {
                errors.push('El usuario es requerido');
            }
            
            if (!this.password || this.password.trim().length < 6) {
                errors.push('La contraseña debe tener al menos 6 caracteres');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Métodos estáticos para manejo de datos
    static getAll() {
        const drivers = localStorage.getItem('drivers');
        if (!drivers) return [];
        
        return JSON.parse(drivers).map(data => {
            // Asegurar que todos los campos nuevos existan, incluso en datos antiguos
            const driverData = {
                ...data,
                email: data.email || null,
                status: data.status || 'active',
                address: data.address || null,
                notes: data.notes || null
            };
            return new Driver(driverData);
        });
    }

    static getById(id) {
        const drivers = Driver.getAll();
        return drivers.find(driver => driver.id == id);
    }

    static getByUsername(username) {
        const drivers = Driver.getAll();
        return drivers.find(driver => driver.username === username);
    }

    static getByVehicleId(vehicleId) {
        const drivers = Driver.getAll();
        return drivers.find(driver => driver.vehicleId == vehicleId);
    }

    static save(driverData) {
        const drivers = Driver.getAll();
        const driver = new Driver(driverData);
        
        // Verificar si ya existe (actualizar) o es nuevo (crear)
        const existingIndex = drivers.findIndex(d => d.id == driver.id);
        const isUpdate = existingIndex !== -1;
        
        // Validar con opciones según si es creación o actualización
        const validation = driver.validate({ skipCredentials: isUpdate });
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        // Verificar unicidad de cédula y username
        const existingDriver = drivers.find(d => 
            d.id != driver.id && (d.idNumber === driver.idNumber || d.username === driver.username)
        );
        
        if (existingDriver) {
            throw new Error('Ya existe un conductor con esa cédula o nombre de usuario');
        }

        if (isUpdate) {
            driver.updatedAt = new Date().toISOString();
            drivers[existingIndex] = driver;
        } else {
            drivers.push(driver);
        }

        // Usar StorageService para activar sincronización automática
        StorageService.setDrivers(drivers);
        return driver;
    }

    static delete(id) {
        const drivers = Driver.getAll();
        const filteredDrivers = drivers.filter(driver => driver.id != id);
        // Usar StorageService para activar sincronización automática
        StorageService.setDrivers(filteredDrivers);
        return true;
    }

    static search(query) {
        const drivers = Driver.getAll();
        const searchTerm = query.toLowerCase();
        
        return drivers.filter(driver => 
            driver.name.toLowerCase().includes(searchTerm) ||
            driver.idNumber.includes(searchTerm) ||
            driver.phone.includes(searchTerm) ||
            driver.username.toLowerCase().includes(searchTerm)
        );
    }

    // Métodos de instancia
    save() {
        return Driver.save(this);
    }

    delete() {
        return Driver.delete(this.id);
    }

    getVehicle() {
        if (!this.vehicleId) return null;
        
        // Importar Vehicle si está disponible
        if (typeof Vehicle !== 'undefined') {
            return Vehicle.getById(this.vehicleId);
        }
        
        // Fallback si no está disponible la clase Vehicle
        const vehicles = JSON.parse(localStorage.getItem('vehicles') || '[]');
        return vehicles.find(v => v.id == this.vehicleId);
    }

    getExpenses() {
        if (typeof Expense !== 'undefined') {
            return Expense.getByDriverId(this.id);
        }
        
        // Fallback
        const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        return expenses.filter(e => e.driverId == this.id);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            idNumber: this.idNumber,
            phone: this.phone,
            email: this.email,
            vehicleId: this.vehicleId,
            status: this.status,
            address: this.address,
            notes: this.notes,
            username: this.username,
            password: this.password,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    toString() {
        return `${this.name} (${this.idNumber})`;
    }
}