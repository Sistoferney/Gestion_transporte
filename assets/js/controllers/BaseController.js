/**
 * Controlador Base - Funcionalidades comunes para todos los controladores
 */
class BaseController {
    constructor() {
        this.currentUser = null;
        this.initialize();
    }

    // Inicialización común
    initialize() {
        this.loadCurrentUser();
        this.setupEventListeners();
    }

    // Gestión de usuario actual
    loadCurrentUser() {
        const session = StorageService.getUserSession();
        if (session) {
            this.currentUser = session;
        }
    }

    requireAuth() {
        if (!this.currentUser) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.requireAuth() || this.currentUser.type !== 'admin') {
            this.showError('Acceso denegado. Se requieren permisos de administrador.');
            return false;
        }
        return true;
    }

    redirectToLogin() {
        window.location.href = './auth.html';
    }

    // Event listeners comunes
    setupEventListeners() {
        // Manejar cambios de sección
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.handleSectionChange(e);
            }
        });

        // Manejar logout - ahora manejado por NavigationManager
        // El botón de logout usa navigationManager.logout() que incluye confirmación
    }

    handleSectionChange(e) {
        const sectionName = e.target.textContent.toLowerCase();
        // Subclases pueden sobrescribir este método
    }

    logout() {
        StorageService.clearUserSession();
        this.redirectToLogin();
    }

    // Utilidades de UI
    showError(message, duration = 5000) {
        this.showNotification(message, 'error', duration);
    }

    showSuccess(message, duration = 3000) {
        this.showNotification(message, 'success', duration);
    }

    showWarning(message, duration = 4000) {
        this.showNotification(message, 'warning', duration);
    }

    showInfo(message, duration = 3000) {
        this.showNotification(message, 'info', duration);
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease-out;
        `;

        // Colores según el tipo
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;

        // Agregar al DOM
        document.body.appendChild(notification);

        // Remover después del tiempo especificado
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // Utilidades de validación
    validateForm(formElement, rules = {}) {
        const errors = [];
        const formData = new FormData(formElement);

        Object.entries(rules).forEach(([fieldName, rule]) => {
            const value = formData.get(fieldName) || '';
            
            if (rule.required && !value.trim()) {
                errors.push(`${rule.label || fieldName} es requerido`);
            }
            
            if (rule.minLength && value.length < rule.minLength) {
                errors.push(`${rule.label || fieldName} debe tener al menos ${rule.minLength} caracteres`);
            }
            
            if (rule.maxLength && value.length > rule.maxLength) {
                errors.push(`${rule.label || fieldName} no puede tener más de ${rule.maxLength} caracteres`);
            }
            
            if (rule.pattern && !rule.pattern.test(value)) {
                errors.push(`${rule.label || fieldName} tiene un formato inválido`);
            }
            
            if (rule.custom && typeof rule.custom === 'function') {
                const customError = rule.custom(value);
                if (customError) {
                    errors.push(customError);
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Utilidades de datos
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('es-CO');
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString('es-CO');
    }

    // Utilidades de modal
    showModal(title, content, buttons = []) {
        // Remover modales existentes para evitar acumulación
        const existingModals = document.querySelectorAll('.modal-overlay, .modal');
        existingModals.forEach(modal => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        });

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: white;
            border-radius: 10px;
            padding: 20px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;

        const modalHeader = document.createElement('h3');
        modalHeader.textContent = title;
        modalHeader.style.marginBottom = '15px';

        const modalBody = document.createElement('div');
        if (typeof content === 'string') {
            modalBody.innerHTML = content;
        } else {
            modalBody.appendChild(content);
        }
        modalBody.style.marginBottom = '20px';

        const modalFooter = document.createElement('div');
        modalFooter.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';

        // Botones por defecto
        if (buttons.length === 0) {
            buttons = [{
                text: 'Cerrar',
                class: 'btn',
                action: () => document.body.removeChild(modal)
            }];
        }

        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = button.class || 'btn';
            btn.textContent = button.text;
            btn.onclick = () => {
                if (button.action) button.action();
                if (button.closeModal !== false) {
                    document.body.removeChild(modal);
                }
            };
            modalFooter.appendChild(btn);
        });

        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalContent.appendChild(modalFooter);
        modal.appendChild(modalContent);

        // Cerrar con click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // Cerrar con ESC
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleKeyDown);
                if (modal.parentNode) {
                    document.body.removeChild(modal);
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        document.body.appendChild(modal);
        return modal;
    }

    createModal(title, content) {
        // Remover modales existentes para evitar acumulación
        const existingModals = document.querySelectorAll('.modal-overlay');
        existingModals.forEach(modal => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        });

        // Crear el modal usando showModal pero sin botones predeterminados
        return this.showModal(title, content, []);
    }

    showConfirmDialog(message, onConfirm, onCancel = null) {
        return this.showModal('Confirmación', message, [
            {
                text: 'Cancelar',
                class: 'btn',
                action: onCancel
            },
            {
                text: 'Confirmar',
                class: 'btn btn-danger',
                action: onConfirm
            }
        ]);
    }

    // Utilidades de carga
    showLoading(message = 'Cargando...') {
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.9);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        `;

        loader.innerHTML = `
            <div style="
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <p style="color: #666; font-size: 16px;">${message}</p>
        `;

        // Agregar animación de spin
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(loader);
        return loader;
    }

    hideLoading() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            document.body.removeChild(loader);
        }
    }

    // Utilidades de acordeón
    toggleAccordion(accordionId) {
        const content = document.getElementById(accordionId);
        if (!content) return;

        const header = content.previousElementSibling;
        const allAccordions = document.querySelectorAll('.accordion-content');
        const allHeaders = document.querySelectorAll('.accordion-header');
        
        // Cerrar todos los otros acordeones
        allAccordions.forEach(accordion => {
            if (accordion.id !== accordionId) {
                accordion.classList.remove('active');
            }
        });
        
        allHeaders.forEach(headerElement => {
            if (headerElement !== header) {
                headerElement.classList.remove('active');
            }
        });
        
        // Toggle del acordeón actual
        content.classList.toggle('active');
        if (header) {
            header.classList.toggle('active');
        }
    }

    // Manejo de errores centralizado
    handleError(error, userMessage = 'Ha ocurrido un error') {
        console.error('Error en controlador:', error);
        
        let message = userMessage;
        if (error.message) {
            message += `: ${error.message}`;
        }
        
        this.showError(message);
    }

    // Cleanup
    destroy() {
        // Limpiar event listeners y recursos
        // Las subclases pueden sobrescribir este método
    }
}