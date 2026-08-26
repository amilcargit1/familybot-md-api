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

// Express 4 no propaga automáticamente excepciones de handlers async.
// Envolvemos los handlers registrados por los routers cargados aquí.
if (!express.__familybotPatched) {
    const originalRouterFactory = express.Router;
    express.Router = function patchedRouter(...args) {
        const router = originalRouterFactory(...args);
        ['get', 'post', 'put', 'delete', 'patch', 'all'].forEach(method => {
            const original = router[method].bind(router);
            router[method] = function (routePath, ...handlers) {
                const wrapped = handlers.map(handler => {
                    if (typeof handler !== 'function') return handler;
                    return function asyncSafeHandler(req, res, next) {
                        try {
                            const result = handler(req, res, next);
                            if (result && typeof result.catch === 'function') result.catch(next);
                        } catch (error) {
                            next(error);
                        }
                    };
                });
                return original(routePath, ...wrapped);
            };
        });
        return router;
    };
    express.__familybotPatched = true;
}

function validateRouter(router, filePath) {
    if (!router || typeof router !== 'function' || typeof router.use !== 'function') {
        throw new TypeError(`El archivo ${filePath} no exporta un Express Router válido`);
    }
}

function loadRoutes(app, authHandler) {
    const routesDir = path.join(__dirname, '..', 'routes');
    if (!fs.existsSync(routesDir)) {
        console.warn('⚠️ Directorio routes no encontrado:', routesDir);
        app.locals.apiEndpoints = [];
        return;
    }

    const endpoints = [];
    const mountedPaths = new Map();

    function mount(routePath, router, middleware, filePath) {
        const existing = mountedPaths.get(routePath);
        if (existing) {
            throw new Error(`Conflicto de ruta: ${routePath} (${existing} y ${filePath})`);
        }
        mountedPaths.set(routePath, filePath);
        app.use(routePath, ...(middleware ? [middleware, router] : [router]));
    }

    function walk(currentDir, segments) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true })
            .sort((a, b) => a.name.localeCompare(b.name));

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath, [...segments, entry.name]);
                continue;
            }

            if (!entry.isFile() || !entry.name.endsWith('.js') || entry.name.startsWith('_')) continue;

            const name = entry.name.replace(/\.js$/, '');
            let router;
            try {
                router = require(fullPath);
                validateRouter(router, fullPath);
            } catch (error) {
                throw new Error(`No se pudo cargar la ruta ${fullPath}: ${error.message}`);
            }

            if (segments.length === 0) {
                const routePath = `/api/${name}`;
                mount(routePath, router, null, fullPath);
                console.log(`🔓 Ruta pública: ${routePath}`);
                continue;
            }

            const routePath = `/api/${segments.join('/')}/${name}`;
            mount(routePath, router, authHandler, fullPath);
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
                fields: Array.isArray(meta.fields) ? meta.fields : [],
                resultType: meta.resultType || 'raw',
                resultField: meta.resultField || null,
                previewFields: Array.isArray(meta.previewFields) ? meta.previewFields : [],
                example: meta.example || null
            });
        }
    }

    try {
        walk(routesDir, []);
    } catch (error) {
        console.error('❌ Error cargando endpoints:', error);
        throw error;
    }

    app.locals.apiEndpoints = endpoints;
    console.log(`📚 ${endpoints.length} endpoint(s) protegido(s) cargado(s) correctamente.`);
}

module.exports = loadRoutes;
