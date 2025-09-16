/**
 * Controlador de Conductores - Gestión de conductores del sistema
 */
class DriverController extends BaseController {
    constructor() {
        super();
        this.drivers = [];
        this.initialize();
    }

    initialize() {
        super.initialize();
        if (!this.requireAuth()) return;
        
        this.loadDrivers();
        this.setupEventListeners();
    }

    loadDrivers() {
        try {
            this.drivers = Driver.getAll();
            console.log(`📋 ${this.drivers.length} conductores cargados`);
        } catch (error) {
            this.handleError(error, 'Error al cargar conductores');
        }
    }

    setupEventListeners() {
        super.setupEventListeners();
        
        // Event listeners específicos del controlador de conductores
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="add-driver"]')) {
                this.showAddDriverModal();
            } else if (e.target.matches('[data-action="edit-driver"]')) {
                const driverId = parseInt(e.target.dataset.driverId);
                this.showEditDriverModal(driverId);
            } else if (e.target.matches('[data-action="delete-driver"]')) {
                const driverId = parseInt(e.target.dataset.driverId);
                this.deleteDriver(driverId);
            } else if (e.target.matches('[data-action="view-driver"]')) {
                const driverId = parseInt(e.target.dataset.driverId);
                this.viewDriverDetails(driverId);
            }
        });

        // Formularios
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#addDriverForm')) {
                e.preventDefault();
                this.handleAddDriver(e.target);
            } else if (e.target.matches('#editDriverForm')) {
                e.preventDefault();
                this.handleEditDriver(e.target);
            }
        });
    }

    // Crear nuevo conductor
    async showAddDriverModal() {
        try {
            const vehicles = Vehicle.getAll().filter(v => !v.driverId); // Vehículos sin conductor
            
            const modal = this.createModal('Agregar Conductor', `
                <form id="addDriverForm">
                    <div class="form-group">
                        <label>Nombre Completo *</label>
                        <input type="text" name="name" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Cédula *</label>
                        <input type="text" name="idNumber" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Licencia de Conducir *</label>
                        <input type="text" name="licenseNumber" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Categoría de Licencia</label>
                        <select name="licenseCategory">
                            <option value="A1">A1 - Motocicletas hasta 125cc</option>
                            <option value="A2">A2 - Motocicletas hasta 500cc</option>
                            <option value="B1">B1 - Automóviles, campeonetas</option>
                            <option value="B2">B2 - Camiones hasta 7.5 ton</option>
                            <option value="B3">B3 - Camiones hasta 15 ton</option>
                            <option value="C1" selected>C1 - Camiones de carga</option>
                            <option value="C2">C2 - Vehículos articulados</option>
                            <option value="C3">C3 - Vehículos especiales</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Fecha de Vencimiento Licencia *</label>
                        <input type="date" name="licenseExpiry" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="tel" name="phone">
                    </div>
                    
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email">
                    </div>
                    
                    <div class="form-group">
                        <label>Dirección</label>
                        <textarea name="address" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Vehículo Asignado</label>
                        <select name="vehicleId">
                            <option value="">Sin asignar</option>
                            ${vehicles.map(v => `<option value="${v.id}">${v.plate} - ${v.brand} ${v.model}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="isActive" checked>
                            Conductor activo
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Conductor</button>
                    </div>
                </form>
            `);
            
            document.body.appendChild(modal);
            
        } catch (error) {
            this.handleError(error, 'Error al mostrar formulario de conductor');
        }
    }

    async handleAddDriver(form) {
        try {
            this.showLoading('Guardando conductor...');
            
            const formData = new FormData(form);
            const driverData = {
                name: formData.get('name').trim(),
                idNumber: formData.get('idNumber').trim(),
                licenseNumber: formData.get('licenseNumber').trim(),
                licenseCategory: formData.get('licenseCategory'),
                licenseExpiry: formData.get('licenseExpiry'),
                phone: formData.get('phone')?.trim() || '',
                email: formData.get('email')?.trim() || '',
                address: formData.get('address')?.trim() || '',
                vehicleId: formData.get('vehicleId') ? parseInt(formData.get('vehicleId')) : null,
                isActive: formData.has('isActive')
            };

            // Crear conductor
            const driver = new Driver(driverData);
            const validation = driver.validate();
            
            if (!validation.isValid) {
                this.hideLoading();
                this.showError('Errores de validación:\n' + validation.errors.join('\n'));
                return;
            }

            // Guardar conductor
            driver.save();

            // Crear credenciales seguras para el conductor
            try {
                if (window.AuthService) {
                    // Usar sistema seguro de AuthService
                    const credentials = await AuthService.createDriverCredentials({
                        name: driverData.name,
                        idNumber: driverData.idNumber,
                        driverId: driver.id
                    });

                    if (credentials.success) {
                        console.log(`✅ Credenciales seguras creadas para conductor: ${credentials.username}`);

                        // Mostrar credenciales al admin una sola vez
                        this.showSuccess(`Conductor creado exitosamente!\n\n` +
                                       `🔐 Credenciales de acceso:\n` +
                                       `Usuario: ${credentials.username}\n` +
                                       `Contraseña: ${credentials.originalPassword}\n\n` +
                                       `ℹ️ La contraseña es su número de documento.`);
                    }
                } else {
                    // Fallback al sistema legacy (solo si AuthService no está disponible)
                    console.warn('⚠️ AuthService no disponible, usando sistema legacy');

                    const username = this.generateDriverUsername(driverData.name);
                    const password = driverData.idNumber;

                    const userData = {
                        username: username,
                        password: password,
                        name: driverData.name,
                        type: 'driver',
                        isActive: true,
                        driverId: driver.id
                    };

                    const user = new User(userData);
                    const savedUser = user.save();
                    console.log(`✅ Usuario legacy creado para conductor: ${username}`);

                    // Mostrar credenciales legacy
                    this.showSuccess(`Conductor creado exitosamente!\n\n` +
                                   `🔐 Credenciales de acceso:\n` +
                                   `Usuario: ${username}\n` +
                                   `Contraseña: ${password}\n\n` +
                                   `⚠️ Usando sistema legacy.`);
                }
            } catch (userError) {
                console.error('❌ Error al crear credenciales para conductor:', userError);
                // No fallar el proceso completo por error en credenciales
                this.showWarning('Conductor creado, pero hubo un error al generar credenciales de acceso. Puede crearlas manualmente.');
            }

            // Si hay vehículo asignado, actualizar el vehículo
            if (driverData.vehicleId) {
                const vehicle = Vehicle.getById(driverData.vehicleId);
                if (vehicle) {
                    vehicle.driverId = driver.id;
                    vehicle.save();
                }
            }

            this.hideLoading();
            
            const username = this.generateDriverUsername(driverData.name);
            this.showSuccess(`Conductor agregado exitosamente.\n\n🔑 Credenciales de acceso:\nUsuario: ${username}\nContraseña: ${driverData.idNumber}`);
            
            // Cerrar modal y recargar
            form.closest('.modal').remove();
            this.loadDrivers();
            
            // Recargar vista si existe
            if (window.driverView) {
                window.driverView.render();
            }
            
        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al guardar conductor');
        }
    }

    // Generar nombre de usuario para conductor
    generateDriverUsername(fullName) {
        // Dividir el nombre completo
        const nameParts = fullName.trim().toLowerCase().split(' ');
        
        // Tomar el primer nombre y primer apellido
        const firstName = nameParts[0] || '';
        const lastName = nameParts[1] || '';
        
        // Crear username: conductor + primer nombre + primer apellido
        let username = 'conductor' + firstName;
        if (lastName) {
            username += lastName;
        }
        
        // Limpiar caracteres especiales y espacios
        username = username.replace(/[^a-z0-9]/g, '');
        
        // Verificar si ya existe este username
        let finalUsername = username;
        let counter = 1;
        while (User.getByUsername(finalUsername)) {
            finalUsername = username + counter;
            counter++;
        }
        
        return finalUsername;
    }

    // Editar conductor existente
    async showEditDriverModal(driverId) {
        try {
            const driver = Driver.getById(driverId);
            if (!driver) {
                this.showError('Conductor no encontrado');
                return;
            }

            const vehicles = Vehicle.getAll().filter(v => !v.driverId || v.driverId === driverId);
            
            const modal = this.createModal('Editar Conductor', `
                <form id="editDriverForm" data-driver-id="${driverId}">
                    <div class="form-group">
                        <label>Nombre Completo *</label>
                        <input type="text" name="name" value="${driver.name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Cédula *</label>
                        <input type="text" name="idNumber" value="${driver.idNumber}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Licencia de Conducir *</label>
                        <input type="text" name="licenseNumber" value="${driver.licenseNumber}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Categoría de Licencia</label>
                        <select name="licenseCategory">
                            <option value="A1" ${driver.licenseCategory === 'A1' ? 'selected' : ''}>A1 - Motocicletas hasta 125cc</option>
                            <option value="A2" ${driver.licenseCategory === 'A2' ? 'selected' : ''}>A2 - Motocicletas hasta 500cc</option>
                            <option value="B1" ${driver.licenseCategory === 'B1' ? 'selected' : ''}>B1 - Automóviles, campeonetas</option>
                            <option value="B2" ${driver.licenseCategory === 'B2' ? 'selected' : ''}>B2 - Camiones hasta 7.5 ton</option>
                            <option value="B3" ${driver.licenseCategory === 'B3' ? 'selected' : ''}>B3 - Camiones hasta 15 ton</option>
                            <option value="C1" ${driver.licenseCategory === 'C1' ? 'selected' : ''}>C1 - Camiones de carga</option>
                            <option value="C2" ${driver.licenseCategory === 'C2' ? 'selected' : ''}>C2 - Vehículos articulados</option>
                            <option value="C3" ${driver.licenseCategory === 'C3' ? 'selected' : ''}>C3 - Vehículos especiales</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Fecha de Vencimiento Licencia *</label>
                        <input type="date" name="licenseExpiry" value="${driver.licenseExpiry}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="tel" name="phone" value="${driver.phone || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value="${driver.email || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Dirección</label>
                        <textarea name="address" rows="3">${driver.address || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Vehículo Asignado</label>
                        <select name="vehicleId">
                            <option value="">Sin asignar</option>
                            ${vehicles.map(v => `<option value="${v.id}" ${driver.vehicleId === v.id ? 'selected' : ''}>${v.plate} - ${v.brand} ${v.model}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="isActive" ${driver.isActive ? 'checked' : ''}>
                            Conductor activo
                        </label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Actualizar Conductor</button>
                    </div>
                </form>
            `);
            
            document.body.appendChild(modal);
            
        } catch (error) {
            this.handleError(error, 'Error al mostrar formulario de edición');
        }
    }

    async handleEditDriver(form) {
        try {
            this.showLoading('Actualizando conductor...');
            
            const driverId = parseInt(form.dataset.driverId);
            const driver = Driver.getById(driverId);
            
            if (!driver) {
                this.hideLoading();
                this.showError('Conductor no encontrado');
                return;
            }

            const formData = new FormData(form);
            const oldVehicleId = driver.vehicleId;
            
            // Actualizar datos del conductor
            driver.name = formData.get('name').trim();
            driver.idNumber = formData.get('idNumber').trim();
            driver.licenseNumber = formData.get('licenseNumber').trim();
            driver.licenseCategory = formData.get('licenseCategory');
            driver.licenseExpiry = formData.get('licenseExpiry');
            driver.phone = formData.get('phone')?.trim() || '';
            driver.email = formData.get('email')?.trim() || '';
            driver.address = formData.get('address')?.trim() || '';
            driver.vehicleId = formData.get('vehicleId') ? parseInt(formData.get('vehicleId')) : null;
            driver.isActive = formData.has('isActive');

            const validation = driver.validate();
            if (!validation.isValid) {
                this.hideLoading();
                this.showError('Errores de validación:\n' + validation.errors.join('\n'));
                return;
            }

            // Actualizar asignación de vehículos
            if (oldVehicleId !== driver.vehicleId) {
                // Liberar vehículo anterior
                if (oldVehicleId) {
                    const oldVehicle = Vehicle.getById(oldVehicleId);
                    if (oldVehicle) {
                        oldVehicle.driverId = null;
                        oldVehicle.save();
                    }
                }

                // Asignar nuevo vehículo
                if (driver.vehicleId) {
                    const newVehicle = Vehicle.getById(driver.vehicleId);
                    if (newVehicle) {
                        newVehicle.driverId = driver.id;
                        newVehicle.save();
                    }
                }
            }

            driver.save();

            // Crear credenciales si no existen para este conductor
            try {
                // Verificar si ya tiene credenciales en el sistema seguro
                let hasSecureCredentials = false;
                if (window.AuthService) {
                    const allDriverCredentials = AuthService.getAllDriverCredentials();
                    hasSecureCredentials = Object.values(allDriverCredentials).some(cred => cred.driverId === driver.id);
                }

                // Verificar sistema legacy también
                const existingUsers = User.getAll();
                const hasLegacyUser = existingUsers.some(user => user.driverId === driver.id);

                if (!hasSecureCredentials && !hasLegacyUser) {
                    if (window.AuthService) {
                        // Crear credenciales seguras
                        const credentials = await AuthService.createDriverCredentials({
                            name: driver.name,
                            idNumber: driver.idNumber,
                            driverId: driver.id
                        });

                        if (credentials.success) {
                            console.log(`✅ Credenciales seguras creadas para conductor actualizado: ${credentials.username}`);
                        }
                    } else {
                        // Fallback al sistema legacy
                        const username = this.generateDriverUsername(driver.name);
                        const password = driver.idNumber;

                        const userData = {
                            username: username,
                            password: password,
                            name: driver.name,
                            type: 'driver',
                            isActive: true,
                            driverId: driver.id
                        };

                        const user = new User(userData);
                        user.save();

                        console.log(`✅ Usuario legacy creado para conductor existente: ${username}`);
                    }
                }
            } catch (userError) {
                console.warn('⚠️ Error al verificar/crear credenciales:', userError.message);
            }

            this.hideLoading();
            this.showSuccess('Conductor actualizado exitosamente');
            
            form.closest('.modal').remove();
            this.loadDrivers();
            
            if (window.driverView) {
                window.driverView.render();
            }
            
        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al actualizar conductor');
        }
    }

    // Eliminar conductor
    async deleteDriver(driverId) {
        try {
            const driver = Driver.getById(driverId);
            if (!driver) {
                this.showError('Conductor no encontrado');
                return;
            }

            if (!confirm(`¿Está seguro de eliminar al conductor ${driver.name}?`)) {
                return;
            }

            this.showLoading('Eliminando conductor...');

            // Liberar vehículo asignado
            if (driver.vehicleId) {
                const vehicle = Vehicle.getById(driver.vehicleId);
                if (vehicle) {
                    vehicle.driverId = null;
                    vehicle.save();
                }
            }

            // Eliminar conductor
            driver.delete();

            this.hideLoading();
            this.showSuccess('Conductor eliminado exitosamente');
            
            this.loadDrivers();
            
            if (window.driverView) {
                window.driverView.render();
            }
            
        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al eliminar conductor');
        }
    }

    // Ver detalles del conductor
    viewDriverDetails(driverId) {
        try {
            const driver = Driver.getById(driverId);
            if (!driver) {
                this.showError('Conductor no encontrado');
                return;
            }

            const vehicle = driver.vehicleId ? Vehicle.getById(driver.vehicleId) : null;
            const expenses = Expense.getByDriverId(driverId);
            const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

            const modal = this.createModal(`Detalles de ${driver.name}`, `
                <div class="driver-details">
                    <div class="details-section">
                        <h4>📋 Información Personal</h4>
                        <p><strong>Nombre:</strong> ${driver.name}</p>
                        <p><strong>Cédula:</strong> ${driver.idNumber}</p>
                        <p><strong>Teléfono:</strong> ${driver.phone || 'No registrado'}</p>
                        <p><strong>Email:</strong> ${driver.email || 'No registrado'}</p>
                        <p><strong>Dirección:</strong> ${driver.address || 'No registrada'}</p>
                        <p><strong>Estado:</strong> <span class="status ${driver.isActive ? 'active' : 'inactive'}">${driver.isActive ? 'Activo' : 'Inactivo'}</span></p>
                    </div>

                    <div class="details-section">
                        <h4>🚗 Licencia de Conducir</h4>
                        <p><strong>Número:</strong> ${driver.licenseNumber}</p>
                        <p><strong>Categoría:</strong> ${driver.licenseCategory}</p>
                        <p><strong>Vencimiento:</strong> ${this.formatDate(driver.licenseExpiry)}</p>
                        <p><strong>Estado:</strong> ${driver.isLicenseValid() ? '✅ Vigente' : '❌ Vencida'}</p>
                    </div>

                    ${vehicle ? `
                        <div class="details-section">
                            <h4>🚛 Vehículo Asignado</h4>
                            <p><strong>Placa:</strong> ${vehicle.plate}</p>
                            <p><strong>Marca:</strong> ${vehicle.brand} ${vehicle.model}</p>
                            <p><strong>Año:</strong> ${vehicle.year}</p>
                        </div>
                    ` : `
                        <div class="details-section">
                            <h4>🚛 Vehículo Asignado</h4>
                            <p>Sin vehículo asignado</p>
                        </div>
                    `}

                    <div class="details-section">
                        <h4>💰 Resumen de Gastos</h4>
                        <p><strong>Total de gastos:</strong> ${this.formatCurrency(totalExpenses)}</p>
                        <p><strong>Número de gastos:</strong> ${expenses.length}</p>
                    </div>

                    <div class="details-section">
                        <h4>📅 Fechas</h4>
                        <p><strong>Registrado:</strong> ${this.formatDate(driver.createdAt)}</p>
                        <p><strong>Última actualización:</strong> ${this.formatDate(driver.updatedAt)}</p>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cerrar</button>
                    <button type="button" class="btn btn-primary" data-action="edit-driver" data-driver-id="${driverId}" onclick="this.closest('.modal').remove()">Editar</button>
                </div>
            `);

            document.body.appendChild(modal);
            
        } catch (error) {
            this.handleError(error, 'Error al mostrar detalles del conductor');
        }
    }

    // Obtener estadísticas de conductores
    getDriverStats() {
        try {
            const drivers = Driver.getAll();
            const activeDrivers = drivers.filter(d => d.isActive);
            const inactiveDrivers = drivers.filter(d => !d.isActive);
            const driversWithVehicles = drivers.filter(d => d.vehicleId);
            const driversWithoutVehicles = drivers.filter(d => !d.vehicleId);
            const expiredLicenses = drivers.filter(d => !d.isLicenseValid());

            return {
                total: drivers.length,
                active: activeDrivers.length,
                inactive: inactiveDrivers.length,
                withVehicles: driversWithVehicles.length,
                withoutVehicles: driversWithoutVehicles.length,
                expiredLicenses: expiredLicenses.length
            };
        } catch (error) {
            console.error('Error al obtener estadísticas de conductores:', error);
            return {
                total: 0,
                active: 0,
                inactive: 0,
                withVehicles: 0,
                withoutVehicles: 0,
                expiredLicenses: 0
            };
        }
    }

    // Exportar conductores
    exportDrivers() {
        try {
            const drivers = Driver.getAll();
            const data = drivers.map(driver => {
                const vehicle = driver.vehicleId ? Vehicle.getById(driver.vehicleId) : null;
                return {
                    id: driver.id,
                    nombre: driver.name,
                    cedula: driver.idNumber,
                    licencia: driver.licenseNumber,
                    categoria: driver.licenseCategory,
                    vencimientoLicencia: driver.licenseExpiry,
                    telefono: driver.phone,
                    email: driver.email,
                    direccion: driver.address,
                    vehiculoAsignado: vehicle ? `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}` : 'Sin asignar',
                    activo: driver.isActive ? 'Sí' : 'No',
                    fechaRegistro: driver.createdAt
                };
            });

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conductores_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showSuccess('Conductores exportados exitosamente');
        } catch (error) {
            this.handleError(error, 'Error al exportar conductores');
        }
    }
}