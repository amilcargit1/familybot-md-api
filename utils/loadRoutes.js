const fs = require('fs');
const path = require('path');

const CATEGORY_LABELS = {
    tools: 'Herramientas',
    download: 'Descargas',
    search: 'Búsquedas',
    anime: 'Anime',
    fun: 'Diversión'
};

const ENDPOINT_TYPES = new Set(['api', 'download', 'search', 'media', 'utility', 'auth', 'admin', 'custom']);

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeType(meta, category, name) {
    if (meta.type && ENDPOINT_TYPES.has(meta.type)) return meta.type;
    if (category === 'download') return 'download';
    if (category === 'search') return 'search';
    if (category === 'anime') return 'media';
    if (category === 'auth') return 'auth';
    if (category === 'admin') return 'admin';
    if (name.includes('download') || name.includes('descarg')) return 'download';
    if (name.includes('search') || name.includes('buscar')) return 'search';
    if (name.includes('media') || name.includes('video') || name.includes('audio')) return 'media';
    return 'api';
}

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
                const routePath = `/api/${name}`;
                app.use(routePath, router);
                console.log(`🔓 Ruta pública: ${routePath}`);
            } else {
                const routePath = `/api/${segments.join('/')}/${name}`;
                app.use(routePath, authHandler, router);
                console.log(`🔌 Ruta protegida: ${routePath}`);

                const category = segments[0];
                const meta = router.meta || {};
                const type = normalizeType(meta, category, name);

                endpoints.push({
                    category,
                    categoryLabel: CATEGORY_LABELS[category] || capitalize(category),
                    type,
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
