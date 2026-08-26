const db = require('../db');

/**
 * Recoge métricas de las solicitudes /api sin bloquear la respuesta.
 * No guarda API keys, IPs ni otros datos personales.
 */
function statsMiddleware(req, res, next) {
    if (!req.path.startsWith('/api/')) return next();

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const routePath = req.route?.path;
        const endpoint = routePath ? `${req.baseUrl || ''}${routePath}` : req.path;

        db.incrementStats({
            endpoint,
            method: req.method,
            statusCode: res.statusCode,
            responseTimeMs: elapsedMs
        }).catch(err => {
            console.error('⚠️ Error guardando estadísticas:', err.message);
        });
    });

    next();
}

module.exports = { statsMiddleware };
