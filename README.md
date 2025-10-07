# 🚚 Sistema de Gestión de Transporte

Sistema completo de gestión de vehículos, conductores, documentos y gastos para empresas de transporte, desarrollado con arquitectura MVC en JavaScript puro.

## 🌟 Características Principales

### 🔐 **Sistema de Autenticación**
- Login seguro con roles diferenciados (Administrador/Conductor)
- **🌐 Acceso Multi-Dispositivo**: Conductores pueden iniciar sesión desde cualquier dispositivo sin configuración
- **🔒 Auto-Configuración S3**: Configuración automática de almacenamiento en la nube
- **🔑 Gestión Segura de Credenciales**: Sin credenciales hardcodeadas, sistema completamente seguro
- Sesiones persistentes con expiración automática
- Migración automática de conductores existentes

### 📊 **Dashboard Inteligente**
- Vista personalizada según el rol del usuario
- Estadísticas en tiempo real
- Alertas automáticas de documentos próximos a vencer
- Resumen de gastos mensuales

### 🚗 **Gestión de Vehículos**
- CRUD completo de vehículos
- Búsqueda y filtrado avanzado
- Importación/exportación de datos
- Estadísticas por marca y año

### 👥 **Gestión de Conductores**
- Registro completo de conductores
- Asignación de vehículos
- Control de estados (activo/inactivo/suspendido)
- Vista detallada con historial de gastos

### 📄 **Gestión de Documentos**
- **SOAT**: Seguro obligatorio con cálculo automático de vencimiento
- **Tecnomecánica**: Revisión técnica con estados (aprobado/condicionado/rechazado)
- **Impuesto Vehicular**: Manejo automático de fechas según estado de pago
- **Impuesto de Rodamiento**: Con opción de exención para vehículos especiales
- Carga de archivos (PDF/imágenes)
- Alertas automáticas de vencimiento
- Pre-asignación automática de vehículos para conductores

### 💰 **Control de Gastos Avanzado**
- **📸 Cámara Integrada**: Captura de recibos con cámara trasera 1080x720px
- **🗜️ Compresión Inteligente**: Reducción automática de imágenes para optimizar almacenamiento
- **📋 Tipos de Gastos Completos**: Combustible, mantenimiento, peajes, multas, seguros, impuestos, reparaciones, repuestos
- **🔄 Filtrado Dependiente**: Filtros inteligentes que muestran solo datos relacionados
- **📊 Exportación Múltiple**: Excel (.xlsx), CSV y opciones de impresión
- **📈 Reportes Detallados**: Estadísticas por conductor, vehículo, tipo y período
- **🧹 Limpieza Automática**: Gestión inteligente de almacenamiento con limpieza de imágenes huérfanas

### 🚛 **Sistema de Fletes (NUEVO)**
- **📋 Gestión Completa**: Registro de servicios de transporte con origen, destino, carga y precios
- **🗺️ Cálculo Automático**: Distancias calculadas automáticamente con OpenStreetMap (gratuito)
- **🔄 Mapas Inteligentes**: Usa Google Maps si está configurado, sino OpenStreetMap como fallback
- **👨‍💼 Vista Admin**: Gestión completa de fletes con asignación de conductores
- **🚛 Vista Conductor**: Información limitada con acciones de estado (Iniciar/Completar)
- **📍 Integración de Rutas**: Enlaces directos para ver rutas en mapas
- **📞 Contacto Directo**: Enlaces para llamar clientes desde la aplicación
- **⏱️ Control de Estados**: Programado → En Progreso → Completado con timestamps
- **🏋️‍♂️ Gestión de Carga**: Registro en toneladas para control de capacidad

### 🎨 **Interfaz de Usuario**
- Diseño responsive y moderno
- Modo oscuro disponible
- Navegación intuitiva con breadcrumbs
- Notificaciones toast
- Animaciones suaves

## 🏗️ Arquitectura del Sistema

### **Patrón MVC (Model-View-Controller)**

```
📁 assets/
├── 📁 css/
│   ├── styles.css          # Estilos principales
│   ├── components.css      # Componentes específicos
│   ├── responsive.css      # Adaptación móvil
│   └── navigation.css      # Sistema de navegación
├── 📁 js/
│   ├── 📁 models/          # Modelos de datos
│   │   ├── Vehicle.js      # Gestión de vehículos
│   │   ├── Driver.js       # Gestión de conductores
│   │   ├── Document.js     # Gestión de documentos
│   │   ├── Expense.js      # Gestión de gastos
│   │   ├── Freight.js      # Gestión de fletes
│   │   └── User.js         # Gestión de usuarios
│   ├── 📁 views/           # Vistas de interfaz
│   │   ├── BaseView.js     # Vista base con utilidades
│   │   ├── DashboardView.js # Vista del dashboard
│   │   ├── VehicleView.js  # Vista de vehículos
│   │   ├── DriverView.js   # Vista de conductores
│   │   ├── DocumentView.js # Vista de documentos
│   │   ├── ExpenseView.js  # Vista de gastos
│   │   └── FreightView.js  # Vista de fletes
│   ├── 📁 controllers/     # Controladores de lógica
│   │   ├── BaseController.js     # Controlador base
│   │   ├── AuthController.js     # Autenticación
│   │   ├── VehicleController.js  # Lógica de vehículos
│   │   ├── DriverController.js   # Lógica de conductores
│   │   ├── DocumentController.js # Lógica de documentos
│   │   ├── FreightController.js  # Lógica de fletes
│   │   └── DashboardController.js # Lógica del dashboard
│   ├── 📁 core/            # Sistema central
│   │   ├── Router.js       # Enrutamiento SPA
│   │   └── NavigationManager.js # Gestión de navegación
│   ├── 📁 services/        # Servicios del sistema
│   │   ├── StorageService.js # Gestión de localStorage
│   │   ├── GoogleMapsService.js # Integración Google Maps
│   │   ├── OpenStreetMapService.js # Integración OpenStreetMap
│   │   └── MapService.js     # Servicio unificado de mapas
│   └── 📁 app/             # Aplicación principal
│       └── Application.js  # Coordinador principal
```

## 🚀 Instalación y Uso

### **1. Archivos Necesarios**
- `auth.html` - Página de inicio de sesión
- `main.html` - Aplicación principal
- `assets/` - Todos los archivos CSS y JavaScript

### **2. Sistema de Usuarios**

#### **👨‍💼 Administrador**
El sistema se configura automáticamente con un administrador seguro mediante el wizard de configuración inicial.

#### **🚛 Conductores**
Los conductores son migrados automáticamente del sistema de gestión existente:

| Usuario | Contraseña | Rol | Nombre |
|---------|------------|-----|--------|
| `conductorsistoferneyguarin` | `71330994` | Conductor | Sisto Ferney Guarin |
| `conductorantoniomejia` | `21430726` | Conductor | Antonio Mejia |
| `conductorpepelopez` | `987654321` | Conductor | Pepe Lopez |

**✨ Acceso Multi-Dispositivo**: Los conductores pueden iniciar sesión desde cualquier dispositivo sin necesidad de configurar nada manualmente.

### **3. Primeros Pasos**
1. Abrir `auth.html` en el navegador
2. Iniciar sesión con cualquier usuario de prueba
3. El sistema redirige automáticamente a `main.html`
4. Explorar las diferentes secciones según el rol

## 📱 Funcionalidades por Rol

### **👨‍💼 Administrador**
- ✅ Ver y gestionar todos los vehículos
- ✅ Ver y gestionar todos los conductores
- ✅ Ver y gestionar todos los documentos
- ✅ Ver y gestionar todos los gastos
- ✅ **NUEVO: Gestión completa de fletes** con asignación de conductores
- ✅ **NUEVO: Cálculo automático de distancias** con OpenStreetMap gratuito
- ✅ **NUEVO: Seguimiento de ingresos** por vehículo y conductor
- ✅ Acceso a reportes y estadísticas completas
- ✅ Exportar datos en Excel (.xlsx) y CSV
- ✅ Imprimir reportes filtrados
- ✅ Cámara para captura de recibos
- ✅ Filtrado avanzado con dependencias
- ✅ Gestión de usuarios (pendiente)

### **🚛 Conductor**
- ✅ Ver dashboard personal con sus estadísticas
- ✅ Ver documentos de su vehículo pre-asignado
- ✅ Registrar y ver sus propios gastos
- ✅ **NUEVO: Ver servicios de transporte asignados** en sección "Mis Servicios"
- ✅ **NUEVO: Control de estados de servicios** (Iniciar/Completar)
- ✅ **NUEVO: Información de clientes** con enlaces para llamar
- ✅ **NUEVO: Ver rutas en mapas** para cada servicio
- ✅ Cargar recibos de gastos con cámara
- ✅ Captura de imágenes con compresión automática
- ✅ Acceso a tipos de gastos completos (incluye repuestos)
- ✅ Exportar e imprimir sus propios gastos
- ❌ No puede gestionar otros conductores o vehículos
- ❌ No puede ver datos de otros conductores
- ❌ No ve precios ni información administrativa de fletes

## 🔧 Características Técnicas

### **💾 Persistencia de Datos**
- **localStorage**: Datos principales (vehículos, conductores, gastos, documentos, fletes)
- **sessionStorage**: Sesión del usuario
- **Base64**: Recibos y documentos con compresión automática
- **Limpieza Automática**: Eliminación de imágenes huérfanas para optimizar espacio
- **🆕 Sincronización S3**: Datos de fletes incluidos en backup automático

### **🎯 Validaciones Automáticas**
- Fechas de vencimiento de documentos según normativa colombiana
- Validación de formularios en tiempo real
- Verificación de duplicados (placas, licencias)
- Control de dependencias (no eliminar vehículos con gastos)

### **📊 Cálculos Automáticos**
- **SOAT**: +1 año desde fecha de expedición
- **Tecnomecánica**: +1 año desde fecha de expedición
- **Impuesto Vehicular**: 30 de junio del año siguiente si está pagado
- **Impuesto de Rodamiento**: 31 de diciembre del año siguiente si está pagado
- **🆕 Distancias de Fletes**: Cálculo automático con OpenStreetMap (gratuito)
- **🆕 Asignación Automática**: Conductor → Vehículo en fletes
- **🆕 Estados de Servicios**: Timestamps automáticos de inicio y finalización

### **🔔 Sistema de Alertas**
- Documentos vencidos (rojo)
- Documentos próximos a vencer (amarillo)
- Notificaciones automáticas en el dashboard
- Mensajes específicos para impuestos territoriales

## 🎨 Personalización

### **Temas**
- Modo claro (por defecto)
- Modo oscuro (configurable por usuario)
- Colores personalizables en CSS

### **Responsive Design**
- ✅ Escritorio (1200px+)
- ✅ Tablet (768px - 1199px)
- ✅ Móvil (< 768px)
- ✅ Menú hamburguesa en móviles

## 🛠️ Desarrollo y Extensiones

### **Agregar Nuevos Módulos**
1. Crear modelo en `models/`
2. Crear vista en `views/`
3. Crear controlador en `controllers/`
4. Registrar ruta en `Router.js`
5. Agregar navegación en `NavigationManager.js`

### **Estructura de Archivos**
```javascript
// Ejemplo de nuevo módulo
class NewModule extends BaseModel { ... }
class NewModuleView extends BaseView { ... }
class NewModuleController extends BaseController { ... }
```

## ✨ Funcionalidades Más Recientes (v1.4)

### **🚛 Sistema de Fletes Completo**
- **Gestión de Servicios de Transporte**: Módulo completo para registro y seguimiento de fletes
- **Cálculo Automático de Distancias**: Integración con OpenStreetMap (100% gratuito) y Google Maps
- **Vista Diferenciada por Rol**: Administradores ven información completa, conductores información limitada
- **Control de Estados**: Programado → En Progreso → Completado con timestamps automáticos
- **Integración de Mapas**: Servicio unificado que usa Google Maps si está configurado, sino OpenStreetMap
- **Gestión de Clientes**: Registro de información de contacto con enlaces directos para llamar
- **Asignación Inteligente**: Conductor seleccionado → Vehículo asignado automáticamente
- **Registro de Carga**: Control en toneladas para seguimiento de capacidad

### **🗺️ Servicios de Mapas Multi-Proveedor**
- **OpenStreetMap**: Servicio gratuito con Nominatim (geocoding) y OSRM (routing)
- **Google Maps**: Servicio premium con autocompletado y cálculos precisos
- **MapService Unificado**: Automatiza la selección del mejor proveedor disponible
- **Fallback Inteligente**: Cambia automáticamente si un servicio falla
- **Sin Configuración**: OpenStreetMap funciona inmediatamente sin API Keys

## ✨ Funcionalidades Anteriores (v1.3)

### **🌐 Sistema de Autenticación Multi-Dispositivo**
- **Auto-Configuración S3**: Configuración automática de almacenamiento en la nube para conductores
- **Login Sin Configuración**: Conductores pueden acceder desde cualquier dispositivo sin setup manual
- **Migración Automática**: Sistema migra automáticamente conductores existentes al nuevo sistema
- **Credenciales Seguras**: Eliminación completa de credenciales hardcodeadas
- **Sincronización Transparente**: Datos se sincronizan automáticamente con AWS S3

### **🔒 Mejoras de Seguridad**
- Eliminación total de credenciales hardcodeadas del código fuente
- Sistema de configuración segura con encriptación
- Wizard de configuración inicial para administradores
- Manejo seguro de configuraciones inconsistentes

### **📁 Gestión de Archivos S3**
- Archivo dedicado `conductores.json` para credenciales de conductores
- Sistema de fallback con múltiples formatos (legacy y nuevo)
- Corrección de bugs en parámetros de upload
- Arquitectura modular para fácil mantenimiento

## ✨ Funcionalidades Anteriores (v1.2)

### **📸 Sistema de Cámara Avanzado**
- Captura con cámara trasera prioritaria
- Resolución optimizada 1080x720px
- Compresión JPEG automática (60% calidad)
- Redimensionado a 800x600px para almacenamiento

### **📊 Exportación y Reportes Mejorados**
- Exportación nativa a Excel (.xlsx) con múltiples hojas
- Reportes con estadísticas por conductor, vehículo y tipo
- Función de impresión con formato optimizado
- Filtros inteligentes que adaptan los reportes

### **🔧 Mejoras Técnicas**
- Patrón Singleton para prevenir duplicación de eventos
- Sistema de limpieza automática de localStorage
- Filtrado dependiente entre conductores y vehículos
- Gestión optimizada de memoria e imágenes

### **📋 Nuevo Tipo de Gasto**
- **Repuestos**: Agregado como categoría de gasto
- Disponible tanto para administradores como conductores
- Incluido en reportes y estadísticas

## 📋 Próximas Funcionalidades

- [ ] **Reportes avanzados** con gráficos interactivos
- [ ] **Backup automático** a la nube
- [ ] **Notificaciones push** para vencimientos
- [ ] **API REST** para integración externa
- [ ] **Múltiples empresas** en un mismo sistema
- [ ] **Roles personalizados** más granulares
- [ ] **Importación masiva** desde Excel/CSV
- [ ] **Firma digital** de documentos
- [ ] **Geolocalización** para registro de gastos
- [ ] **Modo offline** con sincronización

## ⚡ Rendimiento

- **Carga inicial**: < 2 segundos
- **Navegación entre secciones**: < 500ms
- **Búsquedas**: Tiempo real
- **Almacenamiento**: ~5MB límite de localStorage con limpieza automática
- **Compresión de imágenes**: Reducción hasta 90% del tamaño original
- **Optimización**: Lazy loading de vistas y singleton patterns
- **Exportación Excel**: Generación nativa sin servidor

## 🔒 Seguridad

- Autenticación obligatoria
- Sesiones con expiración automática (24 horas)
- Validación de permisos por rol
- Datos almacenados localmente (sin servidor)
- Sanitización de inputs
- Protección contra XSS básica

## 🐛 Solución de Problemas

### **Errores Comunes**
1. **"Error al cargar componentes"**: Verificar que todos los archivos JS estén presentes
2. **"Usuario no encontrado"**: Usar usuarios por defecto o recrear datos
3. **"Sesión expirada"**: Volver a iniciar sesión
4. **Pantalla en blanco**: Abrir consola del navegador para ver errores
5. **"QuotaExceededError"**: El sistema limpia automáticamente, o limpiar manualmente
6. **Cámara no funciona**: Verificar permisos del navegador para acceso a cámara
7. **Exportaciones duplicadas**: Actualizar la página si los botones no responden

### **Limpiar Datos**
```javascript
// Limpieza completa en consola del navegador
localStorage.clear();
sessionStorage.clear();
location.reload();

// Limpieza selectiva solo de imágenes
localStorage.removeItem('receipts');
```

### **Liberar Espacio de Almacenamiento**
El sistema incluye limpieza automática, pero se puede hacer manualmente:
```javascript
// En consola del navegador - ejecutar la limpieza
if (window.expenseView && window.expenseView.cleanupOrphanedReceipts) {
    window.expenseView.cleanupOrphanedReceipts();
    console.log('Limpieza completada');
}
```

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema:
- **Documentación**: Este archivo README
- **Código fuente**: Comentarios detallados en cada archivo
- **Consola del navegador**: Para debugging (F12)

## 📚 Dependencias Externas

### **Librerías CDN Utilizadas**
- **SheetJS (xlsx.full.min.js)**: Para exportación nativa a Excel (.xlsx)
  ```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  ```

### **APIs del Navegador**
- **getUserMedia API**: Para acceso a la cámara del dispositivo
- **Canvas API**: Para compresión y redimensionado de imágenes
- **File API**: Para manejo de archivos y conversión a Base64
- **localStorage/sessionStorage**: Para persistencia de datos

## 🎯 Casos de Uso Principales

### **📊 Para Administradores**
1. **Monitoreo de Flota**: Dashboard con alertas de documentos vencidos
2. **Control de Gastos**: Vista completa de todos los gastos con filtros avanzados
3. **Reportes Gerenciales**: Exportación de datos para análisis externo
4. **Gestión de Conductores**: Asignación de vehículos y seguimiento de desempeño

### **🚛 Para Conductores**
1. **Registro Rápido**: Captura de gastos con cámara desde el móvil
2. **Seguimiento Personal**: Vista de sus propios gastos y estadísticas
3. **Cumplimiento Documental**: Verificación del estado de documentos de su vehículo
4. **Reportes Personales**: Exportación de sus gastos para control personal

### **🚛 Para Gestión de Fletes**
1. **Registro de Servicios**: Captura completa de información de transporte
2. **Cálculo Automático**: Distancias calculadas sin costo con OpenStreetMap
3. **Seguimiento de Estados**: Control de progreso de servicios en tiempo real
4. **Análisis de Ingresos**: Seguimiento de ingresos por vehículo y conductor
5. **Gestión de Clientes**: Base de datos de clientes con información de contacto

## 🔄 Changelog

### **v1.4 (2024) - Sistema de Fletes y Mapas**
- ➕ **Sistema completo de fletes** con gestión de servicios de transporte
- ➕ **Integración con OpenStreetMap** gratuita para cálculo de distancias
- ➕ **MapService unificado** con Google Maps como premium y OSM como fallback
- ➕ **Vista diferenciada por roles** (admin completa, conductor limitada)
- ➕ **Control de estados de servicios** (Programado → En Progreso → Completado)
- ➕ **Gestión de clientes** con información de contacto
- ➕ **Cálculo automático de distancias** sin configuración requerida
- ➕ **Asignación automática** conductor → vehículo
- ➕ **Registro de carga en toneladas** para control de capacidad
- ➕ **Integración de rutas** con enlaces directos a mapas
- 🔧 **Navegación actualizada** con sección "Fletes/Mis Servicios"
- 🔧 **Permisos de usuario** actualizados para incluir fletes

### **v1.3 (2024) - Sistema Multi-Dispositivo**
- ➕ **Sistema de autenticación multi-dispositivo** para conductores
- ➕ **Auto-configuración de S3** sin intervención manual
- ➕ **Migración automática** de conductores existentes
- ➕ **Wizard de configuración inicial** para administradores
- ➕ **Sistema de archivos S3 dedicados** (`conductores.json`)
- 🔒 **Eliminación completa** de credenciales hardcodeadas
- 🔒 **Configuración segura** con encriptación
- 🔧 **Corrección de bugs** en parámetros de upload S3
- 🔧 **Optimización de carga** desde S3 con sistema de prioridades

### **v1.2 (2024) - Actualización Mayor**
- ➕ Sistema de cámara con compresión automática
- ➕ Exportación nativa a Excel (.xlsx)
- ➕ Filtrado dependiente conductor-vehículo  
- ➕ Tipo de gasto "repuestos"
- ➕ Limpieza automática de localStorage
- ➕ Patrón Singleton para prevenir duplicaciones
- 🔧 Corrección de múltiples guardados de gastos
- 🔧 Mejoras en gestión de memoria
- 🔧 Optimización de rendimiento

### **v1.0 (2024) - Lanzamiento Inicial**
- ➕ Sistema base MVC
- ➕ Autenticación por roles
- ➕ Gestión de vehículos, conductores y documentos
- ➕ Control básico de gastos
- ➕ Dashboard interactivo

---

**Desarrollado para la gestión eficiente del transporte empresarial**

*Sistema de Gestión de Transporte v1.4 - 2024*
*Desarrollador: Sisto Ferney Guarin*
*Última actualización: Sistema de Fletes con OpenStreetMap*