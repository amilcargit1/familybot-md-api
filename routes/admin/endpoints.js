const express = require('express');
const { buildEndpointCatalog, checkAllGetEndpoints } = require('../../utils/endpointStatus');

const router = express.Router();

// loadRoutes ya aplica authHandler a todo /api/admin/*.
// Aquí solo comprobamos que la credencial autenticada tenga rol admin.
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            status: false,
            message: 'Acceso restringido a administradores.'
        });
    }
    next();
}

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

router.meta = {
    title: 'Estado de Endpoints',
    description: 'Catálogo administrativo de endpoints y comprobación segura de rutas GET.',
    icon: 'fas fa-heartbeat',
    method: 'GET',
    resultType: 'json',
    resultField: 'endpoints'
};

module.exports = router;
