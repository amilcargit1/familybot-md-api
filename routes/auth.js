const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// ============== REGISTRO ==============
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ status: false, message: 'Faltan datos: username, email, password' });
    }

    const exists = db.findUser('email', email) || db.findUser('username', username);
    if (exists) {
        return res.status(400).json({ status: false, message: 'Ese usuario o correo ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = db.createUser({ username, email, password: hashedPassword });

    res.json({ status: true, message: 'Registro exitoso', key: newUser.key });
});

// ============== LOGIN ==============
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: false, message: 'Faltan datos: email, password' });
    }

    const user = db.findUser('email', email);
    if (!user) {
        return res.status(401).json({ status: false, message: 'Credenciales incorrectas' });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
        return res.status(401).json({ status: false, message: 'Credenciales incorrectas' });
    }

    res.json({
        status: true,
        data: { username: user.username, email: user.email, key: user.key, plan: user.plan }
    });
});

// ============== MI PERFIL (usado por el dashboard para mostrar solicitudes) ==============
router.get('/me', (req, res) => {
    const { apiKey } = req.query;
    if (!apiKey) return res.status(400).json({ status: false, message: 'ApiKey requerida' });

    const user = db.findUser('key', apiKey);
    if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado' });

    const today = new Date().toISOString().split('T')[0];
    const requestToday = user.lastRequestDate === today ? user.requestToday : 0;

    res.json({
        status: true,
        data: {
            username: user.username,
            email: user.email,
            plan: user.plan,
            requests: {
                today: requestToday,
                total: user.totalRequest || 0,
                limit: user.limit || 100,
                remaining: (user.limit || 100) - requestToday
            }
        }
    });
});

// ============== ESTADÍSTICAS GLOBALES (para la portada) ==============
router.get('/stats', (req, res) => {
    res.json({ status: true, users: db.countUsers(), endpoints: 2 });
});

module.exports = router;
