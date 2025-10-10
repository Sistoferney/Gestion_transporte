/**
 * Vista de Documentos - Gestión de la interfaz de documentos del vehículo
 */
class DocumentView extends BaseView {
    constructor(containerId = 'documents') {
        super(containerId);
        this.currentVehicleId = null;
        this.userType = null;
        this.hasBeenRendered = false; // Flag para tracking de renderizado
        this.eventsSetup = false; // Flag para evitar event listeners duplicados
        this.vehiclesCache = null; // Cache para vehículos
        this.lastVehicleUpdate = 0; // Timestamp de última actualización
        this.initialize();
    }

    initialize() {
        super.initialize();
        const session = StorageService.getUserSession();
        if (session) {
            this.userType = session.type;
        }
    }

    render() {
        const container = this.getContainer();
        if (!container) return '';
        
        console.log('📄 [DocumentView.render] Iniciando renderizado...');
        
        // Verificar si ya ha sido renderizado anteriormente
        if (!this.hasBeenRendered) {
            console.log('📄 [DocumentView.render] Generando contenido inicial...');
            const content = this.generateContent();
            container.innerHTML = content;
            this.bindEvents(); // Usar bindEvents en lugar de setupEventListeners
            this.hasBeenRendered = true; // Marcar como renderizado
        } else {
            console.log('📄 [DocumentView.render] Contenido HTML ya existe, solo actualizando datos...');
            // Asegurar que los eventos están configurados
            this.bindEvents(); // Usar bindEvents en lugar de setupEventListeners
            // Si por alguna razón el contenedor está vacío pero ya había sido renderizado,
            // re-renderizar para evitar pantalla en blanco
            if (container.innerHTML.length === 0) {
                console.log('📄 [DocumentView.render] Contenedor vacío detectado, re-renderizando...');
                const content = this.generateContent();
                container.innerHTML = content;
                this.bindEvents(); // Usar bindEvents en lugar de setupEventListeners
            }
        }
        
        // Cargar/actualizar los datos de documentos solo una vez por render
        this.loadDocumentData();
        
        console.log('📄 [DocumentView.render] Renderizado completado');
        return container.innerHTML;
    }

    generateContent() {
        if (this.userType === 'driver') {
            return this.generateDriverDocumentView();
        } else {
            return this.generateAdminDocumentView();
        }
    }

    generateAdminDocumentView() {
        return `
            <h2>📄 Gestión de Documentos</h2>
            
            <!-- Selector de vehículo -->
            <div class="card">
                <h3>🚚 Seleccionar Vehículo</h3>
                <div class="form-group">
                    <label for="documentVehicleSelect">Vehículo:</label>
                    <select id="documentVehicleSelect" required>
                        <option value="">Seleccionar vehículo</option>
                    </select>
                </div>
            </div>

            <!-- Contenedor de documentos -->
            <div id="documentsContainer" class="hidden">
                ${this.generateDocumentsContent()}
            </div>
        `;
    }

    generateDriverDocumentView() {
        return `
            <h2>📄 Documentos de Mi Vehículo</h2>
            
            <!-- Información del vehículo asignado -->
            <div id="vehicleInfo" class="card" style="display: none;">
                <h3>🚗 Mi Vehículo Asignado</h3>
                <div id="vehicleDetails">
                    <!-- Se llenará automáticamente -->
                </div>
            </div>
            
            <div id="documentsContainer">
                ${this.generateDocumentsContent()}
            </div>
        `;
    }

    generateDocumentsContent() {
        return `
            <!-- Estado de documentos -->
            <div class="card">
                <h3>🔍 Estado de Documentos</h3>
                <div id="documentsStatus" class="stats-container">
                    <p>Cargando estado de documentos...</p>
                </div>
            </div>

            <!-- Formularios de documentos -->
            <div class="documents-forms">
                ${this.generateSOATForm()}
                ${this.generateTechnicalForm()}
                ${this.generateTaxForm()}
                ${this.generateSealForm()}
            </div>

            <!-- Historial de documentos -->
            <div class="card">
                <h3>📋 Historial de Documentos</h3>
                <div id="documentsHistory">
                    <p>No hay documentos registrados para este vehículo.</p>
                </div>
            </div>
        `;
    }

    generateSOATForm() {
        return `
            <div class="card accordion-card">
                <div class="accordion-header" onclick="documentView.toggleAccordion('soatAccordion')">
                    <h3>🛡️ SOAT (Seguro Obligatorio de Accidentes de Tránsito)</h3>
                    <span class="accordion-icon">▼</span>
                </div>
                <div id="soatAccordion" class="accordion-content">
                    <form id="soatForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="soatNumber">Número de póliza:</label>
                                <input type="text" id="soatNumber" name="soatNumber" required autocomplete="off">
                            </div>
                            <div class="form-group">
                                <label for="soatCompany">Aseguradora:</label>
                                <input type="text" id="soatCompany" name="soatCompany" required autocomplete="organization">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="soatIssueDate">Fecha de expedición:</label>
                                <input type="date" id="soatIssueDate" name="soatIssueDate" required>
                            </div>
                            <div class="form-group">
                                <label for="soatExpiryDate">Fecha de vencimiento:</label>
                                <input type="date" id="soatExpiryDate" name="soatExpiryDate" required readonly>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="soatAmount">Valor pagado:</label>
                                <input type="number" id="soatAmount" name="soatAmount" min="0" step="100" required>
                            </div>
                            <div class="form-group">
                                <label for="soatFile">Archivo del documento:</label>
                                <input type="file" id="soatFile" name="soatFile" accept="image/*,.pdf">
                            </div>
                        </div>
                        <button type="submit" class="btn">💾 Guardar SOAT</button>
                    </form>
                </div>
            </div>
        `;
    }

    generateTechnicalForm() {
        return `
            <div class="card accordion-card">
                <div class="accordion-header" onclick="documentView.toggleAccordion('technicalAccordion')">
                    <h3>🔧 Revisión Tecnomecánica</h3>
                    <span class="accordion-icon">▼</span>
                </div>
                <div id="technicalAccordion" class="accordion-content">
                    <form id="technicalForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="technicalNumber">Número de certificado:</label>
                                <input type="text" id="technicalNumber" name="technicalNumber" required autocomplete="off">
                            </div>
                            <div class="form-group">
                                <label for="technicalCenter">Centro de revisión:</label>
                                <input type="text" id="technicalCenter" name="technicalCenter" required autocomplete="organization">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="technicalIssueDate">Fecha de expedición:</label>
                                <input type="date" id="technicalIssueDate" name="technicalIssueDate" required>
                            </div>
                            <div class="form-group">
                                <label for="technicalExpiryDate">Fecha de vencimiento:</label>
                                <input type="date" id="technicalExpiryDate" name="technicalExpiryDate" required readonly>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="technicalResult">Resultado:</label>
                                <select id="technicalResult" name="technicalResult" required>
                                    <option value="">Seleccionar resultado</option>
                                    <option value="approved">Aprobado</option>
                                    <option value="conditioned">Condicionado</option>
                                    <option value="rejected">Rechazado</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="technicalAmount">Valor pagado:</label>
                                <input type="number" id="technicalAmount" name="technicalAmount" min="0" step="100" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="technicalFile">Archivo del documento:</label>
                            <input type="file" id="technicalFile" name="technicalFile" accept="image/*,.pdf">
                        </div>
                        <button type="submit" class="btn">💾 Guardar Tecnomecánica</button>
                    </form>
                </div>
            </div>
        `;
    }

    generateTaxForm() {
        return `
            <div class="card accordion-card">
                <div class="accordion-header" onclick="documentView.toggleAccordion('taxAccordion')">
                    <h3>💰 Impuesto Vehicular</h3>
                    <span class="accordion-icon">▼</span>
                </div>
                <div id="taxAccordion" class="accordion-content">
                    <form id="taxForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="taxYear">Año del impuesto:</label>
                                <input type="number" id="taxYear" name="taxYear" min="2020" max="2030" required>
                            </div>
                            <div class="form-group">
                                <label for="taxStatus">Estado:</label>
                                <select id="taxStatus" name="taxStatus" required>
                                    <option value="">Seleccionar estado</option>
                                    <option value="paid">Pagado</option>
                                    <option value="pending">Pendiente</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="taxPaymentDate">Fecha de pago:</label>
                                <input type="date" id="taxPaymentDate" name="taxPaymentDate">
                            </div>
                            <div class="form-group">
                                <label for="taxExpiryDate">Fecha de vencimiento:</label>
                                <input type="date" id="taxExpiryDate" name="taxExpiryDate" required readonly>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="taxAmount">Valor pagado:</label>
                                <input type="number" id="taxAmount" name="taxAmount" min="0" step="100" required>
                            </div>
                            <div class="form-group">
                                <label for="taxFile">Archivo del documento:</label>
                                <input type="file" id="taxFile" name="taxFile" accept="image/*,.pdf">
                            </div>
                        </div>
                        <div class="form-note">
                            <small>⚠️ La fecha de vencimiento se calcula automáticamente. 
                            Si está marcado como "pagado", vence en junio del año siguiente.</small>
                        </div>
                        <button type="submit" class="btn">💾 Guardar Impuesto Vehicular</button>
                    </form>
                </div>
            </div>
        `;
    }

    generateSealForm() {
        return `
            <div class="card accordion-card">
                <div class="accordion-header" onclick="documentView.toggleAccordion('sealAccordion')">
                    <h3>🚗 Impuesto de Rodamiento (Semaforizacion)</h3>
                    <span class="accordion-icon">▼</span>
                </div>
                <div id="sealAccordion" class="accordion-content">
                    <form id="sealForm">
                        <div class="form-group">
                            <label for="sealApplies">¿Aplica impuesto de rodamiento?</label>
                            <select id="sealApplies" name="sealApplies" required>
                                <option value="">Seleccionar</option>
                                <option value="yes">Sí</option>
                                <option value="no">No (Exento)</option>
                            </select>
                        </div>
                        
                        <div id="rodamientoFields" class="hidden">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="sealNumber">Número de recibo:</label>
                                    <input type="text" id="sealNumber" name="sealNumber" autocomplete="off">
                                </div>
                                <div class="form-group">
                                    <label for="sealYear">Año del impuesto:</label>
                                    <input type="number" id="sealYear" name="sealYear" min="2020" max="2030">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="sealStatus">Estado:</label>
                                    <select id="sealStatus" name="sealStatus">
                                        <option value="">Seleccionar estado</option>
                                        <option value="paid">Pagado</option>
                                        <option value="pending">Pendiente</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="sealIssueDate">Fecha de pago:</label>
                                    <input type="date" id="sealIssueDate" name="sealIssueDate">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="sealExpiryDate">Fecha de vencimiento:</label>
                                    <input type="date" id="sealExpiryDate" name="sealExpiryDate" readonly>
                                </div>
                                <div class="form-group">
                                    <label for="sealAmount">Valor pagado:</label>
                                    <input type="number" id="sealAmount" name="sealAmount" min="0" step="100">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="sealFile">Archivo del documento:</label>
                                <input type="file" id="sealFile" name="sealFile" accept="image/*,.pdf">
                            </div>
                            <div class="form-note">
                                <small>⚠️ La fecha de vencimiento se calcula automáticamente. 
                                Si está marcado como "pagado", vence el 31 de diciembre del año siguiente.</small>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn">💾 Guardar Impuesto de Rodamiento (Semaforizacion)</button>
                    </form>
                </div>
            </div>
        `;
    }

    bindEvents() {
        super.bindEvents();
        
        // Solo configurar event listeners si no se han configurado antes
        if (this.eventsSetup) {
            console.log('📄 [DocumentView.bindEvents] Event listeners ya configurados, saltando...');
            return;
        }
        
        console.log('📄 [DocumentView.bindEvents] Configurando event listeners...');
        
        const container = this.getContainer();
        if (!container) {
            console.warn('📄 [DocumentView.bindEvents] Container no encontrado');
            return;
        }
        
        // Eventos del selector de vehículo
        this.delegate('change', '#documentVehicleSelect', this.handleVehicleChange.bind(this));
        
        // Eventos de los formularios
        this.delegate('submit', '#soatForm', this.handleFormSubmit.bind(this));
        this.delegate('submit', '#technicalForm', this.handleFormSubmit.bind(this));
        this.delegate('submit', '#taxForm', this.handleFormSubmit.bind(this));
        this.delegate('submit', '#sealForm', this.handleFormSubmit.bind(this));
        
        // Eventos de cálculo automático
        this.delegate('change', '#soatIssueDate', this.calculateSOATExpiry.bind(this));
        this.delegate('change', '#technicalIssueDate', this.calculateTechnicalExpiry.bind(this));
        this.delegate('change', '#taxYear', this.calculateTaxExpiry.bind(this));
        this.delegate('change', '#taxStatus', this.calculateTaxExpiry.bind(this));
        this.delegate('change', '#sealYear', this.calculateSealExpiry.bind(this));
        this.delegate('change', '#sealStatus', this.calculateSealExpiry.bind(this));
        this.delegate('change', '#sealApplies', this.toggleRodamientoFields.bind(this));
        
        // Eventos de archivos
        this.delegate('change', 'input[type="file"]', this.handleFileSelect.bind(this));
        
        this.eventsSetup = true;
        console.log('✅ [DocumentView.bindEvents] Event listeners configurados correctamente');
    }

    afterRender() {
        super.afterRender();
        this.setupDocumentView();
    }

    setupDocumentView() {
        if (this.userType === 'driver') {
            this.setupDriverDocuments();
        } else {
            this.updateVehicleSelector();
        }
    }

    setupDriverDocuments() {
        setTimeout(() => {
            const session = StorageService.getUserSession();
            console.log('📄 [DocumentView.setupDriverDocuments] Sesión del usuario:', session);
            
            if (session && session.driverId) {
                const driver = Driver.getById(session.driverId);
                console.log('📄 [DocumentView.setupDriverDocuments] Conductor encontrado:', driver);
                
                if (driver && driver.vehicleId) {
                    console.log('📄 [DocumentView.setupDriverDocuments] Vehículo asignado ID:', driver.vehicleId);
                    this.currentVehicleId = driver.vehicleId;
                    
                    // Mostrar información del vehículo
                    const vehicle = Vehicle.getById(driver.vehicleId);
                    if (vehicle) {
                        this.showVehicleInfo(vehicle);
                    }
                    
                    this.loadVehicleDocuments();
                    this.showDocumentsContainer();
                } else {
                    console.log('📄 [DocumentView.setupDriverDocuments] Conductor sin vehículo asignado');
                    this.showDriverWithoutVehicle();
                }
            } else {
                console.log('📄 [DocumentView.setupDriverDocuments] No hay sesión de conductor válida');
                this.showDriverWithoutVehicle();
            }
        }, 100);
    }

    updateVehicleSelector() {
        const selector = document.getElementById('documentVehicleSelect');
        if (!selector) return;

        // Usar caché si es reciente (menos de 5 segundos)
        const now = Date.now();
        if (this.vehiclesCache && (now - this.lastVehicleUpdate) < 5000) {
            console.log('📄 [DocumentView.updateVehicleSelector] Usando caché de vehículos');
            this.populateVehicleSelector(selector, this.vehiclesCache);
            return;
        }

        console.log('📄 [DocumentView.updateVehicleSelector] Cargando vehículos desde localStorage');
        const vehicles = Vehicle.getAll();
        
        // Actualizar caché
        this.vehiclesCache = vehicles;
        this.lastVehicleUpdate = now;
        
        this.populateVehicleSelector(selector, vehicles);
    }
    
    populateVehicleSelector(selector, vehicles) {
        const currentValue = selector.value;

        selector.innerHTML = '<option value="">Seleccionar vehículo</option>' +
            vehicles.map(vehicle =>
                `<option value="${vehicle.id}">${vehicle.plate} - ${vehicle.brand} ${vehicle.model}</option>`
            ).join('');

        // Restaurar valor previo si existe
        if (currentValue && vehicles.find(v => v.id == currentValue)) {
            selector.value = currentValue;
        }
        // Si no hay valor previo y hay vehículos, seleccionar el primero automáticamente
        else if (!currentValue && vehicles.length > 0) {
            selector.value = vehicles[0].id;
            this.currentVehicleId = vehicles[0].id;
            // Cargar documentos del primer vehículo
            this.loadVehicleDocuments();
            this.showDocumentsContainer();
        }
    }

    handleVehicleChange(e, select) {
        const vehicleId = select.value;
        if (vehicleId) {
            this.currentVehicleId = parseInt(vehicleId);
            this.loadVehicleDocuments();
            this.showDocumentsContainer();
        } else {
            this.hideDocumentsContainer();
        }
    }

    handleFormSubmit(e, form) {
        e.preventDefault();
        
        // Asegurar que el controlador tenga el vehículo correcto para conductores
        if (this.userType === 'driver' && this.currentVehicleId && window.documentController) {
            window.documentController.currentVehicleId = this.currentVehicleId;
        }
        
        if (window.documentController) {
            window.documentController.handleDocumentSubmit(e, form.id);
        } else {
            // Intentar esperar un poco para que se inicialice el controlador
            setTimeout(() => {
                if (window.documentController) {
                    // Asegurar sincronización nuevamente
                    if (this.userType === 'driver' && this.currentVehicleId) {
                        window.documentController.currentVehicleId = this.currentVehicleId;
                    }
                    window.documentController.handleDocumentSubmit(e, form.id);
                } else {
                    this.showError('Controlador de documentos no disponible. Recarga la página e intenta de nuevo.');
                }
            }, 500);
        }
    }

    handleFileSelect(e, input) {
        const file = input.files[0];
        if (!file) return;

        // Validar tamaño del archivo (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showError('El archivo es demasiado grande. Máximo 5MB permitido.');
            input.value = '';
            return;
        }

        // Validar tipo de archivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG) y PDF.');
            input.value = '';
            return;
        }

        this.showInfo(`Archivo seleccionado: ${file.name}`);
    }

    showVehicleInfo(vehicle) {
        const vehicleInfoCard = document.getElementById('vehicleInfo');
        const vehicleDetails = document.getElementById('vehicleDetails');
        
        if (vehicleInfoCard && vehicleDetails && vehicle) {
            vehicleDetails.innerHTML = `
                <div class="vehicle-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                    <div><strong>Placa:</strong> ${vehicle.plate}</div>
                    <div><strong>Marca:</strong> ${vehicle.brand}</div>
                    <div><strong>Modelo:</strong> ${vehicle.model}</div>
                    <div><strong>Año:</strong> ${vehicle.year}</div>
                    ${vehicle.type ? `<div><strong>Tipo:</strong> ${vehicle.type}</div>` : ''}
                    ${vehicle.capacity ? `<div><strong>Capacidad:</strong> ${vehicle.capacity}</div>` : ''}
                </div>
            `;
            vehicleInfoCard.style.display = 'block';
        }
    }

    showDocumentsContainer() {
        const container = document.getElementById('documentsContainer');
        if (container) {
            container.classList.remove('hidden');
        }
    }

    hideDocumentsContainer() {
        const container = document.getElementById('documentsContainer');
        if (container) {
            container.classList.add('hidden');
        }
    }

    showDriverWithoutVehicle() {
        const container = document.getElementById('documentsContainer');
        if (container) {
            container.innerHTML = `
                <div class="card">
                    <h3>⚠️ Sin Vehículo Asignado</h3>
                    <p>No tienes un vehículo asignado. Contacta al administrador para que te asigne un vehículo.</p>
                </div>
            `;
            container.classList.remove('hidden');
        }
    }

    loadVehicleDocuments() {
        if (!this.currentVehicleId) return;
        
        // Cargar datos de documentos
        this.loadDocumentData();
        this.updateDocumentsStatus();
        this.updateDocumentsHistory();
        this.setupDefaultYears();
    }

    loadDocumentData() {
        // Para conductores, verificar nuevamente su vehículo asignado
        if (this.userType === 'driver') {
            const session = StorageService.getUserSession();
            if (session && session.driverId) {
                const driver = Driver.getById(session.driverId);
                if (driver && driver.vehicleId && this.currentVehicleId !== driver.vehicleId) {
                    console.log('📄 [DocumentView.loadDocumentData] Actualizando vehículo del conductor:', driver.vehicleId);
                    this.currentVehicleId = driver.vehicleId;
                }
            }
        } else {
            // Siempre actualizar el selector de vehículos para administradores
            this.updateVehicleSelector();
        }
        
        // Solo cargar documentos si hay un vehículo seleccionado
        if (!this.currentVehicleId) {
            if (this.userType === 'driver') {
                this.showDriverWithoutVehicle();
            }
            return;
        }
        
        const vehicleDocuments = StorageService.getVehicleDocuments();
        const docs = vehicleDocuments[this.currentVehicleId] || {};
        
        // Cargar cada tipo de documento
        ['soat', 'technical', 'tax', 'seal'].forEach(docType => {
            if (docs[docType]) {
                this.fillFormData(docType, docs[docType]);
            }
        });

        // Configurar campos específicos
        if (docs.seal) {
            this.toggleRodamientoFields();
        }
        
        // Mostrar contenedor de documentos para conductores
        if (this.userType === 'driver') {
            this.showDocumentsContainer();
        }
    }

    fillFormData(docType, data) {
        const fieldMappings = {
            soat: {
                'soatNumber': 'number',
                'soatIssueDate': 'issueDate',
                'soatExpiryDate': 'expiryDate',
                'soatCompany': 'company',
                'soatAmount': 'amount'
            },
            technical: {
                'technicalNumber': 'number',
                'technicalIssueDate': 'issueDate',
                'technicalExpiryDate': 'expiryDate',
                'technicalCenter': 'center',
                'technicalResult': 'result',
                'technicalAmount': 'amount'
            },
            tax: {
                'taxYear': 'year',
                'taxPaymentDate': 'paymentDate',
                'taxExpiryDate': 'expiryDate',
                'taxAmount': 'amount',
                'taxStatus': 'status'
            },
            seal: {
                'sealApplies': 'applies',
                'sealNumber': 'number',
                'sealYear': 'year',
                'sealIssueDate': 'issueDate',
                'sealExpiryDate': 'expiryDate',
                'sealStatus': 'status',
                'sealAmount': 'amount'
            }
        };

        const mapping = fieldMappings[docType];
        if (!mapping) return;

        Object.entries(mapping).forEach(([fieldId, dataKey]) => {
            const field = document.getElementById(fieldId);
            if (field && data[dataKey] !== undefined) {
                field.value = data[dataKey];
            }
        });
    }

    setupDefaultYears() {
        const currentYear = new Date().getFullYear();
        
        const taxYearInput = document.getElementById('taxYear');
        const sealYearInput = document.getElementById('sealYear');
        
        if (taxYearInput && !taxYearInput.value) {
            taxYearInput.value = currentYear;
            this.calculateTaxExpiry();
        }
        
        if (sealYearInput && !sealYearInput.value) {
            sealYearInput.value = currentYear;
            this.calculateSealExpiry();
        }
    }

    toggleAccordion(accordionId) {
        const accordion = document.getElementById(accordionId);
        const header = accordion?.parentElement?.querySelector('.accordion-header');
        const icon = header?.querySelector('.accordion-icon');
        
        if (accordion) {
            accordion.classList.toggle('active');
            if (icon) {
                icon.textContent = accordion.classList.contains('active') ? '▲' : '▼';
            }
        }
    }

    calculateSOATExpiry() {
        const issueDate = document.getElementById('soatIssueDate')?.value;
        const expiryField = document.getElementById('soatExpiryDate');
        
        if (issueDate && expiryField) {
            const issue = new Date(issueDate);
            const expiry = new Date(issue);
            expiry.setFullYear(expiry.getFullYear() + 1);
            expiryField.value = expiry.toISOString().split('T')[0];
        }
    }

    calculateTechnicalExpiry() {
        const issueDate = document.getElementById('technicalIssueDate')?.value;
        const expiryField = document.getElementById('technicalExpiryDate');
        
        if (issueDate && expiryField) {
            const issue = new Date(issueDate);
            const expiry = new Date(issue);
            expiry.setFullYear(expiry.getFullYear() + 1);
            expiryField.value = expiry.toISOString().split('T')[0];
        }
    }

    calculateTaxExpiry() {
        const year = document.getElementById('taxYear')?.value;
        const status = document.getElementById('taxStatus')?.value;
        const expiryField = document.getElementById('taxExpiryDate');
        
        if (year && expiryField) {
            let expiryYear = parseInt(year);
            
            if (status === 'paid') {
                expiryYear = parseInt(year) + 1;
            }
            
            const expiry = new Date(expiryYear, 5, 30); // 30 de junio
            expiryField.value = expiry.toISOString().split('T')[0];
        }
    }

    calculateSealExpiry() {
        const year = document.getElementById('sealYear')?.value;
        const status = document.getElementById('sealStatus')?.value;
        const expiryField = document.getElementById('sealExpiryDate');
        
        if (year && expiryField) {
            let expiryYear = parseInt(year);
            
            if (status === 'paid') {
                expiryYear = parseInt(year) + 1;
            }
            
            const expiry = new Date(expiryYear, 11, 31); // 31 de diciembre
            expiryField.value = expiry.toISOString().split('T')[0];
        }
    }

    toggleRodamientoFields() {
        const applies = document.getElementById('sealApplies')?.value;
        const fields = document.getElementById('rodamientoFields');
        
        if (!fields) return;
        
        if (applies === 'yes') {
            fields.classList.remove('hidden');
            this.setRequiredFields(['sealYear', 'sealStatus', 'sealAmount'], true);
        } else if (applies === 'no') {
            fields.classList.add('hidden');
            this.setRequiredFields(['sealYear', 'sealStatus', 'sealAmount'], false);
            this.clearSealFields();
        }
    }

    setRequiredFields(fieldIds, required) {
        fieldIds.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.required = required;
            }
        });
    }

    clearSealFields() {
        const fields = ['sealNumber', 'sealYear', 'sealIssueDate', 'sealExpiryDate', 'sealStatus', 'sealAmount'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });
    }

    updateDocumentsStatus() {
        console.log('📄 [DocumentView.updateDocumentsStatus] window.documentController:', typeof window.documentController);
        console.log('📄 [DocumentView.updateDocumentsStatus] window.app.globalControllers:', window.app?.globalControllers?.has('document'));

        if (window.documentController) {
            window.documentController.updateDocumentsStatus();
        } else {
            console.log('📄 [DocumentView.updateDocumentsStatus] Esperando a que DocumentController se inicialice...');
            // Reintentar después de que los controladores se inicialicen
            setTimeout(() => {
                console.log('📄 [DocumentView.updateDocumentsStatus] Retry - window.documentController:', typeof window.documentController);
                if (window.documentController) {
                    console.log('📄 [DocumentView.updateDocumentsStatus] DocumentController ahora disponible, actualizando...');
                    window.documentController.updateDocumentsStatus();
                } else {
                    console.warn('⚠️ [DocumentView.updateDocumentsStatus] DocumentController aún no disponible después de espera');
                    // Último intento: obtener del globalControllers
                    if (window.app?.globalControllers?.has('document')) {
                        console.log('📄 [DocumentView.updateDocumentsStatus] Recuperando desde globalControllers...');
                        const documentController = window.app.globalControllers.get('document');
                        if (documentController) {
                            window.documentController = documentController;
                            documentController.updateDocumentsStatus();
                        }
                    }
                }
            }, 500);
        }
    }

    updateDocumentsHistory() {
        if (window.documentController) {
            window.documentController.updateDocumentsHistory();
        } else {
            console.log('📄 [DocumentView.updateDocumentsHistory] Esperando a que DocumentController se inicialice...');
            // Reintentar después de que los controladores se inicialicen
            setTimeout(() => {
                if (window.documentController) {
                    console.log('📄 [DocumentView.updateDocumentsHistory] DocumentController ahora disponible, actualizando...');
                    window.documentController.updateDocumentsHistory();
                } else {
                    console.warn('⚠️ [DocumentView.updateDocumentsHistory] DocumentController aún no disponible después de espera');
                    // Último intento: obtener del globalControllers
                    if (window.app?.globalControllers?.has('document')) {
                        console.log('📄 [DocumentView.updateDocumentsHistory] Recuperando desde globalControllers...');
                        const documentController = window.app.globalControllers.get('document');
                        if (documentController) {
                            window.documentController = documentController;
                            documentController.updateDocumentsHistory();
                        }
                    }
                }
            }, 500);
        }
    }

    // Métodos de utilidad para mostrar documentos
    viewDocument(fileId) {
        if (window.documentController) {
            window.documentController.viewDocument(fileId);
        }
    }

    downloadDocument(fileId) {
        if (window.documentController) {
            window.documentController.downloadDocument(fileId);
        }
    }
}

// Asegurar que la clase está disponible globalmente
window.DocumentView = DocumentView;
console.log('✅ DocumentView cargada y disponible globalmente');