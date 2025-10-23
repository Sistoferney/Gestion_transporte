/**
 * Controlador de Fletes - Gestión CRUD de servicios de transporte
 */
class FreightController extends BaseController {
    constructor() {
        super();
        this.currentDriverId = null;
        this.freights = [];
        this.isCalculatingDistance = false;
        this.initialize();
    }

    initialize() {
        super.initialize();
        if (!this.requireAuth()) return;

        // Configurar según el tipo de usuario
        if (this.currentUser.type === 'driver') {
            this.currentDriverId = this.currentUser.driverId;
            this.setupDriverView();
        } else {
            this.setupAdminView();
        }

        this.setupEventListeners();
        this.loadFreights();
    }

    setupDriverView() {
        // Vista limitada para conductores - solo sus servicios asignados
        document.body.classList.add('driver-view');

        // Ocultar elementos administrativos
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => el.style.display = 'none');

        // Mostrar solo servicios del conductor
        this.showDriverFreights();
    }

    setupAdminView() {
        // Vista completa para administradores
        document.body.classList.add('admin-view');

        this.setupFreightForm();
        this.setupGoogleMapsIntegration();
        this.loadDriversAndVehicles();
    }

    setupEventListeners() {
        // Formulario de nuevo flete (solo admin)
        const form = document.getElementById('freightForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFreightSubmit(e));
        }

        // Botones de acción para conductores
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-start-service')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.startService(e.target.dataset.freightId);
            } else if (e.target.matches('.btn-complete-service')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.completeService(e.target.dataset.freightId);
            } else if (e.target.matches('.btn-view-route')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.viewRoute(e.target.dataset.freightId);
            } else if (e.target.matches('.btn-edit-freight')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.editFreight(e.target.dataset.freightId);
            } else if (e.target.matches('.btn-delete-freight')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.deleteFreight(e.target.dataset.freightId);
            } else if (e.target.matches('.btn-calculate-distance')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.calculateDistance();
            }
        });

        // Eventos de campos de origen y destino para cálculo automático
        const originField = document.getElementById('freightOrigin');
        const destinationField = document.getElementById('freightDestination');

        if (originField && destinationField) {
            const debounceDelay = 1000; // 1 segundo
            let timeoutId;

            const triggerCalculation = () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    if (originField.value.trim() && destinationField.value.trim()) {
                        this.calculateDistance();
                    }
                }, debounceDelay);
            };

            originField.addEventListener('blur', triggerCalculation);
            destinationField.addEventListener('blur', triggerCalculation);
        }
    }

    setupFreightForm() {
        // Configurar fecha y hora por defecto
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

    async setupGoogleMapsIntegration() {
        try {
            if (GoogleMapsService.isConfigured()) {
                const initialized = await GoogleMapsService.initialize();
                if (initialized) {
                    console.log('✅ Google Maps inicializado para fletes');
                    this.enableAddressAutocomplete();
                } else {
                    console.warn('⚠️ No se pudo inicializar Google Maps');
                }
            } else {
                console.warn('⚠️ Google Maps no está configurado');
                this.showGoogleMapsWarning();
            }
        } catch (error) {
            console.error('❌ Error inicializando Google Maps:', error);
        }
    }

    enableAddressAutocomplete() {
        const originField = document.getElementById('freightOrigin');
        const destinationField = document.getElementById('freightDestination');

        if (originField && window.google) {
            const originAutocomplete = new google.maps.places.Autocomplete(originField, {
                componentRestrictions: { country: 'co' },
                types: ['geocode']
            });

            originAutocomplete.addListener('place_changed', () => {
                this.onPlaceSelected(originAutocomplete, 'origin');
            });
        }

        if (destinationField && window.google) {
            const destinationAutocomplete = new google.maps.places.Autocomplete(destinationField, {
                componentRestrictions: { country: 'co' },
                types: ['geocode']
            });

            destinationAutocomplete.addListener('place_changed', () => {
                this.onPlaceSelected(destinationAutocomplete, 'destination');
            });
        }
    }

    onPlaceSelected(autocomplete, type) {
        const place = autocomplete.getPlace();
        if (place.geometry) {
            console.log(`📍 ${type} seleccionado:`, place.formatted_address);
            // Trigger cálculo de distancia automático después de un breve delay
            setTimeout(() => this.calculateDistance(), 500);
        }
    }

    showGoogleMapsWarning() {
        const warning = document.querySelector('.google-maps-warning');
        if (warning) {
            warning.style.display = 'block';
        }
    }

    loadDriversAndVehicles() {
        // Cargar conductores en el select
        const driverSelect = document.getElementById('freightDriver');
        if (driverSelect) {
            driverSelect.innerHTML = '<option value="">Seleccionar conductor</option>';

            const drivers = Driver.getAll().filter(d => d.status === 'active');
            drivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = `${driver.name} (${driver.idNumber})`;
                option.dataset.vehicleId = driver.vehicleId || '';
                driverSelect.appendChild(option);
            });

            // Auto-seleccionar vehículo cuando se selecciona conductor
            driverSelect.addEventListener('change', (e) => {
                this.onDriverSelected(e.target.value);
            });
        }
    }

    onDriverSelected(driverId) {
        if (!driverId) return;

        const driver = Driver.getById(driverId);
        if (driver && driver.vehicleId) {
            // El vehículo se asigna automáticamente en el modelo
            console.log(`🚗 Vehículo auto-asignado para conductor ${driver.name}`);
        }
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

        if (this.isCalculatingDistance) {
            console.log('⏳ Ya se está calculando una distancia...');
            return;
        }

        try {
            this.isCalculatingDistance = true;

            // Mostrar indicador de carga
            if (calculateBtn) {
                calculateBtn.disabled = true;
                calculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';
            }

            distanceField.value = 'Calculando...';

            if (!GoogleMapsService.isAvailable()) {
                throw new Error('Google Maps no está disponible');
            }

            const result = await GoogleMapsService.calculateDistance(origin, destination);

            if (result) {
                distanceField.value = `${result.distanceKm} km`;

                // Mostrar información adicional
                this.showDistanceInfo(result);

                console.log(`📏 Distancia calculada: ${result.distanceKm} km`);
            } else {
                throw new Error('No se pudo calcular la distancia');
            }

        } catch (error) {
            console.error('❌ Error calculando distancia:', error);
            distanceField.value = 'Error calculando';
            this.showNotification('Error calculando distancia: ' + error.message, 'error');
        } finally {
            this.isCalculatingDistance = false;

            // Restaurar botón
            if (calculateBtn) {
                calculateBtn.disabled = false;
                calculateBtn.innerHTML = '<i class="fas fa-route"></i> Calcular Distancia';
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
                        <a href="${GoogleMapsService.getRouteUrl(result.origin, result.destination)}"
                           target="_blank" class="text-primary">
                            <i class="fas fa-external-link-alt"></i> Ver en Google Maps
                        </a>
                    </small>
                </div>
            `;
        }
    }

    async handleFreightSubmit(e) {
        e.preventDefault();

        try {
            const formData = new FormData(e.target);
            const freightData = {
                driverId: formData.get('driverId'),
                origin: formData.get('origin'),
                destination: formData.get('destination'),
                distance: this.parseDistance(formData.get('distance')),
                tonnage: parseFloat(formData.get('tonnage')),
                price: parseFloat(formData.get('price')),
                serviceDate: formData.get('serviceDate'),
                serviceTime: formData.get('serviceTime'),
                clientName: formData.get('clientName'),
                clientPhone: formData.get('clientPhone'),
                observations: formData.get('observations') || ''
            };

            // Asociar ruta frecuente si se seleccionó
            const frequentRouteId = formData.get('frequentRouteId');
            if (frequentRouteId) {
                let FrequentRoute = window.FrequentRoute;
                if (!FrequentRoute) {
                    try {
                        FrequentRoute = require('../models/Freight.js').FrequentRoute;
                    } catch (err) {
                        FrequentRoute = window.FrequentRoute;
                    }
                }
                if (FrequentRoute) {
                    const route = FrequentRoute.getById(frequentRouteId);
                    if (route) {
                        freightData.frequentRouteId = route.id;
                        freightData.routeData = {
                            name: route.name,
                            origin: route.origin,
                            destination: route.destination,
                            routeType: route.routeType,
                            distance: route.distance,
                            path: route.path
                        };
                        // Sobrescribir campos relevantes
                        freightData.origin = route.origin;
                        freightData.destination = route.destination;
                        freightData.distance = route.distance;
                    }
                }
            }

            // Si es edición, incluir ID
            const freightId = formData.get('freightId');
            if (freightId) {
                freightData.id = parseInt(freightId);
            }

            const freight = Freight.save(freightData);

            this.showNotification(
                freightId ? 'Flete actualizado exitosamente' : 'Flete creado exitosamente',
                'success'
            );

            this.resetForm();
            this.loadFreights();

        } catch (error) {
            console.error('❌ Error guardando flete:', error);
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    parseDistance(distanceStr) {
        if (!distanceStr) return null;

        // Extraer número de strings como "120.5 km" o "120.5"
        const match = distanceStr.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : null;
    }

    resetForm() {
        const form = document.getElementById('freightForm');
        if (form) {
            form.reset();

            // Limpiar campos calculados
            const distanceField = document.getElementById('freightDistance');
            const tonnageField = document.getElementById('freightTonnage');
            const infoContainer = document.querySelector('.distance-info');

            if (distanceField) distanceField.value = '';
            if (tonnageField) tonnageField.value = '';
            if (infoContainer) infoContainer.innerHTML = '';

            // Restaurar fecha y hora por defecto
            this.setupFreightForm();
        }
    }

    loadFreights() {
        this.freights = Freight.getAll();

        if (this.currentUser.type === 'driver') {
            this.freights = this.freights.filter(f => f.driverId == this.currentDriverId);
            this.renderDriverFreights();
        } else {
            this.renderAdminFreights();
        }
    }

    renderDriverFreights() {
        const container = document.getElementById('driverFreightsList');
        if (!container) return;

        const pendingFreights = this.freights.filter(f =>
            f.status === 'programmed' || f.status === 'in_progress'
        );

        if (pendingFreights.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle"></i>
                    No tienes servicios asignados por el momento
                </div>
            `;
            return;
        }

        const html = pendingFreights.map(freight => {
            const driverInfo = freight.getDriverInfo();
            return `
                <div class="card freight-card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="card-title">
                                    <i class="fas fa-route text-primary"></i>
                                    ${driverInfo.route}
                                </h5>
                                <div class="freight-details">
                                    <p class="mb-1">
                                        <i class="fas fa-calendar"></i>
                                        <strong>Fecha:</strong> ${driverInfo.formattedDate}
                                    </p>
                                    <p class="mb-1">
                                        <i class="fas fa-clock"></i>
                                        <strong>Hora:</strong> ${freight.serviceTime}
                                    </p>
                                    ${freight.distance ? `
                                        <p class="mb-1">
                                            <i class="fas fa-road"></i>
                                            <strong>Distancia:</strong> ${freight.distance} km
                                        </p>
                                    ` : ''}
                                    <p class="mb-1">
                                        <i class="fas fa-weight-hanging"></i>
                                        <strong>Carga:</strong> ${driverInfo.formattedTonnage}
                                    </p>
                                    <p class="mb-1">
                                        <i class="fas fa-user"></i>
                                        <strong>Cliente:</strong> ${freight.clientName}
                                    </p>
                                    <p class="mb-1">
                                        <i class="fas fa-phone"></i>
                                        <strong>Teléfono:</strong>
                                        <a href="tel:${freight.clientPhone}">${freight.clientPhone}</a>
                                    </p>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="badge badge-${this.getStatusColor(freight.status)} mb-2">
                                    ${driverInfo.statusText}
                                </span>
                            </div>
                        </div>

                        <div class="freight-actions mt-3">
                            ${freight.status === 'programmed' ? `
                                <button class="btn btn-success btn-sm btn-start-service"
                                        data-freight-id="${freight.id}">
                                    <i class="fas fa-play"></i> Iniciar Servicio
                                </button>
                            ` : ''}

                            ${freight.status === 'in_progress' ? `
                                <button class="btn btn-primary btn-sm btn-complete-service"
                                        data-freight-id="${freight.id}">
                                    <i class="fas fa-check"></i> Completar Servicio
                                </button>
                            ` : ''}

                            <button class="btn btn-outline-info btn-sm btn-view-route"
                                    data-freight-id="${freight.id}">
                                <i class="fas fa-map-marked-alt"></i> Ver Ruta
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    renderAdminFreights() {
        const container = document.getElementById('freightsList');
        if (!container) return;

        if (this.freights.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle"></i>
                    No hay fletes registrados aún
                </div>
            `;
            return;
        }

        const html = this.freights.map(freight => {
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
        }).join('');

        container.innerHTML = html;
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

    async startService(freightId) {
        // Confirmar antes de iniciar el servicio
        const confirmResult = confirm('¿Estás seguro de que deseas iniciar este servicio?');

        if (confirmResult !== true) {
            console.log('✋ Inicio de servicio cancelado por el usuario');
            return;
        }

        try {
            const freight = Freight.getById(freightId);
            if (!freight) throw new Error('Flete no encontrado');

            freight.markAsInProgress(this.currentDriverId);

            this.showNotification('Servicio iniciado exitosamente', 'success');
            this.loadFreights();

        } catch (error) {
            console.error('❌ Error iniciando servicio:', error);
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    async completeService(freightId) {
        // Confirmar antes de completar el servicio
        const confirmResult = confirm('¿Estás seguro de que deseas finalizar este servicio?');

        if (confirmResult !== true) {
            console.log('✋ Finalización de servicio cancelada por el usuario');
            return;
        }

        try {
            const freight = Freight.getById(freightId);
            if (!freight) throw new Error('Flete no encontrado');

            freight.markAsCompleted(this.currentDriverId);

            this.showNotification('Servicio completado exitosamente', 'success');
            this.loadFreights();

        } catch (error) {
            console.error('❌ Error completando servicio:', error);
            this.showNotification('Error: ' + error.message, 'error');
        }
    }

    viewRoute(freightId) {
        const freight = Freight.getById(freightId);
        if (!freight) return;

        GoogleMapsService.openRoute(freight.origin, freight.destination);
    }

    editFreight(freightId) {
        const freight = Freight.getById(freightId);
        if (!freight) return;

        // Llenar formulario con datos del flete
        this.populateForm(freight);

        // Scroll al formulario
        const form = document.getElementById('freightForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }

    populateForm(freight) {
        document.getElementById('freightId').value = freight.id;
        document.getElementById('freightDriver').value = freight.driverId;
        document.getElementById('freightOrigin').value = freight.origin;
        document.getElementById('freightDestination').value = freight.destination;
        document.getElementById('freightDistance').value = freight.distance ? `${freight.distance} km` : '';
        document.getElementById('freightTonnage').value = freight.tonnage;
        document.getElementById('freightPrice').value = freight.price;
        document.getElementById('freightServiceDate').value = freight.serviceDate;
        document.getElementById('freightServiceTime').value = freight.serviceTime;
        document.getElementById('freightClientName').value = freight.clientName;
        document.getElementById('freightClientPhone').value = freight.clientPhone;
        document.getElementById('freightObservations').value = freight.observations;

        // Cambiar texto del botón
        const submitBtn = document.querySelector('#freightForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Flete';
        }
    }

    async deleteFreight(freightId) {
        if (!confirm('¿Estás seguro de que deseas eliminar este flete?')) return;

        try {
            Freight.delete(freightId);
            this.showNotification('Flete eliminado exitosamente', 'success');
            this.loadFreights();

        } catch (error) {
            console.error('❌ Error eliminando flete:', error);
            this.showNotification('Error eliminando flete: ' + error.message, 'error');
        }
    }

    showDriverFreights() {
        // Método para mostrar vista específica de conductor
        const freights = Freight.getPendingForDriver(this.currentDriverId);
        this.renderDriverFreights();
    }

    // Métodos de utilidad
    showNotification(message, type = 'info') {
        // Implementar sistema de notificaciones si no existe
        console.log(`[${type.toUpperCase()}] ${message}`);

        // Si existe un sistema de notificaciones en BaseController, usarlo
        if (typeof this.showAlert === 'function') {
            this.showAlert(message, type);
        }
    }
}

// Asegurar que esté disponible globalmente
window.FreightController = FreightController;