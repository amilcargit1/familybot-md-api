const db = require('../db');

const ADMIN_KEY = process.env.ADMIN_KEY || 'familybot-md';

// Middleware que valida la apiKey, cuenta la solicitud y controla el límite diario
function authHandler(req, res, next) {
    const { apiKey } = req.query;

    if (!apiKey) {
        return res.status(401).json({ status: false, message: 'API Key requerida (usa ?apiKey=TU_KEY)' });
    }

    if (apiKey === ADMIN_KEY) {
        req.user = { role: 'admin', plan: 'ADMIN VIP' };
        return next();
    }

    let user = db.findUser('key', apiKey);
    if (!user) {
        return res.status(401).json({ status: false, message: 'API Key inválida' });
    }

    if ((user.requestToday || 0) >= (user.limit || 100) && user.lastRequestDate === new Date().toISOString().split('T')[0]) {
        return res.status(429).json({
            status: false,
            message: `Límite diario alcanzado (${user.limit}). Vuelve mañana o mejora tu plan.`
        });
    }

    // Sumar la solicitud (esto también resetea el contador si cambió el día)
    user = db.registerRequest(user);
    req.user = user;
    next();
}

module.exports = { authHandler };