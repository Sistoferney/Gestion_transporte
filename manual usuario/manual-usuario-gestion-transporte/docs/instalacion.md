# Instalación del Sistema de Gestión de Transporte

Este documento detalla los pasos necesarios para instalar y configurar el Sistema de Gestión de Transporte. Asegúrese de seguir cada paso cuidadosamente para garantizar una instalación exitosa.

## Requisitos Previos

Antes de comenzar la instalación, asegúrese de tener los siguientes requisitos:

- **Navegador Web**: Asegúrese de tener un navegador moderno (Chrome, Firefox, Edge) actualizado.
- **Conexión a Internet**: Necesaria para descargar dependencias y acceder a servicios en la nube.
- **Sistema de Archivos**: Acceso a un sistema de archivos donde pueda almacenar los archivos del proyecto.

## Pasos de Instalación

### 1. Descarga del Proyecto

- Descargue el archivo ZIP del proyecto desde el repositorio oficial o clone el repositorio usando Git:

```bash
git clone <URL_DEL_REPOSITORIO>
```

### 2. Descompresión de Archivos

- Si descargó un archivo ZIP, descomprímalo en una ubicación de su elección.

### 3. Estructura de Archivos

- Asegúrese de que la estructura de archivos sea la siguiente:

```
manual-usuario-gestion-transporte/
├── docs/
├── examples/
├── scripts/
├── .gitignore
└── README.md
```

### 4. Configuración Inicial

- Abra el archivo `README.md` para obtener información sobre la configuración inicial y los pasos adicionales que pueda necesitar.

### 5. Acceso a la Aplicación

- Para acceder a la aplicación, abra el archivo `auth.html` en su navegador. Esto le llevará a la página de inicio de sesión.

### 6. Creación de Usuarios

- Si es la primera vez que utiliza el sistema, utilice las credenciales predeterminadas proporcionadas en el archivo `README.md` para iniciar sesión como administrador.

### 7. Configuración de Almacenamiento en la Nube (Opcional)

- Si desea utilizar la funcionalidad de almacenamiento en la nube, siga las instrucciones en el archivo `README.md` para configurar el acceso a S3.

## Verificación de Instalación

- Una vez que haya completado los pasos anteriores, inicie sesión en la aplicación y verifique que todas las funcionalidades estén operativas.

## Soporte

Si encuentra problemas durante la instalación, consulte el documento de solución de problemas en `docs/anexos/solucion-de-problemas.md` o busque ayuda en la comunidad del proyecto.