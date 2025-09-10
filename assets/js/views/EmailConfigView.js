/**
 * Vista de Configuración de Email - Interfaz para configurar EmailJS
 */
class EmailConfigView extends BaseView {
    constructor(containerId = 'email-config') {
        super(containerId);
        this.templateName = 'Configuración de Email';
        this.hasBeenRendered = false; // Flag para tracking de renderizado
    }

    render() {
        const container = this.getContainer();
        if (!container) return '';
        
        // Verificar si ya ha sido renderizado anteriormente
        if (!this.hasBeenRendered) {
            console.log('📧 [EmailConfigView.render] Generando contenido inicial...');
            const content = this.generateContent();
            container.innerHTML = content;
            this.setupEventListeners();
            this.hasBeenRendered = true; // Marcar como renderizado
        } else {
            console.log('📧 [EmailConfigView.render] Contenido HTML ya existe, solo actualizando datos...');
            // Si por alguna razón el contenedor está vacío pero ya había sido renderizado,
            // re-renderizar para evitar pantalla en blanco
            if (container.innerHTML.length === 0) {
                console.log('📧 [EmailConfigView.render] Contenedor vacío detectado, re-renderizando...');
                const content = this.generateContent();
                container.innerHTML = content;
                this.setupEventListeners();
            }
        }
        
        return container.innerHTML;
    }

    generateContent() {
        const emailStats = window.emailService ? window.emailService.getEmailStats() : {
            isConfigured: false,
            isInitialized: false,
            alertsSentToday: 0,
            adminEmail: ''
        };

        return `
            <div class="email-config-container">
                <div class="card">
                    <h2>📧 Configuración de Notificaciones por Email</h2>
                    <p>Configure las alertas automáticas por correo electrónico para documentos de vehículos.</p>
                    
                    <!-- Estado actual -->
                    <div class="status-section">
                        <h3>Estado del Servicio</h3>
                        <div class="status-grid">
                            <div class="status-item ${emailStats.isConfigured ? 'success' : 'error'}">
                                <span class="status-icon">${emailStats.isConfigured ? '✅' : '❌'}</span>
                                <span>Configurado: ${emailStats.isConfigured ? 'Sí' : 'No'}</span>
                            </div>
                            <div class="status-item ${emailStats.isInitialized ? 'success' : 'error'}">
                                <span class="status-icon">${emailStats.isInitialized ? '✅' : '❌'}</span>
                                <span>Inicializado: ${emailStats.isInitialized ? 'Sí' : 'No'}</span>
                            </div>
                            <div class="status-item">
                                <span class="status-icon">📊</span>
                                <span>Alertas enviadas hoy: ${emailStats.alertsSentToday}</span>
                            </div>
                        </div>
                        ${emailStats.adminEmail ? `<p><strong>Email configurado:</strong> ${emailStats.adminEmail}</p>` : ''}
                    </div>

                    <!-- Formulario de configuración -->
                    <div class="config-section">
                        <h3>Configuración de EmailJS</h3>
                        <div class="info-box">
                            <h4>📋 Pasos para configurar EmailJS:</h4>
                            <ol>
                                <li>Crear cuenta en <a href="https://www.emailjs.com/" target="_blank">EmailJS.com</a></li>
                                <li>Crear un servicio de email (Gmail, Outlook, etc.)</li>
                                <li>Crear una plantilla de email</li>
                                <li>Obtener las credenciales y configurarlas aquí</li>
                            </ol>
                        </div>

                        <form id="emailConfigForm" class="email-config-form">
                            <div class="form-group">
                                <label for="serviceId">Service ID *</label>
                                <input type="text" id="serviceId" name="serviceId" placeholder="Ej: service_xxxxxxx" required autocomplete="off">
                                <small>ID del servicio de email en EmailJS</small>
                            </div>

                            <div class="form-group">
                                <label for="templateId">Template ID *</label>
                                <input type="text" id="templateId" name="templateId" placeholder="Ej: template_xxxxxxx" required autocomplete="off">
                                <small>ID de la plantilla de email en EmailJS</small>
                            </div>

                            <div class="form-group">
                                <label for="publicKey">Public Key *</label>
                                <input type="text" id="publicKey" name="publicKey" placeholder="Ej: user_xxxxxxxxxxxxxxxxxxxx" required autocomplete="off">
                                <small>Clave pública de EmailJS</small>
                            </div>

                            <div class="form-group">
                                <label for="adminEmail">Email de Administrador *</label>
                                <input type="email" id="adminEmail" name="adminEmail" placeholder="admin@empresa.com" required>
                                <small>Email donde se recibirán las alertas</small>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">💾 Guardar Configuración</button>
                                <button type="button" id="testEmailBtn" class="btn btn-secondary">📧 Enviar Email de Prueba</button>
                                <button type="button" id="clearConfigBtn" class="btn btn-danger">🗑️ Limpiar Configuración</button>
                            </div>
                        </form>
                    </div>

                    <!-- Plantilla de email recomendada -->
                    <div class="template-section">
                        <h3>📝 Plantilla de Email Recomendada</h3>
                        <p>Cree una plantilla en EmailJS con el siguiente contenido:</p>
                        
                        <div class="template-example">
                            <h4>Asunto:</h4>
                            <code>{{alert_type}} - {{document_type}} {{vehicle_plate}}</code>
                            
                            <h4>Contenido:</h4>
                            <pre class="template-content">
Estimado administrador,

{{alert_message}}

DETALLES:
• Vehículo: {{vehicle_plate}} - {{vehicle_brand}}
• Documento: {{document_type}}
• Fecha de vencimiento: {{expiry_date}}
• Días hasta vencimiento: {{days_to_expiry}}

Por favor, tome las acciones necesarias para renovar este documento.

---
{{company_name}}
Fecha: {{current_date}}
                            </pre>
                        </div>

                        <div class="template-variables">
                            <h4>Variables disponibles:</h4>
                            <div class="variables-grid">
                                <span><code>{{to_email}}</code> - Email destino</span>
                                <span><code>{{vehicle_plate}}</code> - Placa del vehículo</span>
                                <span><code>{{vehicle_brand}}</code> - Marca y modelo</span>
                                <span><code>{{document_type}}</code> - Tipo de documento</span>
                                <span><code>{{expiry_date}}</code> - Fecha de vencimiento</span>
                                <span><code>{{days_to_expiry}}</code> - Días hasta vencer</span>
                                <span><code>{{alert_type}}</code> - Tipo de alerta</span>
                                <span><code>{{alert_message}}</code> - Mensaje de alerta</span>
                                <span><code>{{company_name}}</code> - Nombre de la empresa</span>
                                <span><code>{{current_date}}</code> - Fecha actual</span>
                            </div>
                        </div>
                    </div>

                    <!-- Información sobre alertas -->
                    <div class="alerts-info-section">
                        <h3>⚠️ Tipos de Alertas Automáticas</h3>
                        <div class="alert-types">
                            <div class="alert-type-item urgent">
                                <strong>🚨 VENCIDO</strong>
                                <p>Documentos que ya vencieron</p>
                            </div>
                            <div class="alert-type-item warning">
                                <strong>⏰ URGENTE</strong>
                                <p>Documentos que vencen en 8 días o menos</p>
                            </div>
                            <div class="alert-type-item info">
                                <strong>📅 PRÓXIMO A VENCER</strong>
                                <p>Documentos que vencen en 30 días o menos</p>
                            </div>
                        </div>
                        <p><small>💡 Las alertas se verifican automáticamente y solo se envía un email por día por cada documento para evitar spam.</small></p>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        super.setupEventListeners();

        // Formulario de configuración
        const form = document.getElementById('emailConfigForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleConfigSubmit(e));
        }

        // Botón de email de prueba
        const testBtn = document.getElementById('testEmailBtn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.handleTestEmail());
        }

        // Botón de limpiar configuración
        const clearBtn = document.getElementById('clearConfigBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.handleClearConfig());
        }

        // Cargar configuración existente
        this.loadExistingConfig();
    }

    loadExistingConfig() {
        if (!window.emailService) return;

        const config = window.emailService.config;
        if (config) {
            const form = document.getElementById('emailConfigForm');
            if (form) {
                form.serviceId.value = config.serviceId || '';
                form.templateId.value = config.templateId || '';
                form.publicKey.value = config.publicKey || '';
                form.adminEmail.value = config.adminEmail || '';
            }
        }
    }

    async handleConfigSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        
        const config = {
            serviceId: formData.get('serviceId').trim(),
            templateId: formData.get('templateId').trim(),
            publicKey: formData.get('publicKey').trim(),
            adminEmail: formData.get('adminEmail').trim()
        };

        try {
            this.showLoading('Configurando EmailJS...');

            if (!window.emailService) {
                throw new Error('EmailService no está disponible');
            }

            await window.emailService.setConfig(
                config.serviceId,
                config.templateId,
                config.publicKey,
                config.adminEmail
            );

            this.hideLoading();
            this.showSuccess('✅ Configuración guardada exitosamente. EmailJS está listo para usar.');
            
            // Actualizar la vista
            setTimeout(() => {
                this.render();
                this.setupEventListeners();
            }, 1000);

        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al configurar EmailJS');
        }
    }

    async handleTestEmail() {
        if (!window.emailService || !window.emailService.isConfigured()) {
            this.showError('Configure EmailJS antes de enviar un email de prueba');
            return;
        }

        try {
            this.showLoading('Enviando email de prueba...');

            await window.emailService.sendTestEmail();
            
            this.hideLoading();
            this.showSuccess('✅ Email de prueba enviado exitosamente. Revise su bandeja de entrada.');

        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al enviar email de prueba');
        }
    }

    handleClearConfig() {
        if (!confirm('¿Está seguro de que desea eliminar la configuración de email? Esto deshabilitará las alertas automáticas.')) {
            return;
        }

        try {
            if (window.emailService) {
                window.emailService.clearConfig();
            }

            this.showSuccess('Configuración eliminada exitosamente');
            
            // Actualizar la vista
            setTimeout(() => {
                this.render();
                this.setupEventListeners();
            }, 1000);

        } catch (error) {
            this.handleError(error, 'Error al limpiar configuración');
        }
    }

    // Método para mostrar en la navegación (si se agrega como sección)
    static getNavigationInfo() {
        return {
            id: 'email-config',
            title: 'Config. Email',
            icon: '📧',
            requiresAuth: true,
            adminOnly: true
        };
    }
}

// Asegurar que la clase está disponible globalmente
window.EmailConfigView = EmailConfigView;
console.log('✅ EmailConfigView cargada y disponible globalmente');