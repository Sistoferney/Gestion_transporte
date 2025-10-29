/**
 * ReportService - Servicio para generación de reportes con recibos
 */
class ReportService {
    /**
     * Genera un reporte detallado de gastos por conductor
     * @param {string} driverId - ID del conductor (o 'all' para todos)
     * @param {object} filters - Filtros de fecha y tipo
     * @returns {Promise<object>} - Datos del reporte
     */
    static async generateDriverExpensesReport(driverId, filters = {}) {
        console.log(`📊 Generando reporte de gastos para conductor: ${driverId}`);

        try {
            // Obtener conductores
            const drivers = driverId === 'all' ? Driver.getAll() : [Driver.getById(driverId)];

            if (!drivers || drivers.length === 0 || !drivers[0]) {
                throw new Error('Conductor no encontrado');
            }

            const reportsByDriver = [];

            for (const driver of drivers) {
                // Obtener gastos del conductor
                let expenses = Expense.getByDriverId(driver.id);

                // Aplicar filtros de fecha (por fecha de creación del registro)
                if (filters.dateFrom) {
                    const fromDate = new Date(filters.dateFrom + 'T00:00:00');
                    expenses = expenses.filter(e => new Date(e.createdAt) >= fromDate);
                }
                if (filters.dateTo) {
                    const toDate = new Date(filters.dateTo + 'T23:59:59');
                    expenses = expenses.filter(e => new Date(e.createdAt) <= toDate);
                }

                // Aplicar filtro de tipo
                if (filters.expenseType && filters.expenseType !== '') {
                    expenses = expenses.filter(e => e.type === filters.expenseType);
                }

                // Obtener vehículo asignado
                const vehicle = driver.vehicleId ? Vehicle.getById(driver.vehicleId) : null;

                // Calcular totales por tipo
                const expensesByType = {};
                expenses.forEach(expense => {
                    if (!expensesByType[expense.type]) {
                        expensesByType[expense.type] = {
                            count: 0,
                            total: 0,
                            expenses: []
                        };
                    }
                    expensesByType[expense.type].count++;
                    expensesByType[expense.type].total += expense.amount;
                    expensesByType[expense.type].expenses.push(expense);
                });

                // Preparar datos del reporte
                const reportData = {
                    conductor: {
                        id: driver.id,
                        nombre: driver.name,
                        cedula: driver.idNumber,
                        licencia: driver.licenseNumber,
                        vehiculo: vehicle ? `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}` : 'Sin asignar'
                    },
                    periodo: {
                        desde: filters.dateFrom || 'N/A',
                        hasta: filters.dateTo || 'N/A'
                    },
                    gastos: expenses.map(expense => {
                        const hasReceipt = !!expense.receiptId;
                        const receipt = hasReceipt ? this.getReceiptInfo(expense.receiptId) : null;

                        return {
                            id: expense.id,
                            fecha: expense.date,
                            fechaCreacion: expense.createdAt,
                            tipo: expense.type,
                            monto: expense.amount,
                            descripcion: expense.description,
                            receiptId: expense.receiptId,
                            hasReceipt: hasReceipt,
                            receiptFormat: receipt ? receipt.format : null,
                            receiptSize: receipt ? receipt.size : null
                        };
                    }),
                    totales: {
                        porTipo: expensesByType,
                        general: expenses.reduce((sum, e) => sum + e.amount, 0),
                        cantidad: expenses.length,
                        conRecibo: expenses.filter(e => e.receiptId).length,
                        sinRecibo: expenses.filter(e => !e.receiptId).length
                    },
                    recibos: {
                        disponibles: expenses.filter(e => e.receiptId).length,
                        faltantes: expenses.filter(e => !e.receiptId).length
                    }
                };

                reportsByDriver.push(reportData);
            }

            return driverId === 'all' ? reportsByDriver : reportsByDriver[0];

        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            throw error;
        }
    }

    /**
     * Obtiene información de un recibo desde localStorage
     */
    static getReceiptInfo(receiptId) {
        const receipts = StorageService.getReceipts() || {};
        const receipt = receipts[receiptId];

        if (!receipt) return null;

        return {
            id: receiptId,
            format: receipt.format || 'image/jpeg',
            size: receipt.data ? receipt.data.length : 0,
            data: receipt.data
        };
    }

    /**
     * Descarga los recibos de S3 para un rango de fechas
     */
    static async downloadReceiptsFromS3(dateFrom, dateTo) {
        console.log(`📥 Descargando recibos desde S3: ${dateFrom} - ${dateTo}`);

        try {
            // Determinar los meses a descargar
            const startDate = new Date(dateFrom);
            const endDate = new Date(dateTo);

            const months = [];
            let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

            while (current <= endDate) {
                months.push({
                    year: current.getFullYear(),
                    month: current.getMonth() + 1
                });
                current.setMonth(current.getMonth() + 1);
            }

            console.log(`📅 Meses a cargar:`, months);

            // Descargar recibos de cada mes
            const allReceipts = {};
            for (const { year, month } of months) {
                try {
                    const monthReceipts = await S3Service.loadMonthlyReceipts(year, month);
                    Object.assign(allReceipts, monthReceipts);
                } catch (error) {
                    console.warn(`⚠️ No se pudieron cargar recibos de ${year}-${month}:`, error);
                }
            }

            // Combinar con recibos locales
            const localReceipts = StorageService.getReceipts() || {};
            const combined = { ...localReceipts, ...allReceipts };

            StorageService.setReceipts(combined);

            console.log(`✅ Recibos descargados: ${Object.keys(allReceipts).length} desde S3, ${Object.keys(combined).length} total`);

            return allReceipts;

        } catch (error) {
            console.error('❌ Error descargando recibos desde S3:', error);
            throw error;
        }
    }

    /**
     * Crea un archivo ZIP con el reporte y los recibos
     */
    static async createReportZip(reportData, options = {}) {
        console.log('📦 Creando archivo ZIP con reporte y recibos...');

        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip no está disponible. Asegúrese de que la librería esté cargada.');
        }

        try {
            const zip = new JSZip();

            // Si es reporte consolidado (array de reportes)
            const isConsolidated = Array.isArray(reportData);
            const reports = isConsolidated ? reportData : [reportData];

            // Crear carpeta para cada conductor
            for (const report of reports) {
                const driverFolder = this.sanitizeFileName(report.conductor.nombre);
                const driverZip = zip.folder(driverFolder);

                // 1. Agregar reporte en Excel
                const excelData = await this.generateExcelReport(report);
                driverZip.file('detalle_gastos.xlsx', excelData, { binary: true });

                // 2. Agregar resumen en texto
                const txtReport = this.generateTextReport(report);
                driverZip.file('resumen.txt', txtReport);

                // 3. Organizar recibos por tipo
                const receiptsFolder = driverZip.folder('recibos');

                // Agrupar gastos por tipo
                const expensesByType = {};
                report.gastos.forEach(gasto => {
                    if (!expensesByType[gasto.tipo]) {
                        expensesByType[gasto.tipo] = [];
                    }
                    expensesByType[gasto.tipo].push(gasto);
                });

                // Agregar recibos organizados por tipo
                for (const [tipo, gastos] of Object.entries(expensesByType)) {
                    const tipoFolder = receiptsFolder.folder(this.sanitizeFileName(tipo));

                    for (const gasto of gastos) {
                        if (gasto.hasReceipt) {
                            const receiptInfo = this.getReceiptInfo(gasto.receiptId);
                            if (receiptInfo && receiptInfo.data) {
                                const extension = this.getFileExtension(receiptInfo.format);
                                const filename = `${gasto.fecha}_${this.sanitizeFileName(gasto.descripcion)}_${gasto.monto}${extension}`;

                                // Convertir base64 a binary
                                const binaryData = this.base64ToBlob(receiptInfo.data);
                                tipoFolder.file(filename, binaryData, { binary: true });
                            }
                        }
                    }
                }
            }

            // Si es consolidado, agregar un resumen general
            if (isConsolidated) {
                const consolidatedSummary = this.generateConsolidatedSummary(reports);
                zip.file('resumen_consolidado.txt', consolidatedSummary);
            }

            // Generar el ZIP
            console.log('🔄 Generando archivo ZIP...');
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            console.log(`✅ ZIP generado: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);

            return zipBlob;

        } catch (error) {
            console.error('❌ Error creando ZIP:', error);
            throw error;
        }
    }

    /**
     * Genera un reporte en formato Excel
     */
    static async generateExcelReport(reportData) {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX no está disponible');
        }

        const wb = XLSX.utils.book_new();

        // Hoja 1: Información del conductor
        const infoData = [
            ['REPORTE DE GASTOS POR CONDUCTOR'],
            [''],
            ['Conductor:', reportData.conductor.nombre],
            ['Cédula:', reportData.conductor.cedula],
            ['Licencia:', reportData.conductor.licencia],
            ['Vehículo:', reportData.conductor.vehiculo],
            [''],
            ['Período:', `${reportData.periodo.desde} - ${reportData.periodo.hasta}`],
            [''],
            ['RESUMEN'],
            ['Total Gastos:', reportData.totales.cantidad],
            ['Monto Total:', this.formatCurrency(reportData.totales.general)],
            ['Con Recibo:', reportData.recibos.disponibles],
            ['Sin Recibo:', reportData.recibos.faltantes]
        ];
        const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
        XLSX.utils.book_append_sheet(wb, wsInfo, 'Información');

        // Hoja 2: Detalle COMPLETO de gastos con todos los datos
        const expensesData = reportData.gastos.map(gasto => ({
            'ID': gasto.id,
            'Fecha Gasto': gasto.fecha,
            'Fecha Registro': gasto.fechaCreacion ? new Date(gasto.fechaCreacion).toLocaleString('es-CO') : 'N/A',
            'Tipo': this.getTypeName(gasto.tipo),
            'Descripción': gasto.descripcion,
            'Monto': gasto.monto,
            'Tiene Recibo': gasto.hasReceipt ? 'Sí' : 'No',
            'ID Recibo': gasto.receiptId || 'N/A',
            'Formato Recibo': gasto.receiptFormat || 'N/A'
        }));

        const wsExpenses = XLSX.utils.json_to_sheet(expensesData);

        // Agregar totales al final
        const lastRow = expensesData.length + 2; // +1 para header, +1 para espacio
        XLSX.utils.sheet_add_aoa(wsExpenses, [
            [], // Fila vacía
            ['TOTALES', '', '', '', reportData.totales.general, '', '', '']
        ], { origin: -1 });

        XLSX.utils.book_append_sheet(wb, wsExpenses, 'Detalle Gastos');

        // Hoja 3: Totales por tipo
        const byTypeData = Object.entries(reportData.totales.porTipo).map(([tipo, data]) => ({
            'Tipo': this.getTypeName(tipo),
            'Cantidad': data.count,
            'Total': data.total
        }));
        const wsByType = XLSX.utils.json_to_sheet(byTypeData);
        XLSX.utils.book_append_sheet(wb, wsByType, 'Por Tipo');

        // Generar archivo
        return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    }

    /**
     * Traduce el tipo de gasto al nombre legible
     */
    static getTypeName(type) {
        const names = {
            'fuel': 'Combustible',
            'maintenance': 'Mantenimiento',
            'toll': 'Peajes',
            'parking': 'Parqueadero',
            'fine': 'Multas',
            'other': 'Otros'
        };
        return names[type] || type;
    }

    /**
     * Genera un resumen en texto plano
     */
    static generateTextReport(reportData) {
        let text = '';
        text += '═══════════════════════════════════════════════════\n';
        text += '        REPORTE DE GASTOS POR CONDUCTOR\n';
        text += '═══════════════════════════════════════════════════\n\n';

        text += 'INFORMACIÓN DEL CONDUCTOR\n';
        text += '─────────────────────────────────────────────────────\n';
        text += `Nombre:    ${reportData.conductor.nombre}\n`;
        text += `Cédula:    ${reportData.conductor.cedula}\n`;
        text += `Licencia:  ${reportData.conductor.licencia}\n`;
        text += `Vehículo:  ${reportData.conductor.vehiculo}\n\n`;

        text += 'PERÍODO\n';
        text += '─────────────────────────────────────────────────────\n';
        text += `Desde:  ${reportData.periodo.desde}\n`;
        text += `Hasta:  ${reportData.periodo.hasta}\n\n`;

        text += 'RESUMEN GENERAL\n';
        text += '─────────────────────────────────────────────────────\n';
        text += `Total Gastos:     ${reportData.totales.cantidad}\n`;
        text += `Monto Total:      ${this.formatCurrency(reportData.totales.general)}\n`;
        text += `Con Recibo:       ${reportData.recibos.disponibles}\n`;
        text += `Sin Recibo:       ${reportData.recibos.faltantes}\n\n`;

        text += 'DETALLE POR TIPO DE GASTO\n';
        text += '─────────────────────────────────────────────────────\n';
        for (const [tipo, data] of Object.entries(reportData.totales.porTipo)) {
            text += `${tipo}:\n`;
            text += `  Cantidad: ${data.count}\n`;
            text += `  Total:    ${this.formatCurrency(data.total)}\n\n`;
        }

        text += 'DETALLE DE GASTOS\n';
        text += '═══════════════════════════════════════════════════\n\n';
        reportData.gastos.forEach((gasto, index) => {
            const fechaRegistro = gasto.fechaCreacion ? new Date(gasto.fechaCreacion).toLocaleString('es-CO') : 'N/A';
            text += `${index + 1}. ${gasto.tipo}\n`;
            text += `   Fecha Gasto:    ${gasto.fecha}\n`;
            text += `   Fecha Registro: ${fechaRegistro}\n`;
            text += `   Descripción:    ${gasto.descripcion}\n`;
            text += `   Monto:          ${this.formatCurrency(gasto.monto)}\n`;
            text += `   Recibo:         ${gasto.hasReceipt ? 'Sí ✓' : 'No ✗'}\n\n`;
        });

        text += '═══════════════════════════════════════════════════\n';
        text += `Generado el: ${new Date().toLocaleString('es-CO')}\n`;
        text += '═══════════════════════════════════════════════════\n';

        return text;
    }

    /**
     * Genera un resumen consolidado de todos los conductores
     */
    static generateConsolidatedSummary(reports) {
        let text = '';
        text += '═══════════════════════════════════════════════════\n';
        text += '       REPORTE CONSOLIDADO - TODOS LOS CONDUCTORES\n';
        text += '═══════════════════════════════════════════════════\n\n';

        const totalGeneral = reports.reduce((sum, r) => sum + r.totales.general, 0);
        const totalGastos = reports.reduce((sum, r) => sum + r.totales.cantidad, 0);
        const totalConRecibo = reports.reduce((sum, r) => sum + r.recibos.disponibles, 0);

        text += 'RESUMEN GLOBAL\n';
        text += '─────────────────────────────────────────────────────\n';
        text += `Total Conductores:   ${reports.length}\n`;
        text += `Total Gastos:        ${totalGastos}\n`;
        text += `Monto Total:         ${this.formatCurrency(totalGeneral)}\n`;
        text += `Recibos Disponibles: ${totalConRecibo}\n\n`;

        text += 'DETALLE POR CONDUCTOR\n';
        text += '═══════════════════════════════════════════════════\n\n';

        reports.forEach((report, index) => {
            text += `${index + 1}. ${report.conductor.nombre}\n`;
            text += `   Gastos:    ${report.totales.cantidad}\n`;
            text += `   Total:     ${this.formatCurrency(report.totales.general)}\n`;
            text += `   Recibos:   ${report.recibos.disponibles} de ${report.totales.cantidad}\n\n`;
        });

        text += '═══════════════════════════════════════════════════\n';
        text += `Generado el: ${new Date().toLocaleString('es-CO')}\n`;
        text += '═══════════════════════════════════════════════════\n';

        return text;
    }

    /**
     * Descarga el archivo ZIP
     */
    static downloadZip(zipBlob, filename) {
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ===== UTILIDADES =====

    static sanitizeFileName(name) {
        return name
            .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\-_]/g, '')
            .replace(/\s+/g, '_')
            .toLowerCase();
    }

    static getFileExtension(format) {
        const extensions = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'application/pdf': '.pdf'
        };
        return extensions[format] || '.jpg';
    }

    static base64ToBlob(base64Data) {
        // Remover prefijo data:image/...;base64, si existe
        const base64 = base64Data.split(',')[1] || base64Data;
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        return new Uint8Array(byteNumbers);
    }

    static formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

// Hacer disponible globalmente
window.ReportService = ReportService;
console.log('✅ ReportService cargado y disponible globalmente');
