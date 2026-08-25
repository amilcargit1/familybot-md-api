const fs = require('fs');
const path = require('path');
const express = require('express');

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

// ============== SEGURIDAD: atrapar errores de rutas async automáticamente ==============
// Express 4 NO atrapa solo los errores lanzados dentro de funciones `async`
// en una ruta. Si a alguien se le olvida poner try/catch en un endpoint
// nuevo, ese error puede colgar la solicitud o tumbar el servidor entero.
// Para no depender de que cada archivo lo recuerde, "parchamos" el propio
// express.Router() una sola vez aquí: a partir de este punto, CUALQUIER
// router creado con express.Router() (en cualquier archivo de /routes)
// atrapa automáticamente los errores de sus rutas y los manda al manejador
// de errores global en index.js.
if (!express.__familybotPatched) {
    const originalRouterFactory = express.Router;
    express.Router = function patchedRouter(...args) {
        const router = originalRouterFactory(...args);
        ['get', 'post', 'put', 'delete', 'patch', 'all'].forEach(method => {
            const original = router[method].bind(router);
            router[method] = function (routePath, ...handlers) {
                const wrapped = handlers.map(h => {
                    if (typeof h !== 'function') return h;
                    return function (req, res, next) {
                        Promise.resolve(h(req, res, next)).catch(next);
                    };
                });
                return original(routePath, ...wrapped);
            };
        });
        return router;
    };
    express.__familybotPatched = true;
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
                    method: meta.method || 'GET',
                    fields: meta.fields || [],
                    resultType: meta.resultType || 'raw',
                    resultField: meta.resultField || null,
                    previewFields: meta.previewFields || [],
                    example: meta.example || null
                });
            }
        });
    }

    walk(routesDir, []);
    app.locals.apiEndpoints = endpoints;
}

module.exports = loadRoutes;
