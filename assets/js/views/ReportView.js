/**
 * Vista de Reportes - Interfaz para generar y visualizar reportes
 */
class ReportView extends BaseView {
    constructor(containerId = 'reports') {
        super(containerId);
        this.templateName = 'Reportes';
        this.currentReport = null;
        this.hasBeenRendered = false; // Flag para tracking de renderizado
    }

    render() {
        const container = this.getContainer();
        if (!container) return '';
        
        // Verificar si ya ha sido renderizado anteriormente
        if (!this.hasBeenRendered) {
            console.log('📊 [ReportView.render] Generando contenido inicial...');
            const content = this.generateContent();
            container.innerHTML = content;
            this.setupEventListeners();
            this.hasBeenRendered = true; // Marcar como renderizado
        } else {
            console.log('📊 [ReportView.render] Contenido HTML ya existe, solo actualizando datos...');
            // Si por alguna razón el contenedor está vacío pero ya había sido renderizado,
            // re-renderizar para evitar pantalla en blanco
            if (container.innerHTML.length === 0) {
                console.log('📊 [ReportView.render] Contenedor vacío detectado, re-renderizando...');
                const content = this.generateContent();
                container.innerHTML = content;
                this.setupEventListeners();
            }
        }
        
        return container.innerHTML;
    }

    generateContent() {
        return `
            <div class="reports-container">
                <div class="card">
                    <h2>📊 Sistema de Reportes</h2>
                    <p>Genere reportes detallados sobre vehículos, conductores, gastos y documentos.</p>

                    <!-- Selector de tipo de reporte -->
                    <div class="report-selector">
                        <h3>Seleccionar Tipo de Reporte</h3>
                        <div class="report-types">
                            <button class="report-btn" data-report="vehicles">
                                🚛 Reporte de Vehículos
                            </button>
                            <button class="report-btn" data-report="drivers">
                                👥 Reporte de Conductores
                            </button>
                            <button class="report-btn" data-report="expenses">
                                💰 Reporte de Gastos
                            </button>
                            <button class="report-btn" data-report="documents">
                                📄 Reporte de Documentos
                            </button>
                            <button class="report-btn" data-report="summary">
                                📈 Reporte Resumen
                            </button>
                        </div>
                    </div>

                    <!-- Filtros de reporte -->
                    <div id="reportFilters" class="report-filters" style="display: none;">
                        <h3>Filtros</h3>
                        <div class="filters-grid">
                            <div class="filter-group">
                                <label>Fecha Desde:</label>
                                <input type="date" id="dateFrom" name="dateFrom">
                            </div>
                            <div class="filter-group">
                                <label>Fecha Hasta:</label>
                                <input type="date" id="dateTo" name="dateTo">
                            </div>
                            <div class="filter-group">
                                <label>Estado:</label>
                                <select id="statusFilter" name="statusFilter">
                                    <option value="">Todos</option>
                                    <option value="active">Activos</option>
                                    <option value="inactive">Inactivos</option>
                                </select>
                            </div>
                        </div>
                        <div class="filter-actions">
                            <button class="btn btn-primary" onclick="reportView.generateReport()">
                                📊 Generar Reporte
                            </button>
                            <button class="btn btn-secondary" onclick="reportView.clearFilters()">
                                🔄 Limpiar Filtros
                            </button>
                        </div>
                    </div>

                    <!-- Área de resultados -->
                    <div id="reportResults" class="report-results" style="display: none;">
                        <div class="report-header">
                            <h3 id="reportTitle">Reporte</h3>
                            <div class="report-actions">
                                <button class="btn btn-success" onclick="reportView.exportReport('excel')">
                                    📊 Exportar Excel
                                </button>
                                <button class="btn btn-info" onclick="reportView.exportReport('pdf')">
                                    📄 Exportar PDF
                                </button>
                                <button class="btn btn-secondary" onclick="reportView.printReport()">
                                    🖨️ Imprimir
                                </button>
                            </div>
                        </div>
                        <div id="reportContent" class="report-content">
                            <!-- El contenido del reporte se genera dinámicamente -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        super.setupEventListeners();

        // Botones de tipo de reporte
        document.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectReportType(e.target.dataset.report);
            });
        });

        // Configurar fechas por defecto
        this.setDefaultDates();
    }

    setDefaultDates() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        
        if (dateFrom) dateFrom.value = firstDay.toISOString().split('T')[0];
        if (dateTo) dateTo.value = now.toISOString().split('T')[0];
    }

    selectReportType(reportType) {
        this.currentReport = reportType;
        
        // Actualizar botones activos
        document.querySelectorAll('.report-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-report="${reportType}"]`).classList.add('active');

        // Mostrar filtros
        const filtersContainer = document.getElementById('reportFilters');
        if (filtersContainer) {
            filtersContainer.style.display = 'block';
        }

        // Personalizar filtros según el tipo de reporte
        this.customizeFilters(reportType);
    }

    customizeFilters(reportType) {
        const statusFilter = document.getElementById('statusFilter');
        if (!statusFilter) return;

        // Limpiar opciones anteriores
        statusFilter.innerHTML = '<option value="">Todos</option>';

        switch (reportType) {
            case 'vehicles':
                statusFilter.innerHTML += `
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                    <option value="withDriver">Con Conductor</option>
                    <option value="withoutDriver">Sin Conductor</option>
                `;
                break;
            case 'drivers':
                statusFilter.innerHTML += `
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                    <option value="withVehicle">Con Vehículo</option>
                    <option value="withoutVehicle">Sin Vehículo</option>
                    <option value="expiringSoonLicense">Licencia por Vencer (< 30 días)</option>
                    <option value="expiredLicense">Licencia Vencida</option>
                `;
                break;
            case 'documents':
                statusFilter.innerHTML += `
                    <option value="valid">Vigentes</option>
                    <option value="warning">Por Vencer</option>
                    <option value="expired">Vencidos</option>
                `;
                break;
            case 'expenses':
                statusFilter.innerHTML += `
                    <option value="withReceipt">Con Recibo</option>
                    <option value="withoutReceipt">Sin Recibo</option>
                `;
                break;
        }
    }

    generateReport() {
        if (!this.currentReport) {
            this.showError('Seleccione un tipo de reporte');
            return;
        }

        try {
            this.showLoading('Generando reporte...');

            const filters = this.getFilters();
            let reportData;

            switch (this.currentReport) {
                case 'vehicles':
                    reportData = this.generateVehiclesReport(filters);
                    break;
                case 'drivers':
                    reportData = this.generateDriversReport(filters);
                    break;
                case 'expenses':
                    reportData = this.generateExpensesReport(filters);
                    break;
                case 'documents':
                    reportData = this.generateDocumentsReport(filters);
                    break;
                case 'summary':
                    reportData = this.generateSummaryReport(filters);
                    break;
                default:
                    throw new Error('Tipo de reporte no válido');
            }

            this.displayReport(reportData);
            this.hideLoading();

        } catch (error) {
            this.hideLoading();
            this.handleError(error, 'Error al generar reporte');
        }
    }

    getFilters() {
        return {
            dateFrom: document.getElementById('dateFrom')?.value || '',
            dateTo: document.getElementById('dateTo')?.value || '',
            status: document.getElementById('statusFilter')?.value || ''
        };
    }

    generateVehiclesReport(filters) {
        let vehicles = Vehicle.getAll();

        // Aplicar filtros
        if (filters.status) {
            switch (filters.status) {
                case 'active':
                    vehicles = vehicles.filter(v => v.isActive);
                    break;
                case 'inactive':
                    vehicles = vehicles.filter(v => !v.isActive);
                    break;
                case 'withDriver':
                    vehicles = vehicles.filter(v => v.driverId);
                    break;
                case 'withoutDriver':
                    vehicles = vehicles.filter(v => !v.driverId);
                    break;
            }
        }

        const reportData = vehicles.map(vehicle => {
            const driver = vehicle.driverId ? Driver.getById(vehicle.driverId) : null;
            const expenses = Expense.getAll().filter(e => e.vehicleId === vehicle.id);
            const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

            return {
                placa: vehicle.plate,
                marca: vehicle.brand,
                modelo: vehicle.model,
                año: vehicle.year,
                conductor: driver ? driver.name : 'Sin asignar',
                estado: vehicle.isActive ? 'Activo' : 'Inactivo',
                totalGastos: totalExpenses,
                numeroGastos: expenses.length
            };
        });

        return {
            title: 'Reporte de Vehículos',
            data: reportData,
            summary: {
                total: vehicles.length,
                activos: vehicles.filter(v => v.isActive).length,
                conConductor: vehicles.filter(v => v.driverId).length
            }
        };
    }

    generateDriversReport(filters) {
        let drivers = Driver.getAll();

        // Aplicar filtros
        if (filters.status) {
            switch (filters.status) {
                case 'active':
                    drivers = drivers.filter(d => d.isActive);
                    break;
                case 'inactive':
                    drivers = drivers.filter(d => !d.isActive);
                    break;
                case 'withVehicle':
                    drivers = drivers.filter(d => d.vehicleId);
                    break;
                case 'withoutVehicle':
                    drivers = drivers.filter(d => !d.vehicleId);
                    break;
                case 'expiringSoonLicense':
                    drivers = drivers.filter(d => d.isLicenseExpiringSoon && d.isLicenseExpiringSoon());
                    break;
                case 'expiredLicense':
                    drivers = drivers.filter(d => !d.isLicenseValid());
                    break;
            }
        }

        const reportData = drivers.map(driver => {
            const vehicle = driver.vehicleId ? Vehicle.getById(driver.vehicleId) : null;
            const expenses = Expense.getByDriverId(driver.id);
            const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

            return {
                nombre: driver.name,
                cedula: driver.idNumber,
                licencia: driver.licenseNumber,
                categoria: driver.licenseCategory,
                vencimientoLicencia: driver.licenseExpiry,
                vehiculo: vehicle ? `${vehicle.plate} - ${vehicle.brand}` : 'Sin asignar',
                estado: driver.isActive ? 'Activo' : 'Inactivo',
                totalGastos: totalExpenses,
                numeroGastos: expenses.length
            };
        });

        return {
            title: 'Reporte de Conductores',
            data: reportData,
            summary: {
                total: drivers.length,
                activos: drivers.filter(d => d.isActive).length,
                conVehiculo: drivers.filter(d => d.vehicleId).length,
                licenciasVencidas: drivers.filter(d => !d.isLicenseValid()).length
            }
        };
    }

    generateExpensesReport(filters) {
        let expenses = Expense.getAll();

        // Aplicar filtros de fecha
        if (filters.dateFrom) {
            expenses = expenses.filter(e => e.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
            expenses = expenses.filter(e => e.date <= filters.dateTo);
        }

        // Aplicar filtros de estado
        if (filters.status) {
            switch (filters.status) {
                case 'withReceipt':
                    expenses = expenses.filter(e => e.receiptId);
                    break;
                case 'withoutReceipt':
                    expenses = expenses.filter(e => !e.receiptId);
                    break;
            }
        }

        const reportData = expenses.map(expense => {
            const driver = Driver.getById(expense.driverId);
            const vehicle = Vehicle.getById(expense.vehicleId);

            return {
                fecha: expense.date,
                conductor: driver ? driver.name : 'No encontrado',
                vehiculo: vehicle ? `${vehicle.plate} - ${vehicle.brand}` : 'No encontrado',
                tipo: expense.type,
                descripcion: expense.description,
                monto: expense.amount,
                tieneRecibo: expense.receiptId ? 'Sí' : 'No'
            };
        });

        return {
            title: 'Reporte de Gastos',
            data: reportData,
            summary: {
                total: expenses.length,
                montoTotal: expenses.reduce((sum, e) => sum + e.amount, 0),
                conRecibo: expenses.filter(e => e.receiptId).length,
                sinRecibo: expenses.filter(e => !e.receiptId).length
            }
        };
    }

    generateDocumentsReport(filters) {
        let documents = Document.getAll();

        // Aplicar filtros de estado
        if (filters.status) {
            documents = documents.filter(doc => doc.getStatus() === filters.status);
        }

        const reportData = documents.map(document => {
            const vehicle = Vehicle.getById(document.vehicleId);
            const status = document.getStatus();
            const daysToExpiry = document.getDaysToExpiry();

            return {
                vehiculo: vehicle ? `${vehicle.plate} - ${vehicle.brand}` : 'No encontrado',
                tipoDocumento: document.getTypeName(),
                fechaVencimiento: document.expiryDate,
                diasParaVencer: daysToExpiry,
                estado: status === 'valid' ? 'Vigente' : 
                       status === 'warning' ? 'Por Vencer' : 'Vencido'
            };
        });

        return {
            title: 'Reporte de Documentos',
            data: reportData,
            summary: {
                total: documents.length,
                vigentes: documents.filter(d => d.getStatus() === 'valid').length,
                porVencer: documents.filter(d => d.getStatus() === 'warning').length,
                vencidos: documents.filter(d => d.getStatus() === 'expired').length
            }
        };
    }

    generateSummaryReport(filters) {
        const vehicles = Vehicle.getAll();
        const drivers = Driver.getAll();
        const expenses = Expense.getAll();
        const documents = Document.getAll();

        const reportData = {
            vehiculos: {
                total: vehicles.length,
                activos: vehicles.filter(v => v.isActive).length,
                conConductor: vehicles.filter(v => v.driverId).length
            },
            conductores: {
                total: drivers.length,
                activos: drivers.filter(d => d.isActive).length,
                conVehiculo: drivers.filter(d => d.vehicleId).length
            },
            gastos: {
                total: expenses.length,
                montoTotal: expenses.reduce((sum, e) => sum + e.amount, 0),
                conRecibo: expenses.filter(e => e.receiptId).length
            },
            documentos: {
                total: documents.length,
                vigentes: documents.filter(d => d.getStatus() === 'valid').length,
                vencidos: documents.filter(d => d.getStatus() === 'expired').length
            }
        };

        return {
            title: 'Reporte Resumen',
            data: reportData,
            isSummary: true
        };
    }

    displayReport(reportData) {
        const resultsContainer = document.getElementById('reportResults');
        const titleElement = document.getElementById('reportTitle');
        const contentElement = document.getElementById('reportContent');

        if (!resultsContainer || !titleElement || !contentElement) return;

        titleElement.textContent = reportData.title;

        if (reportData.isSummary) {
            contentElement.innerHTML = this.renderSummaryReport(reportData.data);
        } else {
            contentElement.innerHTML = this.renderTableReport(reportData);
        }

        resultsContainer.style.display = 'block';
    }

    renderSummaryReport(data) {
        return `
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>🚛 Vehículos</h4>
                    <p>Total: ${data.vehiculos.total}</p>
                    <p>Activos: ${data.vehiculos.activos}</p>
                    <p>Con Conductor: ${data.vehiculos.conConductor}</p>
                </div>
                <div class="summary-card">
                    <h4>👥 Conductores</h4>
                    <p>Total: ${data.conductores.total}</p>
                    <p>Activos: ${data.conductores.activos}</p>
                    <p>Con Vehículo: ${data.conductores.conVehiculo}</p>
                </div>
                <div class="summary-card">
                    <h4>💰 Gastos</h4>
                    <p>Total: ${data.gastos.total}</p>
                    <p>Monto: ${this.formatCurrency(data.gastos.montoTotal)}</p>
                    <p>Con Recibo: ${data.gastos.conRecibo}</p>
                </div>
                <div class="summary-card">
                    <h4>📄 Documentos</h4>
                    <p>Total: ${data.documentos.total}</p>
                    <p>Vigentes: ${data.documentos.vigentes}</p>
                    <p>Vencidos: ${data.documentos.vencidos}</p>
                </div>
            </div>
        `;
    }

    renderTableReport(reportData) {
        if (!reportData.data || reportData.data.length === 0) {
            return '<p>No hay datos para mostrar con los filtros seleccionados.</p>';
        }

        const headers = Object.keys(reportData.data[0]);
        
        return `
            <div class="report-summary">
                ${reportData.summary ? this.renderReportSummary(reportData.summary) : ''}
            </div>
            <div class="table-responsive">
                <table class="report-table">
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${this.formatHeader(header)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.data.map(row => `
                            <tr>
                                ${headers.map(header => `<td>${this.formatCellValue(row[header], header)}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderReportSummary(summary) {
        return `
            <div class="report-summary-stats">
                ${Object.entries(summary).map(([key, value]) => `
                    <div class="summary-stat">
                        <strong>${this.formatHeader(key)}:</strong> 
                        ${typeof value === 'number' && key.includes('total') && key.includes('Gastos') ? this.formatCurrency(value) : value}
                    </div>
                `).join('')}
            </div>
        `;
    }

    formatHeader(header) {
        const headerMap = {
            placa: 'Placa',
            marca: 'Marca',
            modelo: 'Modelo',
            año: 'Año',
            conductor: 'Conductor',
            estado: 'Estado',
            totalGastos: 'Total Gastos',
            numeroGastos: 'Nº Gastos',
            nombre: 'Nombre',
            cedula: 'Cédula',
            licencia: 'Licencia',
            categoria: 'Categoría',
            vencimientoLicencia: 'Venc. Licencia',
            vehiculo: 'Vehículo',
            fecha: 'Fecha',
            tipo: 'Tipo',
            descripcion: 'Descripción',
            monto: 'Monto',
            tieneRecibo: 'Recibo',
            tipoDocumento: 'Documento',
            fechaVencimiento: 'Vencimiento',
            diasParaVencer: 'Días',
            total: 'Total',
            activos: 'Activos',
            conConductor: 'Con Conductor'
        };
        return headerMap[header] || header;
    }

    formatCellValue(value, header) {
        if (value === null || value === undefined) return '-';
        
        if (header.includes('Gastos') || header === 'monto') {
            return this.formatCurrency(value);
        }
        
        if (header.includes('fecha') || header.includes('Fecha')) {
            return this.formatDate(value);
        }
        
        return value;
    }

    clearFilters() {
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('statusFilter').value = '';
        this.setDefaultDates();
    }

    exportReport(format) {
        if (!this.currentReport) {
            this.showError('No hay reporte para exportar');
            return;
        }

        try {
            const filters = this.getFilters();
            let reportData;

            switch (this.currentReport) {
                case 'vehicles':
                    reportData = this.generateVehiclesReport(filters);
                    break;
                case 'drivers':
                    reportData = this.generateDriversReport(filters);
                    break;
                case 'expenses':
                    reportData = this.generateExpensesReport(filters);
                    break;
                case 'documents':
                    reportData = this.generateDocumentsReport(filters);
                    break;
                case 'summary':
                    reportData = this.generateSummaryReport(filters);
                    break;
            }

            if (format === 'excel') {
                this.exportToExcel(reportData);
            } else if (format === 'pdf') {
                this.exportToPDF(reportData);
            }

        } catch (error) {
            this.handleError(error, 'Error al exportar reporte');
        }
    }

    exportToExcel(reportData) {
        const data = reportData.isSummary ? [reportData.data] : reportData.data;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showSuccess('Reporte exportado exitosamente');
    }

    exportToPDF(reportData) {
        // Para una implementación completa de PDF, se necesitaría una librería como jsPDF
        this.showInfo('Funcionalidad de PDF en desarrollo');
    }

    printReport() {
        const reportContent = document.getElementById('reportContent');
        if (!reportContent) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte - Sistema de Gestión</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
                        .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <h1>${document.getElementById('reportTitle').textContent}</h1>
                    <p>Fecha de generación: ${new Date().toLocaleDateString()}</p>
                    ${reportContent.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }
}

// Asegurar que la clase está disponible globalmente  
window.ReportView = ReportView;
console.log('✅ ReportView cargada y disponible globalmente');