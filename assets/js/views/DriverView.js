/**
 * Vista de Conductores - Gestión de la interfaz de conductores (solo para administradores)
 */
class DriverView extends BaseView {
    constructor(containerId = 'drivers') {
        super(containerId);
        this.isEditing = false;
        this.editingId = null;
        this.isSaving = false; // Flag para evitar guardados múltiples
        this.hasBeenRendered = false; // Flag para tracking de renderizado
        this.eventsSetup = false; // Flag para evitar event listeners duplicados
        this.initialize();
    }

    render() {
        const container = this.getContainer();
        if (!container) return '';
        
        console.log('👥 [DriverView.render] Iniciando renderizado...');
        
        // Verificar si ya ha sido renderizado anteriormente
        if (!this.hasBeenRendered) {
            console.log('👥 [DriverView.render] Generando contenido inicial...');
            const content = this.generateContent();
            container.innerHTML = content;
            this.bindEvents(); // Usar bindEvents en lugar de setupEventListeners
            this.hasBeenRendered = true; // Marcar como renderizado
        } else {
            console.log('👥 [DriverView.render] Contenido HTML ya existe, solo actualizando datos...');
            // Asegurar que los eventos están configurados (importante para contenido dinámico)
            this.bindEvents(); // Usar bindEvents en lugar de setupEventListeners
            // Si por alguna razón el contenedor está vacío pero ya había sido renderizado,
            // re-renderizar para evitar pantalla en blanco
            if (container.innerHTML.length === 0) {
                console.log('👥 [DriverView.render] Contenedor vacío detectado, re-renderizando...');
                const content = this.generateContent();
                container.innerHTML = content;
                this.bindEvents(); // Usar bindEvents en lugar de setupEventListeners
            }
        }
        
        // Siempre cargar/actualizar los datos de conductores
        this.loadDrivers();
        
        console.log('👥 [DriverView.render] Renderizado completado');
        return container.innerHTML;
    }

    generateContent() {
        return `
            <h2>👥 Gestión de Conductores</h2>

            <!-- Botón para desplegar formulario de conductores -->
            <div class="driver-form-container">
                <div class="driver-form-toggle">
                    <button type="button" id="toggleDriverForm" class="btn btn-primary" style="
                        background: linear-gradient(145deg, #007bff, #0056b3);
                        border: none;
                        padding: 15px 30px;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
                        transition: all 0.3s ease;
                        width: 100%;
                        margin-bottom: 20px;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0, 123, 255, 0.4)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 123, 255, 0.3)'">
                        <span id="toggleDriverFormIcon">👤</span>
                        <span id="toggleDriverFormText">Registrar Nuevo Conductor</span>
                    </button>
                </div>

                <!-- Formulario de conductores (inicialmente oculto) -->
                <div class="card driver-form" id="driverFormCard" style="display: none; margin-top: 0;">
                    <div class="form-header" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid #e9ecef;
                    ">
                        <h3 id="driverFormTitle" style="margin: 0; color: #007bff;">Registrar Nuevo Conductor</h3>
                        <button type="button" id="closeDriverForm" class="btn btn-close" style="
                            background: none;
                            border: none;
                            font-size: 20px;
                            color: #6c757d;
                            cursor: pointer;
                            padding: 5px 10px;
                            border-radius: 50%;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.background='#f8f9fa'; this.style.color='#dc3545'"
                           onmouseout="this.style.background='none'; this.style.color='#6c757d'"
                           title="Cerrar formulario">✕</button>
                    </div>
                <form id="driverForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="driverName">Nombre completo:</label>
                            <input type="text" id="driverName" name="name" required 
                                   placeholder="Nombre completo del conductor"
                                   autocomplete="name">
                        </div>
                        <div class="form-group">
                            <label for="driverLicense">Número de cédula:</label>
                            <input type="text" id="driverLicense" name="license" required 
                                   placeholder="Número de cédula de ciudadanía"
                                   autocomplete="off">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="driverPhone">Teléfono:</label>
                            <input type="tel" id="driverPhone" name="phone" required
                                   placeholder="Número de teléfono"
                                   autocomplete="tel">
                        </div>
                        <div class="form-group">
                            <label for="driverEmail">Email:</label>
                            <input type="email" id="driverEmail" name="email"
                                   placeholder="correo@ejemplo.com"
                                   autocomplete="email">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="driverLicenseExpiry">Vencimiento de licencia:</label>
                            <input type="date" id="driverLicenseExpiry" name="licenseExpiry"
                                   title="Fecha de vencimiento de la licencia de conducción">
                            <small style="color: #666;">📋 Número de licencia: misma cédula. Actualice este campo para conductores existentes.</small>
                        </div>
                        <div class="form-group">
                            <label for="driverStatus">Estado:</label>
                            <select id="driverStatus" name="status" required>
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                                <option value="suspended">Suspendido</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="driverVehicle">Vehículo asignado:</label>
                            <select id="driverVehicle" name="vehicleId">
                                <option value="">Sin vehículo asignado</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <!-- Espacio vacío para mantener layout -->
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="driverUsername">Usuario:</label>
                            <input type="text" id="driverUsername" name="username" 
                                   placeholder="conductor + nombre (ej: conductorjuan)" readonly
                                   autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label for="driverPassword">Contraseña:</label>
                            <input type="password" id="driverPassword" name="password" 
                                   placeholder="Número de cédula" readonly
                                   autocomplete="new-password">
                            <small style="color: #666;">Usuario: "conductor" + nombre, Contraseña: número de cédula</small>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="driverAddress">Dirección:</label>
                        <textarea id="driverAddress" name="address" rows="2" 
                                placeholder="Dirección de residencia"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="driverNotes">Notas:</label>
                        <textarea id="driverNotes" name="notes" rows="3" 
                                placeholder="Observaciones adicionales sobre el conductor"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn">
                            <span id="submitButtonText">💾 Guardar Conductor</span>
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="driverView.cancelEdit()" id="driverCancelButton" style="display: none;">
                            ❌ Cancelar
                        </button>
                    </div>
                </form>
                </div>
            </div>

            <!-- Herramientas de gestión -->
            <div class="driver-tools-container">
                <div class="driver-tools-toggle">
                    <button type="button" id="toggleDriverTools" class="btn btn-secondary" style="
                        background: linear-gradient(145deg, #6c757d, #5a6268);
                        border: none;
                        padding: 12px 25px;
                        border-radius: 12px;
                        font-size: 15px;
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
                        transition: all 0.3s ease;
                        width: 100%;
                        margin-bottom: 20px;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(108, 117, 125, 0.4)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(108, 117, 125, 0.3)'">
                        <span id="toggleDriverToolsIcon">🔧</span>
                        <span id="toggleDriverToolsText">Herramientas de Gestión</span>
                    </button>
                </div>

                <div class="card driver-tools-card" id="driverToolsCard" style="display: none; margin-top: 0;">
                    <div class="form-header" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid #e9ecef;
                    ">
                        <h3 style="margin: 0; color: #6c757d;">🔧 Herramientas de Gestión</h3>
                        <button type="button" id="closeDriverTools" class="btn btn-close" style="
                            background: none;
                            border: none;
                            font-size: 20px;
                            color: #6c757d;
                            cursor: pointer;
                            padding: 5px 10px;
                            border-radius: 50%;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.background='#f8f9fa'; this.style.color='#dc3545'"
                           onmouseout="this.style.background='none'; this.style.color='#6c757d'"
                           title="Cerrar herramientas">✕</button>
                    </div>
                    <div class="tools-container">
                    <div class="form-group">
                        <label for="driverSearch">Buscar conductores:</label>
                        <input type="text" id="driverSearch" placeholder="Buscar por nombre, licencia o teléfono..." 
                               onkeyup="driverView.handleSearch(this.value)"
                               autocomplete="off">
                    </div>
                    <div class="form-actions">
                        <button class="btn" onclick="driverView.showStats()">
                            📊 Ver Estadísticas
                        </button>
                        <button class="btn" onclick="driverView.exportDrivers()">
                            📤 Exportar
                        </button>
                        <button class="btn" onclick="driverView.showVehicleAssignments()">
                            🚚 Asignaciones
                        </button>
                        <label class="btn" for="importDriversFile">
                            📥 Importar
                        </label>
                        <input type="file" id="importDriversFile" accept=".json" style="display: none;" 
                               onchange="driverView.handleImport(this.files[0])">
                    </div>
                    </div>
                </div>
            </div>

            <!-- Lista de conductores -->
            <div class="card">
                <h3>📋 Lista de Conductores</h3>
                <div id="driversList">
                    <p>Cargando conductores...</p>
                </div>
            </div>
        `;
    }

    bindEvents() {
        super.bindEvents();
        
        // Solo configurar event listeners si no se han configurado antes
        if (this.eventsSetup) {
            console.log('👥 [DriverView.bindEvents] Event listeners ya configurados, saltando...');
            return;
        }
        
        console.log('👥 [DriverView.bindEvents] Configurando event listeners...');
        
        const container = this.getContainer();
        if (!container) {
            console.warn('👥 [DriverView.bindEvents] Container no encontrado');
            return;
        }
        
        // Configurar event listeners usando el método delegate de BaseView
        // El método delegate ya maneja múltiples listeners automáticamente
        this.delegate('submit', '#driverForm', this.handleFormSubmit.bind(this));
        this.delegate('input', '#driverLicense', this.handleLicenseInput.bind(this));
        this.delegate('keyup', '#driverSearch', this.handleSearchKeyup.bind(this));
        
        // Eventos de la lista
        this.delegate('click', '.edit-driver-btn', this.handleEditClick.bind(this));
        this.delegate('click', '.delete-driver-btn', this.handleDeleteClick.bind(this));
        this.delegate('click', '.view-driver-btn', this.handleViewClick.bind(this));
        this.delegate('click', '.assign-vehicle-btn', this.handleAssignVehicleClick.bind(this));
        this.delegate('click', '.remove-vehicle-btn', this.handleRemoveVehicleClick.bind(this));

        // Eventos del formulario colapsable
        this.delegate('click', '#toggleDriverForm', this.handleToggleDriverFormClick.bind(this));
        this.delegate('click', '#closeDriverForm', this.handleCloseDriverFormClick.bind(this));

        // Eventos de las herramientas colapsables
        this.delegate('click', '#toggleDriverTools', this.handleToggleDriverToolsClick.bind(this));
        this.delegate('click', '#closeDriverTools', this.handleCloseDriverToolsClick.bind(this));

        this.eventsSetup = true;
        console.log('✅ [DriverView.bindEvents] Event listeners configurados correctamente');
    }

    afterRender() {
        super.afterRender();
        this.loadDrivers();
        this.updateVehicleSelector();
    }

    handleFormSubmit(e, form) {
        e.preventDefault();
        console.log('👥 [DriverView.handleFormSubmit] Formulario enviado');
        
        // Evitar guardados múltiples (similar a VehicleView)
        if (this.isSaving) {
            console.log('⚠️ [DriverView.handleFormSubmit] Guardado en progreso, ignorando...');
            return;
        }
        
        this.isSaving = true;
        
        try {
            const formData = new FormData(form);
            
            // Debug: mostrar todos los valores del FormData
            console.log('👥 [DriverView.handleFormSubmit] Valores en FormData:');
            for (let [key, value] of formData.entries()) {
                console.log(`  ${key}: "${value}"`);
            }
            
            // Debug: verificar específicamente el campo status
            const statusValue = formData.get('status');
            console.log('👥 [DriverView.handleFormSubmit] Status específico:', statusValue, typeof statusValue);
            
            const driverData = {
                name: formData.get('name'),
                idNumber: formData.get('license'), // Mapear license -> idNumber para el modelo
                phone: formData.get('phone'),
                email: formData.get('email') || null,
                licenseExpiry: formData.get('licenseExpiry'), // Fecha de vencimiento de licencia
                vehicleId: formData.get('vehicleId') ? parseInt(formData.get('vehicleId')) : null,
                status: formData.get('status'),
                address: formData.get('address') || null,
                notes: formData.get('notes') || null
            };

            console.log('👥 [DriverView.handleFormSubmit] Datos del formulario:', driverData);

            if (this.isEditing) {
                // Para edición, NO incluir credenciales (se mantienen las existentes)
                console.log('👥 [DriverView.handleFormSubmit] Modo edición, actualizando conductor ID:', this.editingId);
                this.updateDriver(this.editingId, driverData);
            } else {
                console.log('👥 [DriverView.handleFormSubmit] Modo creación, creando nuevo conductor');
                this.createDriver(driverData);
            }
        } catch (error) {
            console.error('❌ [DriverView.handleFormSubmit] Error al procesar formulario:', error);
            this.showError('Error al procesar los datos del formulario');
            this.isSaving = false; // Liberar flag en caso de error
        }
    }

    handleLicenseInput(e, input) {
        // Formatear número de cédula (solo números)
        input.value = input.value.replace(/[^0-9]/g, '');
    }

    handleSearchKeyup(e, input) {
        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch(input.value);
        }, 300);
    }

    handleEditClick(e, button) {
        const driverId = button.dataset.driverId;
        this.editDriver(parseInt(driverId));
    }

    handleDeleteClick(e, button) {
        const driverId = button.dataset.driverId;
        this.deleteDriver(parseInt(driverId));
    }

    handleViewClick(e, button) {
        const driverId = button.dataset.driverId;
        this.viewDriverDetails(parseInt(driverId));
    }

    handleAssignVehicleClick(e, button) {
        const driverId = button.dataset.driverId;
        this.assignVehicleToDriver(parseInt(driverId));
    }

    handleRemoveVehicleClick(e, button) {
        const driverId = button.dataset.driverId;
        this.removeVehicleFromDriver(parseInt(driverId));
    }

    handleToggleDriverFormClick(e, button) {
        console.log('👤 [handleToggleDriverFormClick] Alternando formulario de conductores...');
        this.toggleDriverForm();
    }

    handleCloseDriverFormClick(e, button) {
        console.log('❌ [handleCloseDriverFormClick] Cerrando formulario de conductores...');
        this.closeDriverForm();
    }

    handleToggleDriverToolsClick(e, button) {
        console.log('🔧 [handleToggleDriverToolsClick] Alternando herramientas de gestión...');
        this.toggleDriverTools();
    }

    handleCloseDriverToolsClick(e, button) {
        console.log('❌ [handleCloseDriverToolsClick] Cerrando herramientas de gestión...');
        this.closeDriverTools();
    }

    handleSearch(query) {
        this.performSearch(query);
    }

    handleImport(file) {
        if (!file) return;
        this.importDrivers(file);
    }

    async loadDrivers() {
        try {
            this.showLoading('Cargando conductores...');
            
            const drivers = Driver.getAll();
            this.updateDriversList(drivers);
            
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError('Error al cargar conductores');
        }
    }

    updateVehicleSelector() {
        const selector = document.getElementById('driverVehicle');
        if (!selector) return;

        const vehicles = Vehicle.getAll();
        const drivers = Driver.getAll();
        const currentValue = selector.value;
        
        // Obtener vehículos ya asignados (excluyendo el actual si estamos editando)
        const assignedVehicles = drivers
            .filter(d => d.vehicleId && (!this.isEditing || d.id !== this.editingId))
            .map(d => d.vehicleId);
        
        selector.innerHTML = '<option value="">Sin vehículo asignado</option>' +
            vehicles
                .filter(vehicle => !assignedVehicles.includes(vehicle.id))
                .map(vehicle => 
                    `<option value="${vehicle.id}">${vehicle.plate} - ${vehicle.brand} ${vehicle.model}</option>`
                ).join('');
        
        // Restaurar valor seleccionado si aún está disponible
        if (currentValue && !assignedVehicles.includes(parseInt(currentValue))) {
            selector.value = currentValue;
        }
    }

    async createDriver(driverData) {
        try {
            // Generar credenciales automáticamente antes de validar
            const credentials = this.generateCredentialsForDriver(driverData.name, driverData.idNumber);
            driverData.username = credentials.username;
            driverData.password = credentials.password;

            this.showLoading('Guardando conductor...');
            
            // Verificar si la cédula ya existe
            const existingDriverByLicense = Driver.getAll().find(d => 
                d.idNumber === driverData.idNumber
            );
            
            if (existingDriverByLicense) {
                this.hideLoading();
                this.showError('Ya existe un conductor con esa cédula');
                return;
            }

            // Verificar si el usuario ya existe
            const existingDriverByUsername = Driver.getAll().find(d => 
                d.username === driverData.username
            );
            
            if (existingDriverByUsername) {
                this.hideLoading();
                this.showError('Ya existe un conductor con ese nombre de usuario');
                return;
            }

            const driver = Driver.save(driverData);

            // Crear credenciales seguras para el conductor usando AuthService
            try {
                if (window.AuthService) {
                    console.log(`🔧 [DEBUG] Creando credenciales seguras con AuthService:`, {
                        name: driverData.name,
                        idNumber: driverData.idNumber,
                        driverId: driver.id
                    });

                    const authCredentials = await AuthService.createDriverCredentials({
                        name: driverData.name,
                        idNumber: driverData.idNumber,
                        driverId: driver.id
                    });

                    if (authCredentials.success) {
                        console.log(`✅ Credenciales seguras creadas y sincronizadas con S3: ${authCredentials.username}`);
                    } else {
                        throw new Error('AuthService no pudo crear credenciales');
                    }
                } else {
                    // Fallback al sistema legacy (solo si AuthService no está disponible)
                    console.warn('⚠️ AuthService no disponible, usando sistema legacy');

                    const userData = {
                        username: credentials.username,
                        password: credentials.password,
                        name: driverData.name,
                        type: 'driver',
                        isActive: true,
                        driverId: driver.id
                    };

                    const user = new User(userData);
                    user.save();
                    console.log(`✅ Usuario legacy creado para conductor: ${credentials.username}`);
                }
            } catch (userError) {
                console.error('❌ Error al crear credenciales para conductor:', userError);
                console.error('❌ Stack trace:', userError.stack);
                this.showWarning(`Conductor creado, pero error al crear credenciales: ${userError.message}`);
            }

            this.showSuccess('Conductor registrado exitosamente');
            
            // Mostrar credenciales del conductor
            this.showDriverCredentials(driver);
            
            this.resetForm();
            this.loadDrivers();
            this.updateVehicleSelector();

            // Cerrar formulario automáticamente después de guardar exitosamente
            setTimeout(() => {
                this.closeDriverForm();
            }, 1000); // Pequeña demora para que el usuario vea el mensaje de éxito

            this.hideLoading();
            this.isSaving = false; // Liberar flag de guardado
        } catch (error) {
            this.hideLoading();
            this.isSaving = false; // Liberar flag también en caso de error
            console.error('❌ [DriverView.createDriver] Error completo:', error);
            console.error('❌ [DriverView.createDriver] Stack trace:', error.stack);
            this.showError(`Error al guardar conductor: ${error.message}`);
        }
    }

    async updateDriver(driverId, driverData) {
        try {
            this.showLoading('Actualizando conductor...');
            
            // Obtener datos actuales del conductor para preservar credenciales
            const currentDriver = Driver.getById(driverId);
            if (!currentDriver) {
                this.hideLoading();
                this.showError('Conductor no encontrado');
                this.isSaving = false; // Liberar flag
                return;
            }
            
            // Verificar si la cédula ya existe en otro conductor
            const existingDriverByLicense = Driver.getAll().find(d => 
                d.id !== driverId && d.idNumber === driverData.idNumber
            );
            
            if (existingDriverByLicense) {
                this.hideLoading();
                this.showError('Ya existe otro conductor con esa cédula');
                this.isSaving = false; // Liberar flag
                return;
            }

            // Preservar credenciales existentes
            driverData.id = driverId;
            driverData.username = currentDriver.username;
            driverData.password = currentDriver.password;
            driverData.createdAt = currentDriver.createdAt; // Preservar fecha de creación
            
            Driver.save(driverData);

            // Solo crear usuario de login si no existe uno para este conductor
            try {
                const existingUsers = User.getAll();
                const hasUser = existingUsers.some(user => user.driverId === driverId);
                
                if (!hasUser) {
                    // Solo crear si el conductor tiene credenciales definidas
                    if (currentDriver.username && currentDriver.password) {
                        const userData = {
                            username: currentDriver.username,
                            password: currentDriver.password,
                            name: driverData.name,
                            type: 'driver',
                            isActive: true,
                            driverId: driverId
                        };

                        const user = new User(userData);
                        user.save();
                        
                        console.log(`✅ Usuario de login creado para conductor existente: ${currentDriver.username}`);
                    }
                }
            } catch (userError) {
                console.warn('⚠️ Error al verificar/crear usuario:', userError.message);
            }

            this.showSuccess('Conductor actualizado exitosamente');
            this.cancelEdit();
            this.loadDrivers();
            this.updateVehicleSelector();

            // Cerrar formulario automáticamente después de actualizar exitosamente
            setTimeout(() => {
                this.closeDriverForm();
            }, 1000); // Pequeña demora para que el usuario vea el mensaje de éxito

            this.hideLoading();
            this.isSaving = false; // Liberar flag al final
        } catch (error) {
            this.hideLoading();
            this.isSaving = false; // Liberar flag también en caso de error
            console.error('❌ [DriverView.updateDriver] Error completo:', error);
            this.showError('Error al actualizar conductor');
        }
    }

    editDriver(driverId) {
        const driver = Driver.getById(driverId);
        if (!driver) {
            this.showError('Conductor no encontrado');
            return;
        }

        console.log('👥 [DriverView.editDriver] Datos del conductor a editar:', driver);
        console.log('👥 [DriverView.editDriver] Dirección del conductor:', driver.address);

        // Llenar formulario (sin incluir credenciales)
        document.getElementById('driverName').value = driver.name || '';
        document.getElementById('driverLicense').value = driver.idNumber || '';
        document.getElementById('driverPhone').value = driver.phone || '';
        document.getElementById('driverEmail').value = driver.email || '';
        document.getElementById('driverLicenseExpiry').value = driver.licenseExpiry || '';
        document.getElementById('driverVehicle').value = driver.vehicleId || '';
        document.getElementById('driverStatus').value = driver.status || 'active';
        document.getElementById('driverAddress').value = driver.address || '';
        document.getElementById('driverNotes').value = driver.notes || '';
        
        console.log('👥 [DriverView.editDriver] Campo dirección llenado con:', driver.address || 'vacío');

        // Mantener credenciales como solo lectura y mostrar valores actuales
        document.getElementById('driverUsername').value = driver.username || '';
        document.getElementById('driverPassword').value = '••••••••'; // Mostrar asteriscos por seguridad

        // Cambiar a modo edición
        this.isEditing = true;
        this.editingId = driverId;

        // Abrir formulario para editar
        const formCard = document.getElementById('driverFormCard');
        const toggleButton = document.getElementById('toggleDriverForm');
        const toggleIcon = document.getElementById('toggleDriverFormIcon');
        const toggleText = document.getElementById('toggleDriverFormText');

        if (formCard && formCard.style.display === 'none') {
            this.openDriverFormWithAnimation(formCard, toggleButton, toggleIcon, toggleText);
        }

        // Actualizar UI
        document.getElementById('driverFormTitle').textContent = 'Editar Conductor';
        document.getElementById('submitButtonText').textContent = '✏️ Actualizar Conductor';
        document.getElementById('driverCancelButton').style.display = 'inline-block';

        // Mantener campos de credenciales como readonly (no editables)
        document.getElementById('driverUsername').readonly = true;
        document.getElementById('driverPassword').readonly = true;
        
        // Agregar texto informativo sobre credenciales
        const credentialsInfo = document.createElement('small');
        credentialsInfo.id = 'credentialsEditInfo';
        credentialsInfo.style.cssText = 'color: #666; display: block; margin-top: 5px;';
        credentialsInfo.textContent = 'Las credenciales se mantienen sin cambios durante la edición';
        
        const passwordField = document.getElementById('driverPassword');
        if (!document.getElementById('credentialsEditInfo') && passwordField.parentNode) {
            passwordField.parentNode.appendChild(credentialsInfo);
        }

        // Actualizar selector de vehículos para incluir el vehículo actual
        this.updateVehicleSelector();

        // Scroll al formulario
        this.scrollToElement('#driverForm');
    }

    cancelEdit() {
        this.isEditing = false;
        this.editingId = null;
        
        // Resetear formulario y UI
        this.resetForm();
        document.getElementById('driverFormTitle').textContent = 'Registrar Nuevo Conductor';
        document.getElementById('submitButtonText').textContent = '💾 Guardar Conductor';
        document.getElementById('driverCancelButton').style.display = 'none';

        // Restaurar campos de credenciales a readonly
        document.getElementById('driverUsername').readonly = true;
        document.getElementById('driverPassword').readonly = true;
        document.getElementById('driverUsername').placeholder = 'conductor + nombre (ej: conductorjuan)';
        document.getElementById('driverPassword').placeholder = 'Número de cédula';
        
        // Remover texto informativo de credenciales si existe
        const credentialsInfo = document.getElementById('credentialsEditInfo');
        if (credentialsInfo) {
            credentialsInfo.remove();
        }
        
        // Actualizar selector de vehículos
        this.updateVehicleSelector();

        // Cerrar formulario al cancelar edición
        this.closeDriverForm();
    }

    deleteDriver(driverId) {
        const driver = Driver.getById(driverId);
        if (!driver) {
            this.showError('Conductor no encontrado');
            return;
        }

        // Verificar si tiene gastos registrados
        const driverExpenses = Expense.getByDriverId(driverId);
        if (driverExpenses.length > 0) {
            this.showError(`No se puede eliminar el conductor. Tiene ${driverExpenses.length} gastos registrados`);
            return;
        }

        this.showConfirmDialog(
            `¿Está seguro de eliminar al conductor ${driver.name}?`,
            () => this.confirmDeleteDriver(driverId)
        );
    }

    async confirmDeleteDriver(driverId) {
        try {
            this.showLoading('Eliminando conductor...');
            
            Driver.delete(driverId);
            this.showSuccess('Conductor eliminado exitosamente');
            this.loadDrivers();
            this.updateVehicleSelector();
            
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError('Error al eliminar conductor');
        }
    }

    viewDriverDetails(driverId) {
        const driver = Driver.getById(driverId);
        if (!driver) {
            this.showError('Conductor no encontrado');
            return;
        }

        const vehicle = driver.vehicleId ? Vehicle.getById(driver.vehicleId) : null;
        const expenses = Expense.getByDriverId(driverId);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        const detailsHTML = `
            <div class="driver-details">
                <h3>👤 ${driver.name}</h3>
                
                <div class="details-grid">
                    <div class="detail-item">
                        <strong>Cédula:</strong>
                        <span>${driver.idNumber}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Teléfono:</strong>
                        <span>${driver.phone}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Email:</strong>
                        <span>${driver.email || 'No registrado'}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Vencimiento licencia:</strong>
                        <span style="${this.isLicenseExpired(driver.licenseExpiry) ? 'color: #dc3545; font-weight: bold;' : (driver.isLicenseExpiringSoon && driver.isLicenseExpiringSoon() ? 'color: #ffc107; font-weight: bold;' : '')}">${driver.licenseExpiry ? this.formatDate(driver.licenseExpiry) : 'No registrado'} ${this.isLicenseExpired(driver.licenseExpiry) ? '⚠️ VENCIDA' : (driver.isLicenseExpiringSoon && driver.isLicenseExpiringSoon() ? '⚠️ POR VENCER (< 30 días)' : '')}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Estado:</strong>
                        <span class="status-${driver.status}">${this.getStatusName(driver.status)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Usuario:</strong>
                        <span>${driver.username || 'No asignado'}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Contraseña:</strong>
                        <span>****</span>
                    </div>
                    <div class="detail-item">
                        <strong>Vehículo asignado:</strong>
                        <span>${vehicle ? `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}` : 'Sin asignar'}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Total en gastos:</strong>
                        <span>${this.formatCurrency(totalExpenses)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Número de gastos:</strong>
                        <span>${expenses.length}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Fecha de registro:</strong>
                        <span>${this.formatDate(driver.createdAt)}</span>
                    </div>
                </div>

                ${driver.address ? `
                    <div class="detail-section">
                        <strong>Dirección:</strong>
                        <p>${driver.address}</p>
                    </div>
                ` : ''}

                ${driver.notes ? `
                    <div class="detail-section">
                        <strong>Notas:</strong>
                        <p>${driver.notes}</p>
                    </div>
                ` : ''}

                <div class="detail-actions">
                    <button class="btn" onclick="driverView.editDriver(${driver.id}); document.querySelector('.modal').remove();">
                        ✏️ Editar
                    </button>
                    <button class="btn" onclick="driverView.showDriverExpenses(${driver.id})">
                        💰 Ver Gastos
                    </button>
                </div>
            </div>
        `;

        this.showModal(`Detalles del Conductor`, detailsHTML);
    }

    assignVehicleToDriver(driverId) {
        const driver = Driver.getById(driverId);
        if (!driver) {
            this.showError('Conductor no encontrado');
            return;
        }

        // Verificar si ya tiene vehículo asignado
        if (driver.vehicleId) {
            this.showWarning('Este conductor ya tiene un vehículo asignado. Use "Quitar Vehículo" primero.');
            return;
        }

        // Obtener solo vehículos disponibles (sin conductor asignado)
        const allVehicles = Vehicle.getAll();
        const allDrivers = Driver.getAll();
        const assignedVehicleIds = allDrivers
            .filter(d => d.vehicleId && d.id !== driverId)
            .map(d => d.vehicleId);

        const availableVehicles = allVehicles.filter(v => !assignedVehicleIds.includes(v.id));

        if (availableVehicles.length === 0) {
            this.showWarning('No hay vehículos disponibles para asignar. Todos los vehículos están asignados a otros conductores.');
            return;
        }

        // Mostrar modal con vehículos disponibles
        const vehiclesOptionsHTML = availableVehicles.map(vehicle => `
            <div class="vehicle-option" style="
                padding: 15px;
                margin: 10px 0;
                border: 2px solid #e9ecef;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            " onmouseover="this.style.borderColor='#007bff'; this.style.backgroundColor='#f8f9fa'"
               onmouseout="this.style.borderColor='#e9ecef'; this.style.backgroundColor='white'"
               onclick="driverView.confirmVehicleAssignment(${driverId}, ${vehicle.id})">
                <strong style="font-size: 18px;">🚗 ${vehicle.plate}</strong>
                <p style="margin: 5px 0; color: #666;">${vehicle.brand} ${vehicle.model} (${vehicle.year})</p>
            </div>
        `).join('');

        const modalHTML = `
            <div class="assign-vehicle-modal">
                <h4 style="margin-bottom: 20px;">Seleccione un vehículo para asignar a ${driver.name}:</h4>
                <div class="available-vehicles-list">
                    ${vehiclesOptionsHTML}
                </div>
                <p style="margin-top: 20px; color: #666; text-align: center;">
                    <small>Haga clic en un vehículo para asignarlo</small>
                </p>
            </div>
        `;

        this.showModal('Asignar Vehículo', modalHTML);
    }

    confirmVehicleAssignment(driverId, vehicleId) {
        const driver = Driver.getById(driverId);
        const vehicle = Vehicle.getById(vehicleId);

        if (!driver || !vehicle) {
            this.showError('Conductor o vehículo no encontrado');
            return;
        }

        this.showConfirmDialog(
            `¿Está seguro de asignar el vehículo ${vehicle.plate} (${vehicle.brand} ${vehicle.model}) al conductor ${driver.name}?`,
            () => this.executeVehicleAssignment(driverId, vehicleId)
        );
    }

    async executeVehicleAssignment(driverId, vehicleId) {
        try {
            this.showLoading('Asignando vehículo...');

            const driver = Driver.getById(driverId);
            if (!driver) {
                this.hideLoading();
                this.showError('Conductor no encontrado');
                return;
            }

            // Actualizar solo el campo vehicleId, preservando todos los demás datos
            const updatedDriverData = {
                id: driver.id,
                name: driver.name,
                idNumber: driver.idNumber,
                phone: driver.phone,
                email: driver.email,
                vehicleId: vehicleId, // Solo este campo cambia
                status: driver.status,
                address: driver.address,
                notes: driver.notes,
                username: driver.username,
                password: driver.password,
                createdAt: driver.createdAt,
                updatedAt: new Date().toISOString()
            };

            Driver.save(updatedDriverData);

            this.showSuccess('Vehículo asignado exitosamente');
            this.loadDrivers();
            this.updateVehicleSelector();

            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            console.error('❌ Error al asignar vehículo:', error);
            this.showError(`Error al asignar vehículo: ${error.message}`);
        }
    }

    removeVehicleFromDriver(driverId) {
        const driver = Driver.getById(driverId);
        if (!driver) {
            this.showError('Conductor no encontrado');
            return;
        }

        if (!driver.vehicleId) {
            this.showInfo('Este conductor no tiene vehículo asignado');
            return;
        }

        const vehicle = Vehicle.getById(driver.vehicleId);
        const vehicleInfo = vehicle ? `${vehicle.plate} (${vehicle.brand} ${vehicle.model})` : 'el vehículo';

        this.showConfirmDialog(
            `¿Está seguro de quitar ${vehicleInfo} del conductor ${driver.name}?`,
            () => this.confirmRemoveVehicle(driverId)
        );
    }

    async confirmRemoveVehicle(driverId) {
        try {
            this.showLoading('Quitando vehículo...');

            const driver = Driver.getById(driverId);
            if (!driver) {
                this.hideLoading();
                this.showError('Conductor no encontrado');
                return;
            }

            // Actualizar solo el campo vehicleId a null, preservando todos los demás datos
            const updatedDriverData = {
                id: driver.id,
                name: driver.name,
                idNumber: driver.idNumber,
                phone: driver.phone,
                email: driver.email,
                vehicleId: null, // Solo este campo cambia
                status: driver.status,
                address: driver.address,
                notes: driver.notes,
                username: driver.username,
                password: driver.password,
                createdAt: driver.createdAt,
                updatedAt: new Date().toISOString()
            };

            Driver.save(updatedDriverData);

            this.showSuccess('Vehículo quitado exitosamente');
            this.loadDrivers();
            this.updateVehicleSelector();

            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            console.error('❌ Error al quitar vehículo:', error);
            this.showError(`Error al quitar vehículo: ${error.message}`);
        }
    }

    showDriverExpenses(driverId) {
        const driver = Driver.getById(driverId);
        const expenses = Expense.getByDriverId(driverId);

        if (expenses.length === 0) {
            this.showInfo('Este conductor no tiene gastos registrados');
            return;
        }

        const expensesHTML = `
            <div class="driver-expenses">
                <h3>💰 Gastos de ${driver.name}</h3>
                <p><strong>Total:</strong> ${this.formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}</p>
                
                <div class="expenses-list">
                    ${expenses.map(expense => {
                        const vehicle = Vehicle.getById(expense.vehicleId);
                        return `
                            <div class="expense-item">
                                <div class="expense-header">
                                    <strong>${this.formatCurrency(expense.amount)}</strong>
                                    <span>${this.getExpenseTypeName(expense.type)}</span>
                                </div>
                                <p><small>${vehicle ? vehicle.plate : 'N/A'} - ${this.formatDate(expense.date)}</small></p>
                                ${expense.description ? `<p><small>${expense.description}</small></p>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        this.showModal(`Gastos del Conductor`, expensesHTML);
    }

    performSearch(query) {
        try {
            if (!query || query.trim().length === 0) {
                this.loadDrivers();
                return;
            }

            const results = Driver.search(query);
            this.updateDriversList(results);
            
            if (results.length === 0) {
                this.showInfo('No se encontraron conductores que coincidan con la búsqueda');
            }
        } catch (error) {
            this.showError('Error en la búsqueda');
        }
    }

    updateDriversList(drivers) {
        const container = document.getElementById('driversList');
        if (!container) return;

        if (!drivers || drivers.length === 0) {
            container.innerHTML = '<p>No hay conductores registrados</p>';
            return;
        }

        const driversHTML = drivers.map(driver => {
            const vehicle = driver.vehicleId ? Vehicle.getById(driver.vehicleId) : null;
            const expenses = Expense.getByDriverId(driver.id);
            const statusClass = driver.status === 'active' ? 'status-active' :
                               driver.status === 'inactive' ? 'status-inactive' : 'status-suspended';

            // Determinar estado de licencia
            const isExpired = this.isLicenseExpired(driver.licenseExpiry);
            const isExpiringSoon = !isExpired && driver.isLicenseExpiringSoon && driver.isLicenseExpiringSoon();

            return `
                <div class="expense-item driver-item" data-driver-id="${driver.id}">
                    <div class="expense-header">
                        <div class="driver-info">
                            <strong class="driver-name">${driver.name}</strong>
                            <p class="driver-details">
                                📄 ${driver.idNumber} | 📞 ${driver.phone}
                                <br><span class="driver-status ${statusClass}">${this.getStatusName(driver.status)}</span>
                                ${vehicle ? ` | 🚚 ${vehicle.plate}` : ' | Sin vehículo'}
                                ${isExpired ? '<br><span style="color: #dc3545; font-weight: bold;">⚠️ LICENCIA VENCIDA</span>' : ''}
                                ${isExpiringSoon ? '<br><span style="color: #ffc107; font-weight: bold;">⚠️ LICENCIA POR VENCER (< 30 días)</span>' : ''}
                            </p>
                            <small class="driver-meta">
                                ${expenses.length} gastos - ${this.formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                                | Creado: ${this.formatDate(driver.createdAt)}
                                ${driver.licenseExpiry ? ` | Lic. vence: ${this.formatDate(driver.licenseExpiry)}` : ''}
                            </small>
                        </div>
                        <div class="driver-actions">
                            <button class="btn btn-sm view-driver-btn" data-driver-id="${driver.id}">
                                👁️ Ver
                            </button>
                            <button class="btn btn-sm edit-driver-btn" data-driver-id="${driver.id}">
                                ✏️ Editar
                            </button>
                            ${!driver.vehicleId ?
                                `<button class="btn btn-sm btn-success assign-vehicle-btn" data-driver-id="${driver.id}" title="Asignar vehículo">
                                    🚗 Asignar Vehículo
                                </button>` :
                                `<button class="btn btn-sm btn-warning remove-vehicle-btn" data-driver-id="${driver.id}" title="Quitar vehículo asignado">
                                    🚫 Quitar Vehículo
                                </button>`
                            }
                            <button class="btn btn-sm btn-danger delete-driver-btn" data-driver-id="${driver.id}">
                                🗑️ Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = driversHTML;
    }

    showStats() {
        try {
            const drivers = Driver.getAll();
            const stats = this.calculateDriverStats(drivers);
            
            const statsHTML = `
                <div class="stats-modal-content">
                    <h3>📊 Estadísticas de Conductores</h3>
                    
                    <div class="stats-grid">
                        <div class="stat-item">
                            <strong>Total de conductores:</strong>
                            <span>${stats.total}</span>
                        </div>
                        <div class="stat-item">
                            <strong>Conductores activos:</strong>
                            <span>${stats.active}</span>
                        </div>
                        <div class="stat-item">
                            <strong>Con vehículo asignado:</strong>
                            <span>${stats.withVehicle}</span>
                        </div>
                        <div class="stat-item">
                            <strong>Sin vehículo:</strong>
                            <span>${stats.withoutVehicle}</span>
                        </div>
                    </div>
                    
                    <div class="stats-section">
                        <h4>Por Estado:</h4>
                        <div class="stats-list">
                            ${Object.entries(stats.byStatus).map(([status, count]) => 
                                `<div class="stats-item">${this.getStatusName(status)}: <strong>${count}</strong></div>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="stats-section">
                        <h4>Top 5 por Gastos:</h4>
                        <div class="stats-list">
                            ${stats.topByExpenses.slice(0, 5).map(item => 
                                `<div class="stats-item">${item.driver.name}: <strong>${this.formatCurrency(item.total)}</strong></div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            `;

            this.showModal('Estadísticas de Conductores', statsHTML);
        } catch (error) {
            this.showError('Error al calcular estadísticas');
        }
    }

    calculateDriverStats(drivers) {
        const stats = {
            total: drivers.length,
            active: 0,
            withVehicle: 0,
            withoutVehicle: 0,
            byStatus: {},
            topByExpenses: []
        };

        drivers.forEach(driver => {
            // Por estado
            if (!stats.byStatus[driver.status]) {
                stats.byStatus[driver.status] = 0;
            }
            stats.byStatus[driver.status]++;

            if (driver.status === 'active') {
                stats.active++;
            }

            // Con/sin vehículo
            if (driver.vehicleId) {
                stats.withVehicle++;
            } else {
                stats.withoutVehicle++;
            }

            // Para ranking por gastos
            const expenses = Expense.getByDriverId(driver.id);
            const total = expenses.reduce((sum, e) => sum + e.amount, 0);
            stats.topByExpenses.push({ driver, total, count: expenses.length });
        });

        // Ordenar por gastos
        stats.topByExpenses.sort((a, b) => b.total - a.total);

        return stats;
    }

    showVehicleAssignments() {
        const drivers = Driver.getAll();
        const vehicles = Vehicle.getAll();
        
        const assignedVehicles = drivers.filter(d => d.vehicleId).map(d => d.vehicleId);
        const unassignedVehicles = vehicles.filter(v => !assignedVehicles.includes(v.id));
        const driversWithoutVehicle = drivers.filter(d => !d.vehicleId);

        const assignmentsHTML = `
            <div class="vehicle-assignments">
                <h3>🚚 Asignaciones de Vehículos</h3>
                
                <div class="assignments-section">
                    <h4>Vehículos Asignados (${assignedVehicles.length})</h4>
                    <div class="assignments-list">
                        ${drivers.filter(d => d.vehicleId).map(driver => {
                            const vehicle = Vehicle.getById(driver.vehicleId);
                            return `
                                <div class="assignment-item">
                                    <strong>${vehicle.plate}</strong> - ${vehicle.brand} ${vehicle.model}
                                    <br><small>Asignado a: ${driver.name}</small>
                                </div>
                            `;
                        }).join('') || '<p>No hay vehículos asignados</p>'}
                    </div>
                </div>
                
                <div class="assignments-section">
                    <h4>Vehículos Disponibles (${unassignedVehicles.length})</h4>
                    <div class="assignments-list">
                        ${unassignedVehicles.map(vehicle => `
                            <div class="assignment-item available">
                                <strong>${vehicle.plate}</strong> - ${vehicle.brand} ${vehicle.model}
                                <br><small>Disponible para asignar</small>
                            </div>
                        `).join('') || '<p>No hay vehículos disponibles</p>'}
                    </div>
                </div>
                
                <div class="assignments-section">
                    <h4>Conductores sin Vehículo (${driversWithoutVehicle.length})</h4>
                    <div class="assignments-list">
                        ${driversWithoutVehicle.map(driver => `
                            <div class="assignment-item unassigned">
                                <strong>${driver.name}</strong>
                                <br><small>Sin vehículo asignado</small>
                            </div>
                        `).join('') || '<p>Todos los conductores tienen vehículo asignado</p>'}
                    </div>
                </div>
            </div>
        `;

        this.showModal('Asignaciones de Vehículos', assignmentsHTML);
    }

    exportDrivers() {
        try {
            const drivers = Driver.getAll();
            const data = {
                drivers: drivers,
                exportDate: new Date().toISOString(),
                totalDrivers: drivers.length
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conductores_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showSuccess('Datos de conductores exportados exitosamente');
        } catch (error) {
            this.showError('Error al exportar conductores');
        }
    }

    importDrivers(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.drivers || !Array.isArray(data.drivers)) {
                    this.showError('Formato de archivo inválido');
                    return;
                }

                this.showConfirmDialog(
                    `¿Está seguro de importar ${data.drivers.length} conductores?`,
                    () => this.confirmImportDrivers(data.drivers)
                );

            } catch (error) {
                this.showError('Error al leer el archivo');
            }
        };
        reader.readAsText(file);
    }

    async confirmImportDrivers(driversData) {
        try {
            this.showLoading('Importando conductores...');
            
            let importedCount = 0;
            let errorCount = 0;

            for (const driverData of driversData) {
                try {
                    Driver.save(driverData);
                    importedCount++;
                } catch (error) {
                    errorCount++;
                    console.error('Error al importar conductor:', driverData, error);
                }
            }

            this.loadDrivers();
            this.updateVehicleSelector();
            this.hideLoading();
            
            if (errorCount === 0) {
                this.showSuccess(`${importedCount} conductores importados exitosamente`);
            } else {
                this.showWarning(`${importedCount} conductores importados, ${errorCount} errores`);
            }

        } catch (error) {
            this.hideLoading();
            this.showError('Error durante la importación');
        }
    }

    validateDriverData(data) {
        const errors = [];
        
        if (!data.name || data.name.trim().length === 0) {
            errors.push('El nombre es requerido');
        }
        
        if (!data.idNumber || data.idNumber.trim().length === 0) {
            errors.push('El número de cédula es requerido');
        }
        
        if (!data.phone || data.phone.trim().length === 0) {
            errors.push('El teléfono es requerido');
        }
        
        if (data.email && !this.isValidEmail(data.email)) {
            errors.push('El email no tiene un formato válido');
        }
        
        if (!data.status || !['active', 'inactive', 'suspended'].includes(data.status)) {
            errors.push('El estado debe ser válido');
        }
        
        if (data.username !== undefined && (!data.username || data.username.trim().length === 0)) {
            errors.push('El usuario es requerido');
        }
        
        if (data.password !== undefined && (!data.password || data.password.trim().length < 6)) {
            errors.push('La contraseña debe tener al menos 6 caracteres');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getStatusName(status) {
        const statusNames = {
            active: 'Activo',
            inactive: 'Inactivo',
            suspended: 'Suspendido'
        };
        return statusNames[status] || status;
    }

    isLicenseExpired(licenseExpiry) {
        if (!licenseExpiry) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(licenseExpiry);
        expiryDate.setHours(0, 0, 0, 0);
        return expiryDate < today;
    }

    getExpenseTypeName(type) {
        const typeNames = {
            fuel: 'Combustible',
            maintenance: 'Mantenimiento',
            repairs: 'Reparaciones',
            insurance: 'Seguros',
            taxes: 'Impuestos',
            tolls: 'Peajes',
            parking: 'Parqueadero',
            food: 'Alimentación',
            other: 'Otros'
        };
        return typeNames[type] || type;
    }

    generateCredentialsForDriver(name, cedula) {
        if (!name || !name.trim()) {
            throw new Error('El nombre es requerido para generar credenciales');
        }
        
        if (!cedula || !cedula.trim()) {
            throw new Error('La cédula es requerida para generar credenciales');
        }
        
        // Generar usuario: "conductor" + nombre (sin espacios, sin acentos, en minúscula)
        const cleanName = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remover acentos
            .replace(/[^a-z]/g, '') // Solo letras
            .replace(/\s+/g, ''); // Remover espacios
            
        const username = `conductor${cleanName}`;

        // Verificar si el usuario ya existe y agregar número si es necesario
        let finalUsername = username;
        let counter = 1;
        const existingDrivers = Driver.getAll();
        
        while (existingDrivers.some(d => d.username === finalUsername)) {
            finalUsername = `${username}${counter}`;
            counter++;
        }

        // La contraseña es la cédula
        const password = cedula.toString();
        
        return {
            username: finalUsername,
            password: password
        };
    }

    showDriverCredentials(driver) {
        const credentialsHTML = `
            <div class="driver-credentials">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3>🔑 Credenciales del Conductor</h3>
                    <p>Conductor: <strong>${driver.name}</strong></p>
                </div>
                
                <div class="credentials-info" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold; display: block; margin-bottom: 5px;">Usuario:</label>
                        <input type="text" value="${driver.username}" readonly 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" 
                               onclick="this.select()">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight: bold; display: block; margin-bottom: 5px;">Contraseña:</label>
                        <input type="text" value="${driver.password}" readonly 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" 
                               onclick="this.select()">
                    </div>
                </div>
                
                <div class="credentials-note" style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                    <p><strong>📧 Instrucciones:</strong></p>
                    <ul style="margin-left: 20px;">
                        <li><strong>Usuario:</strong> Se genera con el prefijo "conductor" + su nombre</li>
                        <li><strong>Contraseña:</strong> Es su número de cédula</li>
                        <li>Estas credenciales son fáciles de recordar para el conductor</li>
                        <li>Envíe estas credenciales al conductor de forma segura</li>
                        <li>Haga clic en los campos para seleccionar y copiar fácilmente</li>
                    </ul>
                </div>
                
                <div style="text-align: center;">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                        📋 Entendido
                    </button>
                </div>
            </div>
        `;

        this.showModal('Credenciales Generadas', credentialsHTML);
    }

    resetForm() {
        const form = document.getElementById('driverForm');
        if (form) {
            form.reset();
            this.clearAllFieldErrors();

            // Restaurar estado activo por defecto
            document.getElementById('driverStatus').value = 'active';
        }
    }

    // ===== FUNCIONES DE FORMULARIO COLAPSABLE =====

    toggleDriverForm() {
        const formCard = document.getElementById('driverFormCard');
        const toggleButton = document.getElementById('toggleDriverForm');
        const toggleIcon = document.getElementById('toggleDriverFormIcon');
        const toggleText = document.getElementById('toggleDriverFormText');

        if (!formCard || !toggleButton) {
            console.warn('⚠️ [toggleDriverForm] Elementos del formulario no encontrados');
            return;
        }

        const isVisible = formCard.style.display === 'block';

        if (isVisible) {
            // Ocultar formulario con animación
            this.closeDriverFormWithAnimation(formCard, toggleButton, toggleIcon, toggleText);
        } else {
            // Mostrar formulario con animación
            this.openDriverFormWithAnimation(formCard, toggleButton, toggleIcon, toggleText);
        }
    }

    openDriverFormWithAnimation(formCard, toggleButton, toggleIcon, toggleText) {
        // Cambiar textos del botón
        toggleIcon.textContent = '📂';
        toggleText.textContent = 'Ocultar Formulario';

        // Cambiar estilo del botón
        toggleButton.style.background = 'linear-gradient(145deg, #dc3545, #c82333)';
        toggleButton.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.3)';

        // Mostrar formulario
        formCard.style.display = 'block';

        // Animación de entrada
        formCard.style.opacity = '0';
        formCard.style.transform = 'translateY(-20px)';
        formCard.style.transition = 'all 0.3s ease';

        // Trigger animation
        setTimeout(() => {
            formCard.style.opacity = '1';
            formCard.style.transform = 'translateY(0)';
        }, 10);

        // Enfocar primer campo
        setTimeout(() => {
            const firstInput = formCard.querySelector('input, select');
            if (firstInput) firstInput.focus();
        }, 350);

        console.log('👤 [toggleDriverForm] Formulario expandido');
    }

    closeDriverFormWithAnimation(formCard, toggleButton, toggleIcon, toggleText) {
        // Animación de salida
        formCard.style.opacity = '0';
        formCard.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            formCard.style.display = 'none';

            // Cambiar textos del botón
            toggleIcon.textContent = '👤';
            toggleText.textContent = 'Registrar Nuevo Conductor';

            // Restaurar estilo del botón
            toggleButton.style.background = 'linear-gradient(145deg, #007bff, #0056b3)';
            toggleButton.style.boxShadow = '0 4px 15px rgba(0, 123, 255, 0.3)';
        }, 300);

        console.log('📂 [toggleDriverForm] Formulario contraído');
    }

    closeDriverForm() {
        const formCard = document.getElementById('driverFormCard');
        const toggleButton = document.getElementById('toggleDriverForm');
        const toggleIcon = document.getElementById('toggleDriverFormIcon');
        const toggleText = document.getElementById('toggleDriverFormText');

        if (formCard && toggleButton) {
            this.closeDriverFormWithAnimation(formCard, toggleButton, toggleIcon, toggleText);
        }
    }

    // ===== FUNCIONES DE HERRAMIENTAS COLAPSABLES =====

    toggleDriverTools() {
        const toolsCard = document.getElementById('driverToolsCard');
        const toggleButton = document.getElementById('toggleDriverTools');
        const toggleIcon = document.getElementById('toggleDriverToolsIcon');
        const toggleText = document.getElementById('toggleDriverToolsText');

        if (!toolsCard || !toggleButton) {
            console.warn('⚠️ [toggleDriverTools] Elementos de herramientas no encontrados');
            return;
        }

        const isVisible = toolsCard.style.display === 'block';

        if (isVisible) {
            // Ocultar herramientas con animación
            this.closeDriverToolsWithAnimation(toolsCard, toggleButton, toggleIcon, toggleText);
        } else {
            // Mostrar herramientas con animación
            this.openDriverToolsWithAnimation(toolsCard, toggleButton, toggleIcon, toggleText);
        }
    }

    openDriverToolsWithAnimation(toolsCard, toggleButton, toggleIcon, toggleText) {
        // Cambiar textos del botón
        toggleIcon.textContent = '🔼';
        toggleText.textContent = 'Ocultar Herramientas';

        // Cambiar estilo del botón
        toggleButton.style.background = 'linear-gradient(145deg, #17a2b8, #138496)';
        toggleButton.style.boxShadow = '0 4px 15px rgba(23, 162, 184, 0.3)';

        // Mostrar herramientas
        toolsCard.style.display = 'block';

        // Animación de entrada
        toolsCard.style.opacity = '0';
        toolsCard.style.transform = 'translateY(-20px)';
        toolsCard.style.transition = 'all 0.3s ease';

        // Trigger animation
        setTimeout(() => {
            toolsCard.style.opacity = '1';
            toolsCard.style.transform = 'translateY(0)';
        }, 10);

        console.log('🔧 [toggleDriverTools] Herramientas expandidas');
    }

    closeDriverToolsWithAnimation(toolsCard, toggleButton, toggleIcon, toggleText) {
        // Animación de salida
        toolsCard.style.opacity = '0';
        toolsCard.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            toolsCard.style.display = 'none';

            // Cambiar textos del botón
            toggleIcon.textContent = '🔧';
            toggleText.textContent = 'Herramientas de Gestión';

            // Restaurar estilo del botón
            toggleButton.style.background = 'linear-gradient(145deg, #6c757d, #5a6268)';
            toggleButton.style.boxShadow = '0 4px 15px rgba(108, 117, 125, 0.3)';
        }, 300);

        console.log('🔼 [toggleDriverTools] Herramientas contraídas');
    }

    closeDriverTools() {
        const toolsCard = document.getElementById('driverToolsCard');
        const toggleButton = document.getElementById('toggleDriverTools');
        const toggleIcon = document.getElementById('toggleDriverToolsIcon');
        const toggleText = document.getElementById('toggleDriverToolsText');

        if (toolsCard && toggleButton) {
            this.closeDriverToolsWithAnimation(toolsCard, toggleButton, toggleIcon, toggleText);
        }
    }

    showConfirmDialog(message, onConfirm) {
        // Primero remover TODOS los modales existentes
        this.removeAllModals();
        
        const modal = document.createElement('div');
        modal.className = 'modal confirm-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 10000;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white; padding: 20px; border-radius: 8px; max-width: 400px;
            margin: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>Confirmar Acción</h3>
            </div>
            <div class="modal-body">
                <div class="confirm-dialog">
                    <p>${message}</p>
                    <div class="confirm-actions" style="margin-top: 20px; text-align: right;">
                        <button class="btn btn-secondary" id="confirmNo" style="margin-right: 10px;">
                            Cancelar
                        </button>
                        <button class="btn btn-danger" id="confirmYes">
                            Sí, continuar
                        </button>
                    </div>
                </div>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Event listeners para los botones
        const yesBtn = modalContent.querySelector('#confirmYes');
        const noBtn = modalContent.querySelector('#confirmNo');

        yesBtn.addEventListener('click', () => {
            this.removeAllModals();
            onConfirm();
        });

        noBtn.addEventListener('click', () => {
            this.removeAllModals();
        });

        // Cerrar al hacer click fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.removeAllModals();
            }
        });

        // Cerrar con tecla Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.removeAllModals();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    removeAllModals() {
        // Remover todos los modales que puedan existir
        const modals = document.querySelectorAll('.modal, .confirm-modal');
        modals.forEach(modal => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        });
    }

    showModal(title, content) {
        // Remover TODOS los modales existentes
        this.removeAllModals();

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 9000;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white; padding: 20px; border-radius: 8px; max-width: 800px; max-height: 80vh;
            overflow-y: auto; margin: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" id="modalCloseBtn" style="float: right; background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Event listener para el botón de cerrar
        const closeBtn = modalContent.querySelector('#modalCloseBtn');
        closeBtn.addEventListener('click', () => {
            this.removeAllModals();
        });

        // Cerrar al hacer click fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.removeAllModals();
            }
        });

        // Cerrar con tecla Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.removeAllModals();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
}

// Asegurar que la clase está disponible globalmente
window.DriverView = DriverView;
console.log('✅ DriverView cargada y disponible globalmente');