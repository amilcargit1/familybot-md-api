const db = require('../db');

/**
 * Recoge métricas de las solicitudes /api sin bloquear la respuesta.
 * Este middleware se monta con app.use('/api/', statsMiddleware), por lo
 * que req.path NO contiene el prefijo /api/ dentro de este middleware.
 * No guarda API keys, IPs ni otros datos personales.
 * El endpoint de estadísticas se excluye para evitar inflar sus propios contadores.
 */
function statsMiddleware(req, res, next) {
    const relativePath = req.path || '';

    // Al estar montado en /api/, Express entrega req.path como /auth/login,
    // /tools/qr, etc. El endpoint completo se reconstruye más abajo.
    if (relativePath === '/auth/stats') return next();

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const routePath = req.route?.path;
        const base = req.baseUrl || '/api';
        const endpoint = routePath
            ? `${base}${routePath}`
            : `${base}${relativePath}`;

        db.incrementStats({
            endpoint,
            method: req.method,
            statusCode: res.statusCode,
            responseTimeMs: elapsedMs
        }).catch(err => console.error('⚠️ Error guardando estadísticas:', err.message));
    });

    next();
}

module.exports = { statsMiddleware };
