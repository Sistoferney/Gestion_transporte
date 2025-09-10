/**
 * Servicio de Email - Gestión de notificaciones por correo electrónico
 * Utiliza EmailJS para envío de emails sin backend
 */
class EmailService {
    constructor() {
        this.isInitialized = false;
        this.config = {
            serviceId: '', // Se configurará desde la UI
            templateId: '', // Se configurará desde la UI
            publicKey: '', // Se configurará desde la UI
            adminEmail: '' // Email del administrador
        };
        this.sentAlerts = new Set(); // Para evitar spam de emails
        this.initialize();
    }

    async initialize() {
        try {
            // Cargar configuración guardada
            this.loadConfig();
            
            // Inicializar EmailJS si hay configuración
            if (this.config.publicKey) {
                await this.initializeEmailJS();
            }
        } catch (error) {
            console.error('Error al inicializar EmailService:', error);
        }
    }

    loadConfig() {
        const savedConfig = localStorage.getItem('emailConfig');
        if (savedConfig) {
            this.config = { ...this.config, ...JSON.parse(savedConfig) };
        }
    }

    saveConfig() {
        localStorage.setItem('emailConfig', JSON.stringify(this.config));
    }

    async initializeEmailJS() {
        try {
            // Cargar EmailJS desde CDN si no está disponible
            if (typeof emailjs === 'undefined') {
                await this.loadEmailJSScript();
            }
            
            // Inicializar con la clave pública
            emailjs.init(this.config.publicKey);
            this.isInitialized = true;
            console.log('✅ EmailJS inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar EmailJS:', error);
            this.isInitialized = false;
        }
    }

    loadEmailJSScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Configurar credenciales de EmailJS
    setConfig(serviceId, templateId, publicKey, adminEmail) {
        this.config = {
            serviceId,
            templateId, 
            publicKey,
            adminEmail
        };
        this.saveConfig();
        return this.initializeEmailJS();
    }

    // Verificar si el servicio está configurado
    isConfigured() {
        return this.config.serviceId && this.config.templateId && 
               this.config.publicKey && this.config.adminEmail;
    }

    // Generar clave única para alertas (evitar spam)
    generateAlertKey(vehicleId, documentType, alertType) {
        const today = new Date().toDateString();
        return `${vehicleId}_${documentType}_${alertType}_${today}`;
    }

    // Verificar si ya se envió la alerta hoy
    wasAlertSentToday(alertKey) {
        return this.sentAlerts.has(alertKey);
    }

    // Marcar alerta como enviada
    markAlertAsSent(alertKey) {
        this.sentAlerts.add(alertKey);
        // Limpiar alertas antiguas (más de 24 horas)
        this.cleanOldAlerts();
    }

    cleanOldAlerts() {
        // Limpiar alertas cada 100 nuevas alertas para mantener rendimiento
        if (this.sentAlerts.size > 100) {
            this.sentAlerts.clear();
        }
    }

    // Enviar alerta de documento por vencer
    async sendDocumentExpirationAlert(document, vehicle, daysToExpiry) {
        if (!this.isConfigured() || !this.isInitialized) {
            console.warn('EmailService no está configurado o inicializado');
            return false;
        }

        const alertType = this.getAlertType(daysToExpiry);
        const alertKey = this.generateAlertKey(vehicle.id, document.type, alertType);

        // Evitar spam - no enviar la misma alerta el mismo día
        if (this.wasAlertSentToday(alertKey)) {
            console.log(`Alerta ya enviada hoy: ${alertKey}`);
            return false;
        }

        try {
            const templateParams = {
                to_email: this.config.adminEmail,
                vehicle_plate: vehicle.plate,
                vehicle_brand: `${vehicle.brand} ${vehicle.model}`,
                document_type: document.getTypeName(),
                expiry_date: this.formatDate(document.expiryDate),
                days_to_expiry: Math.abs(daysToExpiry),
                alert_type: alertType,
                alert_message: this.generateAlertMessage(document, vehicle, daysToExpiry),
                company_name: 'Sistema de Gestión de Transporte',
                current_date: this.formatDate(new Date())
            };

            const response = await emailjs.send(
                this.config.serviceId,
                this.config.templateId,
                templateParams
            );

            console.log('✅ Email enviado exitosamente:', response);
            this.markAlertAsSent(alertKey);
            return true;

        } catch (error) {
            console.error('❌ Error al enviar email:', error);
            return false;
        }
    }

    getAlertType(daysToExpiry) {
        if (daysToExpiry < 0) return 'VENCIDO';
        if (daysToExpiry <= 8) return 'URGENTE';
        if (daysToExpiry <= 30) return 'PRÓXIMO_A_VENCER';
        return 'INFORMATIVO';
    }

    generateAlertMessage(document, vehicle, daysToExpiry) {
        const vehicleInfo = `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}`;
        const docType = document.getTypeName();

        if (daysToExpiry < 0) {
            return `⚠️ DOCUMENTO VENCIDO: El ${docType} del vehículo ${vehicleInfo} venció hace ${Math.abs(daysToExpiry)} días. Requiere atención inmediata.`;
        } else if (daysToExpiry <= 8) {
            return `🚨 URGENTE: El ${docType} del vehículo ${vehicleInfo} vence en ${daysToExpiry} días. Renueve lo antes posible.`;
        } else if (daysToExpiry <= 30) {
            return `⏰ PRÓXIMO A VENCER: El ${docType} del vehículo ${vehicleInfo} vence en ${daysToExpiry} días. Planifique su renovación.`;
        }
        
        return `📋 INFORMACIÓN: El ${docType} del vehículo ${vehicleInfo} vence en ${daysToExpiry} días.`;
    }

    formatDate(date) {
        if (!date) return 'No especificada';
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Procesar todas las alertas de documentos
    async processDocumentAlerts() {
        if (!this.isConfigured()) {
            console.warn('EmailService no configurado - no se enviarán emails');
            return;
        }

        try {
            const documents = Document.getAll();
            const vehicles = Vehicle.getAll();
            let emailsSent = 0;

            for (const document of documents) {
                // Saltar documentos que no aplican
                if (document.type === 'seal' && document.applies === 'no') continue;

                const vehicle = vehicles.find(v => v.id === document.vehicleId);
                if (!vehicle) continue;

                const daysToExpiry = document.getDaysToExpiry();

                // Enviar email si está en los rangos de alerta
                if (this.shouldSendAlert(daysToExpiry)) {
                    const sent = await this.sendDocumentExpirationAlert(document, vehicle, daysToExpiry);
                    if (sent) emailsSent++;
                    
                    // Pequeña pausa entre emails para evitar límites de rate
                    await this.delay(1000);
                }
            }

            if (emailsSent > 0) {
                console.log(`📧 Se enviaron ${emailsSent} alertas por email`);
            }

        } catch (error) {
            console.error('Error al procesar alertas de documentos:', error);
        }
    }

    shouldSendAlert(daysToExpiry) {
        return daysToExpiry < 0 || // Vencido
               daysToExpiry <= 8 || // 8 días o menos
               daysToExpiry <= 30;  // 30 días o menos
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Enviar email de prueba
    async sendTestEmail() {
        if (!this.isConfigured() || !this.isInitialized) {
            throw new Error('EmailService no está configurado correctamente');
        }

        const templateParams = {
            to_email: this.config.adminEmail,
            vehicle_plate: 'ABC-123',
            vehicle_brand: 'Prueba Test',
            document_type: 'Email de Prueba',
            expiry_date: this.formatDate(new Date()),
            days_to_expiry: 0,
            alert_type: 'PRUEBA',
            alert_message: '✅ Este es un email de prueba del Sistema de Gestión de Transporte. El servicio de notificaciones está funcionando correctamente.',
            company_name: 'Sistema de Gestión de Transporte',
            current_date: this.formatDate(new Date())
        };

        return await emailjs.send(
            this.config.serviceId,
            this.config.templateId,
            templateParams
        );
    }

    // Obtener estadísticas de emails
    getEmailStats() {
        return {
            isConfigured: this.isConfigured(),
            isInitialized: this.isInitialized,
            alertsSentToday: this.sentAlerts.size,
            adminEmail: this.config.adminEmail
        };
    }

    // Limpiar configuración
    clearConfig() {
        this.config = {
            serviceId: '',
            templateId: '',
            publicKey: '',
            adminEmail: ''
        };
        this.isInitialized = false;
        localStorage.removeItem('emailConfig');
        this.sentAlerts.clear();
    }
}

// Instancia global del servicio de email
window.emailService = new EmailService();