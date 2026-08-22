const fs = require('fs');
const path = require('path');

/**
 * Carga automáticamente TODAS las rutas dentro de /routes, sin importar
 * cuántos niveles de subcarpetas tengan (esto es totalmente recursivo).
 *
 * Convención:
 * - Un archivo suelto directamente en routes/ (ej: routes/auth.js) se monta
 *   como ruta PÚBLICA en /api/<nombreDelArchivo> (ej: /api/auth). Estos
 *   archivos manejan su propia seguridad internamente (login, apiKey manual).
 *
 * - Un archivo dentro de cualquier subcarpeta, sin importar cuán anidada
 *   esté (ej: routes/tools/qr.js, o incluso routes/juegos/cartas/blackjack.js),
 *   se monta como ruta PROTEGIDA (pasa por authHandler) en
 *   /api/<carpeta1>/<carpeta2>/.../<archivo>.
 *
 * Para agregar un endpoint nuevo, o incluso una categoría nueva completa
 * (con sus propias subcarpetas), solo crea los archivos donde corresponda
 * — no hace falta tocar index.js ni este archivo nunca.
 */
function loadRoutes(app, authHandler) {
    const routesDir = path.join(__dirname, '..', 'routes');
    if (!fs.existsSync(routesDir)) return;

    function walk(currentDir, segments) {
        fs.readdirSync(currentDir).forEach(entry => {
            const fullPath = path.join(currentDir, entry);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Sigue bajando, sin importar cuántos niveles haya
                walk(fullPath, [...segments, entry]);
                return;
            }

            if (!entry.endsWith('.js')) return;

            const name = entry.replace(/\.js$/, '');
            const router = require(fullPath);

            if (segments.length === 0) {
                // Archivo directo en routes/ = público
                const routePath = `/api/${name}`;
                app.use(routePath, router);
                console.log(`🔓 Ruta pública: ${routePath}`);
            } else {
                // Dentro de una o más subcarpetas = protegido
                const routePath = `/api/${segments.join('/')}/${name}`;
                app.use(routePath, authHandler, router);
                console.log(`🔌 Ruta protegida: ${routePath}`);
            }
        });
    }

    walk(routesDir, []);
}

module.exports = loadRoutes;