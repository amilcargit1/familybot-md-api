const express = require('express');
const router = express.Router();

// GET /api/endpoints — lista pública de todos los endpoints protegidos disponibles
// (usada por el Dashboard para armar las tarjetas automáticamente)
router.get('/', (req, res) => {
    res.json({ status: true, endpoints: req.app.locals.apiEndpoints || [] });
});

module.exports = router;
