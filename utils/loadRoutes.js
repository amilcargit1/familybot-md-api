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

const TYPE_META = {
    api: { label: 'API', icon: 'fas fa-plug', resultType: 'raw' },
    download: { label: 'Descarga', icon: 'fas fa-download', resultType: 'link' },
    search: { label: 'Búsqueda', icon: 'fas fa-magnifying-glass', resultType: 'text' },
    media: { label: 'Media', icon: 'fas fa-photo-film', resultType: 'image' },
    utility: { label: 'Utilidad', icon: 'fas fa-toolbox', resultType: 'raw' },
    auth: { label: 'Auth', icon: 'fas fa-key', resultType: 'raw' },
    admin: { label: 'Admin', icon: 'fas fa-shield-halved', resultType: 'raw' },
    custom: { label: 'Personalizado', icon: 'fas fa-code', resultType: 'raw' }
};

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
                const typeMeta = TYPE_META[type];

                endpoints.push({
                    category,
                    categoryLabel: CATEGORY_LABELS[category] || capitalize(category),
                    type,
                    typeLabel: typeMeta.label,
                    path: routePath,
                    title: meta.title || capitalize(name),
                    description: meta.description || '',
                    icon: meta.icon || typeMeta.icon,
                    fields: meta.fields || [],
                    resultType: meta.resultType || typeMeta.resultType,
                    resultField: meta.resultField || null,
                    previewFields: meta.previewFields || [],
                    ui: {
                        mode: type,
                        label: typeMeta.label,
                        icon: typeMeta.icon
                    }
                });
            }
        });
    }

    walk(routesDir, []);
    app.locals.apiEndpoints = endpoints;
}

module.exports = loadRoutes;
