const express = require('express');
const { buildEndpointCatalog, checkAllGetEndpoints, setEndpointEnabled } = require('../../utils/endpointStatus');
const { requireAdmin } = require('../../middlewares/requireAdmin');

const router = express.Router();

router.get('/', requireAdmin, (req, res) => {
    const endpoints = buildEndpointCatalog(req.app);
    res.json({
        status: true,
        creator: 'FamilyBot-MD',
        generatedAt: new Date().toISOString(),
        total: endpoints.length,
        endpoints
    });
});

router.get('/check', requireAdmin, async (req, res, next) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const endpoints = await checkAllGetEndpoints(req.app, baseUrl);
        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            checkedAt: new Date().toISOString(),
            total: endpoints.length,
            endpoints
        });
    } catch (error) {
        next(error);
    }
});

router.post('/toggle', requireAdmin, (req, res) => {
    const endpointPath = String(req.body?.path || '').trim();
    const enabled = req.body?.enabled === true || req.body?.enabled === 'true';
    const known = (req.app.locals.apiEndpoints || []).some((endpoint) => endpoint.path === endpointPath);

    if (!endpointPath || !known) {
        return res.status(400).json({ status: false, message: 'Endpoint no encontrado.' });
    }

    const monitoringEnabled = setEndpointEnabled(endpointPath, enabled);
    res.json({
        status: true,
        path: endpointPath,
        monitoringEnabled,
        message: monitoringEnabled ? 'Monitorización activada.' : 'Monitorización desactivada.'
    });
});

router.meta = {
    title: 'Estado de Endpoints',
    description: 'Catálogo administrativo, monitorización y control de endpoints.',
    icon: 'fas fa-heartbeat',
    method: 'GET',
    resultType: 'json',
    resultField: 'endpoints'
};

module.exports = router;
