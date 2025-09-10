/**
 * Modelo Document - Gestión de documentos del vehículo
 */
class Document {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.vehicleId = data.vehicleId || null;
        this.type = data.type || ''; // soat, technical, tax, seal
        this.number = data.number || '';
        this.issueDate = data.issueDate || '';
        this.expiryDate = data.expiryDate || '';
        this.amount = data.amount || 0;
        this.status = data.status || 'active';
        this.fileId = data.fileId || null;
        this.company = data.company || ''; // Para SOAT
        this.center = data.center || ''; // Para tecnomecánica
        this.result = data.result || ''; // Para tecnomecánica
        this.year = data.year || new Date().getFullYear(); // Para impuestos
        this.paymentDate = data.paymentDate || '';
        this.applies = data.applies || 'yes'; // Para rodamiento
        this.level = data.level || ''; // Para semaforización (legacy)
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    // Validaciones
    validate() {
        const errors = [];
        
        if (!this.vehicleId) {
            errors.push('Debe especificar un vehículo');
        }
        
        if (!this.type || !['soat', 'technical', 'tax', 'seal'].includes(this.type)) {
            errors.push('Tipo de documento inválido');
        }
        
        // Validaciones específicas por tipo
        switch (this.type) {
            case 'soat':
                if (!this.number) errors.push('Número de póliza requerido');
                if (!this.company) errors.push('Aseguradora requerida');
                if (!this.issueDate) errors.push('Fecha de expedición requerida');
                break;
                
            case 'technical':
                if (!this.number) errors.push('Número de certificado requerido');
                if (!this.center) errors.push('Centro de diagnóstico requerido');
                if (!this.result) errors.push('Resultado requerido');
                if (!this.issueDate) errors.push('Fecha de expedición requerida');
                break;
                
            case 'tax':
                if (!this.year) errors.push('Año requerido');
                if (!this.paymentDate) errors.push('Fecha de pago requerida');
                if (!this.status) errors.push('Estado requerido');
                break;
                
            case 'seal':
                if (this.applies === 'yes') {
                    if (!this.year) errors.push('Año requerido');
                    if (!this.status) errors.push('Estado requerido');
                }
                break;
        }
        
        if (this.amount && this.amount < 0) {
            errors.push('El valor debe ser positivo');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Cálculos automáticos de fechas
    calculateExpiryDate() {
        switch (this.type) {
            case 'soat':
            case 'technical':
                if (this.issueDate) {
                    const issue = new Date(this.issueDate);
                    const expiry = new Date(issue);
                    expiry.setFullYear(expiry.getFullYear() + 1);
                    this.expiryDate = expiry.toISOString().split('T')[0];
                }
                break;
                
            case 'tax':
                if (this.year) {
                    let expiryYear = parseInt(this.year);
                    if (this.status === 'paid') {
                        expiryYear = parseInt(this.year) + 1;
                    }
                    const expiry = new Date(expiryYear, 5, 30); // 30 de junio
                    this.expiryDate = expiry.toISOString().split('T')[0];
                }
                break;
                
            case 'seal':
                if (this.year && this.applies === 'yes') {
                    let expiryYear = parseInt(this.year);
                    if (this.status === 'paid') {
                        expiryYear = parseInt(this.year) + 1;
                    }
                    const expiry = new Date(expiryYear, 11, 31); // 31 de diciembre
                    this.expiryDate = expiry.toISOString().split('T')[0];
                }
                break;
        }
    }

    // Estado del documento
    getStatus() {
        if (this.type === 'seal' && this.applies === 'no') {
            return 'exempt';
        }
        
        if (!this.expiryDate) return 'unknown';
        
        const today = new Date();
        const expiry = new Date(this.expiryDate);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'expired';
        if (diffDays <= 30) return 'warning';
        return 'valid';
    }

    getDaysToExpiry() {
        if (!this.expiryDate) return null;
        
        const today = new Date();
        const expiry = new Date(this.expiryDate);
        return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    }

    // Métodos estáticos para manejo de datos
    static getAll() {
        const vehicleDocuments = localStorage.getItem('vehicleDocuments');
        if (!vehicleDocuments) return [];
        
        const documents = [];
        const documentsByVehicle = JSON.parse(vehicleDocuments);
        
        Object.entries(documentsByVehicle).forEach(([vehicleId, docs]) => {
            Object.entries(docs).forEach(([type, docData]) => {
                documents.push(new Document({
                    ...docData,
                    vehicleId: parseInt(vehicleId),
                    type: type
                }));
            });
        });
        
        return documents;
    }

    static getByVehicleId(vehicleId) {
        const documents = Document.getAll();
        return documents.filter(doc => doc.vehicleId == vehicleId);
    }

    static getByType(type) {
        const documents = Document.getAll();
        return documents.filter(doc => doc.type === type);
    }

    static getExpiring(days = 30) {
        const documents = Document.getAll();
        return documents.filter(doc => {
            const daysToExpiry = doc.getDaysToExpiry();
            return daysToExpiry !== null && daysToExpiry <= days && daysToExpiry >= 0;
        });
    }

    static getExpired() {
        const documents = Document.getAll();
        return documents.filter(doc => {
            const daysToExpiry = doc.getDaysToExpiry();
            return daysToExpiry !== null && daysToExpiry < 0;
        });
    }

    static save(documentData) {
        const document = new Document(documentData);
        
        const validation = document.validate();
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        // Calcular fecha de vencimiento automáticamente
        document.calculateExpiryDate();
        document.updatedAt = new Date().toISOString();

        // Obtener estructura actual
        const vehicleDocuments = JSON.parse(localStorage.getItem('vehicleDocuments') || '{}');
        
        if (!vehicleDocuments[document.vehicleId]) {
            vehicleDocuments[document.vehicleId] = {};
        }
        
        vehicleDocuments[document.vehicleId][document.type] = document.toJSON();
        localStorage.setItem('vehicleDocuments', JSON.stringify(vehicleDocuments));
        
        return document;
    }

    static delete(vehicleId, type) {
        const vehicleDocuments = JSON.parse(localStorage.getItem('vehicleDocuments') || '{}');
        
        if (vehicleDocuments[vehicleId] && vehicleDocuments[vehicleId][type]) {
            delete vehicleDocuments[vehicleId][type];
            localStorage.setItem('vehicleDocuments', JSON.stringify(vehicleDocuments));
            return true;
        }
        
        return false;
    }

    // Métodos de instancia
    save() {
        return Document.save(this);
    }

    delete() {
        return Document.delete(this.vehicleId, this.type);
    }

    toJSON() {
        return {
            id: this.id,
            vehicleId: this.vehicleId,
            type: this.type,
            number: this.number,
            issueDate: this.issueDate,
            expiryDate: this.expiryDate,
            amount: this.amount,
            status: this.status,
            fileId: this.fileId,
            company: this.company,
            center: this.center,
            result: this.result,
            year: this.year,
            paymentDate: this.paymentDate,
            applies: this.applies,
            level: this.level,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    getTypeName() {
        const names = {
            'soat': '🛡️ SOAT',
            'technical': '🔧 Tecnomecánica',
            'tax': '💰 Impuesto Vehicular',
            'seal': '🚗 Impuesto de Rodamiento (Semaforizacion)'
        };
        return names[this.type] || this.type;
    }
}