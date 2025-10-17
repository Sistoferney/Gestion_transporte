/**
 * Vista de Fletes - Gestión de la interfaz de servicios de transporte
 */
class FreightView extends BaseView {
    constructor(containerId = 'freights') {
        super(containerId);
        this.userType = null;
        this.currentDriverId = null;
        this.isEditing = false;
        this.editingId = null;
        this.hasBeenRendered = false;
        this.isSubmitting = false;
        this.eventsSetup = false;
        this.eventHandlers = new Map();

        // Limpiar handlers previos si existen
        if (window.freightViewInstance) {
            console.warn('⚠️ [FreightView.constructor] Instancia previa detectada, limpiando handlers...');
            window.freightViewInstance.clearEventHandlers();
        }
        window.freightViewInstance = this;

        this.initialize();
    }

    // Override render para evitar bindEvents múltiples desde BaseView
    render() {
        const container = this.getContainer();
        if (!container) return '';

        // Verificar si ya ha sido renderizado anteriormente
        if (!this.hasBeenRendered) {
            console.log('🚛 [FreightView.render] Generando contenido inicial...');
            const content = this.generateContent();
            container.innerHTML = content;
            this.hasBeenRendered = true;

            // Llamar afterRender después del primer renderizado
            this.afterRender();
        } else {
            console.log('🚛 [FreightView.render] Contenido HTML ya existe, solo actualizando datos...');
            // Si el contenedor está vacío pero ya había sido renderizado, re-renderizar
            if (container.innerHTML.length === 0) {
                console.log('🚛 [FreightView.render] Contenedor vacío detectado, re-renderizando...');
                const content = this.generateContent();
                container.innerHTML = content;
                this.afterRender();
            }
        }

        // Siempre cargar/actualizar los datos de fletes
        this.loadFreights();
        return container.innerHTML;
    }

    initialize() {
        super.initialize();
        const session = StorageService.getUserSession();
        console.log('🚛 [FreightView.initialize] Sesión:', session);
        if (session) {
            this.userType = session.type;
            this.currentDriverId = session.driverId;
            console.log('🚛 [FreightView.initialize] Usuario:', this.userType, 'Driver ID:', this.currentDriverId);
        } else {
            console.error('❌ [FreightView.initialize] No hay sesión de usuario');
        }
        this.currentFilter = 'pending'; // Filtro por defecto para conductores
    }

    updateCounters(programmed, inProgress, completed) {
        const countProgrammed = document.getElementById('countProgrammed');
        const countInProgress = document.getElementById('countInProgress');
        const countCompleted = document.getElementById('countCompleted');

        if (countProgrammed) countProgrammed.textContent = programmed;
        if (countInProgress) countInProgress.textContent = inProgress;
        if (countCompleted) countCompleted.textContent = completed;
    }

    generateContent() {
        if (this.userType === 'driver') {
            return this.generateDriverContent();
        } else {
            return this.generateAdminContent();
        }
    }

    generateDriverContent() {
        return `
            <div class="freight-driver-container">
                <div class="page-header">
                    <h2>🚛 Mis Servicios de Transporte</h2>
                    <p class="text-muted">Servicios asignados y en progreso</p>
                </div>

                <!-- Resumen de servicios -->
                <div class="driver-summary">
                    <div class="summary-card">
                        <div class="summary-icon">📋</div>
                        <div class="summary-info">
                            <span class="summary-label">Programados</span>
                            <span id="countProgrammed" class="summary-value">0</span>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon">🚚</div>
                        <div class="summary-info">
                            <span class="summary-label">En Progreso</span>
                            <span id="countInProgress" class="summary-value">0</span>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon">✅</div>
                        <div class="summary-info">
                            <span class="summary-label">Completados</span>
                            <span id="countCompleted" class="summary-value">0</span>
                        </div>
                    </div>
                </div>

                <!-- Filtros de estado -->
                <div class="driver-filters">
                    <button class="filter-btn active" data-filter="pending">
                        📋 Pendientes
                    </button>
                    <button class="filter-btn" data-filter="completed">
                        ✅ Completados
                    </button>
                    <button class="filter-btn" data-filter="all">
                        📊 Todos
                    </button>
                </div>

                <!-- Lista de servicios para conductor -->
                <div id="driverFreightsList" class="driver-freights-list">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i> Cargando servicios...
                    </div>
                </div>
            </div>
        `;
    }

    generateAdminContent() {
        return `
            <div class="freight-admin-container">
                <div class="page-header">
                    <h2>🚛 Gestión de Fletes</h2>
                    <p class="text-muted">Administra los servicios de transporte y asignaciones</p>
                </div>

                <!-- Estado de servicios de mapas -->
                <div class="google-maps-warning alert alert-info" style="display: none;">
                    <i class="fas fa-info-circle"></i>
                    <strong>Estado de Mapas:</strong> Verificando servicios disponibles...
                </div>

                <!-- Botón para mostrar formulario -->
                <div class="mb-4">
                    <button id="btnShowFreightForm" class="btn btn-primary btn-lg">
                        <i class="fas fa-plus-circle"></i> Nuevo Flete
                    </button>
                </div>

                <!-- Formulario de nuevo flete (oculto por defecto) -->
                <div id="freightFormContainer" class="card mb-4" style="display: none;">
                    <div class="card-header">
                        <h3>
                            <i class="fas fa-plus-circle"></i>
                            <span id="formTitle">Nuevo Flete</span>
                        </h3>
                    </div>
                    <div class="card-body">
                        <form id="freightForm" class="freight-form">
                            <input type="hidden" id="freightId" name="freightId">

                            <div class="row">
                                <!-- Columna izquierda -->
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="freightDriver">
                                            <i class="fas fa-user-tie"></i> Conductor *
                                        </label>
                                        <select id="freightDriver" name="driverId" class="form-control" required>
                                            <option value="">Seleccionar conductor</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="freightOrigin">
                                            <i class="fas fa-map-marker-alt"></i> Origen *
                                        </label>
                                        <input type="text" id="freightOrigin" name="origin"
                                               class="form-control" required
                                               placeholder="Dirección de origen">
                                    </div>

                                    <div class="form-group">
                                        <label for="freightDestination">
                                            <i class="fas fa-map-marker-alt"></i> Destino *
                                        </label>
                                        <input type="text" id="freightDestination" name="destination"
                                               class="form-control" required
                                               placeholder="Dirección de destino">
                                    </div>

                                    <div class="form-group">
                                        <label for="freightDistance">
                                            <i class="fas fa-road"></i> Distancia
                                        </label>
                                        <div class="input-group">
                                            <input type="text" id="freightDistance" name="distance"
                                                   class="form-control distance-input"
                                                   placeholder="Ej: 150 km (automático con Google Maps)">
                                            <div class="input-group-append">
                                                <button type="button" class="btn btn-outline-primary btn-calculate-distance">
                                                    <i class="fas fa-route"></i> Calcular
                                                </button>
                                            </div>
                                        </div>
                                        <small class="form-text text-muted">
                                            Puedes ingresar la distancia manualmente o usar el botón Calcular si Google Maps está configurado.
                                        </small>
                                    </div>

                                    <!-- Información de distancia -->
                                    <div class="distance-info"></div>
                                </div>

                                <!-- Columna derecha -->
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="freightTonnage">
                                            <i class="fas fa-weight-hanging"></i> Carga (Toneladas) *
                                        </label>
                                        <input type="number" id="freightTonnage" name="tonnage"
                                               class="form-control" required min="0.1" step="0.1"
                                               placeholder="Ej: 25.5">
                                    </div>

                                    <div class="form-group">
                                        <label for="freightPrice">
                                            <i class="fas fa-dollar-sign"></i> Precio del Servicio *
                                        </label>
                                        <div class="input-group">
                                            <div class="input-group-prepend">
                                                <span class="input-group-text">$</span>
                                            </div>
                                            <input type="text" id="freightPrice" name="price"
                                                   class="form-control" required
                                                   placeholder="Ej: 150.000">
                                        </div>
                                        <input type="hidden" id="freightPriceValue" name="priceValue">
                                    </div>

                                    <div class="row">
                                        <div class="col-sm-6">
                                            <div class="form-group">
                                                <label for="freightServiceDate">
                                                    <i class="fas fa-calendar"></i> Fecha del Servicio *
                                                </label>
                                                <input type="date" id="freightServiceDate" name="serviceDate"
                                                       class="form-control" required>
                                            </div>
                                        </div>
                                        <div class="col-sm-6">
                                            <div class="form-group">
                                                <label for="freightServiceTime">
                                                    <i class="fas fa-clock"></i> Hora del Servicio *
                                                </label>
                                                <input type="time" id="freightServiceTime" name="serviceTime"
                                                       class="form-control" required>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label for="freightClientName">
                                            <i class="fas fa-user"></i> Nombre del Cliente *
                                        </label>
                                        <input type="text" id="freightClientName" name="clientName"
                                               class="form-control" required
                                               placeholder="Nombre completo del cliente">
                                    </div>

                                    <div class="form-group">
                                        <label for="freightClientPhone">
                                            <i class="fas fa-phone"></i> Teléfono del Cliente *
                                        </label>
                                        <input type="tel" id="freightClientPhone" name="clientPhone"
                                               class="form-control" required
                                               placeholder="Teléfono de contacto">
                                    </div>
                                </div>
                            </div>

                            <!-- Observaciones -->
                            <div class="form-group">
                                <label for="freightObservations">
                                    <i class="fas fa-sticky-note"></i> Observaciones
                                </label>
                                <textarea id="freightObservations" name="observations"
                                          class="form-control" rows="3"
                                          placeholder="Observaciones adicionales (opcional)"></textarea>
                            </div>

                            <!-- Botones -->
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Guardar Flete
                                </button>
                                <button type="button" class="btn btn-secondary btn-cancel" style="display: none;">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Lista de fletes -->
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-list"></i> Fletes Registrados</h3>
                    </div>
                    <div class="card-body">
                        <div id="freightsList" class="freights-list">
                            <div class="loading-placeholder">
                                <i class="fas fa-spinner fa-spin"></i> Cargando fletes...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    afterRender() {
        if (this.eventsSetup) {
            console.log('🚛 [FreightView.afterRender] Eventos ya configurados, omitiendo...');
            return;
        }

        console.log('🚛 [FreightView.afterRender] Configurando eventos...');
        this.setupFormEvents();
        this.setupToggleFormButton();
        this.loadDriversSelect();
        this.eventsSetup = true;

        // Inicializar servicios de mapas si es admin
        if (this.userType !== 'driver') {
            this.initializeMapServices();
        }
    }

    setupToggleFormButton() {
        const btnShowForm = document.getElementById('btnShowFreightForm');
        if (btnShowForm) {
            btnShowForm.addEventListener('click', () => this.toggleFreightForm());
        }
    }

    toggleFreightForm(show = null) {
        const formContainer = document.getElementById('freightFormContainer');
        const btnShowForm = document.getElementById('btnShowFreightForm');

        if (!formContainer || !btnShowForm) return;

        if (show === null) {
            // Toggle automático
            show = formContainer.style.display === 'none';
        }

        if (show) {
            formContainer.style.display = 'block';
            btnShowForm.style.display = 'none';
            // Scroll al formulario
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            formContainer.style.display = 'none';
            btnShowForm.style.display = 'block';
            // Limpiar el formulario
            this.resetForm();
        }
    }

    async initializeMapServices() {
        try {
            console.log('🗺️ [FreightView] Inicializando servicios de mapas...');

            const config = MapService.getConfig();
            console.log('📋 [FreightView] Configuración de mapas:', config);

            if (MapService.isAvailable()) {
                const statusMessage = MapService.getStatusMessage();
                console.log(`✅ [FreightView] ${statusMessage.message}`);

                this.showMapStatus(statusMessage);
                this.enableAddressAutocomplete();
            } else {
                console.warn('⚠️ [FreightView] No hay servicios de mapas disponibles');
                this.showMapStatus({
                    type: 'warning',
                    message: 'Servicios de mapas no disponibles. Las distancias deben ingresarse manualmente.'
                });
            }

        } catch (error) {
            console.error('❌ [FreightView] Error inicializando servicios de mapas:', error);
            this.showMapStatus({
                type: 'error',
                message: 'Error inicializando servicios de mapas.'
            });
        }
    }

    showMapStatus(statusMessage) {
        const warning = document.querySelector('.google-maps-warning');
        if (warning) {
            // Actualizar contenido según el tipo de mensaje
            const alertClass = statusMessage.type === 'success' ? 'alert-success' :
                             statusMessage.type === 'info' ? 'alert-info' :
                             statusMessage.type === 'error' ? 'alert-danger' : 'alert-warning';

            warning.className = `google-maps-warning alert ${alertClass}`;
            warning.innerHTML = `
                <i class="fas fa-${statusMessage.type === 'success' ? 'check-circle' :
                                  statusMessage.type === 'info' ? 'info-circle' :
                                  statusMessage.type === 'error' ? 'times-circle' : 'exclamation-triangle'}"></i>
                <strong>Estado de Mapas:</strong> ${statusMessage.message}
                ${statusMessage.type !== 'success' ? `
                    <br><small>
                        <strong>Puedes:</strong>
                        • Ingresar direcciones y distancias manualmente
                        • Ver rutas (se abrirá en el navegador)
                    </small>
                ` : ''}
            `;
            warning.style.display = 'block';
        }

        // Configurar campo de distancia según disponibilidad
        const distanceField = document.getElementById('freightDistance');
        if (distanceField) {
            if (statusMessage.type === 'success' || statusMessage.type === 'info') {
                // Servicios disponibles - campo readonly
                distanceField.setAttribute('readonly', 'true');
                distanceField.setAttribute('placeholder', 'Se calcula automáticamente');
            } else {
                // Sin servicios - campo editable
                distanceField.removeAttribute('readonly');
                distanceField.setAttribute('placeholder', 'Ej: 150 km (ingresa manualmente)');
            }
        }
    }

    enableAddressAutocomplete() {
        const originField = document.getElementById('freightOrigin');
        const destinationField = document.getElementById('freightDestination');

        // Usar el servicio unificado para autocompletado
        const autocompleteEnabled = MapService.setupAutocomplete(
            originField,
            destinationField,
            (type) => {
                console.log(`📍 [FreightView] ${type} seleccionado`);
                setTimeout(() => this.calculateDistance(), 500);
            }
        );

        if (autocompleteEnabled) {
            console.log('✅ [FreightView] Autocompletado habilitado');
        } else {
            console.log('📝 [FreightView] Autocompletado no disponible');
        }
    }

    setupFormEvents() {
        const form = document.getElementById('freightForm');
        if (form && !this.eventHandlers.has('freightForm')) {
            const handler = (e) => this.handleSubmit(e);
            form.addEventListener('submit', handler);
            this.eventHandlers.set('freightForm', { element: form, event: 'submit', handler });
        }

        // Eventos para cálculo automático de distancia
        const originField = document.getElementById('freightOrigin');
        const destinationField = document.getElementById('freightDestination');

        if (originField && !this.eventHandlers.has('freightOrigin')) {
            const handler = () => this.scheduleDistanceCalculation();
            originField.addEventListener('blur', handler);
            this.eventHandlers.set('freightOrigin', { element: originField, event: 'blur', handler });
        }

        if (destinationField && !this.eventHandlers.has('freightDestination')) {
            const handler = () => this.scheduleDistanceCalculation();
            destinationField.addEventListener('blur', handler);
            this.eventHandlers.set('freightDestination', { element: destinationField, event: 'blur', handler });
        }

        // Botón de calcular distancia
        const calculateBtn = document.querySelector('.btn-calculate-distance');
        if (calculateBtn && !this.eventHandlers.has('calculateBtn')) {
            const handler = () => this.calculateDistance();
            calculateBtn.addEventListener('click', handler);
            this.eventHandlers.set('calculateBtn', { element: calculateBtn, event: 'click', handler });
        }

        // Formatear campo de precio
        const priceField = document.getElementById('freightPrice');
        if (priceField && !this.eventHandlers.has('freightPrice')) {
            const handler = (e) => this.formatPriceInput(e);
            priceField.addEventListener('input', handler);
            this.eventHandlers.set('freightPrice', { element: priceField, event: 'input', handler });
        }

        // NOTA: Solo manejamos eventos específicos de la vista
        // Los eventos de botones de servicio son manejados por FreightController
        document.addEventListener('click', this.handleGlobalClick.bind(this));
    }

    handleGlobalClick(e) {
        // NOTA: La mayoría de eventos son manejados por FreightController
        // Solo manejamos eventos específicos de la vista aquí
        if (e.target.matches('.filter-btn')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.handleFilterChange(e.target);
        }
    }

    handleFilterChange(button) {
        // Actualizar botones activos
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Obtener filtro y aplicar
        const filter = button.dataset.filter;
        this.currentFilter = filter;
        this.loadDriverFreights();
    }

    scheduleDistanceCalculation() {
        clearTimeout(this.distanceTimeout);
        this.distanceTimeout = setTimeout(() => {
            const origin = document.getElementById('freightOrigin')?.value?.trim();
            const destination = document.getElementById('freightDestination')?.value?.trim();

            if (origin && destination) {
                this.calculateDistance();
            }
        }, 1000);
    }

    async calculateDistance() {
        const originField = document.getElementById('freightOrigin');
        const destinationField = document.getElementById('freightDestination');
        const distanceField = document.getElementById('freightDistance');
        const calculateBtn = document.querySelector('.btn-calculate-distance');

        if (!originField || !destinationField || !distanceField) return;

        const origin = originField.value.trim();
        const destination = destinationField.value.trim();

        if (!origin || !destination) {
            console.log('📍 Origen y destino requeridos para calcular distancia');
            return;
        }

        try {
            // Verificar si hay servicios de mapas disponibles
            if (!MapService.isAvailable()) {
                throw new Error('No hay servicios de mapas disponibles. Verifica tu conexión a internet.');
            }

            // Mostrar indicador de carga
            if (calculateBtn) {
                calculateBtn.disabled = true;
                calculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';
            }

            distanceField.value = 'Calculando...';

            const result = await MapService.calculateDistance(origin, destination);

            if (result) {
                distanceField.value = `${result.distanceKm} km`;
                this.showDistanceInfo(result);
                console.log(`📏 Distancia calculada: ${result.distanceKm} km`);
            } else {
                throw new Error('No se pudo calcular la distancia');
            }

        } catch (error) {
            console.error('❌ Error calculando distancia:', error);

            // Limpiar el campo y permitir entrada manual
            distanceField.value = '';
            distanceField.removeAttribute('readonly');
            distanceField.setAttribute('placeholder', 'Ingresa la distancia manualmente (ej: 150 km)');
            distanceField.focus();

            console.error('❌ Error calculando distancia:', error.message);

            // Mostrar mensaje de error con instrucción
            const errorMsg = `No se pudo calcular la distancia automáticamente. Por favor, ingresa la distancia manualmente.`;

            if (typeof this.showMessage === 'function') {
                this.showMessage(errorMsg, 'warning');
            } else {
                alert(errorMsg);
            }
        } finally {
            // Restaurar botón
            if (calculateBtn) {
                calculateBtn.disabled = false;
                calculateBtn.innerHTML = '<i class="fas fa-route"></i> Calcular';
            }
        }
    }

    showDistanceInfo(result) {
        const infoContainer = document.querySelector('.distance-info');
        if (infoContainer) {
            infoContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <strong>Ruta calculada:</strong><br>
                    📏 Distancia: ${result.distance.text}<br>
                    ⏱️ Tiempo estimado: ${result.duration.text}<br>
                    <small>
                        <a href="${MapService.getRouteUrl(result.origin, result.destination)}"
                           target="_blank" class="text-primary">
                            <i class="fas fa-external-link-alt"></i> Ver en ${MapService.getProviderName()}
                        </a>
                    </small>
                </div>
            `;
        }
    }

    loadDriversSelect() {
        const driverSelect = document.getElementById('freightDriver');
        if (!driverSelect) return;

        driverSelect.innerHTML = '<option value="">Seleccionar conductor</option>';

        const drivers = Driver.getAll().filter(d => d.status === 'active');
        drivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.id;
            option.textContent = `${driver.name} (${driver.idNumber})`;
            option.dataset.vehicleId = driver.vehicleId || '';
            driverSelect.appendChild(option);
        });
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) {
            console.log('⚠️ [FreightView.handleSubmit] Ya se está procesando un envío');
            return;
        }

        try {
            this.isSubmitting = true;

            const formData = new FormData(e.target);

            // Obtener el precio sin formato (solo números)
            const priceValue = document.getElementById('freightPriceValue').value ||
                             this.parseCurrency(formData.get('price'));

            const freightData = {
                driverId: formData.get('driverId'),
                origin: formData.get('origin'),
                destination: formData.get('destination'),
                distance: this.parseDistance(formData.get('distance')),
                tonnage: parseFloat(formData.get('tonnage')),
                price: parseFloat(priceValue),
                serviceDate: formData.get('serviceDate'),
                serviceTime: formData.get('serviceTime'),
                clientName: formData.get('clientName'),
                clientPhone: formData.get('clientPhone'),
                observations: formData.get('observations') || ''
            };

            // Si es edición, incluir ID
            const freightId = formData.get('freightId');
            if (freightId) {
                freightData.id = parseInt(freightId);
            }

            const freight = Freight.save(freightData);

            const message = freightId ? 'Flete actualizado exitosamente' : 'Flete creado exitosamente';
            if (typeof this.showMessage === 'function') {
                this.showMessage(message, 'success');
            } else {
                alert(message);
            }

            this.resetForm();
            this.toggleFreightForm(false); // Ocultar el formulario después de guardar
            this.loadFreights();

        } catch (error) {
            console.error('❌ Error guardando flete:', error);
            if (typeof this.showMessage === 'function') {
                this.showMessage('Error: ' + error.message, 'error');
            } else {
                alert('Error: ' + error.message);
            }
        } finally {
            this.isSubmitting = false;
        }
    }

    parseDistance(distanceStr) {
        if (!distanceStr) return null;
        const match = distanceStr.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
    }

    formatPriceInput(e) {
        const input = e.target;
        let value = input.value;

        // Remover todo excepto números
        value = value.replace(/[^\d]/g, '');

        // Guardar el valor sin formato en el campo oculto
        const hiddenField = document.getElementById('freightPriceValue');
        if (hiddenField) {
            hiddenField.value = value;
        }

        // Formatear con separadores de miles
        if (value) {
            const formatted = parseInt(value).toLocaleString('es-CO');
            input.value = formatted;
        } else {
            input.value = '';
        }
    }

    parseCurrency(currencyStr) {
        if (!currencyStr) return null;
        // Remover separadores de miles y símbolos
        return currencyStr.replace(/[^\d]/g, '');
    }

    formatCurrency(amount) {
        if (!amount) return '';
        return parseInt(amount).toLocaleString('es-CO');
    }

    resetForm() {
        const form = document.getElementById('freightForm');
        if (form) {
            form.reset();

            // Restablecer título y botones
            const formTitle = document.getElementById('formTitle');
            const submitBtn = document.querySelector('#freightForm button[type="submit"]');
            const cancelBtn = document.querySelector('.btn-cancel');

            if (formTitle) formTitle.textContent = 'Nuevo Flete';
            if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Flete';
            if (cancelBtn) cancelBtn.style.display = 'none';

            // Limpiar campos calculados
            const distanceField = document.getElementById('freightDistance');
            const infoContainer = document.querySelector('.distance-info');

            if (distanceField) distanceField.value = '';
            if (infoContainer) infoContainer.innerHTML = '';

            // Restaurar estado de edición
            this.isEditing = false;
            this.editingId = null;

            // Restaurar fecha y hora por defecto
            this.setDefaultDateTime();
        }
    }

    setDefaultDateTime() {
        const dateField = document.getElementById('freightServiceDate');
        const timeField = document.getElementById('freightServiceTime');

        if (dateField && !dateField.value) {
            dateField.value = new Date().toISOString().split('T')[0];
        }

        if (timeField && !timeField.value) {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            timeField.value = `${hours}:${minutes}`;
        }
    }

    loadFreights() {
        if (this.userType === 'driver') {
            this.loadDriverFreights();
        } else {
            this.loadAdminFreights();
        }
    }

    loadDriverFreights() {
        const container = document.getElementById('driverFreightsList');
        if (!container) {
            console.error('❌ [FreightView] No se encontró el contenedor driverFreightsList');
            return;
        }

        console.log('🚛 [FreightView.loadDriverFreights] Cargando fletes para conductor:', this.currentDriverId);

        // Obtener todos los fletes del conductor
        let allFreights = Freight.getByDriverId(this.currentDriverId);
        console.log('📦 [FreightView.loadDriverFreights] Fletes encontrados:', allFreights.length, allFreights);

        // Actualizar contadores
        const programmed = allFreights.filter(f => f.status === 'programmed').length;
        const inProgress = allFreights.filter(f => f.status === 'in_progress').length;
        const completed = allFreights.filter(f => f.status === 'completed').length;

        console.log('📊 [FreightView.loadDriverFreights] Contadores:', { programmed, inProgress, completed });

        this.updateCounters(programmed, inProgress, completed);

        // Aplicar filtro y ordenar
        let freights = allFreights;
        const filter = this.currentFilter || 'pending';

        if (filter === 'pending') {
            freights = allFreights
                .filter(f => f.status === 'programmed' || f.status === 'in_progress')
                .sort((a, b) => {
                    // Programados primero, luego en progreso
                    if (a.status !== b.status) {
                        return a.status === 'programmed' ? -1 : 1;
                    }
                    // Dentro de cada grupo, ordenar por fecha (más cercano primero)
                    const dateA = new Date(`${a.serviceDate}T${a.serviceTime}`);
                    const dateB = new Date(`${b.serviceDate}T${b.serviceTime}`);
                    return dateA - dateB;
                });
        } else if (filter === 'completed') {
            freights = allFreights
                .filter(f => f.status === 'completed')
                .sort((a, b) => {
                    // Ordenar completados por fecha de finalización (más reciente primero)
                    const dateA = a.completedAt ? new Date(a.completedAt) : new Date(`${a.serviceDate}T${a.serviceTime}`);
                    const dateB = b.completedAt ? new Date(b.completedAt) : new Date(`${b.serviceDate}T${b.serviceTime}`);
                    return dateB - dateA;
                });
        } else {
            // 'all' - ordenar por estado y fecha
            freights = allFreights.sort((a, b) => {
                // Orden de prioridad: programmed, in_progress, completed
                const statusOrder = { 'programmed': 1, 'in_progress': 2, 'completed': 3 };
                const statusDiff = statusOrder[a.status] - statusOrder[b.status];

                if (statusDiff !== 0) return statusDiff;

                // Mismo estado, ordenar por fecha
                const dateA = new Date(`${a.serviceDate}T${a.serviceTime}`);
                const dateB = new Date(`${b.serviceDate}T${b.serviceTime}`);
                return a.status === 'completed' ? dateB - dateA : dateA - dateB;
            });
        }

        if (freights.length === 0) {
            const filterText = filter === 'pending' ? 'pendientes' :
                             filter === 'completed' ? 'completados' : '';
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle"></i>
                    No tienes servicios ${filterText} por el momento
                </div>
            `;
            return;
        }

        const html = freights.map(freight => {
            const driverInfo = freight.getDriverInfo();
            const statusIcon = freight.status === 'programmed' ? '📋' :
                             freight.status === 'in_progress' ? '🚚' : '✅';

            return `
                <div class="freight-card-driver ${freight.status}">
                    <div class="freight-header">
                        <div class="freight-status-badge ${freight.status}">
                            ${statusIcon} ${driverInfo.statusText}
                        </div>
                        <div class="freight-date">
                            📅 ${driverInfo.formattedDate} ⏰ ${freight.serviceTime}
                        </div>
                    </div>

                    <div class="freight-route">
                        <div class="route-point origin">
                            <span class="route-label">📍 Origen</span>
                            <span class="route-address">${freight.origin}</span>
                        </div>
                        <div class="route-arrow">→</div>
                        <div class="route-point destination">
                            <span class="route-label">📍 Destino</span>
                            <span class="route-address">${freight.destination}</span>
                        </div>
                    </div>

                    <div class="freight-details-grid">
                        ${freight.distance ? `
                            <div class="detail-item">
                                <span class="detail-icon">🛣️</span>
                                <span class="detail-label">Distancia</span>
                                <span class="detail-value">${freight.distance} km</span>
                            </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-icon">⚖️</span>
                            <span class="detail-label">Carga</span>
                            <span class="detail-value">${driverInfo.formattedTonnage}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">👤</span>
                            <span class="detail-label">Cliente</span>
                            <span class="detail-value">${freight.clientName}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-icon">📞</span>
                            <span class="detail-label">Teléfono</span>
                            <span class="detail-value">
                                <a href="tel:${freight.clientPhone}" class="phone-link">${freight.clientPhone}</a>
                            </span>
                        </div>
                    </div>

                    ${freight.observations ? `
                        <div class="freight-observations">
                            <strong>📝 Observaciones:</strong>
                            <p>${freight.observations}</p>
                        </div>
                    ` : ''}

                    ${freight.status === 'completed' && freight.getDuration() ? `
                        <div class="freight-duration">
                            ⏱️ Duración del servicio: <strong>${freight.getDuration()}</strong>
                        </div>
                    ` : ''}

                    <div class="freight-actions">
                        ${freight.status === 'programmed' ? `
                            <button class="btn-action btn-success btn-start-service"
                                    data-freight-id="${freight.id}">
                                ▶️ Iniciar Servicio
                            </button>
                        ` : ''}

                        ${freight.status === 'in_progress' ? `
                            <button class="btn-action btn-primary btn-complete-service"
                                    data-freight-id="${freight.id}">
                                ✅ Completar Servicio
                            </button>
                        ` : ''}

                        <button class="btn-action btn-secondary btn-view-route"
                                data-freight-id="${freight.id}">
                            🗺️ Ver Ruta en Mapa
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    loadAdminFreights() {
        const container = document.getElementById('freightsList');
        if (!container) return;

        const freights = Freight.getAll();

        if (freights.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle"></i>
                    No hay fletes registrados aún
                </div>
            `;
            return;
        }

        // Agrupar fletes por estado y ordenar por fecha
        const programmedFreights = freights
            .filter(f => f.status === 'programmed')
            .sort((a, b) => {
                // Ordenar por fecha y hora (más cercano primero)
                const dateA = new Date(`${a.serviceDate}T${a.serviceTime}`);
                const dateB = new Date(`${b.serviceDate}T${b.serviceTime}`);
                return dateA - dateB;
            });

        const inProgressFreights = freights
            .filter(f => f.status === 'in_progress')
            .sort((a, b) => {
                // Ordenar por fecha de inicio (más reciente primero)
                const dateA = new Date(`${a.serviceDate}T${a.serviceTime}`);
                const dateB = new Date(`${b.serviceDate}T${b.serviceTime}`);
                return dateA - dateB;
            });

        const completedFreights = freights
            .filter(f => f.status === 'completed')
            .sort((a, b) => {
                // Ordenar por fecha de finalización (más reciente primero)
                const dateA = a.completedAt ? new Date(a.completedAt) : new Date(`${a.serviceDate}T${a.serviceTime}`);
                const dateB = b.completedAt ? new Date(b.completedAt) : new Date(`${b.serviceDate}T${b.serviceTime}`);
                return dateB - dateA;
            });

        const html = `
            <!-- Fletes Programados -->
            <div class="freight-section mb-4">
                <button class="freight-section-toggle" onclick="freightView.toggleFreightSection('programmed')"
                        style="width: 100%; text-align: left; padding: 15px; background: linear-gradient(145deg, #ffc107, #ff9800);
                               border: none; border-radius: 8px; font-size: 18px; font-weight: bold; color: white;
                               cursor: pointer; display: flex; justify-content: space-between; align-items: center;
                               box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: all 0.3s ease;"
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 5px rgba(0,0,0,0.1)'">
                    <span>📋 Fletes Programados (${programmedFreights.length})</span>
                    <span id="programmed-toggle-icon">▼</span>
                </button>
                <div id="programmed-freights" class="freight-section-content" style="display: block; margin-top: 15px;">
                    ${programmedFreights.length > 0 ? programmedFreights.map(freight => this.renderFreightCard(freight)).join('') :
                      '<div class="alert alert-info">No hay fletes programados</div>'}
                </div>
            </div>

            <!-- Fletes En Proceso -->
            <div class="freight-section mb-4">
                <button class="freight-section-toggle" onclick="freightView.toggleFreightSection('in_progress')"
                        style="width: 100%; text-align: left; padding: 15px; background: linear-gradient(145deg, #17a2b8, #138496);
                               border: none; border-radius: 8px; font-size: 18px; font-weight: bold; color: white;
                               cursor: pointer; display: flex; justify-content: space-between; align-items: center;
                               box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: all 0.3s ease;"
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 5px rgba(0,0,0,0.1)'">
                    <span>🚚 Fletes En Proceso (${inProgressFreights.length})</span>
                    <span id="in_progress-toggle-icon">▼</span>
                </button>
                <div id="in_progress-freights" class="freight-section-content" style="display: block; margin-top: 15px;">
                    ${inProgressFreights.length > 0 ? inProgressFreights.map(freight => this.renderFreightCard(freight)).join('') :
                      '<div class="alert alert-info">No hay fletes en proceso</div>'}
                </div>
            </div>

            <!-- Fletes Completados -->
            <div class="freight-section mb-4">
                <button class="freight-section-toggle" onclick="freightView.toggleFreightSection('completed')"
                        style="width: 100%; text-align: left; padding: 15px; background: linear-gradient(145deg, #28a745, #218838);
                               border: none; border-radius: 8px; font-size: 18px; font-weight: bold; color: white;
                               cursor: pointer; display: flex; justify-content: space-between; align-items: center;
                               box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: all 0.3s ease;"
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.15)'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 5px rgba(0,0,0,0.1)'">
                    <span>✅ Fletes Completados (${completedFreights.length})</span>
                    <span id="completed-toggle-icon">▼</span>
                </button>
                <div id="completed-freights" class="freight-section-content" style="display: none; margin-top: 15px;">
                    ${completedFreights.length > 0 ? completedFreights.map(freight => this.renderFreightCard(freight)).join('') :
                      '<div class="alert alert-info">No hay fletes completados</div>'}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    renderFreightCard(freight) {
        const driver = freight.getDriver();
        const vehicle = freight.getVehicle();

        return `
            <div class="card freight-card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5 class="card-title">
                                <i class="fas fa-route text-primary"></i>
                                ${freight.getRoute()}
                            </h5>
                            <div class="row">
                                <div class="col-sm-6">
                                    <p class="mb-1">
                                        <i class="fas fa-user-tie"></i>
                                        <strong>Conductor:</strong> ${driver ? driver.name : 'N/A'}
                                    </p>
                                    <p class="mb-1">
                                        <i class="fas fa-car"></i>
                                        <strong>Vehículo:</strong> ${vehicle ? vehicle.toString() : 'N/A'}
                                    </p>
                                    <p class="mb-1">
                                        <i class="fas fa-calendar"></i>
                                        <strong>Fecha:</strong> ${freight.getFormattedServiceDate()}
                                    </p>
                                    <p class="mb-1">
                                        <i class="fas fa-clock"></i>
                                        <strong>Hora:</strong> ${freight.serviceTime}
                                    </p>
                                </div>
                                <div class="col-sm-6">
                                    <p class="mb-1">
                                        <i class="fas fa-user"></i>
                                        <strong>Cliente:</strong> ${freight.clientName}
                                    </p>
                                    <p class="mb-1">
                                        <i class="fas fa-phone"></i>
                                        <strong>Teléfono:</strong> ${freight.clientPhone}
                                    </p>
                                    <p class="mb-1">
                                        <i class="fas fa-dollar-sign"></i>
                                        <strong>Precio:</strong> ${freight.getFormattedPrice()}
                                    </p>
                                    <p class="mb-1">
                                        <i class="fas fa-weight-hanging"></i>
                                        <strong>Carga:</strong> ${freight.getFormattedTonnage()}
                                    </p>
                                    ${freight.distance ? `
                                        <p class="mb-1">
                                            <i class="fas fa-road"></i>
                                            <strong>Distancia:</strong> ${freight.distance} km
                                        </p>
                                    ` : ''}
                                </div>
                            </div>

                            ${freight.observations ? `
                                <div class="mt-2">
                                    <small class="text-muted">
                                        <i class="fas fa-sticky-note"></i>
                                        <strong>Observaciones:</strong> ${freight.observations}
                                    </small>
                                </div>
                            ` : ''}
                        </div>

                        <div class="col-md-4 text-end">
                            <span class="badge badge-${this.getStatusColor(freight.status)} mb-2">
                                ${freight.getStatusText()}
                            </span>

                            ${freight.getDuration() ? `
                                <div class="text-muted small mb-2">
                                    <i class="fas fa-stopwatch"></i>
                                    Duración: ${freight.getDuration()}
                                </div>
                            ` : ''}

                            <div class="btn-group-vertical btn-group-sm">
                                <button class="btn btn-outline-primary btn-edit-freight"
                                        data-freight-id="${freight.id}">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-outline-info btn-view-route"
                                        data-freight-id="${freight.id}">
                                    <i class="fas fa-map-marked-alt"></i> Ver Ruta
                                </button>
                                <button class="btn btn-outline-danger btn-delete-freight"
                                        data-freight-id="${freight.id}">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    toggleFreightSection(sectionId) {
        const content = document.getElementById(`${sectionId}-freights`);
        const icon = document.getElementById(`${sectionId}-toggle-icon`);

        if (!content || !icon) return;

        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.textContent = '▼';
        } else {
            content.style.display = 'none';
            icon.textContent = '▶';
        }
    }

    getStatusColor(status) {
        const colors = {
            'programmed': 'warning',
            'in_progress': 'info',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return colors[status] || 'secondary';
    }

    // NOTA: startService ahora es manejado por FreightController
    // Esta función ya no se usa para evitar duplicación

    // NOTA: completeService ahora es manejado por FreightController
    // Esta función ya no se usa para evitar duplicación

    viewRoute(freightId) {
        const freight = Freight.getById(freightId);
        if (!freight) return;

        // Usar el servicio unificado para abrir rutas
        MapService.openRoute(freight.origin, freight.destination);
    }

    editFreight(freightId) {
        const freight = Freight.getById(freightId);
        if (!freight) return;

        // Mostrar el formulario
        this.toggleFreightForm(true);

        // Poblar los datos
        this.populateForm(freight);

        // Scroll al formulario (después de un pequeño delay para asegurar que esté visible)
        setTimeout(() => {
            const form = document.getElementById('freightForm');
            if (form) {
                form.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }

    populateForm(freight) {
        // Marcar como edición
        this.isEditing = true;
        this.editingId = freight.id;

        // Llenar campos
        document.getElementById('freightId').value = freight.id;
        document.getElementById('freightDriver').value = freight.driverId;
        document.getElementById('freightOrigin').value = freight.origin;
        document.getElementById('freightDestination').value = freight.destination;
        document.getElementById('freightDistance').value = freight.distance ? `${freight.distance} km` : '';
        document.getElementById('freightTonnage').value = freight.tonnage;

        // Formatear el precio con separadores de miles
        const priceField = document.getElementById('freightPrice');
        const priceValueField = document.getElementById('freightPriceValue');
        if (priceField && freight.price) {
            priceField.value = this.formatCurrency(freight.price);
            if (priceValueField) {
                priceValueField.value = freight.price;
            }
        }

        document.getElementById('freightServiceDate').value = freight.serviceDate;
        document.getElementById('freightServiceTime').value = freight.serviceTime;
        document.getElementById('freightClientName').value = freight.clientName;
        document.getElementById('freightClientPhone').value = freight.clientPhone;
        document.getElementById('freightObservations').value = freight.observations;

        // Cambiar interfaz para edición
        const formTitle = document.getElementById('formTitle');
        const submitBtn = document.querySelector('#freightForm button[type="submit"]');
        const cancelBtn = document.querySelector('.btn-cancel');

        if (formTitle) formTitle.textContent = 'Editar Flete';
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Flete';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
    }

    cancelEdit() {
        this.resetForm();
        this.toggleFreightForm(false); // Ocultar el formulario
    }

    async deleteFreight(freightId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este flete?')) return;

        try {
            // Eliminar el flete (esto registrará automáticamente el tombstone)
            Freight.delete(freightId);

            // Sincronizar con S3 inmediatamente después de eliminar (incluirá tombstones)
            if (window.StorageService && window.S3Service && S3Service.isConfigured()) {
                console.log('🔄 Sincronizando eliminación con S3 (con tombstone)...');
                await StorageService.syncWithS3(true); // force = true para ignorar intervalo
                console.log('✅ Eliminación y tombstone sincronizados con S3');
            }

            if (typeof this.showMessage === 'function') {
                this.showMessage('Flete eliminado exitosamente', 'success');
            } else {
                alert('Flete eliminado exitosamente');
            }
            this.loadFreights();

        } catch (error) {
            console.error('❌ Error eliminando flete:', error);
            if (typeof this.showMessage === 'function') {
                this.showMessage('Error eliminando flete: ' + error.message, 'error');
            } else {
                alert('Error eliminando flete: ' + error.message);
            }
        }
    }

    clearEventHandlers() {
        this.eventHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventHandlers.clear();
        this.eventsSetup = false;
    }

    destroy() {
        this.clearEventHandlers();
        clearTimeout(this.distanceTimeout);

        if (window.freightViewInstance === this) {
            delete window.freightViewInstance;
        }
    }
}

// Asegurar que esté disponible globalmente
window.FreightView = FreightView;