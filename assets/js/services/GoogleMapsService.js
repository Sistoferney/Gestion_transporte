/**
 * Servicio Google Maps - Integración para cálculo de distancias y rutas
 */
class GoogleMapsService {
    static config = {
        loaded: false,
        apiKey: null,
        language: 'es',
        region: 'CO', // Colombia
        libraries: ['places', 'geometry']
    };

    // Inicializar Google Maps API
    static async initialize(apiKey = null) {
        if (this.config.loaded && window.google && window.google.maps) {
            console.log('✅ Google Maps ya está cargado');
            return true;
        }

        try {
            // Si no se proporciona API key, intentar obtenerla del localStorage
            if (!apiKey) {
                const settings = StorageService.getUserSettings();
                apiKey = settings.googleMapsApiKey;
            }

            if (!apiKey) {
                console.warn('⚠️ No se ha configurado la API Key de Google Maps');
                return false;
            }

            console.log('🗺️ Inicializando Google Maps...');

            // Configurar callback global
            window.googleMapsInitCallback = () => {
                this.config.loaded = true;
                console.log('✅ Google Maps inicializado correctamente');
                window.dispatchEvent(new CustomEvent('googleMapsLoaded'));
            };

            // Crear script tag para cargar Google Maps
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=${this.config.language}&region=${this.config.region}&libraries=${this.config.libraries.join(',')}&callback=googleMapsInitCallback`;
            script.async = true;
            script.defer = true;

            // Manejar errores de carga
            script.onerror = () => {
                console.error('❌ Error cargando Google Maps API');
                window.dispatchEvent(new CustomEvent('googleMapsError', {
                    detail: { error: 'Error cargando la API' }
                }));
            };

            document.head.appendChild(script);
            this.config.apiKey = apiKey;

            return new Promise((resolve) => {
                window.addEventListener('googleMapsLoaded', () => resolve(true), { once: true });
                window.addEventListener('googleMapsError', () => resolve(false), { once: true });

                // Timeout después de 10 segundos
                setTimeout(() => {
                    if (!this.config.loaded) {
                        console.error('❌ Timeout cargando Google Maps');
                        resolve(false);
                    }
                }, 10000);
            });

        } catch (error) {
            console.error('❌ Error inicializando Google Maps:', error);
            return false;
        }
    }

    // Verificar si está disponible
    static isAvailable() {
        return this.config.loaded && window.google && window.google.maps;
    }

    // Calcular distancia entre dos ubicaciones
    static async calculateDistance(origin, destination) {
        if (!this.isAvailable()) {
            console.warn('⚠️ Google Maps no está disponible');
            return null;
        }

        try {
            console.log(`📏 Calculando distancia: ${origin} → ${destination}`);

            return new Promise((resolve, reject) => {
                const service = new google.maps.DistanceMatrixService();

                service.getDistanceMatrix({
                    origins: [origin],
                    destinations: [destination],
                    travelMode: google.maps.TravelMode.DRIVING,
                    unitSystem: google.maps.UnitSystem.METRIC,
                    avoidHighways: false,
                    avoidTolls: false,
                    durationInTraffic: false
                }, (response, status) => {
                    if (status === 'OK' && response.rows && response.rows[0]) {
                        const element = response.rows[0].elements[0];

                        if (element.status === 'OK') {
                            const result = {
                                distance: {
                                    text: element.distance.text,
                                    value: element.distance.value // metros
                                },
                                duration: {
                                    text: element.duration.text,
                                    value: element.duration.value // segundos
                                },
                                distanceKm: Math.round(element.distance.value / 1000 * 100) / 100, // km con 2 decimales
                                durationMinutes: Math.round(element.duration.value / 60),
                                origin: origin,
                                destination: destination
                            };

                            console.log(`📏 Distancia calculada: ${result.distanceKm} km, ${result.duration.text}`);
                            resolve(result);
                        } else {
                            const error = `No se pudo calcular la ruta: ${element.status}`;
                            console.error('❌', error);
                            reject(new Error(error));
                        }
                    } else {
                        const error = `Error en Distance Matrix API: ${status}`;
                        console.error('❌', error);
                        reject(new Error(error));
                    }
                });
            });

        } catch (error) {
            console.error('❌ Error calculando distancia:', error);
            throw error;
        }
    }

    // Obtener URL de Google Maps para mostrar ruta
    static getRouteUrl(origin, destination) {
        const baseUrl = 'https://www.google.com/maps/dir/';
        const encodedOrigin = encodeURIComponent(origin);
        const encodedDestination = encodeURIComponent(destination);

        return `${baseUrl}${encodedOrigin}/${encodedDestination}`;
    }

    // Abrir ruta en Google Maps (nueva ventana)
    static openRoute(origin, destination) {
        const url = this.getRouteUrl(origin, destination);
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    // Validar ubicación usando Geocoding
    static async validateLocation(location) {
        if (!this.isAvailable()) {
            return { valid: false, error: 'Google Maps no disponible' };
        }

        try {
            return new Promise((resolve) => {
                const geocoder = new google.maps.Geocoder();

                geocoder.geocode({
                    address: location,
                    region: this.config.region
                }, (results, status) => {
                    if (status === 'OK' && results && results.length > 0) {
                        const result = results[0];
                        resolve({
                            valid: true,
                            formatted_address: result.formatted_address,
                            location: {
                                lat: result.geometry.location.lat(),
                                lng: result.geometry.location.lng()
                            },
                            types: result.types
                        });
                    } else {
                        resolve({
                            valid: false,
                            error: `No se pudo validar la ubicación: ${status}`
                        });
                    }
                });
            });

        } catch (error) {
            console.error('❌ Error validando ubicación:', error);
            return { valid: false, error: error.message };
        }
    }

    // Sugerir ubicaciones (autocomplete)
    static async suggestLocations(input, limit = 5) {
        if (!this.isAvailable()) {
            return [];
        }

        try {
            return new Promise((resolve) => {
                const service = new google.maps.places.AutocompleteService();

                service.getPlacePredictions({
                    input: input,
                    componentRestrictions: { country: 'co' }, // Solo Colombia
                    types: ['geocode'] // Solo direcciones geográficas
                }, (predictions, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                        const suggestions = predictions.slice(0, limit).map(prediction => ({
                            description: prediction.description,
                            place_id: prediction.place_id,
                            types: prediction.types
                        }));

                        resolve(suggestions);
                    } else {
                        resolve([]);
                    }
                });
            });

        } catch (error) {
            console.error('❌ Error obteniendo sugerencias:', error);
            return [];
        }
    }

    // Configurar API Key
    static setApiKey(apiKey) {
        const settings = StorageService.getUserSettings();
        settings.googleMapsApiKey = apiKey;
        StorageService.setUserSettings(settings);
        this.config.apiKey = apiKey;

        console.log('🔑 Google Maps API Key configurada');
    }

    // Obtener API Key configurada
    static getApiKey() {
        if (this.config.apiKey) {
            return this.config.apiKey;
        }

        const settings = StorageService.getUserSettings();
        return settings.googleMapsApiKey || null;
    }

    // Verificar si está configurado
    static isConfigured() {
        return !!this.getApiKey();
    }

    // Calcular distancia aproximada sin API (fórmula Haversine)
    static calculateApproximateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.degToRad(lat2 - lat1);
        const dLng = this.degToRad(lng2 - lng1);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distancia en km

        return Math.round(distance * 100) / 100; // 2 decimales
    }

    static degToRad(deg) {
        return deg * (Math.PI/180);
    }

    // Obtener información de configuración
    static getConfig() {
        return {
            loaded: this.config.loaded,
            configured: this.isConfigured(),
            available: this.isAvailable(),
            apiKey: this.getApiKey() ? '***configurada***' : 'No configurada',
            language: this.config.language,
            region: this.config.region
        };
    }

    // Reinicializar con nueva configuración
    static async reinitialize(apiKey) {
        this.config.loaded = false;

        // Remover script anterior si existe
        const oldScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (oldScript) {
            oldScript.remove();
        }

        // Limpiar callback global
        delete window.googleMapsInitCallback;

        // Inicializar con nueva API key
        return await this.initialize(apiKey);
    }

    // Método de prueba
    static async test() {
        console.log('🧪 Ejecutando prueba de Google Maps...');

        if (!this.isConfigured()) {
            console.error('❌ Google Maps no está configurado');
            return false;
        }

        if (!this.isAvailable()) {
            const initialized = await this.initialize();
            if (!initialized) {
                console.error('❌ No se pudo inicializar Google Maps');
                return false;
            }
        }

        try {
            // Prueba con ubicaciones conocidas en Colombia
            const result = await this.calculateDistance('Bogotá, Colombia', 'Medellín, Colombia');
            console.log('✅ Prueba exitosa:', result);
            return true;
        } catch (error) {
            console.error('❌ Error en prueba:', error);
            return false;
        }
    }
}

// Asegurar que esté disponible globalmente
window.GoogleMapsService = GoogleMapsService;