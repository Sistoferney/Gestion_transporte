/**
 * Vista de Gastos - Gestión de la interfaz de gastos
 */
class ExpenseView extends BaseView {
    constructor(containerId = 'expenses') {
        super(containerId);
        this.userType = null;
        this.currentDriverId = null;
        this.isEditing = false;
        this.editingId = null;
        this.hasBeenRendered = false; // Flag para tracking de renderizado
        this.isSubmitting = false; // Flag para prevenir envíos múltiples
        this.eventsSetup = false; // Flag para evitar event listeners duplicados
        this.eventHandlers = new Map(); // Registro de event handlers para evitar duplicados
        this.submitCount = 0; // Contador para debugging
        this.lastSubmitTime = 0; // Timestamp del último submit
        
        // Limpiar handlers previos si existen (por si es una re-instanciación)
        if (window.expenseViewInstance) {
            console.warn('⚠️ [ExpenseView.constructor] Instancia previa detectada, limpiando handlers...');
            window.expenseViewInstance.clearEventHandlers();
        }
        window.expenseViewInstance = this;
        
        this.initialize();
    }

    // Override render para evitar bindEvents múltiples desde BaseView
    render() {
        const container = this.getContainer();
        if (!container) return '';
        
        // Verificar si ya ha sido renderizado anteriormente
        if (!this.hasBeenRendered) {
            console.log('💰 [ExpenseView.render] Generando contenido inicial...');
            const content = this.generateContent();
            container.innerHTML = content;
            this.hasBeenRendered = true; // Marcar como renderizado
            
            // CRÍTICO: Llamar afterRender después del primer renderizado
            this.afterRender();
        } else {
            console.log('💰 [ExpenseView.render] Contenido HTML ya existe, solo actualizando datos...');
            // Si por alguna razón el contenedor está vacío pero ya había sido renderizado,
            // re-renderizar para evitar pantalla en blanco
            if (container.innerHTML.length === 0) {
                console.log('💰 [ExpenseView.render] Contenedor vacío detectado, re-renderizando...');
                const content = this.generateContent();
                container.innerHTML = content;
                
                // También llamar afterRender si se re-renderiza
                this.afterRender();
            }
        }
        
        // CRÍTICO: NO llamar bindEvents() aquí para evitar duplicados
        // Solo bindEvents una vez en initialize()
        
        // Siempre cargar/actualizar los datos de gastos
        this.loadExpenses();
        return container.innerHTML;
    }

    initialize() {
        super.initialize();
        const session = StorageService.getUserSession();
        if (session) {
            this.userType = session.type;
            this.currentDriverId = session.driverId;
        }
        
        // Limpieza proactiva de localStorage al inicializar
        this.performStartupCleanup();
    }
    
    performStartupCleanup() {
        try {
            console.log('🧹 [performStartupCleanup] Iniciando limpieza de startup...');
            
            // Obtener uso actual de localStorage
            const usedSpace = JSON.stringify(localStorage).length;
            const maxSpace = 10 * 1024 * 1024; // 10MB típico
            const usagePercent = (usedSpace / maxSpace) * 100;
            
            console.log(`📊 [performStartupCleanup] Uso de localStorage: ${usagePercent.toFixed(1)}% (${(usedSpace/1024).toFixed(0)}KB de ~${(maxSpace/1024/1024).toFixed(0)}MB)`);
            
            // Si está usando más del 70%, hacer limpieza agresiva
            if (usagePercent > 70) {
                console.log('⚠️ [performStartupCleanup] Alto uso de localStorage, iniciando limpieza agresiva...');
                this.aggressiveCleanup();
            } else if (usagePercent > 50) {
                console.log('ℹ️ [performStartupCleanup] Uso moderado de localStorage, limpieza básica...');
                this.cleanOldReceipts();
            }
            
        } catch (error) {
            console.error('❌ [performStartupCleanup] Error durante limpieza:', error);
        }
    }
    
    aggressiveCleanup() {
        try {
            console.log('🚨 [aggressiveCleanup] Iniciando limpieza agresiva...');
            
            const initialSpace = JSON.stringify(localStorage).length;
            
            // 1. Limpiar receipts huérfanos y antiguos
            this.cleanOldReceipts();
            
            // 2. Limitar máximo de receipts a 20 en lugar de 50
            const receipts = StorageService.getReceipts() || {};
            const receiptIds = Object.keys(receipts);
            
            if (receiptIds.length > 20) {
                console.log(`🗑️ [aggressiveCleanup] Reduciendo receipts de ${receiptIds.length} a 20...`);
                
                const sortedReceipts = receiptIds.map(id => ({
                    id,
                    date: receipts[id].uploadDate
                })).sort((a, b) => new Date(b.date) - new Date(a.date)); // Más recientes primero
                
                // Mantener solo los 20 más recientes
                const toKeep = sortedReceipts.slice(0, 20);
                const cleanedReceipts = {};
                
                toKeep.forEach(({ id }) => {
                    cleanedReceipts[id] = receipts[id];
                });
                
                StorageService.setReceipts(cleanedReceipts);
                console.log(`✅ [aggressiveCleanup] Receipts reducidos a ${Object.keys(cleanedReceipts).length}`);
            }
            
            // 3. Verificar espacio después de limpieza
            const newUsedSpace = JSON.stringify(localStorage).length;
            const newUsagePercent = (newUsedSpace / (10 * 1024 * 1024)) * 100;
            const liberatedKB = ((initialSpace - newUsedSpace) / 1024).toFixed(0);
            console.log(`📊 [aggressiveCleanup] Nuevo uso: ${newUsagePercent.toFixed(1)}% (liberados ${liberatedKB}KB)`);
            
        } catch (error) {
            console.error('❌ [aggressiveCleanup] Error durante limpieza agresiva:', error);
        }
    }

    generateContent() {
        if (this.userType === 'driver') {
            return this.generateDriverExpenseView();
        } else {
            return this.generateAdminExpenseView();
        }
    }

    generateAdminExpenseView() {
        return `
            <h2>💰 Gestión de Gastos</h2>
            
            <!-- Formulario de gastos -->
            <div class="card">
                <h3 id="expenseFormTitle">Registrar Nuevo Gasto</h3>
                <form id="expenseForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expenseDriver">Conductor:</label>
                            <select id="expenseDriver" name="driverId" required>
                                <option value="">Seleccionar conductor</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="expenseVehicle">Vehículo:</label>
                            <select id="expenseVehicle" name="vehicleId" required>
                                <option value="">Seleccionar vehículo</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expenseType">Tipo de gasto:</label>
                            <select id="expenseType" name="type" required>
                                <option value="">Seleccionar tipo</option>
                                <option value="fuel">Combustible</option>
                                <option value="maintenance">Mantenimiento</option>
                                <option value="repairs">Reparaciones</option>
                                <option value="repuestos">Repuestos</option>
                                <option value="insurance">Seguros</option>
                                <option value="taxes">Impuestos</option>
                                <option value="tolls">Peajes</option>
                                <option value="other">Otros</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="expenseAmount">Monto:</label>
                            <input type="number" id="expenseAmount" name="amount" min="0" step="100" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expenseDate">Fecha:</label>
                            <input type="date" id="expenseDate" name="date" required>
                        </div>
                        <div class="form-group">
                            <label for="expenseOdometer">Kilometraje (opcional):</label>
                            <input type="number" id="expenseOdometer" name="odometer" min="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="expenseDescription">Descripción:</label>
                        <textarea id="expenseDescription" name="description" rows="3" 
                                placeholder="Detalles del gasto..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="expenseReceipt">Recibo/Factura:</label>
                        <div class="receipt-input-container" style="display: flex; flex-direction: column; gap: 10px;">
                            <div class="receipt-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button type="button" id="adminCameraBtn" class="btn btn-camera" data-user-type="admin">
                                    📷 Tomar Foto
                                </button>
                                <label for="expenseReceipt" class="btn btn-secondary" style="margin: 0; cursor: pointer;">
                                    📁 Seleccionar Archivo
                                </label>
                            </div>
                            <input type="file" id="expenseReceipt" name="receipt" accept="image/*,.pdf" style="display: none;">
                            <canvas id="adminCameraCanvas" style="display: none;"></canvas>
                            <div id="adminImagePreview" style="display: none; max-width: 200px;">
                                <img id="adminPreviewImg" style="width: 100%; border-radius: 4px; border: 1px solid #ddd;">
                                <div style="font-size: 12px; color: #666; margin-top: 5px; display: flex; justify-content: space-between;">
                                    <span>Vista previa del recibo</span>
                                    <button type="button" class="clear-preview-btn" data-user-type="admin" style="background: none; border: none; color: #999; cursor: pointer;">✕</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn">
                            <span id="submitButtonText">💾 Guardar Gasto</span>
                        </button>
                        <button type="button" class="btn btn-secondary cancel-edit-btn" id="cancelButton" style="display: none;">
                            ❌ Cancelar
                        </button>
                    </div>
                </form>
            </div>

            ${this.generateExpenseFilters()}
            ${this.generateExpenseList()}
        `;
    }

    generateDriverExpenseView() {
        return `
            <h2>💰 Mis Gastos</h2>
            
            <!-- Formulario de gastos para conductor -->
            <div class="card">
                <h3 id="expenseFormTitle">Registrar Nuevo Gasto</h3>
                <form id="expenseForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expenseType">Tipo de gasto:</label>
                            <select id="expenseType" name="type" required>
                                <option value="">Seleccionar tipo</option>
                                <option value="fuel">Combustible</option>
                                <option value="maintenance">Mantenimiento</option>
                                <option value="repairs">Reparaciones</option>
                                <option value="repuestos">Repuestos</option>
                                <option value="tolls">Peajes</option>
                                <option value="parking">Parqueadero</option>
                                <option value="food">Alimentación</option>
                                <option value="other">Otros</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="expenseAmount">Monto:</label>
                            <input type="number" id="expenseAmount" name="amount" min="0" step="100" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expenseDate">Fecha:</label>
                            <input type="date" id="expenseDate" name="date" required>
                        </div>
                        <div class="form-group">
                            <label for="expenseOdometer">Kilometraje (opcional):</label>
                            <input type="number" id="expenseOdometer" name="odometer" min="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="expenseDescription">Descripción:</label>
                        <textarea id="expenseDescription" name="description" rows="3" 
                                placeholder="Detalles del gasto..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="expenseReceipt">Recibo/Factura:</label>
                        <div class="receipt-input-container" style="display: flex; flex-direction: column; gap: 10px;">
                            <div class="receipt-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button type="button" id="driverCameraBtn" class="btn btn-camera" data-user-type="driver">
                                    📷 Tomar Foto
                                </button>
                                <label for="expenseReceipt" class="btn btn-secondary" style="margin: 0; cursor: pointer;">
                                    📁 Seleccionar Archivo
                                </label>
                            </div>
                            <input type="file" id="expenseReceipt" name="receipt" accept="image/*,.pdf" style="display: none;">
                            <canvas id="driverCameraCanvas" style="display: none;"></canvas>
                            <div id="driverImagePreview" style="display: none; max-width: 200px;">
                                <img id="driverPreviewImg" style="width: 100%; border-radius: 4px; border: 1px solid #ddd;">
                                <div style="font-size: 12px; color: #666; margin-top: 5px; display: flex; justify-content: space-between;">
                                    <span>Vista previa del recibo</span>
                                    <button type="button" class="clear-preview-btn" data-user-type="driver" style="background: none; border: none; color: #999; cursor: pointer;">✕</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn">
                            <span id="submitButtonText">💾 Guardar Gasto</span>
                        </button>
                        <button type="button" class="btn btn-secondary cancel-edit-btn" id="cancelButton" style="display: none;">
                            ❌ Cancelar
                        </button>
                    </div>
                </form>
            </div>

            ${this.generateDriverExpenseFilters()}
            ${this.generateExpenseList()}
        `;
    }

    generateExpenseFilters() {
        return `
            <!-- Filtros y herramientas -->
            <div class="card">
                <h3>🔍 Filtros y Herramientas</h3>
                <div class="filters-container">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="filterType">Tipo:</label>
                            <select id="filterType" >
                                <option value="">Todos los tipos</option>
                                <option value="fuel">Combustible</option>
                                <option value="maintenance">Mantenimiento</option>
                                <option value="repairs">Reparaciones</option>
                                <option value="repuestos">Repuestos</option>
                                <option value="insurance">Seguros</option>
                                <option value="taxes">Impuestos</option>
                                <option value="tolls">Peajes</option>
                                <option value="other">Otros</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="filterDriver">Conductor:</label>
                            <select id="filterDriver" >
                                <option value="">Todos los conductores</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="filterVehicle">Vehículo:</label>
                            <select id="filterVehicle" >
                                <option value="">Todos los vehículos</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="filterDateFrom">Desde:</label>
                            <input type="date" id="filterDateFrom" >
                        </div>
                        <div class="form-group">
                            <label for="filterDateTo">Hasta:</label>
                            <input type="date" id="filterDateTo" >
                        </div>
                        <div class="form-group">
                            <label for="filterAmount">Monto mínimo:</label>
                            <input type="number" id="filterAmount" min="0" placeholder="0" >
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="btn clear-filters-btn">
                            🗑️ Limpiar Filtros
                        </button>
                        <button class="btn export-expenses-btn" title="Exportar gastos filtrados a Excel, CSV o Imprimir">
                            📤 Exportar/Imprimir
                        </button>
                        <button class="btn show-stats-btn">
                            📊 Estadísticas
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    generateDriverExpenseFilters() {
        return `
            <!-- Filtros para conductor -->
            <div class="card">
                <h3>🔍 Filtros</h3>
                <div class="filters-container">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="filterType">Tipo:</label>
                            <select id="filterType" >
                                <option value="">Todos los tipos</option>
                                <option value="fuel">Combustible</option>
                                <option value="maintenance">Mantenimiento</option>
                                <option value="repairs">Reparaciones</option>
                                <option value="repuestos">Repuestos</option>
                                <option value="tolls">Peajes</option>
                                <option value="parking">Parqueadero</option>
                                <option value="food">Alimentación</option>
                                <option value="other">Otros</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="filterDateFrom">Desde:</label>
                            <input type="date" id="filterDateFrom" >
                        </div>
                        <div class="form-group">
                            <label for="filterDateTo">Hasta:</label>
                            <input type="date" id="filterDateTo" >
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="btn clear-filters-btn">
                            🗑️ Limpiar Filtros
                        </button>
                        <button class="btn show-stats-btn">
                            📊 Mis Estadísticas
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    generateExpenseList() {
        return `
            <!-- Lista de gastos -->
            <div class="card">
                <h3>📋 Lista de Gastos</h3>
                <div id="expensesTotalInfo" class="expenses-summary">
                    <p>Total filtrado: <strong id="filteredTotal">$0</strong> | Gastos: <strong id="filteredCount">0</strong></p>
                </div>
                <div id="expensesList">
                    <p>Cargando gastos...</p>
                </div>
            </div>
        `;
    }

    bindEvents() {
        super.bindEvents();
        
        // Solo configurar event listeners si no se han configurado antes
        if (this.eventsSetup) {
            console.log('💰 [ExpenseView.bindEvents] Event listeners ya configurados, saltando...');
            return;
        }
        
        console.log('💰 [ExpenseView.bindEvents] Configurando event listeners...');
        
        // Eventos del formulario
        this.delegate('submit', '#expenseForm', this.handleFormSubmit.bind(this));
        this.delegate('change', '#expenseDriver', this.handleDriverChange.bind(this));
        this.delegate('change', '#expenseReceipt', this.handleReceiptSelect.bind(this));
        
        // Eventos de la lista
        this.delegate('click', '.edit-expense-btn', this.handleEditClick.bind(this));
        this.delegate('click', '.delete-expense-btn', this.handleDeleteClick.bind(this));
        this.delegate('click', '.view-receipt-btn', this.handleViewReceiptClick.bind(this));
        
        // Eventos de botones de cámara y vista previa
        this.delegate('click', '.btn-camera', this.handleCameraClick.bind(this));
        this.delegate('click', '.clear-preview-btn', this.handleClearPreviewClick.bind(this));
        this.delegate('click', '.cancel-edit-btn', this.handleCancelEditClick.bind(this));
        
        // Eventos de filtros y acciones
        this.delegate('click', '.clear-filters-btn', this.handleClearFiltersClick.bind(this));
        this.delegate('click', '.export-expenses-btn', this.handleExportClick.bind(this));
        this.delegate('click', '.show-stats-btn', this.handleShowStatsClick.bind(this));
        
        // Eventos de exportación (en modales)
        this.delegate('click', '.export-excel-btn', this.handleExportExcelClick.bind(this));
        this.delegate('click', '.export-csv-btn', this.handleExportCSVClick.bind(this));
        this.delegate('click', '.print-expenses-btn', this.handlePrintClick.bind(this));
        
        // Eventos de cambio en filtros
        this.delegate('change', '#filterType', this.handleFilterChange.bind(this));
        this.delegate('change', '#filterDriver', this.handleFilterChange.bind(this));
        this.delegate('change', '#filterVehicle', this.handleFilterChange.bind(this));
        this.delegate('change', '#filterDateFrom', this.handleFilterChange.bind(this));
        this.delegate('change', '#filterDateTo', this.handleFilterChange.bind(this));
        this.delegate('change', '#filterAmount', this.handleFilterChange.bind(this));
        
        this.eventsSetup = true;
        console.log('✅ [ExpenseView.bindEvents] Event listeners configurados correctamente');
    }

    // Override del delegate para evitar duplicados
    delegate(eventType, selector, handler) {
        const key = `${eventType}:${selector}`;
        if (this.eventHandlers.has(key)) {
            console.log(`⚠️ [ExpenseView.delegate] Event handler ya existe para ${key}, saltando...`);
            return;
        }

        const container = this.getContainer ? this.getContainer() : this.container;
        if (!container) {
            console.warn(`⚠️ [ExpenseView.delegate] Container no encontrado para ${key}`);
            return;
        }

        const delegateHandler = (e) => {
            const target = e.target.closest(selector);
            if (target) {
                console.log(`🎯 [ExpenseView.delegate] Ejecutando handler para ${key}`);
                handler.call(target, e, target);
            }
        };

        container.addEventListener(eventType, delegateHandler);
        this.eventHandlers.set(key, { handler: delegateHandler, element: container, eventType });
        
        console.log(`✅ [ExpenseView.delegate] Registrado event handler para ${key}`);
    }

    // Método para limpiar todos los event handlers si es necesario
    clearEventHandlers() {
        this.eventHandlers.forEach(({ handler, element, eventType }, key) => {
            element.removeEventListener(eventType, handler);
            console.log(`🗑️ [ExpenseView.clearEventHandlers] Removido handler para ${key}`);
        });
        this.eventHandlers.clear();
        this.eventsSetup = false;
        console.log('🧹 [ExpenseView.clearEventHandlers] Todos los event handlers limpiados');
    }

    afterRender() {
        super.afterRender();
        this.setupExpenseView();
        this.loadExpenses();
    }

    setupExpenseView() {
        console.log('💰 [setupExpenseView] Configurando vista de gastos...');
        console.log('💰 [setupExpenseView] DOM state:', document.readyState);
        console.log('💰 [setupExpenseView] Container:', this.container);
        
        // Test de datos disponibles
        this.testDataAvailability();
        
        // Configurar fecha por defecto
        const dateField = document.getElementById('expenseDate');
        if (dateField) {
            dateField.value = new Date().toISOString().split('T')[0];
        }

        // Cargar selectores con delay mayor para asegurar que el DOM esté listo
        setTimeout(() => {
            console.log('💰 [setupExpenseView] Iniciando carga de selectores...');
            console.log('💰 [setupExpenseView] filterDriver exists:', !!document.getElementById('filterDriver'));
            console.log('💰 [setupExpenseView] filterVehicle exists:', !!document.getElementById('filterVehicle'));
            
            this.updateDriverSelectors();
            this.updateVehicleSelectors();
            this.updateFilterSelectors();
        }, 500);
    }

    testDataAvailability() {
        console.log('🔍 [testDataAvailability] Verificando disponibilidad de datos...');
        
        // Verificar localStorage directamente
        const driversRaw = localStorage.getItem('drivers');
        const vehiclesRaw = localStorage.getItem('vehicles');
        
        console.log('🔍 [testDataAvailability] localStorage drivers:', driversRaw ? 'existe' : 'NO existe');
        console.log('🔍 [testDataAvailability] localStorage vehicles:', vehiclesRaw ? 'existe' : 'NO existe');
        
        if (driversRaw) {
            const driversData = JSON.parse(driversRaw);
            console.log('🔍 [testDataAvailability] Conductores en localStorage:', driversData.length);
        }
        
        if (vehiclesRaw) {
            const vehiclesData = JSON.parse(vehiclesRaw);
            console.log('🔍 [testDataAvailability] Vehículos en localStorage:', vehiclesData.length);
        }
        
        // Verificar con las clases
        try {
            const drivers = Driver.getAll();
            const vehicles = Vehicle.getAll();
            console.log('🔍 [testDataAvailability] Driver.getAll():', drivers.length, 'elementos');
            console.log('🔍 [testDataAvailability] Vehicle.getAll():', vehicles.length, 'elementos');
        } catch (error) {
            console.error('🔍 [testDataAvailability] Error al acceder a datos:', error);
        }
    }

    updateDriverSelectors() {
        console.log('💰 [updateDriverSelectors] Actualizando selectores de conductores...');
        
        const drivers = Driver.getAll();
        console.log('💰 [updateDriverSelectors] Conductores obtenidos:', drivers.length);
        console.log('💰 [updateDriverSelectors] Datos de conductores:', drivers.map(d => ({ id: d.id, name: d.name })));
        
        const selectors = ['expenseDriver', 'filterDriver'];
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            console.log(`💰 [updateDriverSelectors] Selector ${selectorId}:`, select ? 'encontrado' : 'NO encontrado');
            
            if (select) {
                console.log(`💰 [updateDriverSelectors] ${selectorId} HTML anterior:`, select.innerHTML.substring(0, 100));
                
                const currentValue = select.value;
                const defaultOption = selectorId === 'expenseDriver' 
                    ? '<option value="">Seleccionar conductor</option>'
                    : '<option value="">Todos los conductores</option>';
                
                const newHTML = defaultOption +
                    drivers.map(driver => 
                        `<option value="${driver.id}">${driver.name}</option>`
                    ).join('');
                
                select.innerHTML = newHTML;
                
                console.log(`💰 [updateDriverSelectors] ${selectorId} actualizado con ${drivers.length} opciones`);
                console.log(`💰 [updateDriverSelectors] ${selectorId} HTML nuevo:`, select.innerHTML.substring(0, 200));
                
                if (currentValue && drivers.find(d => d.id == currentValue)) {
                    select.value = currentValue;
                }
            } else {
                console.error(`❌ [updateDriverSelectors] Elemento ${selectorId} no encontrado en DOM`);
            }
        });
    }

    updateVehicleSelectors() {
        console.log('🚗 [updateVehicleSelectors] Actualizando selectores de vehículos...');
        
        const vehicles = Vehicle.getAll();
        console.log('🚗 [updateVehicleSelectors] Vehículos obtenidos:', vehicles.length);
        console.log('🚗 [updateVehicleSelectors] Datos de vehículos:', vehicles.map(v => ({ id: v.id, plate: v.plate, brand: v.brand, model: v.model })));
        
        const selectors = ['expenseVehicle', 'filterVehicle'];
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            console.log(`🚗 [updateVehicleSelectors] Selector ${selectorId}:`, select ? 'encontrado' : 'NO encontrado');
            
            if (select) {
                console.log(`🚗 [updateVehicleSelectors] ${selectorId} HTML anterior:`, select.innerHTML.substring(0, 100));
                
                const currentValue = select.value;
                const defaultOption = selectorId === 'expenseVehicle' 
                    ? '<option value="">Seleccionar vehículo</option>'
                    : '<option value="">Todos los vehículos</option>';
                
                const newHTML = defaultOption +
                    vehicles.map(vehicle => 
                        `<option value="${vehicle.id}">${vehicle.plate} - ${vehicle.brand} ${vehicle.model}</option>`
                    ).join('');
                    
                select.innerHTML = newHTML;
                
                console.log(`🚗 [updateVehicleSelectors] ${selectorId} actualizado con ${vehicles.length} opciones`);
                console.log(`🚗 [updateVehicleSelectors] ${selectorId} HTML nuevo:`, select.innerHTML.substring(0, 200));
                
                if (currentValue && vehicles.find(v => v.id == currentValue)) {
                    select.value = currentValue;
                }
            } else {
                console.error(`❌ [updateVehicleSelectors] Elemento ${selectorId} no encontrado en DOM`);
            }
        });
    }

    updateFilterSelectors() {
        if (this.userType === 'driver') {
            // Para conductores, solo mostrar sus propios datos
            const filterDriver = document.getElementById('filterDriver');
            const filterVehicle = document.getElementById('filterVehicle');
            
            if (filterDriver) filterDriver.style.display = 'none';
            if (filterVehicle) filterVehicle.style.display = 'none';
        }
    }

    // ===== FILTROS DEPENDIENTES =====

    updateVehicleFilterForDriver(driverId) {
        console.log('🔍 [updateVehicleFilterForDriver] Conductor seleccionado:', driverId);
        const vehicleSelect = document.getElementById('filterVehicle');
        
        if (!vehicleSelect) {
            console.warn('🔍 [updateVehicleFilterForDriver] Selector de vehículo no encontrado');
            return;
        }

        if (!driverId || driverId === '') {
            // Si no hay conductor seleccionado, mostrar todos los vehículos
            console.log('🔍 [updateVehicleFilterForDriver] Conductor deseleccionado, mostrando todos los vehículos');
            this.updateVehicleSelectors();
            return;
        }

        // Encontrar el conductor seleccionado
        const drivers = Driver.getAll();
        const selectedDriver = drivers.find(d => d.id == driverId);
        
        if (!selectedDriver) {
            console.warn('🔍 [updateVehicleFilterForDriver] Conductor no encontrado:', driverId);
            return;
        }

        console.log('🔍 [updateVehicleFilterForDriver] Datos del conductor:', { 
            name: selectedDriver.name, 
            vehicleId: selectedDriver.vehicleId 
        });

        // Obtener el vehículo asignado al conductor
        const vehicles = Vehicle.getAll();
        const assignedVehicle = selectedDriver.vehicleId ? 
            vehicles.find(v => v.id == selectedDriver.vehicleId) : null;

        // Actualizar el selector de vehículos
        const currentValue = vehicleSelect.value;
        let options = '<option value="">Todos los vehículos</option>';
        
        if (assignedVehicle) {
            options += `<option value="${assignedVehicle.id}">${assignedVehicle.plate} - ${assignedVehicle.brand} ${assignedVehicle.model}</option>`;
            console.log('🔍 [updateVehicleFilterForDriver] Vehículo asignado encontrado:', assignedVehicle.plate);
        } else {
            console.log('🔍 [updateVehicleFilterForDriver] Conductor sin vehículo asignado');
            options += '<option value="" disabled>⚠️ Conductor sin vehículo asignado</option>';
        }
        
        vehicleSelect.innerHTML = options;
        
        // Agregar indicador visual de filtro dependiente
        this.addFilterDependentIndicator(vehicleSelect, assignedVehicle ? 1 : 0);
        
        // Restaurar selección si es válida
        if (currentValue && assignedVehicle && assignedVehicle.id == currentValue) {
            vehicleSelect.value = currentValue;
        }
    }

    updateDriverFilterForVehicle(vehicleId) {
        console.log('🔍 [updateDriverFilterForVehicle] Vehículo seleccionado:', vehicleId);
        const driverSelect = document.getElementById('filterDriver');
        
        if (!driverSelect) {
            console.warn('🔍 [updateDriverFilterForVehicle] Selector de conductor no encontrado');
            return;
        }

        if (!vehicleId || vehicleId === '') {
            // Si no hay vehículo seleccionado, mostrar todos los conductores
            console.log('🔍 [updateDriverFilterForVehicle] Vehículo deseleccionado, mostrando todos los conductores');
            this.updateDriverSelectors();
            return;
        }

        // Encontrar el conductor que tiene asignado este vehículo
        const drivers = Driver.getAll();
        const assignedDriver = drivers.find(d => d.vehicleId == vehicleId);
        
        console.log('🔍 [updateDriverFilterForVehicle] Conductor asignado encontrado:', 
            assignedDriver ? assignedDriver.name : 'ninguno');

        // Actualizar el selector de conductores
        const currentValue = driverSelect.value;
        let options = '<option value="">Todos los conductores</option>';
        
        if (assignedDriver) {
            options += `<option value="${assignedDriver.id}">${assignedDriver.name}</option>`;
            console.log('🔍 [updateDriverFilterForVehicle] Conductor asignado:', assignedDriver.name);
        } else {
            console.log('🔍 [updateDriverFilterForVehicle] Vehículo sin conductor asignado');
            options += '<option value="" disabled>⚠️ Vehículo sin conductor asignado</option>';
        }
        
        driverSelect.innerHTML = options;
        
        // Agregar indicador visual de filtro dependiente
        this.addFilterDependentIndicator(driverSelect, assignedDriver ? 1 : 0);
        
        // Restaurar selección si es válida
        if (currentValue && assignedDriver && assignedDriver.id == currentValue) {
            driverSelect.value = currentValue;
        }
    }

    addFilterDependentIndicator(selectElement, optionCount) {
        // Remover indicador existente
        this.removeFilterDependentIndicator(selectElement);
        
        if (optionCount <= 1) { // Solo opción "Todos" o ninguna opción válida
            // Agregar clase para styling de filtro restringido
            selectElement.classList.add('filter-dependent');
            selectElement.setAttribute('title', 
                optionCount === 0 ? 
                'No hay elementos asociados disponibles' : 
                'Filtro limitado por la selección del otro campo');
        } else {
            selectElement.classList.remove('filter-dependent');
            selectElement.removeAttribute('title');
        }
    }

    removeFilterDependentIndicator(selectElement) {
        selectElement.classList.remove('filter-dependent');
        selectElement.removeAttribute('title');
    }

    handleFormSubmit(e, form) {
        e.preventDefault();
        
        const currentTime = Date.now();
        
        // Prevenir envíos múltiples con doble verificación
        if (this.isSubmitting) {
            console.log('⚠️ [ExpenseView.handleFormSubmit] Envío ya en progreso, ignorando...');
            return;
        }
        
        // Prevenir envíos muy rápidos (dentro de 1 segundo)
        if (currentTime - this.lastSubmitTime < 1000) {
            console.log('⚠️ [ExpenseView.handleFormSubmit] Envío muy rápido detectado, ignorando...');
            return;
        }
        
        this.isSubmitting = true;
        this.lastSubmitTime = currentTime;
        this.submitCount++;
        console.log(`💰 [ExpenseView.handleFormSubmit] Procesando envío #${this.submitCount}...`);
        console.log('💰 [ExpenseView.handleFormSubmit] Event target:', e.target);
        console.log('💰 [ExpenseView.handleFormSubmit] Form element:', form);
        
        // Deshabilitar botón de envío
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ Guardando...';
        }
        
        const formData = new FormData(form);
        const expenseData = this.buildExpenseData(formData);

        if (this.isEditing) {
            this.updateExpense(this.editingId, expenseData, submitBtn, originalText);
        } else {
            this.createExpense(expenseData, submitBtn, originalText);
        }
    }

    handleDriverChange(e, select) {
        // Cuando se selecciona un conductor, filtrar vehículos disponibles
        const driverId = select.value;
        if (driverId) {
            const driver = Driver.getById(parseInt(driverId));
            if (driver && driver.vehicleId) {
                const vehicleSelect = document.getElementById('expenseVehicle');
                if (vehicleSelect) {
                    vehicleSelect.value = driver.vehicleId;
                }
            }
        }
    }

    handleReceiptSelect(e, input) {
        const file = input.files[0];
        if (!file) return;

        // Validar archivo
        if (file.size > 5 * 1024 * 1024) {
            this.showError('El archivo es demasiado grande. Máximo 5MB permitido.');
            input.value = '';
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG) y PDF.');
            input.value = '';
            return;
        }

        // Mostrar vista previa si es imagen
        if (file.type.startsWith('image/')) {
            const userType = this.userType === 'driver' ? 'driver' : 'admin';
            this.showFilePreview(file, userType);
        }

        const sizeKB = file.size / 1024;
        this.showInfo(`Recibo seleccionado: ${file.name} (${sizeKB.toFixed(2)} KB)`);
    }

    showFilePreview(file, userType) {
        const preview = document.getElementById(`${userType}ImagePreview`);
        const img = document.getElementById(`${userType}PreviewImg`);
        
        if (preview && img) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    handleEditClick(e, button) {
        const expenseId = button.dataset.expenseId;
        this.editExpense(parseInt(expenseId));
    }

    handleDeleteClick(e, button) {
        const expenseId = button.dataset.expenseId;
        this.deleteExpense(parseInt(expenseId));
    }

    handleViewReceiptClick(e, button) {
        const receiptId = button.dataset.receiptId;
        this.viewReceipt(receiptId);
    }

    handleCameraClick(e, button) {
        const userType = button.dataset.userType;
        this.openCamera(userType);
    }

    handleClearPreviewClick(e, button) {
        const userType = button.dataset.userType;
        this.clearPreview(userType);
    }

    handleCancelEditClick(e, button) {
        this.cancelEdit();
    }

    handleClearFiltersClick(e, button) {
        this.clearFilters();
    }

    handleExportClick(e, button) {
        this.exportExpenses();
    }

    handleShowStatsClick(e, button) {
        this.showStats();
    }

    handleFilterChange(e, element) {
        const filterId = element.id;
        console.log('🔍 [handleFilterChange] Filtro cambiado:', filterId, 'valor:', element.value);
        
        // Manejar filtros dependientes
        if (filterId === 'filterDriver') {
            this.updateVehicleFilterForDriver(element.value);
        } else if (filterId === 'filterVehicle') {
            this.updateDriverFilterForVehicle(element.value);
        }
        
        this.applyFilters();
    }

    handleExportExcelClick(e, button) {
        this.exportToExcel();
    }

    handleExportCSVClick(e, button) {
        this.exportToCSV();
    }

    handlePrintClick(e, button) {
        this.printExpenses();
    }

    buildExpenseData(formData) {
        const data = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            date: formData.get('date'),
            description: formData.get('description') || '',
            odometer: formData.get('odometer') ? parseInt(formData.get('odometer')) : null
        };

        if (this.userType === 'driver') {
            // Para conductores, usar su ID y vehículo asignado
            data.driverId = this.currentDriverId;
            const driver = Driver.getById(this.currentDriverId);
            if (driver) {
                data.vehicleId = driver.vehicleId;
            }
        } else {
            // Para administradores, usar los valores del formulario
            data.driverId = parseInt(formData.get('driverId'));
            data.vehicleId = parseInt(formData.get('vehicleId'));
        }

        return data;
    }

    restoreSubmitButton(submitBtn, originalText) {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText || '<span id="submitButtonText">💾 Guardar Gasto</span>';
        }
    }

    async createExpense(expenseData, submitBtn, originalText) {
        try {
            const validation = this.validateExpenseData(expenseData);
            if (!validation.isValid) {
                this.showError(validation.errors.join(', '));
                this.isSubmitting = false;
                this.restoreSubmitButton(submitBtn, originalText);
                return;
            }

            this.showLoading('Guardando gasto...');
            
            // Manejar archivo de recibo si existe
            const receiptFile = document.getElementById('expenseReceipt').files[0];
            if (receiptFile) {
                const receiptId = await this.handleReceiptUpload(receiptFile);
                expenseData.receiptId = receiptId;
            }

            const expense = Expense.save(expenseData);
            console.log('✅ [ExpenseView.createExpense] Gasto guardado exitosamente:', expense);
            console.log('✅ [ExpenseView.createExpense] ID del gasto:', expense.id);
            this.showSuccess('Gasto registrado exitosamente');
            this.resetForm();
            this.loadExpenses();
            
            this.hideLoading();
            this.isSubmitting = false; // Liberar flag
            this.restoreSubmitButton(submitBtn, originalText);
        } catch (error) {
            this.hideLoading();
            this.isSubmitting = false; // Liberar flag en caso de error
            this.restoreSubmitButton(submitBtn, originalText);
            this.showError('Error al guardar gasto');
        }
    }

    async updateExpense(expenseId, expenseData, submitBtn, originalText) {
        try {
            const validation = this.validateExpenseData(expenseData);
            if (!validation.isValid) {
                this.showError(validation.errors.join(', '));
                this.isSubmitting = false;
                this.restoreSubmitButton(submitBtn, originalText);
                return;
            }

            this.showLoading('Actualizando gasto...');
            
            // Manejar archivo de recibo si existe
            const receiptFile = document.getElementById('expenseReceipt').files[0];
            if (receiptFile) {
                const receiptId = await this.handleReceiptUpload(receiptFile);
                expenseData.receiptId = receiptId;
            }

            expenseData.id = expenseId;
            Expense.save(expenseData);
            this.showSuccess('Gasto actualizado exitosamente');
            this.cancelEdit();
            this.loadExpenses();
            
            this.hideLoading();
            this.isSubmitting = false; // Liberar flag
            this.restoreSubmitButton(submitBtn, originalText);
        } catch (error) {
            this.hideLoading();
            this.isSubmitting = false; // Liberar flag en caso de error
            this.restoreSubmitButton(submitBtn, originalText);
            this.showError('Error al actualizar gasto');
        }
    }

    editExpense(expenseId) {
        const expense = Expense.getById(expenseId);
        if (!expense) {
            this.showError('Gasto no encontrado');
            return;
        }

        // Llenar formulario
        document.getElementById('expenseType').value = expense.type;
        document.getElementById('expenseAmount').value = expense.amount;
        document.getElementById('expenseDate').value = expense.date;
        document.getElementById('expenseDescription').value = expense.description || '';
        
        if (expense.odometer) {
            document.getElementById('expenseOdometer').value = expense.odometer;
        }

        if (this.userType === 'admin') {
            document.getElementById('expenseDriver').value = expense.driverId;
            document.getElementById('expenseVehicle').value = expense.vehicleId;
        }

        // Cambiar a modo edición
        this.isEditing = true;
        this.editingId = expenseId;

        // Actualizar UI
        document.getElementById('expenseFormTitle').textContent = 'Editar Gasto';
        document.getElementById('submitButtonText').textContent = '✏️ Actualizar Gasto';
        document.getElementById('cancelButton').style.display = 'inline-block';

        // Scroll al formulario
        this.scrollToElement('#expenseForm');
    }

    cancelEdit() {
        this.isEditing = false;
        this.editingId = null;
        this.isSubmitting = false; // Liberar flag al cancelar
        
        // Resetear formulario y UI
        this.resetForm();
        document.getElementById('expenseFormTitle').textContent = 'Registrar Nuevo Gasto';
        document.getElementById('submitButtonText').textContent = '💾 Guardar Gasto';
        document.getElementById('cancelButton').style.display = 'none';
        
        // Restaurar botón de envío
        const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }

    deleteExpense(expenseId) {
        const expense = Expense.getById(expenseId);
        if (!expense) {
            this.showError('Gasto no encontrado');
            return;
        }

        this.showConfirmDialog(
            `¿Está seguro de eliminar este gasto de ${this.formatCurrency(expense.amount)}?`,
            () => this.confirmDeleteExpense(expenseId)
        );
    }

    async confirmDeleteExpense(expenseId) {
        try {
            this.showLoading('Eliminando gasto...');
            
            Expense.delete(expenseId);
            this.showSuccess('Gasto eliminado exitosamente');
            this.loadExpenses();
            
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError('Error al eliminar gasto');
        }
    }

    async loadExpenses() {
        try {
            this.showLoading('Cargando gastos...');
            
            let expenses;
            if (this.userType === 'driver') {
                expenses = Expense.getByDriverId(this.currentDriverId);
            } else {
                expenses = Expense.getAll();
            }
            
            this.updateExpensesList(expenses);
            this.updateExpensesSummary(expenses);
            
            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            this.showError('Error al cargar gastos');
        }
    }

    updateExpensesList(expenses) {
        const container = document.getElementById('expensesList');
        if (!container) return;

        if (!expenses || expenses.length === 0) {
            container.innerHTML = '<p>No se encontraron gastos</p>';
            return;
        }

        const expensesHTML = expenses.map(expense => {
            const driver = Driver.getById(expense.driverId);
            const vehicle = Vehicle.getById(expense.vehicleId);
            
            return `
                <div class="expense-item" data-expense-id="${expense.id}">
                    <div class="expense-header">
                        <div class="expense-info">
                            <strong class="expense-amount">${this.formatCurrency(expense.amount)}</strong>
                            <span class="expense-type">${this.getExpenseTypeName(expense.type)}</span>
                            <p class="expense-details">
                                ${driver ? driver.name : 'N/A'} - ${vehicle ? vehicle.plate : 'N/A'}
                                <br><small>${this.formatDate(expense.date)}</small>
                                ${expense.description ? `<br><small>${expense.description}</small>` : ''}
                            </p>
                        </div>
                        <div class="expense-actions">
                            ${expense.receiptId ? `
                                <button class="btn btn-sm view-receipt-btn" data-receipt-id="${expense.receiptId}">
                                    📄 Ver Recibo
                                </button>
                            ` : ''}
                            <button class="btn btn-sm edit-expense-btn" data-expense-id="${expense.id}">
                                ✏️ Editar
                            </button>
                            <button class="btn btn-sm btn-danger delete-expense-btn" data-expense-id="${expense.id}">
                                🗑️ Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = expensesHTML;
    }

    updateExpensesSummary(expenses) {
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const count = expenses.length;

        const totalElement = document.getElementById('filteredTotal');
        const countElement = document.getElementById('filteredCount');

        if (totalElement) totalElement.textContent = this.formatCurrency(total);
        if (countElement) countElement.textContent = count;
    }

    applyFilters() {
        const filters = {
            type: document.getElementById('filterType')?.value || '',
            driverId: document.getElementById('filterDriver')?.value || '',
            vehicleId: document.getElementById('filterVehicle')?.value || '',
            dateFrom: document.getElementById('filterDateFrom')?.value || '',
            dateTo: document.getElementById('filterDateTo')?.value || '',
            minAmount: parseFloat(document.getElementById('filterAmount')?.value || 0)
        };

        try {
            let expenses;
            if (this.userType === 'driver') {
                expenses = Expense.getByDriverId(this.currentDriverId);
            } else {
                expenses = Expense.getAll();
            }

            const filteredExpenses = this.filterExpenses(expenses, filters);
            this.updateExpensesList(filteredExpenses);
            this.updateExpensesSummary(filteredExpenses);
            
        } catch (error) {
            this.showError('Error al aplicar filtros');
        }
    }

    filterExpenses(expenses, filters) {
        return expenses.filter(expense => {
            // Filtro por tipo
            if (filters.type && expense.type !== filters.type) return false;
            
            // Filtro por conductor
            if (filters.driverId && expense.driverId != filters.driverId) return false;
            
            // Filtro por vehículo
            if (filters.vehicleId && expense.vehicleId != filters.vehicleId) return false;
            
            // Filtro por fecha desde
            if (filters.dateFrom && expense.date < filters.dateFrom) return false;
            
            // Filtro por fecha hasta
            if (filters.dateTo && expense.date > filters.dateTo) return false;
            
            // Filtro por monto mínimo
            if (filters.minAmount && expense.amount < filters.minAmount) return false;
            
            return true;
        });
    }

    clearFilters() {
        console.log('🗑️ [clearFilters] Limpiando todos los filtros...');
        
        const filterElements = [
            'filterType', 'filterDriver', 'filterVehicle', 
            'filterDateFrom', 'filterDateTo', 'filterAmount'
        ];
        
        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        // Restaurar listas completas de conductores y vehículos
        console.log('🗑️ [clearFilters] Restaurando listas completas...');
        this.updateDriverSelectors();
        this.updateVehicleSelectors();
        
        // Remover indicadores de filtros dependientes
        const driverSelect = document.getElementById('filterDriver');
        const vehicleSelect = document.getElementById('filterVehicle');
        if (driverSelect) this.removeFilterDependentIndicator(driverSelect);
        if (vehicleSelect) this.removeFilterDependentIndicator(vehicleSelect);
        
        this.loadExpenses();
    }

    getExpenseTypeName(type) {
        const typeNames = {
            fuel: 'Combustible',
            maintenance: 'Mantenimiento',
            repairs: 'Reparaciones',
            repuestos: 'Repuestos',
            insurance: 'Seguros',
            taxes: 'Impuestos',
            tolls: 'Peajes',
            parking: 'Parqueadero',
            food: 'Alimentación',
            other: 'Otros'
        };
        return typeNames[type] || type;
    }

    validateExpenseData(data) {
        const errors = [];
        
        if (!data.type) errors.push('El tipo de gasto es requerido');
        if (!data.amount || data.amount <= 0) errors.push('El monto debe ser mayor a 0');
        if (!data.date) errors.push('La fecha es requerida');
        if (!data.driverId) errors.push('El conductor es requerido');
        if (!data.vehicleId) errors.push('El vehículo es requerido');
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    async handleReceiptUpload(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const receiptId = Date.now().toString();
                    const receiptData = {
                        name: file.name,
                        type: file.type,
                        data: e.target.result,
                        uploadDate: new Date().toISOString()
                    };
                    
                    try {
                        // Guardar en el storage
                        const receipts = StorageService.getReceipts() || {};
                        receipts[receiptId] = receiptData;
                        StorageService.setReceipts(receipts);
                        
                        console.log(`💾 [handleReceiptUpload] Recibo guardado exitosamente: ${receiptId}`);
                        resolve(receiptId);
                    } catch (storageError) {
                        if (storageError.name === 'QuotaExceededError') {
                            console.error('💾 [handleReceiptUpload] Storage lleno, intentando limpiar...');
                            // Intentar limpiar receipts antiguos y reintentar
                            this.cleanOldReceipts();
                            
                            try {
                                const receipts = StorageService.getReceipts() || {};
                                receipts[receiptId] = receiptData;
                                StorageService.setReceipts(receipts);
                                
                                console.log(`💾 [handleReceiptUpload] Recibo guardado después de limpieza: ${receiptId}`);
                                resolve(receiptId);
                            } catch (secondError) {
                                console.error('💾 [handleReceiptUpload] Error persistente de storage:', secondError);
                                reject(new Error('Storage lleno. Libera espacio y intenta de nuevo.'));
                            }
                        } else {
                            reject(storageError);
                        }
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    }

    viewReceipt(receiptId) {
        const receipts = StorageService.getReceipts() || {};
        const receipt = receipts[receiptId];
        
        if (!receipt) {
            this.showError('Recibo no encontrado');
            return;
        }

        let content;
        if (receipt.type.startsWith('image/')) {
            content = `<img src="${receipt.data}" style="max-width: 100%; max-height: 70vh; border-radius: 8px;">`;
        } else if (receipt.type === 'application/pdf') {
            content = `<embed src="${receipt.data}" type="application/pdf" style="width: 100%; height: 70vh; border-radius: 8px;">`;
        } else {
            content = `<p>No se puede previsualizar este tipo de archivo: ${receipt.type}</p>`;
        }

        this.showModal('Ver Recibo', content);
    }

    showStats() {
        try {
            let expenses;
            if (this.userType === 'driver') {
                expenses = Expense.getByDriverId(this.currentDriverId);
            } else {
                expenses = Expense.getAll();
            }

            const stats = this.calculateExpenseStats(expenses);
            this.displayStatsModal(stats);
            
        } catch (error) {
            this.showError('Error al calcular estadísticas');
        }
    }

    calculateExpenseStats(expenses) {
        const stats = {
            total: expenses.reduce((sum, e) => sum + e.amount, 0),
            count: expenses.length,
            byType: {},
            byMonth: {},
            average: 0,
            highest: null,
            lowest: null
        };

        if (expenses.length === 0) return stats;

        stats.average = stats.total / stats.count;

        expenses.forEach(expense => {
            // Por tipo
            if (!stats.byType[expense.type]) {
                stats.byType[expense.type] = { count: 0, total: 0 };
            }
            stats.byType[expense.type].count++;
            stats.byType[expense.type].total += expense.amount;

            // Por mes
            const month = new Date(expense.date).toLocaleString('es', { month: 'long', year: 'numeric' });
            if (!stats.byMonth[month]) {
                stats.byMonth[month] = 0;
            }
            stats.byMonth[month] += expense.amount;

            // Más alto y más bajo
            if (!stats.highest || expense.amount > stats.highest.amount) {
                stats.highest = expense;
            }
            if (!stats.lowest || expense.amount < stats.lowest.amount) {
                stats.lowest = expense;
            }
        });

        return stats;
    }

    displayStatsModal(stats) {
        const statsHTML = `
            <div class="stats-modal-content">
                <h3>📊 Estadísticas de Gastos</h3>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <strong>Total gastado:</strong>
                        <span>${this.formatCurrency(stats.total)}</span>
                    </div>
                    <div class="stat-item">
                        <strong>Número de gastos:</strong>
                        <span>${stats.count}</span>
                    </div>
                    <div class="stat-item">
                        <strong>Promedio por gasto:</strong>
                        <span>${this.formatCurrency(stats.average)}</span>
                    </div>
                    <div class="stat-item">
                        <strong>Gasto más alto:</strong>
                        <span>${stats.highest ? this.formatCurrency(stats.highest.amount) : 'N/A'}</span>
                    </div>
                </div>
                
                <div class="stats-section">
                    <h4>Por Tipo de Gasto:</h4>
                    <div class="stats-list">
                        ${Object.entries(stats.byType).map(([type, data]) => 
                            `<div class="stats-item">
                                ${this.getExpenseTypeName(type)}: 
                                <strong>${this.formatCurrency(data.total)}</strong> 
                                (${data.count} gastos)
                            </div>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="stats-section">
                    <h4>Por Mes:</h4>
                    <div class="stats-list">
                        ${Object.entries(stats.byMonth).map(([month, total]) => 
                            `<div class="stats-item">${month}: <strong>${this.formatCurrency(total)}</strong></div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;

        this.showModal('Estadísticas de Gastos', statsHTML);
    }

    exportExpenses() {
        // Contar gastos filtrados
        const filteredExpenses = this.getFilteredExpenses();
        const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Mostrar opciones de exportación con información
        const exportOptions = `
            <div class="export-options">
                <h4>📤 Opciones de Exportación</h4>
                <div class="export-summary" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h5 style="margin: 0 0 10px 0;">📊 Resumen de datos a exportar:</h5>
                    <p style="margin: 5px 0;"><strong>Gastos:</strong> ${filteredExpenses.length}</p>
                    <p style="margin: 5px 0;"><strong>Total:</strong> ${this.formatCurrency(totalAmount)}</p>
                    ${filteredExpenses.length === 0 ? '<p style="color: #d73527; margin: 5px 0;">⚠️ No hay gastos con los filtros aplicados</p>' : ''}
                </div>
                
                ${filteredExpenses.length > 0 ? `
                    <p>Selecciona el formato para exportar:</p>
                    <div class="export-buttons" style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
                        <button class="btn export-excel-btn">
                            📊 Exportar a Excel (.xlsx)
                        </button>
                        <button class="btn export-csv-btn">
                            📄 Exportar a CSV
                        </button>
                        <button class="btn print-expenses-btn">
                            🖨️ Imprimir
                        </button>
                    </div>
                    <div style="margin-top: 15px; font-size: 12px; color: #666;">
                        <p>💡 <strong>Excel (.xlsx)</strong>: Incluye hoja de gastos detallados y hoja de resumen con estadísticas</p>
                        <p>📝 <strong>CSV</strong>: Formato simple compatible con cualquier programa de hojas de cálculo</p>
                        <p>🖨️ <strong>Imprimir</strong>: Vista optimizada para impresión en papel</p>
                        <p style="margin-top: 10px; font-size: 11px; color: #888;">Se incluirán: fecha, tipo, conductor, vehículo, descripción, monto y kilometraje</p>
                    </div>
                ` : `
                    <div style="text-align: center; color: #6c757d;">
                        <p>Ajusta los filtros para seleccionar gastos a exportar</p>
                    </div>
                `}
            </div>
        `;
        
        this.showModal('Exportar Gastos', exportOptions);
    }

    exportToExcel() {
        // Generar ID único para esta exportación para debug
        const exportId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        try {
            console.log(`📊 [exportToExcel] Iniciando exportación a .xlsx... ID: ${exportId}`);
            
            const expenses = this.getFilteredExpenses();
            if (expenses.length === 0) {
                this.showError('No hay gastos para exportar con los filtros aplicados');
                return;
            }

            // Verificar que SheetJS esté disponible
            if (typeof XLSX === 'undefined') {
                console.error('📊 [exportToExcel] SheetJS no está disponible, usando fallback CSV');
                this.exportToExcelFallback(expenses);
                return;
            }

            console.log(`📊 [exportToExcel] Exportando ${expenses.length} gastos...`);

            // Preparar datos para Excel con SheetJS
            const excelData = this.prepareDataForExport(expenses);
            
            // Crear workbook
            const workbook = XLSX.utils.book_new();
            
            // === HOJA PRINCIPAL: GASTOS ===
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            
            // Configurar anchos de columnas para mejor presentación
            const columnWidths = [
                { wch: 12 }, // Fecha
                { wch: 15 }, // Tipo de Gasto
                { wch: 20 }, // Conductor
                { wch: 25 }, // Vehículo
                { wch: 30 }, // Descripción
                { wch: 15 }, // Monto
                { wch: 12 }, // Kilometraje
                { wch: 15 }  // Fecha de Registro
            ];
            worksheet['!cols'] = columnWidths;
            
            // Agregar hoja de gastos al workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Gastos');
            
            // === HOJA RESUMEN ===
            const summaryData = this.generateExcelSummary(expenses);
            const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
            
            // Configurar anchos de columnas para resumen
            summaryWorksheet['!cols'] = [
                { wch: 25 }, // Concepto
                { wch: 15 }  // Valor
            ];
            
            // Agregar hoja de resumen al workbook
            XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen');
            
            // Generar archivo .xlsx
            const filename = `gastos_${this.userType}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, filename);

            document.querySelector('.modal')?.remove();
            this.showSuccess(`${expenses.length} gastos exportados a Excel (.xlsx) exitosamente`);
            
            console.log(`📊 [exportToExcel] Exportación .xlsx completada exitosamente - ID: ${exportId}`);
        } catch (error) {
            console.error('📊 [exportToExcel] Error al exportar a Excel:', error);
            this.showError('Error al exportar gastos a Excel. Intentando método alternativo...');
            
            // Fallback a CSV si falla XLSX
            const expenses = this.getFilteredExpenses();
            if (expenses.length > 0) {
                this.exportToExcelFallback(expenses);
            }
        }
    }

    exportToExcelFallback(expenses) {
        try {
            console.log('📊 [exportToExcelFallback] Usando método CSV como fallback...');
            
            // Preparar datos para Excel (método original)
            const excelData = this.prepareDataForExport(expenses);
            
            // Crear contenido CSV que Excel puede abrir
            const csvContent = this.generateCSVContent(excelData);
            
            // Crear archivo con BOM para que Excel reconozca UTF-8
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { 
                type: 'text/csv;charset=utf-8;' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gastos_${this.userType}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            document.querySelector('.modal')?.remove();
            this.showSuccess(`${expenses.length} gastos exportados a Excel (CSV) exitosamente`);
        } catch (error) {
            console.error('📊 [exportToExcelFallback] Error en método fallback:', error);
            this.showError('Error al exportar gastos a Excel');
        }
    }

    generateExcelSummary(expenses) {
        console.log('📊 [generateExcelSummary] Generando hoja de resumen...');
        
        // Obtener filtros activos para determinar qué secciones incluir
        const driverFilter = document.getElementById('filterDriver')?.value;
        const vehicleFilter = document.getElementById('filterVehicle')?.value;
        const typeFilter = document.getElementById('filterType')?.value;
        
        console.log('📊 [generateExcelSummary] Filtros activos:', { 
            driver: driverFilter, 
            vehicle: vehicleFilter, 
            type: typeFilter 
        });
        
        // Calcular estadísticas
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalCount = expenses.length;
        
        // Estadísticas por tipo (solo si no está filtrado por tipo)
        const typeStats = {};
        if (!typeFilter) {
            expenses.forEach(expense => {
                const typeName = this.getExpenseTypeName(expense.type);
                if (!typeStats[typeName]) {
                    typeStats[typeName] = { count: 0, total: 0 };
                }
                typeStats[typeName].count++;
                typeStats[typeName].total += expense.amount;
            });
        }
        
        // Estadísticas por conductor (solo si no está filtrado por conductor específico)
        const driverStats = {};
        const shouldShowDriverStats = !driverFilter && this.userType === 'admin';
        
        if (shouldShowDriverStats) {
            expenses.forEach(expense => {
                // Obtener nombre del conductor desde los datos del gasto o buscar en la lista
                let driverName = expense.driverName;
                if (!driverName && expense.driverId) {
                    const driver = Driver.getById(expense.driverId);
                    driverName = driver ? driver.name : null;
                }
                
                // Solo incluir si tenemos un nombre válido
                if (driverName) {
                    if (!driverStats[driverName]) {
                        driverStats[driverName] = { count: 0, total: 0 };
                    }
                    driverStats[driverName].count++;
                    driverStats[driverName].total += expense.amount;
                }
            });
        }
        
        // Crear datos de resumen
        const summaryData = [
            { Concepto: '=== RESUMEN GENERAL ===', Valor: '' },
            { Concepto: 'Total de Gastos', Valor: totalCount },
            { Concepto: 'Monto Total', Valor: this.formatCurrency(totalAmount) },
            { Concepto: 'Promedio por Gasto', Valor: totalCount > 0 ? this.formatCurrency(totalAmount / totalCount) : '$0' },
            { Concepto: 'Fecha de Exportación', Valor: new Date().toLocaleDateString('es-CO') },
        ];
        
        // Agregar información de filtros aplicados
        const appliedFilters = [];
        if (driverFilter) {
            const driver = Driver.getById(driverFilter);
            appliedFilters.push(`Conductor: ${driver ? driver.name : 'ID ' + driverFilter}`);
        }
        if (vehicleFilter) {
            const vehicle = Vehicle.getById(vehicleFilter);
            appliedFilters.push(`Vehículo: ${vehicle ? vehicle.plate : 'ID ' + vehicleFilter}`);
        }
        if (typeFilter) {
            appliedFilters.push(`Tipo: ${this.getExpenseTypeName(typeFilter)}`);
        }
        
        if (appliedFilters.length > 0) {
            summaryData.push({ Concepto: 'Filtros aplicados', Valor: appliedFilters.join(', ') });
        }
        
        summaryData.push({ Concepto: '', Valor: '' });
        
        // Agregar estadísticas por tipo (solo si hay múltiples tipos)
        if (!typeFilter && Object.keys(typeStats).length > 1) {
            summaryData.push({ Concepto: '=== POR TIPO DE GASTO ===', Valor: '' });
            Object.entries(typeStats).forEach(([type, stats]) => {
                summaryData.push({
                    Concepto: `${type} (${stats.count} gastos)`,
                    Valor: this.formatCurrency(stats.total)
                });
            });
            summaryData.push({ Concepto: '', Valor: '' });
        }
        
        // Agregar estadísticas por conductor (solo si hay múltiples conductores y no está filtrado)
        if (shouldShowDriverStats && Object.keys(driverStats).length > 1) {
            summaryData.push({ Concepto: '=== POR CONDUCTOR ===', Valor: '' });
            Object.entries(driverStats).forEach(([driver, stats]) => {
                summaryData.push({
                    Concepto: `${driver} (${stats.count} gastos)`,
                    Valor: this.formatCurrency(stats.total)
                });
            });
        }
        
        console.log('📊 [generateExcelSummary] Resumen generado con', summaryData.length, 'filas');
        console.log('📊 [generateExcelSummary] Secciones incluidas:', {
            general: true,
            byType: !typeFilter && Object.keys(typeStats).length > 1,
            byDriver: shouldShowDriverStats && Object.keys(driverStats).length > 1
        });
        
        return summaryData;
    }

    exportToCSV() {
        try {
            const expenses = this.getFilteredExpenses();
            if (expenses.length === 0) {
                this.showError('No hay gastos para exportar con los filtros aplicados');
                return;
            }

            const csvData = this.prepareDataForExport(expenses);
            const csvContent = this.generateCSVContent(csvData);
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gastos_${this.userType}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            document.querySelector('.modal')?.remove();
            this.showSuccess(`${expenses.length} gastos exportados a CSV exitosamente`);
        } catch (error) {
            console.error('Error al exportar a CSV:', error);
            this.showError('Error al exportar gastos a CSV');
        }
    }

    getFilteredExpenses() {
        // Obtener todos los gastos según el tipo de usuario
        let expenses;
        if (this.userType === 'driver') {
            expenses = Expense.getByDriverId(this.currentDriverId);
        } else {
            expenses = Expense.getAll();
        }

        // Aplicar filtros activos (como se hace en applyFilters)
        const typeFilter = document.getElementById('filterType')?.value;
        const driverFilter = document.getElementById('filterDriver')?.value;
        const vehicleFilter = document.getElementById('filterVehicle')?.value;
        const dateFromFilter = document.getElementById('filterDateFrom')?.value;
        const dateToFilter = document.getElementById('filterDateTo')?.value;
        const amountFilter = document.getElementById('filterAmount')?.value;

        return expenses.filter(expense => {
            // Filtro por tipo
            if (typeFilter && expense.type !== typeFilter) return false;
            
            // Filtro por conductor (solo para admin)
            if (driverFilter && expense.driverId.toString() !== driverFilter) return false;
            
            // Filtro por vehículo
            if (vehicleFilter && expense.vehicleId.toString() !== vehicleFilter) return false;
            
            // Filtro por fecha desde
            if (dateFromFilter && expense.date < dateFromFilter) return false;
            
            // Filtro por fecha hasta
            if (dateToFilter && expense.date > dateToFilter) return false;
            
            // Filtro por monto mínimo
            if (amountFilter && expense.amount < parseFloat(amountFilter)) return false;
            
            return true;
        });
    }

    prepareDataForExport(expenses) {
        // Preparar datos con información completa para exportación
        return expenses.map(expense => {
            const driver = Driver.getById(expense.driverId);
            const vehicle = Vehicle.getById(expense.vehicleId);
            
            return {
                'Fecha': expense.date,
                'Tipo de Gasto': this.getExpenseTypeName(expense.type),
                'Conductor': driver ? driver.name : 'N/A',
                'Vehículo': vehicle ? `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}` : 'N/A',
                'Descripción': expense.description || '',
                'Monto': expense.amount,
                'Kilometraje': expense.odometer || '',
                'Fecha de Registro': new Date(expense.createdAt).toLocaleDateString('es-CO')
            };
        });
    }

    generateCSVContent(data) {
        if (data.length === 0) return '';
        
        // Obtener headers
        const headers = Object.keys(data[0]);
        let csvContent = headers.join(',') + '\n';
        
        // Agregar filas
        data.forEach(row => {
            const rowData = headers.map(header => {
                let cell = row[header];
                
                // Escapar comillas y comas en los valores
                if (typeof cell === 'string') {
                    cell = cell.replace(/"/g, '""'); // Escapar comillas dobles
                    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                        cell = `"${cell}"`;
                    }
                }
                
                return cell;
            });
            
            csvContent += rowData.join(',') + '\n';
        });

        // Agregar fila de totales
        const totalAmount = data.reduce((sum, row) => sum + parseFloat(row['Monto']), 0);
        csvContent += '\n'; // Línea en blanco
        csvContent += `"TOTAL",,,,,${totalAmount},,\n`;
        csvContent += `"Gastos Exportados: ${data.length}",,,,,,,\n`;
        csvContent += `"Fecha de Exportación: ${new Date().toLocaleDateString('es-CO')}",,,,,,,\n`;

        return csvContent;
    }

    printExpenses() {
        try {
            const expenses = this.getFilteredExpenses();
            if (expenses.length === 0) {
                this.showError('No hay gastos para imprimir con los filtros aplicados');
                return;
            }

            const printData = this.prepareDataForExport(expenses);
            this.generatePrintDocument(printData);
            
            document.querySelector('.modal')?.remove();
        } catch (error) {
            console.error('Error al preparar impresión:', error);
            this.showError('Error al preparar la impresión');
        }
    }

    generatePrintDocument(data) {
        const totalAmount = data.reduce((sum, row) => sum + parseFloat(row['Monto']), 0);
        
        const printHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reporte de Gastos</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { color: #2c3e50; }
                    .info { margin-bottom: 20px; }
                    .info p { margin: 5px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f8f9fa; font-weight: bold; }
                    .total-row { background-color: #e9ecef; font-weight: bold; }
                    .amount { text-align: right; }
                    @media print {
                        .no-print { display: none; }
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 Reporte de Gastos</h1>
                    <p>Sistema de Gestión de Transporte</p>
                </div>
                
                <div class="info">
                    <p><strong>Fecha de reporte:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
                    <p><strong>Total de gastos:</strong> ${data.length}</p>
                    <p><strong>Monto total:</strong> ${this.formatCurrency(totalAmount)}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Conductor</th>
                            <th>Vehículo</th>
                            <th>Descripción</th>
                            <th>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            <tr>
                                <td>${row['Fecha']}</td>
                                <td>${row['Tipo de Gasto']}</td>
                                <td>${row['Conductor']}</td>
                                <td>${row['Vehículo']}</td>
                                <td>${row['Descripción']}</td>
                                <td class="amount">${this.formatCurrency(row['Monto'])}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="5"><strong>TOTAL</strong></td>
                            <td class="amount"><strong>${this.formatCurrency(totalAmount)}</strong></td>
                        </tr>
                    </tbody>
                </table>

                <div class="no-print" style="text-align: center; margin-top: 30px;">
                    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">🖨️ Imprimir</button>
                    <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; margin-left: 10px;">❌ Cerrar</button>
                </div>
            </body>
            </html>
        `;

        // Abrir nueva ventana para imprimir
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printHTML);
        printWindow.document.close();
    }

    resetForm() {
        const form = document.getElementById('expenseForm');
        if (form) {
            form.reset();
            this.clearAllFieldErrors();
            
            // Restaurar fecha actual
            document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
            
            // Limpiar vista previa de imagen
            const userType = this.userType === 'driver' ? 'driver' : 'admin';
            this.clearPreview(userType);
        }
    }

    showConfirmDialog(message, onConfirm) {
        const confirmHTML = `
            <div class="confirm-dialog">
                <p>${message}</p>
                <div class="confirm-actions">
                    <button class="btn btn-danger confirm-delete-btn">
                        Sí, eliminar
                    </button>
                    <button class="btn btn-secondary cancel-confirm-btn">
                        Cancelar
                    </button>
                </div>
            </div>
        `;

        this.showModal('Confirmar Eliminación', confirmHTML);
        
        // Agregar eventos específicos para este modal
        setTimeout(() => {
            const confirmBtn = document.querySelector('.confirm-delete-btn');
            const cancelBtn = document.querySelector('.cancel-confirm-btn');
            
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    document.querySelector('.modal')?.remove();
                    onConfirm();
                };
            }
            
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    document.querySelector('.modal')?.remove();
                };
            }
        }, 10);
    }

    // ===== FUNCIONES DE CÁMARA Y COMPRESIÓN =====

    async openCamera(userType = 'driver') {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('La cámara no está disponible en este dispositivo o navegador.');
            return;
        }

        try {
            this.showInfo('Iniciando cámara...');
            
            // Configuración de cámara optimizada para 1080x720 con cámara trasera
            const constraints = {
                video: {
                    facingMode: { ideal: "environment" }, // Cámara trasera preferida
                    width: { ideal: 1080 },
                    height: { ideal: 720 },
                    aspectRatio: { ideal: 1.5 } // 1080/720 = 1.5
                }
            };

            let stream;
            try {
                // Intentar con cámara trasera primero
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (backCameraError) {
                console.warn('Cámara trasera no disponible, intentando con frontal:', backCameraError);
                // Fallback a cámara frontal
                const fallbackConstraints = {
                    video: {
                        facingMode: "user", // Cámara frontal
                        width: { ideal: 1080 },
                        height: { ideal: 720 }
                    }
                };
                stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                this.showInfo('Usando cámara frontal (cámara trasera no disponible)');
            }

            this.showCameraModal(stream, userType);
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError('No se puede acceder a la cámara. Verifica los permisos.');
        }
    }

    showCameraModal(stream, userType) {
        const modalHtml = `
            <div class="camera-modal-content">
                <h3>📷 Tomar Foto del Recibo</h3>
                <div class="camera-container" style="position: relative; max-width: 100%;">
                    <video id="cameraVideo" autoplay playsinline style="width: 100%; max-width: 400px; border-radius: 8px;"></video>
                    <div class="camera-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                         border: 2px dashed rgba(255,255,255,0.8); width: 80%; height: 60%; pointer-events: none; border-radius: 8px;">
                    </div>
                </div>
                <div class="camera-tips" style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 14px;">
                    <strong>💡 Tips para una buena foto:</strong>
                    <ul style="margin: 5px 0 0 20px; padding: 0;">
                        <li>Asegúrate de tener buena iluminación</li>
                        <li>Mantén el recibo dentro del marco punteado</li>
                        <li>Evita sombras y reflejos</li>
                        <li>Mantén el dispositivo estable</li>
                    </ul>
                </div>
                <div class="camera-actions" style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <button id="captureBtn" class="btn" style="background: #28a745; color: white; padding: 12px 24px;">
                        📷 Capturar Foto
                    </button>
                    <button id="closeCameraBtn" class="btn btn-secondary" style="padding: 12px 24px;">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;

        this.showModal('Cámara', modalHtml);
        
        const video = document.getElementById('cameraVideo');
        const captureBtn = document.getElementById('captureBtn');
        const closeCameraBtn = document.getElementById('closeCameraBtn');

        video.srcObject = stream;

        captureBtn.onclick = () => this.capturePhoto(video, stream, userType);
        closeCameraBtn.onclick = () => {
            this.stopCamera(stream);
            document.querySelector('.modal')?.remove();
        };

        // Cerrar cámara si se cierra el modal
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.stopCamera(stream);
                    modal.remove();
                }
            });
        }
    }

    capturePhoto(video, stream, userType) {
        const canvas = document.getElementById(`${userType}CameraCanvas`);
        const ctx = canvas.getContext('2d');
        
        // Configurar canvas con resolución 1080x720
        canvas.width = 1080;
        canvas.height = 720;
        
        // Dibujar el video en el canvas con la resolución deseada
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Comprimir y convertir a blob con calidad 80%
        canvas.toBlob((blob) => {
            this.handleCompressedImage(blob, userType);
            this.stopCamera(stream);
            document.querySelector('.modal')?.remove();
        }, 'image/jpeg', 0.8); // Calidad del 80%
    }

    async handleCompressedImage(blob, userType) {
        try {
            // Verificar tamaño del blob
            const sizeKB = blob.size / 1024;
            console.log(`📸 [handleCompressedImage] Imagen inicial: ${sizeKB.toFixed(2)} KB`);
            
            // Comprimir más agresivamente para localStorage
            if (sizeKB > 200) { // Si es mayor a 200KB, comprimir más
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    // Reducir resolución máxima a 800x600 para localStorage
                    const maxWidth = 800;
                    const maxHeight = 600;
                    let { width, height } = img;
                    
                    // Calcular nueva dimensión manteniendo aspect ratio
                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((compressedBlob) => {
                        const finalSizeKB = compressedBlob.size / 1024;
                        console.log(`📸 [handleCompressedImage] Imagen comprimida: ${finalSizeKB.toFixed(2)} KB`);
                        this.processCompressedImage(compressedBlob, userType);
                    }, 'image/jpeg', 0.6); // Calidad del 60% para localStorage
                };
                
                img.src = URL.createObjectURL(blob);
            } else {
                this.processCompressedImage(blob, userType);
            }
            
        } catch (error) {
            console.error('Error processing image:', error);
            this.showError('Error al procesar la imagen. Intenta de nuevo.');
        }
    }

    processCompressedImage(blob, userType) {
        // Crear un archivo File desde el blob
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `recibo_${timestamp}.jpg`, { 
            type: 'image/jpeg',
            lastModified: Date.now()
        });

        // Simular la selección del archivo
        this.simulateFileSelection(file);

        // Mostrar vista previa
        this.showImagePreview(blob, userType);

        const sizeKB = blob.size / 1024;
        this.showSuccess(`📷 Foto capturada exitosamente (${sizeKB.toFixed(2)} KB)`);
    }

    simulateFileSelection(file) {
        const fileInput = document.getElementById('expenseReceipt');
        if (fileInput) {
            // Crear un nuevo DataTransfer para simular la selección
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInput.files = dataTransfer.files;

            // Disparar evento change
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    }

    showImagePreview(blob, userType) {
        const preview = document.getElementById(`${userType}ImagePreview`);
        const img = document.getElementById(`${userType}PreviewImg`);
        
        if (preview && img) {
            const url = URL.createObjectURL(blob);
            img.src = url;
            preview.style.display = 'block';

            // Limpiar URL después de un tiempo para liberar memoria
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 10000);
        }
    }

    clearPreview(userType) {
        const preview = document.getElementById(`${userType}ImagePreview`);
        const img = document.getElementById(`${userType}PreviewImg`);
        const fileInput = document.getElementById('expenseReceipt');
        
        if (preview) preview.style.display = 'none';
        if (img) img.src = '';
        if (fileInput) fileInput.value = '';
        
        this.showInfo('Vista previa eliminada');
    }

    stopCamera(stream) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }

    // ===== LIMPIEZA DE STORAGE =====

    cleanOldReceipts() {
        try {
            console.log('🧹 [cleanOldReceipts] Iniciando limpieza de receipts antiguos...');
            
            const receipts = StorageService.getReceipts() || {};
            const expenses = Expense.getAll() || [];
            
            // Obtener IDs de receipts que están siendo usados
            const activeReceiptIds = new Set();
            expenses.forEach(expense => {
                if (expense.receiptId) {
                    activeReceiptIds.add(expense.receiptId);
                }
            });
            
            // Identificar receipts huérfanos (no usados por ningún gasto)
            const allReceiptIds = Object.keys(receipts);
            const orphanIds = allReceiptIds.filter(id => !activeReceiptIds.has(id));
            
            console.log(`🧹 [cleanOldReceipts] Encontrados ${orphanIds.length} receipts huérfanos de ${allReceiptIds.length} totales`);
            
            // Eliminar receipts huérfanos
            orphanIds.forEach(id => {
                delete receipts[id];
            });
            
            // Si aún hay muchos receipts, eliminar los más antiguos
            const remainingIds = Object.keys(receipts);
            if (remainingIds.length > 50) { // Mantener máximo 50 receipts
                const sortedReceipts = remainingIds.map(id => ({
                    id,
                    date: receipts[id].uploadDate
                })).sort((a, b) => new Date(a.date) - new Date(b.date));
                
                const toDelete = sortedReceipts.slice(0, remainingIds.length - 50);
                toDelete.forEach(({ id }) => {
                    delete receipts[id];
                });
                
                console.log(`🧹 [cleanOldReceipts] Eliminados ${toDelete.length} receipts antiguos adicionales`);
            }
            
            StorageService.setReceipts(receipts);
            console.log(`✅ [cleanOldReceipts] Limpieza completada. Receipts restantes: ${Object.keys(receipts).length}`);
            
        } catch (error) {
            console.error('❌ [cleanOldReceipts] Error durante limpieza:', error);
        }
    }

    // ===== FIN FUNCIONES DE CÁMARA =====

    setupModalEventListeners(modalContent, modal) {
        console.log('🔧 [setupModalEventListeners] Configurando event listeners del modal...');
        
        // Event listeners para botones de exportación
        const exportExcelBtn = modalContent.querySelector('.export-excel-btn');
        const exportCSVBtn = modalContent.querySelector('.export-csv-btn');
        const printBtn = modalContent.querySelector('.print-expenses-btn');
        
        if (exportExcelBtn) {
            console.log('🔧 [setupModalEventListeners] Configurando export-excel-btn');
            exportExcelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevenir que se ejecute el event delegation global
                console.log('📊 [Modal] Export Excel clicked');
                modal.remove(); // Cerrar modal
                this.exportToExcel();
            });
        }
        
        if (exportCSVBtn) {
            console.log('🔧 [setupModalEventListeners] Configurando export-csv-btn');
            exportCSVBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevenir que se ejecute el event delegation global
                console.log('📄 [Modal] Export CSV clicked');
                modal.remove(); // Cerrar modal
                this.exportToCSV();
            });
        }
        
        if (printBtn) {
            console.log('🔧 [setupModalEventListeners] Configurando print-expenses-btn');
            printBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevenir que se ejecute el event delegation global
                console.log('🖨️ [Modal] Print clicked');
                modal.remove(); // Cerrar modal
                this.printExpenses();
            });
        }
        
        console.log('🔧 [setupModalEventListeners] Event listeners configurados:', {
            excel: !!exportExcelBtn,
            csv: !!exportCSVBtn,
            print: !!printBtn
        });
    }

    showModal(title, content) {
        // Remover modal existente
        const existingModal = document.querySelector('.modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white; padding: 20px; border-radius: 8px; max-width: 600px; max-height: 80vh;
            overflow-y: auto; margin: 20px;
        `;

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" style="float: right; background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Agregar event listener para el botón cerrar
        const closeBtn = modalContent.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
        }

        // Configurar event listeners para botones de exportación en el modal
        this.setupModalEventListeners(modalContent, modal);

        // Cerrar al hacer click fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Asegurar que la clase está disponible globalmente
window.ExpenseView = ExpenseView;
console.log('✅ ExpenseView cargada y disponible globalmente');