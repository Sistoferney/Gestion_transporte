# Solución de Problemas

Este documento proporciona soluciones a problemas comunes que los usuarios pueden encontrar al utilizar el Sistema de Gestión de Transporte. A continuación, se presentan los errores más frecuentes y sus respectivas soluciones.

## Errores Comunes

### 1. "Error al cargar componentes"
- **Descripción**: Este error puede ocurrir si alguno de los archivos JavaScript necesarios no está presente.
- **Solución**: Verifique que todos los archivos JS estén correctamente incluidos en el proyecto y que no falte ninguno.

### 2. "Usuario no encontrado"
- **Descripción**: Este mensaje aparece cuando se intenta iniciar sesión con un usuario que no está registrado en el sistema.
- **Solución**: Asegúrese de utilizar uno de los usuarios por defecto proporcionados en la documentación o registre un nuevo usuario.

### 3. "Sesión expirada"
- **Descripción**: Este error indica que la sesión del usuario ha expirado por inactividad.
- **Solución**: Simplemente vuelva a iniciar sesión para continuar utilizando el sistema.

### 4. Pantalla en blanco
- **Descripción**: Puede ocurrir si hay un error en el código JavaScript que impide que la interfaz se cargue correctamente.
- **Solución**: Abra la consola del navegador (F12) para ver los errores y depurar el problema.

### 5. "QuotaExceededError"
- **Descripción**: Este error se produce cuando se supera el límite de almacenamiento local.
- **Solución**: El sistema incluye limpieza automática, pero también puede limpiar manualmente el almacenamiento local si es necesario.

### 6. Cámara no funciona
- **Descripción**: Puede que la cámara no se active debido a la falta de permisos en el navegador.
- **Solución**: Verifique los permisos del navegador para asegurarse de que tiene acceso a la cámara.

### 7. Exportaciones duplicadas
- **Descripción**: Este problema puede surgir si los botones de exportación no responden correctamente.
- **Solución**: Actualice la página si los botones no funcionan como se espera.

## Limpieza de Datos

Para realizar una limpieza completa de los datos almacenados, puede utilizar los siguientes comandos en la consola del navegador:

```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Para limpiar selectivamente solo las imágenes, utilice:

```javascript
localStorage.removeItem('receipts');
```

## Liberar Espacio de Almacenamiento

El sistema incluye limpieza automática, pero se puede hacer manualmente ejecutando el siguiente comando en la consola del navegador:

```javascript
if (window.expenseView && window.expenseView.cleanupOrphanedReceipts) {
    window.expenseView.cleanupOrphanedReceipts();
    console.log('Limpieza completada');
}
```

## Soporte

Si los problemas persisten o necesita asistencia adicional, consulte la documentación completa o contacte al soporte técnico.