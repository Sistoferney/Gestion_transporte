/**
 * Vista Base - Funcionalidades comunes para todas las vistas
 */
class BaseView {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null; // Se inicializará en getContainer()
        this.data = null;
        this.template = '';
        this.initialized = false;
    }
    
    // Obtener contenedor actualizado cada vez
    getContainer() {
        this.container = document.getElementById(this.containerId);
        return this.container;
    }

    // Inicialización común
    initialize() {
        if (this.initialized) return;
        
        this.setupContainer();
        this.bindEvents();
        this.initialized = true;
    }

    setupContainer() {
        const container = this.getContainer();
        if (!container) {
            console.warn(`Container with ID '${this.containerId}' not found`);
            return;
        }
        
        container.classList.add('view-container');
    }

    // Renderizado principal
    render(data = null) {
        if (data) {
            this.data = data;
        }
        
        if (!this.container) {
            console.warn('Cannot render: container not found');
            return;
        }

        const content = this.generateContent();
        this.container.innerHTML = content;
        
        // Re-bind events después del render
        this.bindEvents();
        this.afterRender();
    }

    // Métodos que las subclases deben implementar
    generateContent() {
        return this.template || '<p>No content defined</p>';
    }

    bindEvents() {
        // Las subclases pueden sobrescribir este método
    }

    setupEventListeners() {
        // Método común para configurar event listeners
        // Las subclases pueden sobrescribir este método
        this.bindEvents();
    }

    afterRender() {
        // Hook para post-procesamiento después del render
    }

    // Utilidades de templating
    template(html, data = {}) {
        return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    templateList(html, items = [], itemTemplate = '') {
        if (!Array.isArray(items) || items.length === 0) {
            return html.replace('{{items}}', '<p>No hay elementos para mostrar</p>');
        }

        const itemsHtml = items.map(item => this.template(itemTemplate, item)).join('');
        return html.replace('{{items}}', itemsHtml);
    }

    // Utilidades de formateo
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount || 0);
    }

    formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-CO');
    }

    formatDateTime(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('es-CO');
    }

    // Utilidades de estado
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.container.classList.add('active');
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.container.classList.remove('active');
        }
    }

    toggle() {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }

    isVisible() {
        return this.container && 
               this.container.style.display !== 'none' && 
               this.container.classList.contains('active');
    }

    // Gestión de loading states
    showLoading(message = 'Cargando...') {
        if (!this.container) return;

        // Remover loader existente si hay uno
        this.hideLoading();

        const loader = document.createElement('div');
        loader.className = 'view-loader';
        loader.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
        `;
        loader.innerHTML = `
            <div style="text-align: center;">
                <div class="spinner" style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <p style="color: #666;">${message}</p>
            </div>
        `;

        // Asegurar que el container tenga position relative para el overlay
        if (this.container.style.position !== 'relative') {
            this.container.style.position = 'relative';
        }
        
        this.container.appendChild(loader);
    }

    hideLoading() {
        if (!this.container) return;

        const loader = this.container.querySelector('.view-loading') || 
                       this.container.querySelector('.view-loader');
        if (loader) {
            loader.remove();
        }
    }

    // Notificaciones toast
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showWarning(message) {
        this.showToast(message, 'warning');
    }

    showToast(message, type = 'info') {
        // Crear toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️';
        toast.innerHTML = `${icon} ${message}`;
        
        document.body.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-remover
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Gestión de errores
    showError(message, canRetry = false, retryCallback = null) {
        // Para errores simples, usar toast
        if (!canRetry) {
            this.showToast(message, 'error');
            return;
        }

        // Para errores que requieren acción, usar vista completa
        if (!this.container) return;

        const errorContainer = document.createElement('div');
        errorContainer.className = 'view-error';
        errorContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h3>Error</h3>
                <p>${message}</p>
                ${canRetry && retryCallback ? `
                    <button class="btn" onclick="(${retryCallback.toString()})()" style="margin-top: 20px;">
                        🔄 Intentar de nuevo
                    </button>
                ` : ''}
            </div>
        `;

        this.container.innerHTML = '';
        this.container.appendChild(errorContainer);
    }

    // Gestión de estado vacío
    showEmpty(message = 'No hay datos para mostrar', actionText = null, actionCallback = null) {
        if (!this.container) return;

        const emptyContainer = document.createElement('div');
        emptyContainer.className = 'view-empty';
        emptyContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                <h3>Sin datos</h3>
                <p>${message}</p>
                ${actionText && actionCallback ? `
                    <button class="btn" onclick="(${actionCallback.toString()})()" style="margin-top: 20px;">
                        ${actionText}
                    </button>
                ` : ''}
            </div>
        `;

        this.container.innerHTML = '';
        this.container.appendChild(emptyContainer);
    }

    // Utilidades de elementos
    createElement(tag, className = '', content = '', attributes = {}) {
        const element = document.createElement(tag);
        
        if (className) {
            element.className = className;
        }
        
        if (content) {
            element.innerHTML = content;
        }
        
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        
        return element;
    }

    // Utilidades de eventos
    delegate(eventType, selector, handler) {
        const container = this.getContainer ? this.getContainer() : this.container;
        if (!container) return;

        container.addEventListener(eventType, (e) => {
            const target = e.target.closest(selector);
            if (target) {
                handler.call(target, e, target);
            }
        });
    }

    // Actualización de datos
    update(newData) {
        this.data = { ...this.data, ...newData };
        this.render();
    }

    refresh() {
        this.render(this.data);
    }

    // Limpieza
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.removeEventListener('click', this.handleClick);
            this.container.removeEventListener('change', this.handleChange);
            this.container.removeEventListener('submit', this.handleSubmit);
        }
        this.data = null;
        this.initialized = false;
    }

    // Utilidades de validación de formularios
    validateForm(form, rules = {}) {
        const errors = [];
        const formData = new FormData(form);

        Object.entries(rules).forEach(([fieldName, rule]) => {
            const value = formData.get(fieldName) || '';
            const field = form.querySelector(`[name="${fieldName}"]`);
            
            // Limpiar errores anteriores
            this.clearFieldError(field);
            
            if (rule.required && !value.trim()) {
                const error = `${rule.label || fieldName} es requerido`;
                errors.push(error);
                this.showFieldError(field, error);
            }
            
            if (value && rule.minLength && value.length < rule.minLength) {
                const error = `${rule.label || fieldName} debe tener al menos ${rule.minLength} caracteres`;
                errors.push(error);
                this.showFieldError(field, error);
            }
            
            if (value && rule.pattern && !rule.pattern.test(value)) {
                const error = `${rule.label || fieldName} tiene un formato inválido`;
                errors.push(error);
                this.showFieldError(field, error);
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    showFieldError(field, message) {
        if (!field) return;
        
        field.classList.add('field-error');
        
        // Crear mensaje de error si no existe
        let errorMessage = field.parentNode.querySelector('.field-error-message');
        if (!errorMessage) {
            errorMessage = document.createElement('small');
            errorMessage.className = 'field-error-message';
            errorMessage.style.color = '#e74c3c';
            field.parentNode.appendChild(errorMessage);
        }
        
        errorMessage.textContent = message;
    }

    clearFieldError(field) {
        if (!field) return;
        
        field.classList.remove('field-error');
        
        const errorMessage = field.parentNode.querySelector('.field-error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    clearAllFieldErrors() {
        if (!this.container) return;
        
        const errorFields = this.container.querySelectorAll('.field-error');
        errorFields.forEach(field => this.clearFieldError(field));
    }

    // Utilidades de animación
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress.toString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(element.style.opacity) || 1;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = (startOpacity * (1 - progress)).toString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Utilidades de scroll
    scrollToTop(smooth = true) {
        if (this.container) {
            this.container.scrollTo({
                top: 0,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }

    scrollToElement(selector, smooth = true) {
        const element = this.container?.querySelector(selector);
        if (element) {
            element.scrollIntoView({
                behavior: smooth ? 'smooth' : 'auto',
                block: 'start'
            });
        }
    }
}