# 🚛 Sistema de Fletes

El módulo de fletes permite gestionar de manera eficiente los servicios de transporte, facilitando el registro, seguimiento y control de las operaciones de carga y entrega. A continuación, se describen las funcionalidades y el uso de este módulo.

## 🌟 Funcionalidades del Módulo de Fletes

### 1. **Gestión Completa de Servicios de Transporte**
- Permite registrar nuevos servicios de transporte, especificando el origen, destino, carga y precios.
- Los administradores pueden gestionar todos los servicios, mientras que los conductores solo pueden ver los que les han sido asignados.

### 2. **Cálculo Automático de Distancias**
- Utiliza OpenStreetMap para calcular automáticamente las distancias entre el origen y el destino.
- Si está configurado, también puede utilizar Google Maps como opción alternativa.

### 3. **Vista Diferenciada por Rol**
- Los administradores tienen acceso a información completa sobre todos los fletes.
- Los conductores solo pueden ver información limitada relacionada con sus servicios asignados.

### 4. **Control de Estados de Servicios**
- Los servicios pueden tener diferentes estados: Programado, En Progreso y Completado.
- Se registran timestamps automáticos para cada cambio de estado, facilitando el seguimiento del progreso.

### 5. **Integración de Rutas**
- Proporciona enlaces directos para visualizar las rutas en mapas, facilitando la planificación de los viajes.

### 6. **Gestión de Clientes**
- Permite registrar información de contacto de los clientes, incluyendo enlaces para llamar directamente desde la aplicación.

### 7. **Registro de Carga**
- Se puede registrar la carga en toneladas, lo que ayuda a controlar la capacidad de los vehículos y optimizar las operaciones.

## 📋 Cómo Utilizar el Módulo de Fletes

### **Para Administradores**
1. **Registrar un Nuevo Servicio de Transporte**
   - Acceder a la sección de fletes en el dashboard.
   - Completar el formulario con la información del servicio (origen, destino, carga, precio).
   - Guardar los cambios para registrar el servicio.

2. **Gestionar Servicios Existentes**
   - Ver la lista de servicios registrados.
   - Editar o eliminar servicios según sea necesario.
   - Cambiar el estado de un servicio (Programado, En Progreso, Completado).

3. **Visualizar Estadísticas**
   - Acceder a reportes que muestran el rendimiento de los servicios de transporte, incluyendo ingresos por vehículo y conductor.

### **Para Conductores**
1. **Ver Servicios Asignados**
   - Acceder a la sección "Mis Servicios" en el dashboard.
   - Visualizar los detalles de los servicios que se les han asignado.

2. **Actualizar el Estado de un Servicio**
   - Iniciar o completar un servicio según corresponda.
   - Registrar cualquier observación relevante durante el proceso.

3. **Consultar Rutas**
   - Utilizar los enlaces proporcionados para ver las rutas en mapas y planificar el viaje.

## 🔔 Notificaciones
- Recibir alertas automáticas sobre el estado de los servicios y cualquier cambio relevante en la programación.

Este módulo está diseñado para optimizar la gestión de fletes, asegurando que tanto administradores como conductores tengan acceso a la información necesaria para realizar su trabajo de manera eficiente.