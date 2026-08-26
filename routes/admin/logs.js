const express = require('express');
const { requireAdmin } = require('../../middlewares/requireAdmin');
const { getStats } = require('../../db');

const router = express.Router();

function clean(value, max = 120) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

router.get('/', requireAdmin, async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 50);
        const endpoint = clean(req.query.endpoint);
        const method = clean(req.query.method, 10).toUpperCase();
        const status = Number(req.query.status);

        const stats = await getStats({ days: 31 });
        let logs = Array.isArray(stats.recentRequests) ? stats.recentRequests : [];

        if (endpoint) logs = logs.filter(log => String(log.endpoint || '').includes(endpoint));
        if (method) logs = logs.filter(log => String(log.method || '').toUpperCase() === method);
        if (Number.isInteger(status) && status >= 100 && status <= 599) {
            logs = logs.filter(log => Number(log.statusCode) === status);
        }

        logs = logs.slice(0, limit).map(log => ({
            timestamp: log.timestamp || null,
            method: String(log.method || 'GET').slice(0, 10),
            endpoint: String(log.endpoint || 'unknown').slice(0, 200),
            statusCode: Number(log.statusCode) || 500,
            responseTimeMs: Math.max(0, Number(log.responseTimeMs) || 0)
        }));

        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            total: logs.length,
            limit,
            filters: { endpoint: endpoint || null, method: method || null, status: Number.isInteger(status) ? status : null },
            logs
        });
    } catch (error) {
        next(error);
    }
});

router.meta = {
    title: 'Logs de solicitudes',
    description: 'Últimas solicitudes de la API, sin API keys, IPs ni datos personales.',
    icon: 'fas fa-list-alt',
    method: 'GET',
    resultType: 'json',
    resultField: 'logs'
};

module.exports = router;
