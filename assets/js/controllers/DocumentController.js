/**
 * Controlador de Documentos - Gestión de documentos del vehículo
 */
class DocumentController extends BaseController {
    constructor() {
        super();
        this.currentVehicleId = null;
        this.documentFiles = {};
        this.initialize();
    }

    initialize() {
        super.initialize();
        if (!this.requireAuth()) return;
        
        this.setupDocumentForms();
        this.setupVehicleSelector();
        this.loadDocumentFiles();
        
        // Si es conductor, configurar automáticamente su vehículo
        if (this.currentUser.type === 'driver') {
            this.setupDriverDocuments();
        }
    }

    setupDocumentForms() {
        const forms = ['soatForm', 'technicalForm', 'taxForm', 'sealForm'];
        
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', (e) => this.handleDocumentSubmit(e, formId));
            }
        });

        // Setup acordeones
        window.toggleAccordion = (accordionId) => this.toggleAccordion(accordionId);
        
        // Setup cálculos automáticos
        this.setupAutomaticCalculations();
        
        // Setup file handlers
        this.setupFileHandlers();
    }

    setupAutomaticCalculations() {
        // SOAT
        const soatIssueDate = document.getElementById('soatIssueDate');
        if (soatIssueDate) {
            soatIssueDate.addEventListener('change', () => this.calculateSOATExpiry());
        }

        // Tecnomecánica
        const technicalIssueDate = document.getElementById('technicalIssueDate');
        if (technicalIssueDate) {
            technicalIssueDate.addEventListener('change', () => this.calculateTechnicalExpiry());
        }

        // Impuesto vehicular
        const taxYear = document.getElementById('taxYear');
        const taxStatus = document.getElementById('taxStatus');
        if (taxYear) taxYear.addEventListener('change', () => this.calculateTaxExpiry());
        if (taxStatus) taxStatus.addEventListener('change', () => this.calculateTaxExpiry());

        // Impuesto de rodamiento
        const sealYear = document.getElementById('sealYear');
        const sealStatus = document.getElementById('sealStatus');
        const sealApplies = document.getElementById('sealApplies');
        
        if (sealYear) sealYear.addEventListener('change', () => this.calculateSealExpiry());
        if (sealStatus) sealStatus.addEventListener('change', () => this.calculateSealExpiry());
        if (sealApplies) sealApplies.addEventListener('change', () => this.toggleRodamientoFields());
    }

    setupFileHandlers() {
        const fileInputs = ['soatFile', 'technicalFile', 'taxFile', 'sealFile'];
        
        fileInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', (e) => this.handleFileSelect(e));
            }
        });
    }

    setupVehicleSelector() {
        const selector = document.getElementById('documentVehicleSelect');
        if (selector) {
            selector.addEventListener('change', () => this.loadVehicleDocuments());
            this.updateVehicleSelector();
        }
    }

    setupDriverDocuments() {
        setTimeout(() => {
            const session = StorageService.getUserSession();
            if (session && session.driverId) {
                const driver = Driver.getById(session.driverId);
                if (driver && driver.vehicleId) {
                    // Establecer el vehículo del conductor directamente
                    this.currentVehicleId = driver.vehicleId;
                    
                    // Pre-seleccionar el vehículo del conductor si existe selector
                    const vehicleSelect = document.getElementById('documentVehicleSelect');
                    if (vehicleSelect) {
                        vehicleSelect.value = driver.vehicleId;
                        vehicleSelect.disabled = true;
                    }
                    
                    // Cargar los documentos del vehículo
                    this.loadDocumentData();
                    this.updateDocumentsStatus();
                    this.updateDocumentsHistory();
                    this.setupDefaultYears();
                    
                    // Modificar título y ocultar selector
                    this.setupDriverInterface();
                } else {
                    this.showDriverWithoutVehicle();
                }
            } else {
                this.showDriverWithoutVehicle();
            }
        }, 100);
    }

    setupDriverInterface() {
        const documentsSection = document.getElementById('documents');
        if (documentsSection) {
            const title = documentsSection.querySelector('h2');
            if (title) {
                title.textContent = '📄 Documentos de Mi Vehículo';
            }
            
            // Ocultar el selector de vehículo
            const vehicleCard = documentsSection.querySelector('.card');
            if (vehicleCard) {
                vehicleCard.style.display = 'none';
            }
            
            // Mostrar contenedor de documentos
            const documentsContainer = document.getElementById('documentsContainer');
            if (documentsContainer) {
                documentsContainer.classList.remove('hidden');
            }
        }
    }

    showDriverWithoutVehicle() {
        const documentsSection = document.getElementById('documents');
        if (documentsSection) {
            documentsSection.innerHTML = `
                <h2>📄 Documentos de Mi Vehículo</h2>
                <div class="card">
                    <h3>⚠️ Sin Vehículo Asignado</h3>
                    <p>No tienes un vehículo asignado. Contacta al administrador para que te asigne un vehículo.</p>
                </div>
            `;
        }
    }

    updateVehicleSelector() {
        const selector = document.getElementById('documentVehicleSelect');
        if (!selector) return;

        const vehicles = Vehicle.getAll();
        const currentValue = selector.value;
        
        selector.innerHTML = '<option value="">Seleccionar vehículo</option>' +
            vehicles.map(vehicle => 
                `<option value="${vehicle.id}">${vehicle.plate} - ${vehicle.brand} ${vehicle.model}</option>`
            ).join('');
        
        if (currentValue && vehicles.find(v => v.id == currentValue)) {
            selector.value = currentValue;
        }
    }

    loadVehicleDocuments() {
        const vehicleId = document.getElementById('documentVehicleSelect').value;
        const container = document.getElementById('documentsContainer');
        
        if (!vehicleId) {
            container.classList.add('hidden');
            return;
        }
        
        this.currentVehicleId = parseInt(vehicleId);
        container.classList.remove('hidden');
        
        this.loadDocumentData();
        this.updateDocumentsStatus();
        this.updateDocumentsHistory();
        this.setupDefaultYears();
    }

    loadDocumentData() {
        if (!this.currentVehicleId) return;
        
        const vehicleDocuments = StorageService.getVehicleDocuments();
        const docs = vehicleDocuments[this.currentVehicleId] || {};
        
        // Cargar SOAT
        if (docs.soat) {
            this.fillFormData('soat', docs.soat);
        }
        
        // Cargar Tecnomecánica
        if (docs.technical) {
            this.fillFormData('technical', docs.technical);
        }
        
        // Cargar Impuesto Vehicular
        if (docs.tax) {
            this.fillFormData('tax', docs.tax);
        }
        
        // Cargar Impuesto de Rodamiento
        if (docs.seal) {
            this.fillFormData('seal', docs.seal);
            this.toggleRodamientoFields();
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
            } else if (!field) {
                console.warn(`📄 [DocumentController.fillFormData] Campo ${fieldId} no encontrado en DOM para tipo ${docType}`);
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
        } else if (!taxYearInput) {
            console.warn('📄 [DocumentController.setupDefaultYears] Campo taxYear no encontrado en DOM');
        }
        
        if (sealYearInput && !sealYearInput.value) {
            sealYearInput.value = currentYear;
            this.calculateSealExpiry();
        } else if (!sealYearInput) {
            console.warn('📄 [DocumentController.setupDefaultYears] Campo sealYear no encontrado en DOM');
        }
    }

    // Cálculos automáticos de fechas
    calculateSOATExpiry() {
        const issueDateField = document.getElementById('soatIssueDate');
        const expiryField = document.getElementById('soatExpiryDate');
        
        if (!issueDateField || !expiryField) {
            console.warn('📄 [DocumentController.calculateSOATExpiry] Campos no encontrados en DOM');
            return;
        }
        
        const issueDate = issueDateField.value;
        if (issueDate) {
            const issue = new Date(issueDate);
            const expiry = new Date(issue);
            expiry.setFullYear(expiry.getFullYear() + 1);
            expiryField.value = expiry.toISOString().split('T')[0];
        }
    }

    calculateTechnicalExpiry() {
        const issueDateField = document.getElementById('technicalIssueDate');
        const expiryField = document.getElementById('technicalExpiryDate');
        
        if (!issueDateField || !expiryField) {
            console.warn('📄 [DocumentController.calculateTechnicalExpiry] Campos no encontrados en DOM');
            return;
        }
        
        const issueDate = issueDateField.value;
        if (issueDate) {
            const issue = new Date(issueDate);
            const expiry = new Date(issue);
            expiry.setFullYear(expiry.getFullYear() + 1);
            expiryField.value = expiry.toISOString().split('T')[0];
        }
    }

    calculateTaxExpiry() {
        const yearField = document.getElementById('taxYear');
        const statusField = document.getElementById('taxStatus');
        const expiryField = document.getElementById('taxExpiryDate');
        
        if (!yearField || !statusField || !expiryField) {
            console.warn('📄 [DocumentController.calculateTaxExpiry] Campos no encontrados en DOM');
            return;
        }
        
        const year = yearField.value;
        const status = statusField.value;
        
        if (year) {
            let expiryYear = parseInt(year);
            
            if (status === 'paid') {
                expiryYear = parseInt(year) + 1;
            }
            
            const expiry = new Date(expiryYear, 5, 30); // 30 de junio
            expiryField.value = expiry.toISOString().split('T')[0];
        }
    }

    calculateSealExpiry() {
        const yearField = document.getElementById('sealYear');
        const statusField = document.getElementById('sealStatus');
        const expiryField = document.getElementById('sealExpiryDate');
        
        if (!yearField || !statusField || !expiryField) {
            console.warn('📄 [DocumentController.calculateSealExpiry] Campos no encontrados en DOM');
            return;
        }
        
        const year = yearField.value;
        const status = statusField.value;
        
        if (year) {
            let expiryYear = parseInt(year);
            
            if (status === 'paid') {
                expiryYear = parseInt(year) + 1;
            }
            
            const expiry = new Date(expiryYear, 11, 31); // 31 de diciembre
            expiryField.value = expiry.toISOString().split('T')[0];
        }
    }

    toggleRodamientoFields() {
        const appliesElement = document.getElementById('sealApplies');
        const fields = document.getElementById('rodamientoFields');
        
        // Verificar que los elementos existan antes de acceder a sus propiedades
        if (!appliesElement || !fields) {
            console.warn('📄 [DocumentController.toggleRodamientoFields] Elementos no encontrados en DOM, saltando...');
            return;
        }
        
        const applies = appliesElement.value;
        
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
            } else {
                console.warn(`📄 [DocumentController.setRequiredFields] Campo ${fieldId} no encontrado en DOM`);
            }
        });
    }

    clearSealFields() {
        const fields = ['sealNumber', 'sealYear', 'sealIssueDate', 'sealExpiryDate', 'sealStatus', 'sealAmount'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            } else {
                console.warn(`📄 [DocumentController.clearSealFields] Campo ${fieldId} no encontrado en DOM`);
            }
        });
    }

    async handleDocumentSubmit(e, formId) {
        e.preventDefault();
        
        // Para conductores, intentar establecer el vehículo automáticamente si no está establecido
        if (!this.currentVehicleId && this.currentUser.type === 'driver') {
            const session = StorageService.getUserSession();
            if (session && session.driverId) {
                const driver = Driver.getById(session.driverId);
                if (driver && driver.vehicleId) {
                    this.currentVehicleId = driver.vehicleId;
                }
            }
        }
        
        if (!this.currentVehicleId) {
            this.showError('Debe seleccionar un vehículo primero');
            return;
        }

        const docType = this.getDocTypeFromFormId(formId);
        if (!docType) {
            this.showError('Tipo de documento no válido');
            return;
        }

        try {
            this.showLoading('Guardando documento...');
            
            const formData = new FormData(e.target);
            const documentData = this.buildDocumentData(docType, formData);
            
            // Validar datos
            const validation = this.validateDocumentData(docType, documentData);
            if (!validation.isValid) {
                this.hideLoading();
                this.showError(validation.errors.join(', '));
                return;
            }

            // Manejar archivo si existe
            const fileInput = document.getElementById(`${docType}File`);
            if (fileInput && fileInput.files.length > 0) {
                const fileId = await this.handleFileUpload(fileInput.files[0]);
                documentData.fileId = fileId;
            }

            // Guardar documento
            documentData.vehicleId = this.currentVehicleId;
            documentData.type = docType;
            
            const savedDocument = Document.save(documentData);
            
            this.hideLoading();
            this.showSuccess(`${savedDocument.getTypeName()} guardado exitosamente`);

            // Actualizar la interfaz de documentos de forma segura
            try {
                this.updateDocumentsStatus();
                this.updateDocumentsHistory();

                // Actualizar dashboard SOLO si estamos en la ruta de dashboard
                const currentHash = window.location.hash.substring(1);
                if (currentHash === 'dashboard' &&
                    window.dashboardController &&
                    typeof window.dashboardController.updateDocumentAlerts === 'function') {
                    setTimeout(() => {
                        try {
                            window.dashboardController.updateDocumentAlerts();
                        } catch (dashError) {
                            console.warn('⚠️ Error actualizando alertas del dashboard:', dashError);
                        }
                    }, 100);
                }
            } catch (updateError) {
                console.warn('⚠️ Error actualizando interfaz después de guardar:', updateError);
                // No propagar el error, el documento ya fue guardado exitosamente
            }

        } catch (error) {
            this.hideLoading();
            console.error('❌ [DocumentController] Error al guardar documento:', error);
            this.handleError(error, 'Error al guardar documento');
        }
    }

    getDocTypeFromFormId(formId) {
        const mapping = {
            'soatForm': 'soat',
            'technicalForm': 'technical',
            'taxForm': 'tax',
            'sealForm': 'seal'
        };
        return mapping[formId];
    }

    buildDocumentData(docType, formData) {
        const builders = {
            soat: () => ({
                number: formData.get('soatNumber') || document.getElementById('soatNumber').value,
                issueDate: formData.get('soatIssueDate') || document.getElementById('soatIssueDate').value,
                expiryDate: formData.get('soatExpiryDate') || document.getElementById('soatExpiryDate').value,
                company: formData.get('soatCompany') || document.getElementById('soatCompany').value,
                amount: parseFloat(formData.get('soatAmount') || document.getElementById('soatAmount').value || 0)
            }),
            technical: () => ({
                number: formData.get('technicalNumber') || document.getElementById('technicalNumber').value,
                issueDate: formData.get('technicalIssueDate') || document.getElementById('technicalIssueDate').value,
                expiryDate: formData.get('technicalExpiryDate') || document.getElementById('technicalExpiryDate').value,
                center: formData.get('technicalCenter') || document.getElementById('technicalCenter').value,
                result: formData.get('technicalResult') || document.getElementById('technicalResult').value,
                amount: parseFloat(formData.get('technicalAmount') || document.getElementById('technicalAmount').value || 0)
            }),
            tax: () => ({
                year: parseInt(formData.get('taxYear') || document.getElementById('taxYear').value),
                paymentDate: formData.get('taxPaymentDate') || document.getElementById('taxPaymentDate').value,
                expiryDate: formData.get('taxExpiryDate') || document.getElementById('taxExpiryDate').value,
                amount: parseFloat(formData.get('taxAmount') || document.getElementById('taxAmount').value || 0),
                status: formData.get('taxStatus') || document.getElementById('taxStatus').value
            }),
            seal: () => {
                const applies = formData.get('sealApplies') || document.getElementById('sealApplies').value;
                const data = { applies };
                
                if (applies === 'yes') {
                    data.number = formData.get('sealNumber') || document.getElementById('sealNumber').value;
                    data.year = parseInt(formData.get('sealYear') || document.getElementById('sealYear').value);
                    data.issueDate = formData.get('sealIssueDate') || document.getElementById('sealIssueDate').value;
                    data.expiryDate = formData.get('sealExpiryDate') || document.getElementById('sealExpiryDate').value;
                    data.status = formData.get('sealStatus') || document.getElementById('sealStatus').value;
                    data.amount = parseFloat(formData.get('sealAmount') || document.getElementById('sealAmount').value || 0);
                }
                
                return data;
            }
        };

        const builder = builders[docType];
        return builder ? builder() : {};
    }

    validateDocumentData(docType, data) {
        // Usar el método de validación del modelo Document
        const tempDocument = new Document({ ...data, type: docType, vehicleId: this.currentVehicleId });
        return tempDocument.validate();
    }

    async handleFileUpload(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const fileId = Date.now().toString();
                    const fileData = {
                        name: file.name,
                        type: file.type,
                        data: e.target.result,
                        uploadDate: new Date().toISOString()
                    };
                    
                    this.documentFiles[fileId] = fileData;
                    StorageService.setDocumentFiles(this.documentFiles);
                    
                    resolve(fileId);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamaño del archivo (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showError('El archivo es demasiado grande. Máximo 5MB permitido.');
            e.target.value = '';
            return;
        }

        // Validar tipo de archivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG) y PDF.');
            e.target.value = '';
            return;
        }

        this.showInfo(`Archivo seleccionado: ${file.name}`);
    }

    loadDocumentFiles() {
        this.documentFiles = StorageService.getDocumentFiles();
    }

    updateDocumentsStatus() {
        if (!this.currentVehicleId) {
            console.log('📄 [updateDocumentsStatus] No hay vehículo seleccionado');
            return;
        }

        const container = document.getElementById('documentsStatus');
        if (!container) {
            console.warn('⚠️ [updateDocumentsStatus] Contenedor documentsStatus no encontrado en DOM');
            return;
        }

        const vehicleDocuments = StorageService.getVehicleDocuments();
        const docs = vehicleDocuments[this.currentVehicleId] || {};
        
        const documentTypes = [
            { key: 'soat', name: 'SOAT', icon: '🛡️' },
            { key: 'technical', name: 'Tecnomecánica', icon: '🔧' },
            { key: 'tax', name: 'Impuesto Vehicular', icon: '💰' },
            { key: 'seal', name: 'Impuesto Rodamiento(Semaforizacion) ', icon: '🚗' }
        ];
        
        container.innerHTML = documentTypes.map(docType => {
            const doc = docs[docType.key];
            let status, color, statusText, daysInfo = '';
            
            if (docType.key === 'seal' && doc && doc.applies === 'no') {
                status = 'exempt';
                color = '#6c757d';
                statusText = '⚪ No aplica';
                daysInfo = '<small>Vehículo exento</small>';
            } else {
                const documentInstance = new Document({ ...doc, type: docType.key });
                status = documentInstance.getStatus();
                color = this.getStatusColor(status);
                statusText = this.getStatusText(status);
                
                if (doc && doc.expiryDate && status !== 'exempt') {
                    const daysToExpiry = documentInstance.getDaysToExpiry();
                    if (daysToExpiry !== null) {
                        if (daysToExpiry >= 0) {
                            daysInfo = `<small>${daysToExpiry} días restantes</small>`;
                        } else {
                            daysInfo = `<small>Vencido hace ${Math.abs(daysToExpiry)} días</small>`;
                        }
                    }
                }
            }
            
            return `
                <div class="stat-card" style="background-color: ${color};">
                    <div>${docType.icon}</div>
                    <div style="font-size: 1.2em; font-weight: bold;">${docType.name}</div>
                    <div>${statusText}</div>
                    ${daysInfo}
                    ${doc && doc.expiryDate && status !== 'exempt' ? 
                        `<small>Vence: ${this.formatDate(doc.expiryDate)}</small>` : ''}
                </div>
            `;
        }).join('');
    }

    updateDocumentsHistory() {
        if (!this.currentVehicleId) {
            console.log('📄 [updateDocumentsHistory] No hay vehículo seleccionado');
            return;
        }

        const container = document.getElementById('documentsHistory');
        if (!container) {
            console.warn('⚠️ [updateDocumentsHistory] Contenedor documentsHistory no encontrado en DOM');
            return;
        }

        const vehicleDocuments = StorageService.getVehicleDocuments();
        const docs = vehicleDocuments[this.currentVehicleId] || {};
        
        let historyHTML = '';
        
        Object.entries(docs).forEach(([docType, docData]) => {
            if (docData) {
                if (docType === 'seal' && docData.applies === 'no') {
                    historyHTML += `
                        <div class="expense-item">
                            <div class="expense-header">
                                <strong>🚗 Impuesto de Rodamiento</strong>
                                <span style="color: #6c757d;">⚪ No aplica</span>
                            </div>
                            <p>Este vehículo está exento del impuesto de rodamiento</p>
                        </div>
                    `;
                } else if (docData.expiryDate) {
                    const documentInstance = new Document({ ...docData, type: docType });
                    const status = documentInstance.getStatus();
                    const statusText = this.getStatusText(status);
                    
                    historyHTML += `
                        <div class="expense-item">
                            <div class="expense-header">
                                <strong>${documentInstance.getTypeName()}</strong>
                                <span>${statusText}</span>
                            </div>
                            <p><strong>Número:</strong> ${docData.number || 'N/A'}</p>
                            <p><strong>Vence:</strong> ${this.formatDate(docData.expiryDate)}</p>
                            <p><strong>Valor:</strong> ${this.formatCurrency(docData.amount || 0)}</p>
                            ${docData.fileId ? `<button class="btn" onclick="documentController.viewDocument('${docData.fileId}')">Ver Documento</button>` : ''}
                        </div>
                    `;
                }
            }
        });
        
        container.innerHTML = historyHTML || '<p>No hay documentos registrados para este vehículo.</p>';
    }

    getStatusColor(status) {
        const colors = {
            'expired': '#e74c3c',
            'warning': '#f39c12', 
            'valid': '#27ae60',
            'exempt': '#6c757d',
            'unknown': '#95a5a6'
        };
        return colors[status] || colors.unknown;
    }

    getStatusText(status) {
        const texts = {
            'expired': '🔴 Vencido',
            'warning': '🟡 Por vencer',
            'valid': '🟢 Vigente',
            'exempt': '⚪ No aplica',
            'unknown': '⚪ Sin datos'
        };
        return texts[status] || texts.unknown;
    }

    viewDocument(fileId) {
        const fileData = this.documentFiles[fileId];
        if (!fileData) {
            this.showError('Archivo no encontrado');
            return;
        }

        let content;
        if (fileData.type.startsWith('image/')) {
            content = `<img src="${fileData.data}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">`;
        } else if (fileData.type === 'application/pdf') {
            content = `<embed src="${fileData.data}" type="application/pdf" style="width: 100%; height: 70vh; border-radius: 8px;">`;
        } else {
            content = `<p>No se puede previsualizar este tipo de archivo: ${fileData.type}</p>`;
        }

        this.showModal('Ver Documento', content, [
            {
                text: 'Descargar',
                class: 'btn',
                action: () => this.downloadDocument(fileId),
                closeModal: false
            },
            {
                text: 'Cerrar',
                class: 'btn btn-danger'
            }
        ]);
    }

    downloadDocument(fileId) {
        const fileData = this.documentFiles[fileId];
        if (!fileData) return;

        const link = document.createElement('a');
        link.href = fileData.data;
        link.download = fileData.name;
        link.click();
    }

    // Obtener documentos próximos a vencer
    getExpiringDocuments(days = 30) {
        return Document.getExpiring(days);
    }

    // Obtener documentos vencidos
    getExpiredDocuments() {
        return Document.getExpired();
    }

    // Generar alertas para el dashboard
    generateDocumentAlerts() {
        const alerts = [];
        const expiring = this.getExpiringDocuments();
        const expired = this.getExpiredDocuments();

        expired.forEach(doc => {
            const vehicle = Vehicle.getById(doc.vehicleId);
            if (vehicle) {
                alerts.push({
                    type: 'error',
                    message: `${doc.getTypeName()} del vehículo ${vehicle.plate} VENCIDO hace ${Math.abs(doc.getDaysToExpiry())} días`,
                    vehicleId: doc.vehicleId,
                    documentType: doc.type
                });
            }
        });

        expiring.forEach(doc => {
            const vehicle = Vehicle.getById(doc.vehicleId);
            if (vehicle) {
                let message = `${doc.getTypeName()} del vehículo ${vehicle.plate} vence en ${doc.getDaysToExpiry()} días`;
                
                // Mensaje especial para impuesto vehicular
                if (doc.type === 'tax') {
                    const today = new Date();
                    const currentMonth = today.getMonth();
                    const currentYear = today.getFullYear();
                    const expiryYear = new Date(doc.expiryDate).getFullYear();
                    
                    if (currentYear === expiryYear && currentMonth >= 5) {
                        message += '. Confirme la fecha exacta con la entidad territorial correspondiente.';
                    }
                }
                
                alerts.push({
                    type: 'warning',
                    message: message,
                    vehicleId: doc.vehicleId,
                    documentType: doc.type
                });
            }
        });

        return alerts;
    }
}