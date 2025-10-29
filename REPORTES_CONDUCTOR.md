# 📦 Reportes de Gastos por Conductor con Recibos

## 🎯 Descripción

Sistema completo para generar reportes detallados de gastos por conductor, con descarga automática de recibos desde S3 y exportación en formato ZIP.

## ✨ Características

### 1. **Reporte Individual por Conductor**
- Información completa del conductor
- Detalle de todos los gastos en el período
- Totales por tipo de gasto
- Identificación de recibos disponibles/faltantes
- Descarga de recibos organizados por tipo

### 2. **Reporte Consolidado (Todos los Conductores)**
- Resumen global de gastos
- Comparativa entre conductores
- Estadísticas generales
- ZIP con carpetas separadas por conductor

### 3. **Descarga Automática desde S3**
- Sincronización automática de recibos del período seleccionado
- Descarga inteligente por meses
- Sin límite de tamaño

### 4. **Exportación en ZIP**
Estructura del archivo ZIP generado:
```
reporte_juan_perez_2025-01-24.zip
├── detalle_gastos.xlsx          # Excel con detalle completo
├── resumen.txt                  # Resumen en texto plano
└── recibos/
    ├── combustible/
    │   ├── 2025-01-05_gasolina_80000.jpg
    │   └── 2025-01-12_diesel_120000.jpg
    ├── mantenimiento/
    │   └── 2025-01-20_cambio_aceite_150000.pdf
    └── multas/
        └── 2025-01-28_exceso_velocidad_200000.jpg
```

## 📖 Cómo Usar

### Paso 1: Acceder a Reportes
1. Navegar a la sección **Reportes** en el menú principal
2. Seleccionar **"📦 Reporte por Conductor (con Recibos)"**

### Paso 2: Configurar Filtros
1. **Seleccionar Conductor**:
   - Conductor específico, o
   - **"TODOS LOS CONDUCTORES"** para reporte consolidado

2. **Seleccionar Período**:
   - Fecha Desde
   - Fecha Hasta

3. **Filtro Opcional**:
   - Tipo de Gasto (combustible, mantenimiento, etc.)

### Paso 3: Generar Reporte
1. Click en **"📊 Generar Reporte"**
2. El sistema:
   - Descarga recibos desde S3 automáticamente
   - Genera el reporte con todos los datos
   - Muestra resumen visual en pantalla

### Paso 4: Exportar
Tres opciones disponibles:

#### Opción 1: **📦 Descargar ZIP Completo** (Recomendado)
- Excel con detalle de gastos
- Resumen en texto plano
- Todos los recibos organizados por tipo
- Perfecto para: Auditorías, contabilidad, archivo

#### Opción 2: **📊 Descargar Excel**
- Solo el archivo Excel con detalle de gastos
- Sin recibos
- Perfecto para: Análisis rápido, importar a otros sistemas

#### Opción 3: **🖨️ Imprimir**
- Impresión directa del reporte
- Sin recibos
- Perfecto para: Revisión rápida

## 🔧 Archivos Implementados

### Nuevos Archivos Creados:

1. **`assets/js/services/ReportService.js`**
   - Servicio principal de generación de reportes
   - Funciones de descarga desde S3
   - Generación de ZIP con JSZip
   - Exportación a Excel

2. **`assets/js/views/DriverExpensesReportView.js`**
   - Vista especializada para reportes de conductor
   - UI de selección y filtros
   - Renderizado de reportes individuales y consolidados
   - Manejo de botones de exportación

3. **`assets/css/driver-reports.css`**
   - Estilos específicos para los reportes
   - Diseño responsive
   - Tarjetas de resumen
   - Tablas mejoradas

### Archivos Modificados:

1. **`main.html`**
   - Agregada librería JSZip
   - Agregado ReportService.js
   - Agregado DriverExpensesReportView.js
   - Agregado driver-reports.css

2. **`assets/js/views/ReportView.js`**
   - Agregado botón "Reporte por Conductor (con Recibos)"
   - Modificado customizeFilters() para mostrar selector de conductor
   - Modificado generateReport() para delegar a DriverExpensesReportView

## 📊 Estructura del Excel Generado

El archivo Excel contiene 3 hojas:

### Hoja 1: **Información**
- Datos del conductor
- Período del reporte
- Resumen de totales

### Hoja 2: **Detalle Gastos**
- Fecha, Tipo, Descripción, Monto
- Estado de recibo (Sí/No)
- Una fila por cada gasto

### Hoja 3: **Por Tipo**
- Totales agrupados por tipo de gasto
- Cantidad y monto por tipo

## 🔍 Tipos de Gasto Soportados

- ⛽ **Combustible**
- 🔧 **Mantenimiento**
- 🛣️ **Peajes**
- 🅿️ **Parqueadero**
- 🚨 **Multas**
- 📌 **Otros**

## 💡 Casos de Uso

### Caso 1: Auditoría Mensual
```
1. Seleccionar conductor
2. Período: 01/01/2025 - 31/01/2025
3. Generar reporte
4. Descargar ZIP completo
5. Entregar a contabilidad
```

### Caso 2: Reporte de Multas
```
1. Seleccionar "TODOS LOS CONDUCTORES"
2. Tipo de Gasto: Multas
3. Período: Mes actual
4. Generar reporte consolidado
5. Identificar conductores con más multas
```

### Caso 3: Control de Combustible
```
1. Seleccionar conductor específico
2. Tipo de Gasto: Combustible
3. Período: Último trimestre
4. Descargar Excel
5. Analizar tendencias de consumo
```

## ⚠️ Notas Importantes

1. **Recibos en S3**: Los recibos deben estar almacenados en S3 con la estructura mensual implementada

2. **Conexión a Internet**: Necesaria para descargar recibos desde S3

3. **Navegador**: Recomendado usar navegadores modernos (Chrome, Firefox, Edge)

4. **Tamaño de ZIP**: No hay límite, pero archivos muy grandes pueden tardar en generarse

5. **Nombres de Archivo**: Se sanitizan automáticamente para evitar caracteres especiales

## 🚀 Tecnologías Utilizadas

- **JSZip**: Generación de archivos ZIP en el navegador
- **XLSX.js**: Generación de archivos Excel
- **AWS SDK**: Descarga de recibos desde S3
- **JavaScript ES6+**: Async/await, promesas, etc.

## 📞 Soporte

Para problemas o preguntas:
1. Revisar la consola del navegador (F12) para errores
2. Verificar conexión a S3
3. Confirmar que los recibos existen en S3

## 🔄 Próximas Mejoras Potenciales

- [ ] Gráficos de torta en el reporte
- [ ] Exportación a PDF con recibos embebidos
- [ ] Comparativas entre períodos
- [ ] Alertas de gastos anormales
- [ ] Programación de reportes automáticos

---

**Versión**: 1.0
**Fecha**: Enero 2025
**Desarrollado para**: Sistema de Gestión de Transporte
