const fs = require('fs');
const path = require('path');

const CATEGORY_LABELS = {
    tools: 'Herramientas',
    download: 'Descargas',
    search: 'Búsquedas',
    anime: 'Anime',
    fun: 'Diversión'
};

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Carga automáticamente TODAS las rutas dentro de /routes, sin importar
 * cuántos niveles de subcarpetas tengan (totalmente recursivo).
 *
 * Además, arma una lista con la información de cada endpoint protegido
 * (guardada en app.locals.apiEndpoints) para que el Dashboard pueda
 * mostrar sus tarjetas automáticamente, sin tocar public/dash.html.
 *
 * Convención:
 * - Un archivo suelto directamente en routes/ (ej: routes/auth.js) = ruta
 *   PÚBLICA en /api/<nombre>. Maneja su propia seguridad.
 *
 * - Un archivo dentro de cualquier subcarpeta (ej: routes/tools/qr.js) =
 *   ruta PROTEGIDA (pasa por authHandler) en /api/<carpeta>/.../<archivo>.
 *
 * Para que un endpoint protegido aparezca bien descrito en el Dashboard,
 * el archivo puede exportar además `router.meta = {...}` (ver ejemplos en
 * routes/tools/qr.js o routes/anime/waifu.js). Si no define `meta`, el
 * Dashboard igual le arma una tarjeta genérica automáticamente.
 */
function loadRoutes(app, authHandler) {
    const routesDir = path.join(__dirname, '..', 'routes');
    if (!fs.existsSync(routesDir)) return;

    const endpoints = [];

    function walk(currentDir, segments) {
        fs.readdirSync(currentDir).forEach(entry => {
            const fullPath = path.join(currentDir, entry);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
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
                // Dentro de subcarpeta(s) = protegido
                const routePath = `/api/${segments.join('/')}/${name}`;
                app.use(routePath, authHandler, router);
                console.log(`🔌 Ruta protegida: ${routePath}`);

                const category = segments[0];
                const meta = router.meta || {};

                endpoints.push({
                    category,
                    categoryLabel: CATEGORY_LABELS[category] || capitalize(category),
                    path: routePath,
                    title: meta.title || capitalize(name),
                    description: meta.description || '',
                    icon: meta.icon || 'fas fa-plug',
                    fields: meta.fields || [],
                    resultType: meta.resultType || 'raw',
                    resultField: meta.resultField || null,
                    previewFields: meta.previewFields || []
                });
            }
        });
    }

    walk(routesDir, []);
    app.locals.apiEndpoints = endpoints;
}

module.exports = loadRoutes;
