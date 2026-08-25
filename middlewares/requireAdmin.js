const crypto = require('crypto');
const ADMIN = require('../utils/adminConfig');

// Compara dos strings sin filtrar información por tiempo de respuesta
// (una comparación normal con === es vulnerable a "timing attacks")
function safeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

// Middleware para proteger rutas de admin. Acepta la key por query (?apiKey=)
// o por body (adminKey), según cómo la mande cada ruta.
function requireAdmin(req, res, next) {
    const providedKey = req.query.apiKey || req.body?.adminKey;

    if (!providedKey || !safeCompare(providedKey, ADMIN.key)) {
        return res.status(403).json({ status: false, message: 'No autorizado' });
    }

    next();
}

module.exports = { requireAdmin, safeCompare };
