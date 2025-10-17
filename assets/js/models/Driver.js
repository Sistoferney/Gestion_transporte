/**
 * Modelo Driver - Gestión de conductores
 */
class Driver {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.name = data.name || '';
        this.idNumber = data.idNumber || ''; // En Colombia, este es el número de licencia
        this.phone = data.phone || '';
        this.email = data.email || null;
        this.licenseExpiry = data.licenseExpiry || null; // Fecha de vencimiento de licencia
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

        // Validar fecha de vencimiento de licencia
        // La fecha de vencimiento de licencia es opcional (para compatibilidad con conductores antiguos)
        if (this.licenseExpiry) {
            // Si se proporciona, validar que sea una fecha válida
            const expiryDate = new Date(this.licenseExpiry);
            if (isNaN(expiryDate.getTime())) {
                errors.push('La fecha de vencimiento de la licencia no es válida');
            }
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
                licenseExpiry: data.licenseExpiry || null,
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

        // Registrar tombstone (marca de eliminación)
        if (window.StorageService && StorageService.registerDeletion) {
            StorageService.registerDeletion('drivers', id);
        }

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

    isLicenseValid() {
        if (!this.licenseExpiry) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(this.licenseExpiry);
        expiryDate.setHours(0, 0, 0, 0);
        return expiryDate >= today;
    }

    isLicenseExpired() {
        return !this.isLicenseValid();
    }

    isLicenseExpiringSoon(daysThreshold = 30) {
        if (!this.licenseExpiry) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(this.licenseExpiry);
        expiryDate.setHours(0, 0, 0, 0);

        // Si ya venció, no es "por vencer"
        if (expiryDate < today) return false;

        // Calcular días hasta el vencimiento
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= daysThreshold;
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
            licenseExpiry: this.licenseExpiry,
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