const express = require('express');
const { requireAdmin } = require('../../middlewares/auth');
const { buildEndpointCatalog } = require('../../utils/endpointStatus');

const router = express.Router();

router.get('/', requireAdmin, (req, res) => {
    const endpoints = buildEndpointCatalog(req.app);
    const counts = endpoints.reduce((acc, endpoint) => {
        acc.total += 1;
        if (endpoint.status === 'available') acc.available += 1;
        else if (endpoint.status === 'error') acc.errors += 1;
        else acc.partial += 1;
        return acc;
    }, { total: 0, available: 0, partial: 0, errors: 0 });

    res.json({
        status: true,
        creator: 'FamilyBot-MD',
        generatedAt: new Date().toISOString(),
        endpoints: counts,
        note: 'El estado de funcionamiento real requiere una comprobación. Los endpoints con datos de entrada no se ejecutan automáticamente.'
    });
});

router.meta = {
    title: 'Resumen Admin',
    description: 'Resumen seguro del estado y cantidad de endpoints descubiertos.',
    icon: 'fas fa-chart-pie',
    method: 'GET',
    resultType: 'json',
    resultField: 'endpoints'
};

module.exports = router;
