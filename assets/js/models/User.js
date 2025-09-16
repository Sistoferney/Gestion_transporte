/**
 * Modelo User - Gestión de usuarios y autenticación
 */
class User {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.username = data.username || '';
        this.password = data.password || '';
        this.type = data.type || 'driver'; // admin, driver
        this.name = data.name || '';
        this.driverId = data.driverId || null; // Para conductores
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.lastLogin = data.lastLogin || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // Validaciones
    validate() {
        const errors = [];
        
        if (!this.username || this.username.trim().length < 3) {
            errors.push('El usuario debe tener al menos 3 caracteres');
        }
        
        if (!this.password || this.password.length < 3) {
            errors.push('La contraseña debe tener al menos 3 caracteres');
        }
        
        if (!this.name || this.name.trim().length === 0) {
            errors.push('El nombre es requerido');
        }
        
        if (!['admin', 'driver'].includes(this.type)) {
            errors.push('Tipo de usuario inválido');
        }
        
        if (this.type === 'driver' && !this.driverId) {
            errors.push('Los conductores deben tener un ID de conductor asociado');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Métodos estáticos para manejo de datos
    static getAll() {
        const users = localStorage.getItem('systemUsers');
        if (!users) return User.getDefaultUsers();
        
        const usersData = JSON.parse(users);
        return Object.entries(usersData).map(([username, userData]) => 
            new User({ ...userData, username })
        );
    }

    static getDefaultUsers() {
        // Ya no hay usuarios por defecto hardcodeados
        // Los administradores se configuran con AuthService
        // Los conductores se crean dinámicamente al registrar conductor
        console.log('ℹ️ Usando sistema de usuarios dinámico - sin credenciales hardcodeadas');
        return [];
    }

    static getByUsername(username) {
        const users = User.getAll();
        return users.find(user => user.username === username);
    }

    static getById(id) {
        const users = User.getAll();
        return users.find(user => user.id == id);
    }

    static getAdmins() {
        const users = User.getAll();
        return users.filter(user => user.type === 'admin');
    }

    static getDriverUsers() {
        const users = User.getAll();
        return users.filter(user => user.type === 'driver');
    }

    static async authenticate(username, password) {
        try {
            // Usar AuthService para autenticación unificada
            if (window.AuthService) {
                const authResult = await AuthService.authenticate(username, password);
                return authResult.user;
            } else {
                // Fallback al método legacy solo para conductores
                const user = User.getByUsername(username);

                if (!user) {
                    throw new Error('Usuario no encontrado');
                }

                if (!user.isActive) {
                    throw new Error('Usuario inactivo');
                }

                if (user.password !== password) {
                    throw new Error('Contraseña incorrecta');
                }

                // Actualizar último login
                user.lastLogin = new Date().toISOString();
                user.save();

                return user;
            }
        } catch (error) {
            throw error;
        }
    }

    static getCurrentUser() {
        const session = sessionStorage.getItem('userSession');
        if (!session) return null;
        
        const sessionData = JSON.parse(session);
        return User.getByUsername(sessionData.username) || new User(sessionData);
    }

    static logout() {
        sessionStorage.removeItem('userSession');
    }

    static save(userData) {
        const user = new User(userData);
        
        const validation = user.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        // Verificar unicidad del username
        const existingUser = User.getByUsername(user.username);
        if (existingUser && existingUser.id !== user.id) {
            throw new Error('El nombre de usuario ya existe');
        }

        // Obtener estructura actual
        const users = JSON.parse(localStorage.getItem('systemUsers') || '{}');
        
        user.updatedAt = new Date().toISOString();
        users[user.username] = user.toJSON();
        
        localStorage.setItem('systemUsers', JSON.stringify(users));
        return user;
    }

    static delete(username) {
        const users = JSON.parse(localStorage.getItem('systemUsers') || '{}');
        
        if (users[username]) {
            delete users[username];
            localStorage.setItem('systemUsers', JSON.stringify(users));
            return true;
        }
        
        return false;
    }

    static search(query) {
        const users = User.getAll();
        const searchTerm = query.toLowerCase();
        
        return users.filter(user => 
            user.username.toLowerCase().includes(searchTerm) ||
            user.name.toLowerCase().includes(searchTerm) ||
            user.type.toLowerCase().includes(searchTerm)
        );
    }

    // Métodos de instancia
    save() {
        return User.save(this);
    }

    delete() {
        return User.delete(this.username);
    }

    login() {
        // Crear sesión
        const sessionData = {
            username: this.username,
            type: this.type,
            name: this.name,
            driverId: this.driverId,
            loginTime: new Date().toISOString()
        };
        
        sessionStorage.setItem('userSession', JSON.stringify(sessionData));
        
        // Actualizar último login
        this.lastLogin = new Date().toISOString();
        this.save();
        
        return sessionData;
    }

    isAdmin() {
        return this.type === 'admin';
    }

    isDriver() {
        return this.type === 'driver';
    }

    getDriver() {
        if (!this.isDriver() || !this.driverId) return null;
        
        if (typeof Driver !== 'undefined') {
            return Driver.getById(this.driverId);
        }
        
        // Fallback
        const drivers = JSON.parse(localStorage.getItem('drivers') || '[]');
        return drivers.find(d => d.id == this.driverId);
    }

    getExpenses() {
        if (!this.isDriver()) return [];
        
        if (typeof Expense !== 'undefined') {
            return Expense.getByDriverId(this.driverId);
        }
        
        // Fallback
        const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        return expenses.filter(e => e.driverId == this.driverId);
    }

    changePassword(newPassword) {
        if (newPassword.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        
        this.password = newPassword;
        this.updatedAt = new Date().toISOString();
        return this.save();
    }

    activate() {
        this.isActive = true;
        this.updatedAt = new Date().toISOString();
        return this.save();
    }

    deactivate() {
        this.isActive = false;
        this.updatedAt = new Date().toISOString();
        return this.save();
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            password: this.password,
            type: this.type,
            name: this.name,
            driverId: this.driverId,
            isActive: this.isActive,
            lastLogin: this.lastLogin,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Para la sesión (sin password)
    toSessionData() {
        return {
            id: this.id,
            username: this.username,
            type: this.type,
            name: this.name,
            driverId: this.driverId,
            isActive: this.isActive,
            lastLogin: this.lastLogin
        };
    }

    toString() {
        return `${this.name} (${this.username}) - ${this.type}`;
    }
}