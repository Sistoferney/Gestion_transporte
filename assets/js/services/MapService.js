/**
 * MapService - Servicio unificado de mapas
 * Usa Google Maps si está configurado, sino OpenStreetMap como fallback
 */
class MapService {
    static providers = {
        GOOGLE_MAPS: 'google',
        OPENSTREETMAP: 'osm'
    };

    // Obtener el proveedor activo
    static getActiveProvider() {
        // Priorizar Google Maps si está configurado
        if (typeof GoogleMapsService !== 'undefined' && GoogleMapsService.isConfigured()) {
            return this.providers.GOOGLE_MAPS;
        }

        // Usar OpenStreetMap como fallback
        if (typeof OpenStreetMapService !== 'undefined' && OpenStreetMapService.isAvailable()) {
            return this.providers.OPENSTREETMAP;
        }

        return null;
    }

    // Verificar si algún servicio está disponible
    static isAvailable() {
        return this.getActiveProvider() !== null;
    }

    // Calcular distancia usando el proveedor disponible
    static async calculateDistance(origin, destination) {
        const provider = this.getActiveProvider();

        if (!provider) {
            throw new Error('No hay servicios de mapas disponibles');
        }

        try {
            console.log(`🗺️ [MapService] Usando proveedor: ${provider}`);

            if (provider === this.providers.GOOGLE_MAPS) {
                // Asegurar que Google Maps esté inicializado
                if (!GoogleMapsService.isAvailable()) {
                    await GoogleMapsService.initialize();
                }
                return await GoogleMapsService.calculateDistance(origin, destination);
            } else {
                return await OpenStreetMapService.calculateDistance(origin, destination);
            }

        } catch (error) {
            console.warn(`⚠️ [MapService] Error con ${provider}, intentando fallback...`);

            // Si Google Maps falla, intentar con OpenStreetMap
            if (provider === this.providers.GOOGLE_MAPS) {
                try {
                    console.log('🔄 [MapService] Fallback a OpenStreetMap');
                    return await OpenStreetMapService.calculateDistance(origin, destination);
                } catch (fallbackError) {
                    console.error('❌ [MapService] Fallback también falló:', fallbackError);
                    throw new Error(`Error calculando distancia: ${error.message}`);
                }
            }

            throw error;
        }
    }

    // Sugerir ubicaciones
    static async suggestLocations(input, limit = 5) {
        const provider = this.getActiveProvider();

        if (!provider) {
            return [];
        }

        try {
            if (provider === this.providers.GOOGLE_MAPS && GoogleMapsService.isAvailable()) {
                return await GoogleMapsService.suggestLocations(input, limit);
            } else {
                return await OpenStreetMapService.suggestLocations(input, limit);
            }
        } catch (error) {
            console.error('❌ [MapService] Error obteniendo sugerencias:', error);
            return [];
        }
    }

    // Validar ubicación
    static async validateLocation(location) {
        const provider = this.getActiveProvider();

        if (!provider) {
            return { valid: false, error: 'No hay servicios de mapas disponibles' };
        }

        try {
            if (provider === this.providers.GOOGLE_MAPS && GoogleMapsService.isAvailable()) {
                return await GoogleMapsService.validateLocation(location);
            } else {
                return await OpenStreetMapService.validateLocation(location);
            }
        } catch (error) {
            console.error('❌ [MapService] Error validando ubicación:', error);
            return { valid: false, error: error.message };
        }
    }

    // Obtener URL de ruta
    static getRouteUrl(origin, destination) {
        const provider = this.getActiveProvider();

        if (provider === this.providers.GOOGLE_MAPS) {
            return GoogleMapsService.getRouteUrl(origin, destination);
        } else {
            return OpenStreetMapService.getRouteUrl(origin, destination);
        }
    }

    // Abrir ruta en el mapa
    static openRoute(origin, destination) {
        const provider = this.getActiveProvider();

        if (provider === this.providers.GOOGLE_MAPS) {
            GoogleMapsService.openRoute(origin, destination);
        } else {
            OpenStreetMapService.openRoute(origin, destination);
        }
    }

    // Configurar autocompletado (solo para Google Maps)
    static setupAutocomplete(originField, destinationField, onPlaceSelectedCallback) {
        const provider = this.getActiveProvider();

        if (provider === this.providers.GOOGLE_MAPS && GoogleMapsService.isAvailable()) {
            // Configurar autocompletado de Google Maps
            if (originField && window.google) {
                const originAutocomplete = new google.maps.places.Autocomplete(originField, {
                    componentRestrictions: { country: 'co' },
                    types: ['geocode']
                });

                originAutocomplete.addListener('place_changed', () => {
                    if (onPlaceSelectedCallback) {
                        onPlaceSelectedCallback('origin');
                    }
                });
            }

            if (destinationField && window.google) {
                const destinationAutocomplete = new google.maps.places.Autocomplete(destinationField, {
                    componentRestrictions: { country: 'co' },
                    types: ['geocode']
                });

                destinationAutocomplete.addListener('place_changed', () => {
                    if (onPlaceSelectedCallback) {
                        onPlaceSelectedCallback('destination');
                    }
                });
            }

            return true;
        } else {
            // Para OpenStreetMap, podríamos implementar un autocompletado manual
            // Por ahora, retornamos false para indicar que no está disponible
            console.log('📝 [MapService] Autocompletado no disponible con OpenStreetMap');
            return false;
        }
    }

    // Obtener información de configuración
    static getConfig() {
        const provider = this.getActiveProvider();

        return {
            activeProvider: provider,
            available: this.isAvailable(),
            google: typeof GoogleMapsService !== 'undefined' ? {
                configured: GoogleMapsService.isConfigured(),
                available: GoogleMapsService.isAvailable()
            } : { configured: false, available: false },
            osm: typeof OpenStreetMapService !== 'undefined' ? {
                available: OpenStreetMapService.isAvailable(),
                config: OpenStreetMapService.getConfig()
            } : { available: false }
        };
    }

    // Método de prueba
    static async test() {
        console.log('🧪 [MapService] Ejecutando prueba del servicio unificado...');

        const config = this.getConfig();
        console.log('📋 [MapService] Configuración:', config);

        if (!this.isAvailable()) {
            console.error('❌ [MapService] No hay servicios disponibles');
            return false;
        }

        try {
            const result = await this.calculateDistance('Bogotá, Colombia', 'Medellín, Colombia');
            console.log('✅ [MapService] Prueba exitosa:', result);
            return true;
        } catch (error) {
            console.error('❌ [MapService] Error en prueba:', error);
            return false;
        }
    }

    // Obtener texto descriptivo del proveedor activo
    static getProviderName() {
        const provider = this.getActiveProvider();

        switch (provider) {
            case this.providers.GOOGLE_MAPS:
                return 'Google Maps';
            case this.providers.OPENSTREETMAP:
                return 'OpenStreetMap';
            default:
                return 'Ninguno';
        }
    }

    // Verificar si se necesita configuración adicional
    static needsConfiguration() {
        return !this.isAvailable();
    }

    // Obtener mensaje de estado para mostrar al usuario
    static getStatusMessage() {
        const provider = this.getActiveProvider();

        if (!provider) {
            return {
                type: 'error',
                message: 'No hay servicios de mapas disponibles. Verifica tu conexión a internet.'
            };
        }

        if (provider === this.providers.GOOGLE_MAPS) {
            return {
                type: 'success',
                message: 'Usando Google Maps - Cálculo automático de distancias y autocompletado disponibles.'
            };
        } else {
            return {
                type: 'info',
                message: 'Usando OpenStreetMap (gratuito) - Cálculo automático de distancias disponible.'
            };
        }
    }
}

// Asegurar que esté disponible globalmente
window.MapService = MapService;