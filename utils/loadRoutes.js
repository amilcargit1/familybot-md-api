const fs = require('fs');
const path = require('path');

/**
 * Carga automáticamente todas las rutas dentro de /routes.
 *
 * Convención:
 * - Un archivo suelto en routes/ (ej: routes/auth.js) se monta como ruta
 *   PÚBLICA en /api/<nombreDelArchivo> (ej: /api/auth). Estos archivos
 *   manejan su propia seguridad internamente (login, apiKey manual, etc).
 *
 * - Un archivo dentro de una subcarpeta (ej: routes/tools/qr.js) se monta
 *   como ruta PROTEGIDA (pasa por authHandler) en /api/<carpeta>/<archivo>
 *   (ej: /api/tools/qr).
 *
 * Para agregar un endpoint nuevo, solo crea el archivo en la carpeta
 * correcta — no hace falta tocar index.js.
 */
function loadRoutes(app, authHandler) {
    const routesDir = path.join(__dirname, '..', 'routes');

    if (!fs.existsSync(routesDir)) return;

    fs.readdirSync(routesDir).forEach(entry => {
        const fullPath = path.join(routesDir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Carpeta = categoría de endpoints protegidos
            fs.readdirSync(fullPath).forEach(file => {
                if (!file.endsWith('.js')) return;
                const name = file.replace(/\.js$/, '');
                const routePath = `/api/${entry}/${name}`;
                const router = require(path.join(fullPath, file));
                app.use(routePath, authHandler, router);
                console.log(`🔌 Ruta protegida: ${routePath}`);
            });
        } else if (entry.endsWith('.js')) {
            // Archivo suelto = ruta pública (maneja su propia seguridad)
            const name = entry.replace(/\.js$/, '');
            const routePath = `/api/${name}`;
            const router = require(fullPath);
            app.use(routePath, router);
            console.log(`🔓 Ruta pública: ${routePath}`);
        }
    });
}

module.exports = loadRoutes;