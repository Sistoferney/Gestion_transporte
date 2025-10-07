/**
 * Servicio OpenStreetMap - Alternativa gratuita a Google Maps
 * Usa Nominatim para geocoding y OSRM para routing
 */
class OpenStreetMapService {
    static config = {
        nominatimUrl: 'https://nominatim.openstreetmap.org',
        osrmUrl: 'https://router.project-osrm.org/route/v1/driving',
        enabled: true,
        userAgent: 'GestionTransporte/1.0'
    };

    // Verificar si está disponible
    static isAvailable() {
        return this.config.enabled && navigator.onLine;
    }

    // Calcular distancia entre dos ubicaciones
    static async calculateDistance(origin, destination) {
        if (!this.isAvailable()) {
            throw new Error('OpenStreetMap no está disponible (verifica tu conexión a internet)');
        }

        try {
            console.log(`📏 [OSM] Calculando distancia: ${origin} → ${destination}`);

            // 1. Geocodificar origen y destino
            const [originCoords, destCoords] = await Promise.all([
                this.geocode(origin),
                this.geocode(destination)
            ]);

            if (!originCoords || !destCoords) {
                throw new Error('No se pudieron encontrar las coordenadas de las ubicaciones');
            }

            // 2. Calcular ruta
            const route = await this.calculateRoute(originCoords, destCoords);

            const result = {
                distance: {
                    text: `${route.distanceKm} km`,
                    value: route.distanceM
                },
                duration: {
                    text: route.durationText,
                    value: route.durationSeconds
                },
                distanceKm: route.distanceKm,
                durationMinutes: Math.round(route.durationSeconds / 60),
                origin: origin,
                destination: destination,
                coordinates: {
                    origin: originCoords,
                    destination: destCoords
                }
            };

            console.log(`📏 [OSM] Distancia calculada: ${result.distanceKm} km, ${result.duration.text}`);
            return result;

        } catch (error) {
            console.error('❌ [OSM] Error calculando distancia:', error);
            throw error;
        }
    }

    // Geocodificar una dirección (convertir a coordenadas)
    static async geocode(address) {
        try {
            const query = encodeURIComponent(`${address}, Colombia`);
            const url = `${this.config.nominatimUrl}/search?format=json&q=${query}&limit=1&countrycodes=co`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.config.userAgent
                }
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                throw new Error(`No se encontró la ubicación: ${address}`);
            }

            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                display_name: result.display_name
            };

        } catch (error) {
            console.error(`❌ [OSM] Error geocodificando "${address}":`, error);
            throw new Error(`No se pudo encontrar la ubicación: ${address}`);
        }
    }

    // Calcular ruta entre dos coordenadas
    static async calculateRoute(originCoords, destCoords) {
        try {
            const url = `${this.config.osrmUrl}/${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}?overview=false&steps=false`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (!data.routes || data.routes.length === 0) {
                throw new Error('No se pudo calcular la ruta');
            }

            const route = data.routes[0];
            const distanceM = route.distance; // metros
            const durationSeconds = route.duration; // segundos

            return {
                distanceM: distanceM,
                distanceKm: Math.round(distanceM / 1000 * 100) / 100, // km con 2 decimales
                durationSeconds: durationSeconds,
                durationText: this.formatDuration(durationSeconds)
            };

        } catch (error) {
            console.error('❌ [OSM] Error calculando ruta:', error);
            throw new Error('No se pudo calcular la ruta entre las ubicaciones');
        }
    }

    // Formatear duración en texto legible
    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    // Sugerir ubicaciones (búsqueda básica)
    static async suggestLocations(input, limit = 5) {
        if (!this.isAvailable() || !input || input.length < 3) {
            return [];
        }

        try {
            const query = encodeURIComponent(`${input}, Colombia`);
            const url = `${this.config.nominatimUrl}/search?format=json&q=${query}&limit=${limit}&countrycodes=co&addressdetails=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.config.userAgent
                }
            });

            if (!response.ok) {
                return [];
            }

            const data = await response.json();

            return data.map(item => ({
                description: item.display_name,
                place_id: item.place_id,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                type: item.type,
                address: item.address
            }));

        } catch (error) {
            console.error('❌ [OSM] Error obteniendo sugerencias:', error);
            return [];
        }
    }

    // Validar ubicación
    static async validateLocation(location) {
        try {
            const coords = await this.geocode(location);
            return {
                valid: true,
                formatted_address: coords.display_name,
                location: {
                    lat: coords.lat,
                    lng: coords.lng
                }
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Obtener URL para ver ruta (OpenStreetMap)
    static getRouteUrl(origin, destination) {
        const encodedOrigin = encodeURIComponent(origin);
        const encodedDestination = encodeURIComponent(destination);

        // Usar OpenStreetMap con direcciones
        return `https://www.openstreetmap.org/directions?from=${encodedOrigin}&to=${encodedDestination}&route=driving`;
    }

    // Abrir ruta en OpenStreetMap
    static openRoute(origin, destination) {
        const url = this.getRouteUrl(origin, destination);
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    // Método de prueba
    static async test() {
        console.log('🧪 [OSM] Ejecutando prueba de OpenStreetMap...');

        if (!this.isAvailable()) {
            console.error('❌ [OSM] OpenStreetMap no está disponible');
            return false;
        }

        try {
            // Prueba con ubicaciones conocidas en Colombia
            const result = await this.calculateDistance('Bogotá, Colombia', 'Medellín, Colombia');
            console.log('✅ [OSM] Prueba exitosa:', result);
            return true;
        } catch (error) {
            console.error('❌ [OSM] Error en prueba:', error);
            return false;
        }
    }

    // Obtener información de configuración
    static getConfig() {
        return {
            available: this.isAvailable(),
            online: navigator.onLine,
            nominatimUrl: this.config.nominatimUrl,
            osrmUrl: this.config.osrmUrl,
            enabled: this.config.enabled
        };
    }

    // Calcular distancia aproximada (fórmula Haversine) como fallback
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

    // Configurar/Desconfigurar servicio
    static enable() {
        this.config.enabled = true;
        console.log('✅ [OSM] OpenStreetMap habilitado');
    }

    static disable() {
        this.config.enabled = false;
        console.log('❌ [OSM] OpenStreetMap deshabilitado');
    }
}

// Asegurar que esté disponible globalmente
window.OpenStreetMapService = OpenStreetMapService;