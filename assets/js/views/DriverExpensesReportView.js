/**
 * DriverExpensesReportView - Extensión de ReportView para reportes de gastos por conductor
 */
class DriverExpensesReportView {
    /**
     * Genera el contenido HTML para el selector de conductores
     */
    static generateDriverSelectorHTML() {
        const drivers = Driver.getAll();

        return `
            <div class="filter-group driver-selector-group">
                <label for="driverSelector">Conductor:</label>
                <select id="driverSelector" name="driverSelector" class="form-control">
                    <option value="">Seleccionar Conductor</option>
                    <option value="all">📊 TODOS LOS CONDUCTORES (Consolidado)</option>
                    <optgroup label="Conductores Activos">
                        ${drivers
                            .filter(d => d.isActive)
                            .map(d => `<option value="${d.id}">${d.name} - ${d.idNumber}</option>`)
                            .join('')}
                    </optgroup>
                    ${drivers.filter(d => !d.isActive).length > 0 ? `
                        <optgroup label="Conductores Inactivos">
                            ${drivers
                                .filter(d => !d.isActive)
                                .map(d => `<option value="${d.id}">${d.name} - ${d.idNumber}</option>`)
                                .join('')}
                        </optgroup>
                    ` : ''}
                </select>
            </div>
            <div class="filter-group">
                <label for="expenseTypeFilter">Tipo de Gasto:</label>
                <select id="expenseTypeFilter" name="expenseTypeFilter" class="form-control">
                    <option value="">Todos los tipos</option>
                    <option value="fuel">Combustible</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="toll">Peajes</option>
                    <option value="parking">Parqueadero</option>
                    <option value="fine">Multas</option>
                    <option value="other">Otros</option>
                </select>
            </div>
        `;
    }

    /**
     * Genera el reporte y muestra los resultados
     */
    static async generateReport() {
        const driverId = document.getElementById('driverSelector')?.value;
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const expenseType = document.getElementById('expenseTypeFilter')?.value;

        if (!driverId) {
            alert('Por favor seleccione un conductor');
            return;
        }

        try {
            // Mostrar loading
            this.showLoading('Generando reporte...');

            // Descargar recibos desde S3 si es necesario
            if (dateFrom && dateTo) {
                await ReportService.downloadReceiptsFromS3(dateFrom, dateTo);
            }

            // Generar reporte
            const reportData = await ReportService.generateDriverExpensesReport(driverId, {
                dateFrom,
                dateTo,
                expenseType
            });

            // Mostrar resultados
            this.displayReport(reportData);

            this.hideLoading();

        } catch (error) {
            this.hideLoading();
            console.error('Error generando reporte:', error);
            alert('Error al generar el reporte: ' + error.message);
        }
    }

    /**
     * Muestra el reporte en pantalla
     */
    static displayReport(reportData) {
        const isConsolidated = Array.isArray(reportData);
        const resultsContainer = document.getElementById('reportResults');
        const titleElement = document.getElementById('reportTitle');
        const contentElement = document.getElementById('reportContent');

        if (!resultsContainer || !titleElement || !contentElement) return;

        // Cambiar título
        titleElement.textContent = isConsolidated
            ? '📊 Reporte Consolidado - Todos los Conductores'
            : `📊 Reporte de Gastos - ${reportData.conductor.nombre}`;

        // Generar contenido
        contentElement.innerHTML = isConsolidated
            ? this.renderConsolidatedReport(reportData)
            : this.renderSingleDriverReport(reportData);

        // Actualizar botones de exportación
        this.updateExportButtons(reportData);

        // Mostrar resultados
        resultsContainer.style.display = 'block';
    }

    /**
     * Renderiza reporte de un solo conductor
     */
    static renderSingleDriverReport(reportData) {
        return `
            <div class="driver-report">
                <!-- Información del conductor -->
                <div class="driver-info-card">
                    <h4>👤 Información del Conductor</h4>
                    <div class="info-grid">
                        <div><strong>Nombre:</strong> ${reportData.conductor.nombre}</div>
                        <div><strong>Cédula:</strong> ${reportData.conductor.cedula}</div>
                        <div><strong>Licencia:</strong> ${reportData.conductor.licencia}</div>
                        <div><strong>Vehículo:</strong> ${reportData.conductor.vehiculo}</div>
                    </div>
                </div>

                <!-- Período -->
                <div class="period-card">
                    <h4>📅 Período del Reporte</h4>
                    <p>Desde: <strong>${reportData.periodo.desde}</strong> | Hasta: <strong>${reportData.periodo.hasta}</strong></p>
                </div>

                <!-- Resumen -->
                <div class="summary-cards-grid">
                    <div class="summary-card-mini">
                        <div class="summary-icon">💰</div>
                        <div class="summary-value">${ReportService.formatCurrency(reportData.totales.general)}</div>
                        <div class="summary-label">Total Gastos</div>
                    </div>
                    <div class="summary-card-mini">
                        <div class="summary-icon">📝</div>
                        <div class="summary-value">${reportData.totales.cantidad}</div>
                        <div class="summary-label">Cantidad</div>
                    </div>
                    <div class="summary-card-mini success">
                        <div class="summary-icon">✅</div>
                        <div class="summary-value">${reportData.recibos.disponibles}</div>
                        <div class="summary-label">Con Recibo</div>
                    </div>
                    <div class="summary-card-mini warning">
                        <div class="summary-icon">⚠️</div>
                        <div class="summary-value">${reportData.recibos.faltantes}</div>
                        <div class="summary-label">Sin Recibo</div>
                    </div>
                </div>

                <!-- Totales por tipo -->
                <div class="expense-types-section">
                    <h4>📊 Detalle por Tipo de Gasto</h4>
                    <div class="types-grid">
                        ${Object.entries(reportData.totales.porTipo).map(([tipo, data]) => `
                            <div class="type-card">
                                <div class="type-icon">${this.getTypeIcon(tipo)}</div>
                                <div class="type-name">${this.getTypeName(tipo)}</div>
                                <div class="type-count">${data.count} gastos</div>
                                <div class="type-total">${ReportService.formatCurrency(data.total)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Tabla de gastos -->
                <div class="expenses-table-section">
                    <h4>📋 Detalle de Gastos</h4>
                    <div class="table-responsive">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Fecha Gasto</th>
                                    <th>Fecha Registro</th>
                                    <th>Tipo</th>
                                    <th>Descripción</th>
                                    <th>Monto</th>
                                    <th>Recibo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reportData.gastos.map(gasto => {
                                    const fechaRegistro = gasto.fechaCreacion ?
                                        new Date(gasto.fechaCreacion).toLocaleString('es-CO', {
                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                            hour: '2-digit', minute: '2-digit'
                                        }) : 'N/A';
                                    return `
                                    <tr>
                                        <td>${gasto.fecha}</td>
                                        <td style="font-size: 0.9em; color: #6c757d;">${fechaRegistro}</td>
                                        <td>${this.getTypeName(gasto.tipo)}</td>
                                        <td>${gasto.descripcion}</td>
                                        <td class="amount">${ReportService.formatCurrency(gasto.monto)}</td>
                                        <td class="receipt-status">
                                            ${gasto.hasReceipt
                                                ? '<span class="badge badge-success">✓ Sí</span>'
                                                : '<span class="badge badge-warning">✗ No</span>'}
                                        </td>
                                    </tr>
                                `}).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="total-row">
                                    <td colspan="4"><strong>TOTAL</strong></td>
                                    <td class="amount"><strong>${ReportService.formatCurrency(reportData.totales.general)}</strong></td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza reporte consolidado
     */
    static renderConsolidatedReport(reportsData) {
        const totalGeneral = reportsData.reduce((sum, r) => sum + r.totales.general, 0);
        const totalGastos = reportsData.reduce((sum, r) => sum + r.totales.cantidad, 0);
        const totalConRecibo = reportsData.reduce((sum, r) => sum + r.recibos.disponibles, 0);
        const totalSinRecibo = reportsData.reduce((sum, r) => sum + r.recibos.faltantes, 0);

        return `
            <div class="consolidated-report">
                <!-- Resumen global -->
                <div class="global-summary">
                    <h4>📊 Resumen Global</h4>
                    <div class="summary-cards-grid">
                        <div class="summary-card-mini">
                            <div class="summary-icon">👥</div>
                            <div class="summary-value">${reportsData.length}</div>
                            <div class="summary-label">Conductores</div>
                        </div>
                        <div class="summary-card-mini">
                            <div class="summary-icon">💰</div>
                            <div class="summary-value">${ReportService.formatCurrency(totalGeneral)}</div>
                            <div class="summary-label">Total Gastos</div>
                        </div>
                        <div class="summary-card-mini">
                            <div class="summary-icon">📝</div>
                            <div class="summary-value">${totalGastos}</div>
                            <div class="summary-label">Cantidad</div>
                        </div>
                        <div class="summary-card-mini success">
                            <div class="summary-icon">✅</div>
                            <div class="summary-value">${totalConRecibo}</div>
                            <div class="summary-label">Con Recibo</div>
                        </div>
                    </div>
                </div>

                <!-- Tabla resumen por conductor -->
                <div class="drivers-summary-section">
                    <h4>👥 Resumen por Conductor</h4>
                    <div class="table-responsive">
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Conductor</th>
                                    <th>Vehículo</th>
                                    <th>Gastos</th>
                                    <th>Total</th>
                                    <th>Con Recibo</th>
                                    <th>Sin Recibo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reportsData.map(report => `
                                    <tr>
                                        <td><strong>${report.conductor.nombre}</strong><br><small>${report.conductor.cedula}</small></td>
                                        <td>${report.conductor.vehiculo}</td>
                                        <td>${report.totales.cantidad}</td>
                                        <td class="amount">${ReportService.formatCurrency(report.totales.general)}</td>
                                        <td class="success">${report.recibos.disponibles}</td>
                                        <td class="warning">${report.recibos.faltantes}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="total-row">
                                    <td colspan="2"><strong>TOTAL</strong></td>
                                    <td><strong>${totalGastos}</strong></td>
                                    <td class="amount"><strong>${ReportService.formatCurrency(totalGeneral)}</strong></td>
                                    <td class="success"><strong>${totalConRecibo}</strong></td>
                                    <td class="warning"><strong>${totalSinRecibo}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Actualiza los botones de exportación
     */
    static updateExportButtons(reportData) {
        const reportActions = document.querySelector('.report-actions');
        if (!reportActions) return;

        const isConsolidated = Array.isArray(reportData);
        const driverName = isConsolidated ? 'consolidado' : ReportService.sanitizeFileName(reportData.conductor.nombre);
        const fecha = new Date().toISOString().split('T')[0];

        reportActions.innerHTML = `
            <button class="btn btn-success" onclick="driverExpensesReportView.downloadZIP()">
                📦 Descargar ZIP Completo
            </button>
            <button class="btn btn-info" onclick="driverExpensesReportView.downloadExcel()">
                📊 Descargar Excel
            </button>
            <button class="btn btn-secondary" onclick="reportView.printReport()">
                🖨️ Imprimir
            </button>
        `;

        // Guardar reportData en el objeto para uso posterior
        this.currentReportData = reportData;
    }

    /**
     * Descarga el ZIP completo
     */
    static async downloadZIP() {
        if (!this.currentReportData) {
            alert('No hay reporte disponible');
            return;
        }

        try {
            this.showLoading('Generando archivo ZIP...');

            const zipBlob = await ReportService.createReportZip(this.currentReportData);

            const isConsolidated = Array.isArray(this.currentReportData);
            const driverName = isConsolidated ? 'consolidado' : ReportService.sanitizeFileName(this.currentReportData.conductor.nombre);
            const fecha = new Date().toISOString().split('T')[0];
            const filename = `reporte_${driverName}_${fecha}.zip`;

            ReportService.downloadZip(zipBlob, filename);

            this.hideLoading();
            alert('✅ Archivo ZIP descargado exitosamente');

        } catch (error) {
            this.hideLoading();
            console.error('Error descargando ZIP:', error);
            alert('Error al generar el ZIP: ' + error.message);
        }
    }

    /**
     * Descarga solo el Excel
     */
    static async downloadExcel() {
        if (!this.currentReportData) {
            alert('No hay reporte disponible');
            return;
        }

        try {
            this.showLoading('Generando Excel...');

            const isConsolidated = Array.isArray(this.currentReportData);
            const reports = isConsolidated ? this.currentReportData : [this.currentReportData];

            // Generar Excel para el primer conductor (o consolidado)
            const excelData = await ReportService.generateExcelReport(reports[0]);

            const driverName = isConsolidated ? 'consolidado' : ReportService.sanitizeFileName(reports[0].conductor.nombre);
            const fecha = new Date().toISOString().split('T')[0];
            const filename = `reporte_${driverName}_${fecha}.xlsx`;

            // Descargar
            const blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            ReportService.downloadZip(blob, filename);

            this.hideLoading();
            alert('✅ Excel descargado exitosamente');

        } catch (error) {
            this.hideLoading();
            console.error('Error descargando Excel:', error);
            alert('Error al generar el Excel: ' + error.message);
        }
    }

    // ===== UTILIDADES =====

    static getTypeIcon(type) {
        const icons = {
            'fuel': '⛽',
            'maintenance': '🔧',
            'toll': '🛣️',
            'parking': '🅿️',
            'fine': '🚨',
            'other': '📌'
        };
        return icons[type] || '📝';
    }

    static getTypeName(type) {
        const names = {
            'fuel': 'Combustible',
            'maintenance': 'Mantenimiento',
            'toll': 'Peajes',
            'tolls': 'Peajes',
            'parking': 'Parqueadero',
            'fine': 'Multas',
            'other': 'Otros'
        };
        return names[type] || type;
    }

    static showLoading(message) {
        // Reutilizar la función de BaseView si está disponible
        if (window.reportView && typeof reportView.showLoading === 'function') {
            reportView.showLoading(message);
        } else {
            console.log('⏳', message);
        }
    }

    static hideLoading() {
        if (window.reportView && typeof reportView.hideLoading === 'function') {
            reportView.hideLoading();
        }
    }
}

// Hacer disponible globalmente
window.DriverExpensesReportView = DriverExpensesReportView;
window.driverExpensesReportView = DriverExpensesReportView; // Alias para compatibilidad
console.log('✅ DriverExpensesReportView cargado y disponible globalmente');
