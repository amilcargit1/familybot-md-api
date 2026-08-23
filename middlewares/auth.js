const db = require('../db');

const ADMIN_KEY = process.env.ADMIN_KEY || 'familybot-md';

// Middleware que valida la apiKey, cuenta la solicitud y controla el límite diario
async function authHandler(req, res, next) {
    const { apiKey } = req.query;

    if (!apiKey) {
        return res.status(401).json({ status: false, message: 'API Key requerida (usa ?apiKey=TU_KEY)' });
    }

    if (apiKey === ADMIN_KEY) {
        req.user = { role: 'admin', plan: 'ADMIN VIP' };
        return next();
    }

    try {
        let user = await db.findUser('key', apiKey);
        if (!user) {
            return res.status(401).json({ status: false, message: 'API Key inválida' });
        }

        const today = new Date().toISOString().split('T')[0];
        if ((user.requestToday || 0) >= (user.limit || 100) && user.lastRequestDate === today) {
            return res.status(429).json({
                status: false,
                message: `Límite diario alcanzado (${user.limit}). Vuelve mañana o mejora tu plan.`
            });
        }

        user = await db.registerRequest(user);
        req.user = user;
        next();
    } catch (err) {
        console.error('Error en authHandler:', err);
        res.status(500).json({ status: false, message: 'Error interno del servidor' });
    }
}

module.exports = { authHandler };
