# Módulo de Autenticación

El módulo de autenticación es fundamental para garantizar la seguridad y el acceso controlado al sistema de gestión de transporte. A continuación, se describen las funcionalidades y procesos relacionados con este módulo.

## Proceso de Inicio de Sesión

1. **Acceso a la Página de Inicio de Sesión**:
   - Los usuarios deben abrir el archivo `auth.html` en su navegador para acceder a la página de inicio de sesión.

2. **Ingreso de Credenciales**:
   - Los usuarios deben ingresar su nombre de usuario y contraseña en los campos correspondientes.
   - Ejemplo de usuarios de prueba:
     - Usuario: `conductorsistoferneyguarin`, Contraseña: `71330994`
     - Usuario: `conductorantoniomejia`, Contraseña: `21430726`
     - Usuario: `conductorpepelopez`, Contraseña: `987654321`

3. **Validación de Credenciales**:
   - Al hacer clic en el botón de inicio de sesión, el sistema validará las credenciales ingresadas.
   - Si las credenciales son correctas, el usuario será redirigido a la página principal (`main.html`).

4. **Manejo de Errores**:
   - Si las credenciales son incorrectas, se mostrará un mensaje de error indicando que el usuario no fue encontrado.

## Roles de Usuario

El sistema cuenta con dos roles principales:

- **Administrador**:
  - Tiene acceso completo a todas las funcionalidades del sistema, incluyendo la gestión de vehículos, conductores, documentos y gastos.
  - Puede ver y gestionar todos los datos y generar reportes.

- **Conductor**:
  - Tiene acceso limitado a su propio dashboard, donde puede ver sus estadísticas, documentos de su vehículo y registrar sus propios gastos.
  - No puede gestionar otros conductores o vehículos.

## Gestión de Credenciales

- **Seguridad de Credenciales**:
  - El sistema no almacena credenciales hardcodeadas, garantizando la seguridad de la información.
  - Las credenciales se gestionan de forma segura y se utilizan sesiones persistentes con expiración automática.

- **Migración de Conductores**:
  - Los conductores existentes en el sistema anterior son migrados automáticamente al nuevo sistema, facilitando la transición sin necesidad de reconfiguración manual.

## Acceso Multi-Dispositivo

- Los conductores pueden iniciar sesión desde cualquier dispositivo sin necesidad de configuración adicional, lo que permite un acceso flexible y conveniente al sistema.

## Conclusión

El módulo de autenticación es esencial para el funcionamiento seguro del sistema de gestión de transporte, asegurando que solo los usuarios autorizados puedan acceder a la información y funcionalidades del sistema.