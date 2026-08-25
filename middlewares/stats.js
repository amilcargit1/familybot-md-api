const db = require('../db');

/**
 * Registra métricas de las solicitudes de la API sin bloquear la respuesta.
 * Las escrituras se realizan cuando Express termina de enviar la respuesta.
 */
function statsMiddleware(req, res, next) {
    if (!req.path.startsWith('/api/')) return next();

    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        const routePath = req.route?.path;
        const endpoint = routePath
            ? `${req.baseUrl || ''}${routePath}`
            : req.path;

        db.incrementStats({
            endpoint,
            statusCode: res.statusCode,
            responseTimeMs: elapsedMs
        }).catch(err => {
            // Las estadísticas nunca deben tumbar una solicitud de la API.
            console.error('⚠️ Error guardando estadísticas:', err.message);
        });
    });

    next();
}

module.exports = { statsMiddleware };
