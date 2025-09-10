/**
 * Controlador de Vehículos - Gestión CRUD de vehículos
 */
class VehicleController extends BaseController {
    constructor() {
        super();
        this.vehicleForm = null;
        this.vehiclesList = null;
        this.vehicles = [];
        this.initialize();
    }

    initialize() {
        super.initialize();
        if (!this.requireAuth()) return;
        
        this.setupVehicleForm();
        this.setupVehiclesList();
        this.loadVehicles();
        this.updateVehicleSelects();
    }

    setupVehicleForm() {
        this.vehicleForm = document.getElementById('vehicleForm');
        // Comentado para evitar conflicto con VehicleView
        // if (this.vehicleForm) {
        //     this.vehicleForm.addEventListener('submit', (e) => this.handleVehicleSubmit(e));
        // }
        console.log('🎛️ [VehicleController] Form setup desactivado - usando VehicleView');
    }

    setupVehiclesList() {
        this.vehiclesList = document.getElementById('vehiclesList');
    }

    loadVehicles() {
        try {
            this.vehicles = Vehicle.getAll();
            this.updateVehiclesList();
        } catch (error) {
            this.handleError(error, 'Error al cargar vehículos');
        }
    }

    async handleVehicleSubmit(e) {
        e.preventDefault();
        
        if (!this.requireAdmin()) return;

        const formData = new FormData(e.target);
        const vehicleData = {
            plate: formData.get('plate'),
            brand: formData.get('brand'),
            model: formData.get('model'),
            year: parseInt(formData.get('year'))
        };

        // Validaciones del formulario
        const validation = this.validateVehicleData(vehicleData);
        if (!validation.isValid) {
            this.showError(validation.errors.join(', '));
            return;
        }

        try {
            this.showLoading('Guardando vehículo...');
            
            // Verificar si la placa ya existe
            const existingVehicle = this.vehicles.find(v => 
                v.plate.toLowerCase() === vehicleData.plate.toLowerCase()
            );
            
            if (existingVehicle) {
                this.hideLoading();
                this.showError('Ya existe un vehículo con esa placa');
                return;
            }

            // Crear nuevo vehículo
            const vehicle = Vehicle.save(vehicleData);
            this.vehicles.push(vehicle);
            
            this.hideLoading();
            this.showSuccess('Vehículo registrado exitosamente');
            
            // Limpiar formulario y actualizar listas
            this.vehicleForm.reset();
            this.updateVehiclesList();
            this.updateVehicleSelects();
            
            // Actualizar dashboard
            if (window.dashboardController) {
                window.dashboardController.updateStats();
            }

        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al guardar vehículo');
        }
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
        
        if (!data.year || data.year < 1900 || data.year > new Date().getFullYear() + 1) {
            errors.push('El año debe ser válido');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    updateVehiclesList() {
        if (!this.vehiclesList) return;

        if (this.vehicles.length === 0) {
            this.vehiclesList.innerHTML = '<p>No hay vehículos registrados</p>';
            return;
        }

        const vehiclesHTML = this.vehicles.map(vehicle => `
            <div class="expense-item" data-vehicle-id="${vehicle.id}">
                <div class="expense-header">
                    <div>
                        <strong>${vehicle.plate}</strong>
                        <p>${vehicle.brand} ${vehicle.model} (${vehicle.year})</p>
                    </div>
                    <div>
                        ${this.currentUser.type === 'admin' ? `
                            <button class="btn" onclick="vehicleController.editVehicle(${vehicle.id})" 
                                    style="margin-right: 5px;">
                                ✏️ Editar
                            </button>
                            <button class="btn btn-danger" onclick="vehicleController.deleteVehicle(${vehicle.id})">
                                🗑️ Eliminar
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="vehicle-stats">
                    <small>
                        Creado: ${this.formatDate(vehicle.createdAt)}
                        ${vehicle.updatedAt !== vehicle.createdAt ? 
                            ` | Actualizado: ${this.formatDate(vehicle.updatedAt)}` : ''}
                    </small>
                </div>
            </div>
        `).join('');

        this.vehiclesList.innerHTML = vehiclesHTML;
    }

    updateVehicleSelects() {
        const selectors = [
            'driverVehicle',
            'expenseVehicle', 
            'documentVehicleSelect'
        ];

        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (select) {
                const currentValue = select.value;
                
                select.innerHTML = '<option value="">Seleccionar vehículo</option>' +
                    this.vehicles.map(vehicle => 
                        `<option value="${vehicle.id}">${vehicle.plate} - ${vehicle.brand} ${vehicle.model}</option>`
                    ).join('');
                
                // Restaurar valor seleccionado si aún existe
                if (currentValue && this.vehicles.find(v => v.id == currentValue)) {
                    select.value = currentValue;
                }
            }
        });
    }

    editVehicle(vehicleId) {
        if (!this.requireAdmin()) return;

        const vehicle = this.vehicles.find(v => v.id == vehicleId);
        if (!vehicle) {
            this.showError('Vehículo no encontrado');
            return;
        }

        // Llenar formulario con datos del vehículo
        const form = this.vehicleForm;
        if (form) {
            form.querySelector('#vehiclePlate').value = vehicle.plate;
            form.querySelector('#vehicleBrand').value = vehicle.brand;
            form.querySelector('#vehicleModel').value = vehicle.model;
            form.querySelector('#vehicleYear').value = vehicle.year;
            
            // Cambiar el comportamiento del formulario para actualización
            form.dataset.editingId = vehicleId;
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Actualizar Vehículo';
            }
            
            // Scroll al formulario
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async updateVehicle(vehicleId, vehicleData) {
        try {
            this.showLoading('Actualizando vehículo...');
            
            // Verificar si la placa ya existe en otro vehículo
            const existingVehicle = this.vehicles.find(v => 
                v.id != vehicleId && v.plate.toLowerCase() === vehicleData.plate.toLowerCase()
            );
            
            if (existingVehicle) {
                this.hideLoading();
                this.showError('Ya existe otro vehículo con esa placa');
                return;
            }

            vehicleData.id = vehicleId;
            const updatedVehicle = Vehicle.save(vehicleData);
            
            // Actualizar en la lista local
            const index = this.vehicles.findIndex(v => v.id == vehicleId);
            if (index !== -1) {
                this.vehicles[index] = updatedVehicle;
            }
            
            this.hideLoading();
            this.showSuccess('Vehículo actualizado exitosamente');
            
            // Resetear formulario
            this.resetVehicleForm();
            this.updateVehiclesList();
            this.updateVehicleSelects();

        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al actualizar vehículo');
        }
    }

    deleteVehicle(vehicleId) {
        if (!this.requireAdmin()) return;

        const vehicle = this.vehicles.find(v => v.id == vehicleId);
        if (!vehicle) {
            this.showError('Vehículo no encontrado');
            return;
        }

        // Verificar si el vehículo tiene conductores asignados
        const assignedDriver = Driver.getByVehicleId(vehicleId);
        if (assignedDriver) {
            this.showError(`No se puede eliminar el vehículo. Está asignado al conductor: ${assignedDriver.name}`);
            return;
        }

        // Verificar si tiene gastos registrados
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
            
            // Remover de la lista local
            this.vehicles = this.vehicles.filter(v => v.id != vehicleId);
            
            this.hideLoading();
            this.showSuccess('Vehículo eliminado exitosamente');
            
            this.updateVehiclesList();
            this.updateVehicleSelects();
            
            // Actualizar dashboard
            if (window.dashboardController) {
                window.dashboardController.updateStats();
            }

        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al eliminar vehículo');
        }
    }

    resetVehicleForm() {
        if (this.vehicleForm) {
            this.vehicleForm.reset();
            delete this.vehicleForm.dataset.editingId;
            
            const submitBtn = this.vehicleForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Guardar Vehículo';
            }
        }
    }

    // Búsqueda de vehículos
    searchVehicles(query) {
        if (!query || query.trim().length === 0) {
            this.loadVehicles();
            return;
        }

        try {
            const results = Vehicle.search(query);
            this.vehicles = results;
            this.updateVehiclesList();
            
            if (results.length === 0) {
                this.showInfo('No se encontraron vehículos que coincidan con la búsqueda');
            }
        } catch (error) {
            this.handleError(error, 'Error en la búsqueda');
        }
    }

    // Obtener estadísticas de vehículos
    getVehicleStats() {
        const stats = {
            total: this.vehicles.length,
            byBrand: {},
            byYear: {},
            newest: null,
            oldest: null
        };

        this.vehicles.forEach(vehicle => {
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

    // Exportar vehículos
    exportVehicles() {
        if (!this.requireAdmin()) return;

        try {
            const data = {
                vehicles: this.vehicles,
                exportDate: new Date().toISOString(),
                totalVehicles: this.vehicles.length
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vehiculos_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showSuccess('Datos de vehículos exportados exitosamente');
        } catch (error) {
            this.handleError(error, 'Error al exportar vehículos');
        }
    }

    // Importar vehículos
    importVehicles(file) {
        if (!this.requireAdmin()) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!data.vehicles || !Array.isArray(data.vehicles)) {
                    this.showError('Formato de archivo inválido');
                    return;
                }

                this.showConfirmDialog(
                    `¿Está seguro de importar ${data.vehicles.length} vehículos? Esto reemplazará los datos actuales.`,
                    () => this.confirmImportVehicles(data.vehicles)
                );

            } catch (error) {
                this.handleError(error, 'Error al leer el archivo');
            }
        };
        reader.readAsText(file);
    }

    async confirmImportVehicles(vehiclesData) {
        try {
            this.showLoading('Importando vehículos...');
            
            let importedCount = 0;
            let errorCount = 0;

            for (const vehicleData of vehiclesData) {
                try {
                    Vehicle.save(vehicleData);
                    importedCount++;
                } catch (error) {
                    errorCount++;
                    console.error('Error al importar vehículo:', vehicleData, error);
                }
            }

            this.loadVehicles();
            this.hideLoading();
            
            if (errorCount === 0) {
                this.showSuccess(`${importedCount} vehículos importados exitosamente`);
            } else {
                this.showWarning(`${importedCount} vehículos importados, ${errorCount} errores`);
            }

        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error durante la importación');
        }
    }
}