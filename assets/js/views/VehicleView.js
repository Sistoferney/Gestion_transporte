/**
 * Vista de Vehículos - Gestión de la interfaz de vehículos
 */
class VehicleView extends BaseView {
    constructor(containerId = 'vehicles') {
        super(containerId);
        this.isEditing = false;
        this.editingId = null;
        this.isSaving = false; // Flag para evitar guardados múltiples
        this.hasBeenRendered = false; // Flag para tracking de renderizado
        this.initialize();
    }

    render() {
        const container = this.getContainer();
        if (!container) return '';
        
        // Verificar si ya ha sido renderizado anteriormente
        if (!this.hasBeenRendered) {
            console.log('🚚 [VehicleView.render] Generando contenido inicial...');
            const content = this.generateContent();
            container.innerHTML = content;
            this.setupEventListeners();
            this.hasBeenRendered = true; // Marcar como renderizado
        } else {
            console.log('🚚 [VehicleView.render] Contenido HTML ya existe, solo actualizando datos...');
            // Si por alguna razón el contenedor está vacío pero ya había sido renderizado,
            // re-renderizar para evitar pantalla en blanco
            if (container.innerHTML.length === 0) {
                console.log('🚚 [VehicleView.render] Contenedor vacío detectado, re-renderizando...');
                const content = this.generateContent();
                container.innerHTML = content;
                this.setupEventListeners();
            }
        }
        
        // Siempre cargar/actualizar los datos de vehículos
        this.loadVehicles();
        
        return container.innerHTML;
    }

    generateContent() {
        return `
            <h2>🚚 Gestión de Vehículos</h2>
            
            <!-- Formulario de vehículos -->
            <div class="card">
                <h3 id="vehicleFormTitle">Registrar Nuevo Vehículo</h3>
                <form id="vehicleForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="vehiclePlate">Placa:</label>
                            <input type="text" id="vehiclePlate" name="plate" required 
                                   placeholder="ABC123" style="text-transform: uppercase;"
                                   autocomplete="off">
                        </div>
                        <div class="form-group">
                            <label for="vehicleBrand">Marca:</label>
                            <input type="text" id="vehicleBrand" name="brand" required 
                                   placeholder="Toyota, Chevrolet, etc."
                                   autocomplete="organization">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="vehicleModel">Modelo:</label>
                            <input type="text" id="vehicleModel" name="model" required 
                                   placeholder="Hilux, NPR, etc."
                                   autocomplete="off">
                        </div>
                        <div class="form-group">
                            <label for="vehicleYear">Año:</label>
                            <input type="number" id="vehicleYear" name="year" required 
                                   min="1990" max="${new Date().getFullYear() + 1}" 
                                   value="${new Date().getFullYear()}"
                                   autocomplete="off">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn">
                            <span id="submitButtonText">💾 Guardar Vehículo</span>
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="vehicleView.cancelEdit()" id="cancelButton" style="display: none;">
                            ❌ Cancelar
                        </button>
                    </div>
                </form>
            </div>

            <!-- Herramientas de gestión -->
            <div class="card">
                <h3>🔧 Herramientas</h3>
                <div class="tools-container">
                    <div class="form-group">
                        <label for="vehicleSearch">Buscar vehículos:</label>
                        <input type="text" id="vehicleSearch" placeholder="Buscar por placa, marca o modelo..." 
                               onkeyup="vehicleView.handleSearch(this.value)"
                               autocomplete="off">
                    </div>
                    <div class="form-actions">
                        <button class="btn" onclick="vehicleView.showStats()">
                            📊 Ver Estadísticas
                        </button>
                        <button class="btn" onclick="vehicleController.exportVehicles()">
                            📤 Exportar
                        </button>
                        <label class="btn" for="importFile">
                            📥 Importar
                        </label>
                        <input type="file" id="importFile" accept=".json" style="display: none;" 
                               onchange="vehicleView.handleImport(this.files[0])">
                    </div>
                </div>
            </div>

            <!-- Lista de vehículos -->
            <div class="card">
                <h3>📋 Lista de Vehículos</h3>
                <div id="vehiclesList">
                    <p>Cargando vehículos...</p>
                </div>
            </div>
        `;
    }

    bindEvents() {
        super.bindEvents();
        
        // Eventos del formulario
        this.delegate('submit', '#vehicleForm', this.handleFormSubmit.bind(this));
        this.delegate('input', '#vehiclePlate', this.handlePlateInput.bind(this));
        this.delegate('keyup', '#vehicleSearch', this.handleSearchKeyup.bind(this));
        
        // Eventos de la lista
        this.delegate('click', '.edit-vehicle-btn', this.handleEditClick.bind(this));
        this.delegate('click', '.delete-vehicle-btn', this.handleDeleteClick.bind(this));
    }

    afterRender() {
        super.afterRender();
        this.loadVehicles();
    }

    handleFormSubmit(e, form) {
        e.preventDefault();
        e.stopPropagation();
        console.log('📝 [VehicleView.handleFormSubmit] Formulario enviado');
        
        // Evitar guardados múltiples
        if (this.isSaving) {
            console.log('⚠️ [VehicleView.handleFormSubmit] Guardado en progreso, ignorando...');
            return false;
        }
        
        const formData = new FormData(form);
        const vehicleData = {
            plate: (formData.get('plate') || '').trim(),
            brand: (formData.get('brand') || '').trim(),
            model: (formData.get('model') || '').trim(),
            year: parseInt(formData.get('year')) || 0
        };

        console.log('📝 [VehicleView.handleFormSubmit] Datos extraídos:', vehicleData);

        // Verificar que los datos no estén vacíos antes de proceder
        if (!vehicleData.plate && !vehicleData.brand && !vehicleData.model) {
            console.log('⚠️ [VehicleView.handleFormSubmit] Datos vacíos detectados, ignorando envío');
            return false;
        }
        
        this.isSaving = true;

        if (this.isEditing) {
            this.updateVehicle(this.editingId, vehicleData);
        } else {
            this.createVehicle(vehicleData);
        }
        
        return false;
    }

    handlePlateInput(e, input) {
        // Convertir a mayúsculas automáticamente
        input.value = input.value.toUpperCase();
    }

    handleSearchKeyup(e, input) {
        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch(input.value);
        }, 300);
    }

    handleEditClick(e, button) {
        const vehicleId = button.dataset.vehicleId;
        this.editVehicle(parseInt(vehicleId));
    }

    handleDeleteClick(e, button) {
        const vehicleId = button.dataset.vehicleId;
        this.deleteVehicle(parseInt(vehicleId));
    }

    handleSearch(query) {
        this.performSearch(query);
    }

    handleImport(file) {
        if (!file) return;
        
        if (window.vehicleController) {
            window.vehicleController.importVehicles(file);
        }
    }

    async loadVehicles() {
        try {
            console.log('🚚 [VehicleView.loadVehicles] Iniciando carga de vehículos...');
            
            // Mostrar loading solo en el contenedor de la lista, no en toda la vista
            const listContainer = document.getElementById('vehiclesList');
            if (listContainer) {
                listContainer.innerHTML = '<p style="text-align: center; padding: 20px;">🔄 Cargando vehículos...</p>';
            }
            
            // Cargar vehículos directamente desde el modelo
            const vehicles = Vehicle.getAll();
            console.log('🚚 [VehicleView.loadVehicles] Vehículos obtenidos:', vehicles.length);
            
            // Actualizar la lista inmediatamente
            this.updateVehiclesList(vehicles);
            
            console.log('✅ [VehicleView.loadVehicles] Carga completada exitosamente');
            
        } catch (error) {
            console.error('❌ [VehicleView.loadVehicles] Error:', error);
            const listContainer = document.getElementById('vehiclesList');
            if (listContainer) {
                listContainer.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">❌ Error al cargar vehículos</p>';
            }
        }
    }

    async createVehicle(vehicleData) {
        try {
            console.log('💾 [VehicleView.createVehicle] Iniciando guardado de vehículo:', vehicleData);
            
            // Validaciones
            const validation = this.validateVehicleData(vehicleData);
            if (!validation.isValid) {
                console.log('❌ [VehicleView.createVehicle] Validación fallida:', validation.errors);
                this.showError(validation.errors.join(', '));
                this.isSaving = false; // Liberar el flag en caso de validación fallida
                return;
            }

            // Guardar directamente usando el modelo (evitar duplicación)
            const vehicle = Vehicle.save(vehicleData);
            console.log('✅ [VehicleView.createVehicle] Vehículo guardado:', vehicle);
            
            this.showSuccess('Vehículo registrado exitosamente');
            
            // Usar setTimeout para evitar conflictos con eventos pendientes
            setTimeout(() => {
                this.resetForm();
                this.loadVehicles();
                
                // Actualizar dashboard si existe
                if (window.dashboardController) {
                    console.log('🔄 [VehicleView.createVehicle] Actualizando dashboard...');
                    window.dashboardController.calculateStats();
                    window.dashboardController.updateStats();
                }
                
                this.isSaving = false; // Liberar el flag después de todas las operaciones
            }, 100);
            
        } catch (error) {
            console.error('❌ [VehicleView.createVehicle] Error al guardar vehículo:', error);
            this.showError(`Error al guardar vehículo: ${error.message || 'Error desconocido'}`);
            this.isSaving = false; // Liberar el flag en caso de error
        }
    }

    async updateVehicle(vehicleId, vehicleData) {
        try {
            const validation = this.validateVehicleData(vehicleData);
            if (!validation.isValid) {
                this.showError(validation.errors.join(', '));
                return;
            }

            this.showLoading('Actualizando vehículo...');
            
            if (window.vehicleController) {
                await window.vehicleController.updateVehicle(vehicleId, vehicleData);
            } else {
                vehicleData.id = vehicleId;
                Vehicle.save(vehicleData);
                this.showSuccess('Vehículo actualizado exitosamente');
            }
            
            this.cancelEdit();
            this.loadVehicles();
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError('Error al actualizar vehículo');
        }
    }

    editVehicle(vehicleId) {
        const vehicle = Vehicle.getById(vehicleId);
        if (!vehicle) {
            this.showError('Vehículo no encontrado');
            return;
        }

        // Llenar formulario
        document.getElementById('vehiclePlate').value = vehicle.plate;
        document.getElementById('vehicleBrand').value = vehicle.brand;
        document.getElementById('vehicleModel').value = vehicle.model;
        document.getElementById('vehicleYear').value = vehicle.year;

        // Cambiar a modo edición
        this.isEditing = true;
        this.editingId = vehicleId;

        // Actualizar UI
        document.getElementById('vehicleFormTitle').textContent = 'Editar Vehículo';
        document.getElementById('submitButtonText').textContent = '✏️ Actualizar Vehículo';
        document.getElementById('cancelButton').style.display = 'inline-block';

        // Scroll al formulario
        this.scrollToElement('#vehicleForm');
    }

    cancelEdit() {
        this.isEditing = false;
        this.editingId = null;
        
        // Resetear formulario y UI
        this.resetForm();
        document.getElementById('vehicleFormTitle').textContent = 'Registrar Nuevo Vehículo';
        document.getElementById('submitButtonText').textContent = '💾 Guardar Vehículo';
        document.getElementById('cancelButton').style.display = 'none';
    }

    deleteVehicle(vehicleId) {
        const vehicle = Vehicle.getById(vehicleId);
        if (!vehicle) {
            this.showError('Vehículo no encontrado');
            return;
        }

        // Verificar dependencias
        const assignedDriver = Driver.getByVehicleId(vehicleId);
        if (assignedDriver) {
            this.showError(`No se puede eliminar el vehículo. Está asignado al conductor: ${assignedDriver.name}`);
            return;
        }

        const vehicleExpenses = Expense.getByVehicleId(vehicleId);
        if (vehicleExpenses.length > 0) {
            this.showError(`No se puede eliminar el vehículo. Tiene ${vehicleExpenses.length} gastos registrados`);
            return;
        }

        this.showConfirmDialog(
            `¿Está seguro de eliminar el vehículo ${vehicle.plate}?`,
            () => this.confirmDeleteVehicle(vehicleId)
        );
    }

    async confirmDeleteVehicle(vehicleId) {
        try {
            this.showLoading('Eliminando vehículo...');
            
            Vehicle.delete(vehicleId);
            this.showSuccess('Vehículo eliminado exitosamente');
            this.loadVehicles();
            
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError('Error al eliminar vehículo');
        }
    }

    performSearch(query) {
        try {
            if (!query || query.trim().length === 0) {
                this.loadVehicles();
                return;
            }

            const results = Vehicle.search(query);
            this.updateVehiclesList(results);
            
            if (results.length === 0) {
                this.showInfo('No se encontraron vehículos que coincidan con la búsqueda');
            }
        } catch (error) {
            this.showError('Error en la búsqueda');
        }
    }

    updateVehiclesList(vehicles) {
        console.log('📋 [VehicleView.updateVehiclesList] Actualizando lista con', vehicles?.length || 0, 'vehículos');
        
        const container = document.getElementById('vehiclesList');
        if (!container) {
            console.error('❌ [VehicleView.updateVehiclesList] Container vehiclesList no encontrado');
            return;
        }
        
        console.log('📋 [VehicleView.updateVehiclesList] Container encontrado, generando HTML...');

        if (!vehicles || vehicles.length === 0) {
            console.log('📭 [VehicleView.updateVehiclesList] No hay vehículos para mostrar');
            container.innerHTML = '<p style="text-align: center; padding: 20px;">📭 No hay vehículos registrados</p>';
            return;
        }

        const vehiclesHTML = vehicles.map(vehicle => `
            <div class="expense-item vehicle-item" data-vehicle-id="${vehicle.id}">
                <div class="expense-header">
                    <div class="vehicle-info">
                        <strong class="vehicle-plate">${vehicle.plate}</strong>
                        <p class="vehicle-details">${vehicle.brand} ${vehicle.model} (${vehicle.year})</p>
                        <small class="vehicle-meta">
                            Creado: ${this.formatDate(vehicle.createdAt)}
                            ${vehicle.updatedAt !== vehicle.createdAt ? ` | Actualizado: ${this.formatDate(vehicle.updatedAt)}` : ''}
                        </small>
                    </div>
                    <div class="vehicle-actions">
                        <button class="btn btn-sm edit-vehicle-btn" data-vehicle-id="${vehicle.id}">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-sm btn-danger delete-vehicle-btn" data-vehicle-id="${vehicle.id}">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = vehiclesHTML;
        console.log('✅ [VehicleView.updateVehiclesList] HTML actualizado exitosamente. Contenido:', container.innerHTML.substring(0, 100) + '...');
    }

    showStats() {
        try {
            const vehicles = Vehicle.getAll();
            const stats = this.calculateStats(vehicles);
            
            const statsHTML = `
                <div class="stats-modal-content">
                    <h3>📊 Estadísticas de Vehículos</h3>
                    
                    <div class="stats-grid">
                        <div class="stat-item">
                            <strong>Total de vehículos:</strong>
                            <span>${stats.total}</span>
                        </div>
                        
                        <div class="stat-item">
                            <strong>Vehículo más nuevo:</strong>
                            <span>${stats.newest ? `${stats.newest.plate} (${stats.newest.year})` : 'N/A'}</span>
                        </div>
                        
                        <div class="stat-item">
                            <strong>Vehículo más antiguo:</strong>
                            <span>${stats.oldest ? `${stats.oldest.plate} (${stats.oldest.year})` : 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="stats-section">
                        <h4>Por Marca:</h4>
                        <div class="stats-list">
                            ${Object.entries(stats.byBrand).map(([brand, count]) => 
                                `<div class="stats-item">${brand}: <strong>${count}</strong></div>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="stats-section">
                        <h4>Por Año:</h4>
                        <div class="stats-list">
                            ${Object.entries(stats.byYear).sort((a, b) => b[0] - a[0]).map(([year, count]) => 
                                `<div class="stats-item">${year}: <strong>${count}</strong></div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            `;

            this.showModal('Estadísticas de Vehículos', statsHTML);
        } catch (error) {
            this.showError('Error al calcular estadísticas');
        }
    }

    calculateStats(vehicles) {
        const stats = {
            total: vehicles.length,
            byBrand: {},
            byYear: {},
            newest: null,
            oldest: null
        };

        vehicles.forEach(vehicle => {
            // Por marca
            if (!stats.byBrand[vehicle.brand]) {
                stats.byBrand[vehicle.brand] = 0;
            }
            stats.byBrand[vehicle.brand]++;

            // Por año
            if (!stats.byYear[vehicle.year]) {
                stats.byYear[vehicle.year] = 0;
            }
            stats.byYear[vehicle.year]++;

            // Más nuevo y más viejo
            if (!stats.newest || vehicle.year > stats.newest.year) {
                stats.newest = vehicle;
            }
            if (!stats.oldest || vehicle.year < stats.oldest.year) {
                stats.oldest = vehicle;
            }
        });

        return stats;
    }

    validateVehicleData(data) {
        const errors = [];
        
        if (!data.plate || data.plate.trim().length === 0) {
            errors.push('La placa es requerida');
        } else if (data.plate.length < 6) {
            errors.push('La placa debe tener al menos 6 caracteres');
        }
        
        if (!data.brand || data.brand.trim().length === 0) {
            errors.push('La marca es requerida');
        }
        
        if (!data.model || data.model.trim().length === 0) {
            errors.push('El modelo es requerido');
        }
        
        if (!data.year || data.year < 1990 || data.year > new Date().getFullYear() + 1) {
            errors.push('El año debe ser válido');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    resetForm() {
        const form = document.getElementById('vehicleForm');
        if (form) {
            console.log('🔄 [VehicleView.resetForm] Limpiando formulario...');
            
            // Limpiar campos específicamente
            const plateField = document.getElementById('vehiclePlate');
            const brandField = document.getElementById('vehicleBrand');
            const modelField = document.getElementById('vehicleModel');
            const yearField = document.getElementById('vehicleYear');
            
            if (plateField) plateField.value = '';
            if (brandField) brandField.value = '';
            if (modelField) modelField.value = '';
            if (yearField) yearField.value = new Date().getFullYear();
            
            // Hacer reset del formulario
            form.reset();
            
            // Limpiar errores
            this.clearAllFieldErrors();
            
            // Restaurar año actual por defecto después del reset
            if (yearField) yearField.value = new Date().getFullYear();
            
            console.log('✅ [VehicleView.resetForm] Formulario limpiado');
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
                <h3>Confirmar Eliminación</h3>
            </div>
            <div class="modal-body">
                <div class="confirm-dialog">
                    <p>${message}</p>
                    <div class="confirm-actions" style="margin-top: 20px; text-align: right;">
                        <button class="btn btn-secondary" id="confirmNo" style="margin-right: 10px;">
                            Cancelar
                        </button>
                        <button class="btn btn-danger" id="confirmYes">
                            Sí, eliminar
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

    // Método para mostrar modal genérico
    showModal(title, content, buttons = null) {
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
            background: white; padding: 20px; border-radius: 8px; max-width: 600px; max-height: 80vh;
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
            ${buttons ? `<div class="modal-footer">${buttons}</div>` : ''}
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
window.VehicleView = VehicleView;
console.log('✅ VehicleView cargada y disponible globalmente');