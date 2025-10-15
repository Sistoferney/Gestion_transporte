# Casos de Uso del Sistema de Gestión de Transporte

Este documento presenta ejemplos de casos de uso del sistema de gestión de transporte, mostrando cómo diferentes roles pueden interactuar con las funcionalidades del sistema.

## 1. Caso de Uso: Administrador

### 1.1 Monitoreo de Flota
- **Descripción**: El administrador accede al dashboard para visualizar el estado de todos los vehículos y conductores.
- **Pasos**:
  1. Iniciar sesión como administrador.
  2. Navegar a la sección del dashboard.
  3. Revisar las alertas de documentos vencidos y estadísticas de gastos.

### 1.2 Gestión de Conductores
- **Descripción**: El administrador registra un nuevo conductor en el sistema.
- **Pasos**:
  1. Iniciar sesión como administrador.
  2. Ir a la sección de gestión de conductores.
  3. Completar el formulario de registro con la información del conductor.
  4. Asignar un vehículo al conductor.
  5. Guardar los cambios.

### 1.3 Generación de Reportes
- **Descripción**: El administrador genera un reporte de gastos mensuales.
- **Pasos**:
  1. Iniciar sesión como administrador.
  2. Acceder a la sección de control de gastos.
  3. Seleccionar el rango de fechas para el reporte.
  4. Exportar el reporte en formato Excel.

## 2. Caso de Uso: Conductor

### 2.1 Registro de Gastos
- **Descripción**: El conductor registra un gasto utilizando la cámara del dispositivo.
- **Pasos**:
  1. Iniciar sesión como conductor.
  2. Navegar a la sección de gastos.
  3. Seleccionar la opción para capturar un recibo.
  4. Tomar una foto del recibo y completar los detalles del gasto.
  5. Guardar el gasto registrado.

### 2.2 Visualización de Documentos
- **Descripción**: El conductor revisa los documentos de su vehículo.
- **Pasos**:
  1. Iniciar sesión como conductor.
  2. Ir a la sección de documentos.
  3. Ver el estado de los documentos asociados a su vehículo, incluyendo SOAT y Tecnomecánica.

### 2.3 Acceso a Servicios de Transporte
- **Descripción**: El conductor consulta los servicios de transporte asignados.
- **Pasos**:
  1. Iniciar sesión como conductor.
  2. Navegar a la sección "Mis Servicios".
  3. Revisar la información de los servicios asignados, incluyendo origen, destino y estado.

## 3. Caso de Uso: Gestión de Fletes

### 3.1 Registro de Servicio de Transporte
- **Descripción**: El administrador registra un nuevo servicio de transporte.
- **Pasos**:
  1. Iniciar sesión como administrador.
  2. Acceder a la sección de gestión de fletes.
  3. Completar el formulario con los detalles del servicio, incluyendo origen, destino y carga.
  4. Asignar un conductor y un vehículo al servicio.
  5. Guardar el servicio registrado.

### 3.2 Cálculo de Distancias
- **Descripción**: El sistema calcula automáticamente la distancia entre dos puntos para un servicio de transporte.
- **Pasos**:
  1. Iniciar sesión como administrador.
  2. Registrar un nuevo servicio de transporte.
  3. Ingresar el origen y destino.
  4. El sistema utiliza OpenStreetMap para calcular la distancia automáticamente.

Estos casos de uso ilustran cómo los diferentes roles dentro del sistema pueden interactuar con las funcionalidades disponibles, facilitando la gestión eficiente del transporte empresarial.