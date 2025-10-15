// Este archivo genera un índice para la documentación del sistema de gestión de transporte.
// Facilita la navegación entre los diferentes módulos y secciones del manual de usuario.

const fs = require('fs');
const path = require('path');

// Ruta del directorio de documentación
const docsDir = path.join(__dirname, '../docs');

// Función para generar el índice
function generarIndice() {
    let indice = '# Índice de Documentación\n\n';
    
    // Leer el directorio de documentos
    fs.readdir(docsDir, (err, files) => {
        if (err) {
            console.error('Error al leer el directorio de documentación:', err);
            return;
        }

        files.forEach(file => {
            if (file.endsWith('.md')) {
                indice += `- [${file.replace('.md', '')}](docs/${file})\n`;
            }
        });

        // Leer el subdirectorio de módulos
        const modulosDir = path.join(docsDir, 'modulos');
        fs.readdir(modulosDir, (err, modulos) => {
            if (err) {
                console.error('Error al leer el directorio de módulos:', err);
                return;
            }

            modulos.forEach(modulo => {
                if (modulo.endsWith('.md')) {
                    indice += `  - [${modulo.replace('.md', '')}](docs/modulos/${modulo})\n`;
                }
            });

            // Guardar el índice en un archivo
            fs.writeFile(path.join(docsDir, 'indice.md'), indice, (err) => {
                if (err) {
                    console.error('Error al guardar el índice:', err);
                } else {
                    console.log('Índice generado correctamente en docs/indice.md');
                }
            });
        });
    });
}

// Ejecutar la función para generar el índice
generarIndice();