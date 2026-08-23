const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// ============== IDENTIDAD DEL ADMINISTRADOR ==============
// Se puede sobreescribir con variables de entorno en Render (ADMIN_EMAIL, etc).
// Si no se definen, se usan estos valores por defecto.
const ADMIN = {
    username: process.env.ADMIN_USERNAME || 'FamilyBot-MD',
    email: process.env.ADMIN_EMAIL || 'amilkarurquiagaramos1@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'AmilcarGit',
    key: process.env.ADMIN_KEY || 'familybot-md'
};

// ============== REGISTRO ==============
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ status: false, message: 'Faltan datos: username, email, password' });
    }

    const exists = (await db.findUser('email', email)) || (await db.findUser('username', username));
    if (exists) {
        return res.status(400).json({ status: false, message: 'Ese usuario o correo ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.createUser({ username, email, password: hashedPassword });

    res.json({ status: true, message: 'Registro exitoso', key: newUser.key });
});

// ============== LOGIN ==============
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: false, message: 'Faltan datos: email, password' });
    }

    // Login del administrador
    if (email === ADMIN.email && password === ADMIN.password) {
        return res.json({
            status: true,
            data: { username: ADMIN.username, email: ADMIN.email, key: ADMIN.key, plan: 'ADMIN VIP', role: 'admin' }
        });
    }

    const user = await db.findUser('email', email);
    if (!user) {
        return res.status(401).json({ status: false, message: 'Credenciales incorrectas' });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
        return res.status(401).json({ status: false, message: 'Credenciales incorrectas' });
    }

    res.json({
        status: true,
        data: { username: user.username, email: user.email, key: user.key, plan: user.plan, role: 'user' }
    });
});

// ============== MI PERFIL (usado por el dashboard para mostrar solicitudes) ==============
router.get('/me', async (req, res) => {
    const { apiKey } = req.query;
    if (!apiKey) return res.status(400).json({ status: false, message: 'ApiKey requerida' });

    const user = await db.findUser('key', apiKey);
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

// ============== ACTUALIZAR PERFIL (username / password) ==============
router.post('/update-profile', async (req, res) => {
    const { apiKey, username, password } = req.body;
    if (!apiKey) return res.status(400).json({ status: false, message: 'ApiKey requerida' });

    const user = await db.findUser('key', apiKey);
    if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado' });

    const updates = {};
    if (username && username.trim()) updates.username = username.trim();
    if (password && password.trim()) updates.password = await bcrypt.hash(password.trim(), 10);

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ status: false, message: 'No enviaste ningún cambio' });
    }

    await db.updateUserBy('id', user.id, updates);
    res.json({ status: true, message: 'Perfil actualizado correctamente' });
});

// ============== ESTADÍSTICAS GLOBALES (para la portada) ==============
router.get('/stats', async (req, res) => {
    res.json({ status: true, users: await db.countUsers(), endpoints: 9 });
});

// ============== CANJEAR CÓDIGO ==============
router.post('/redeem', async (req, res) => {
    const { apiKey, code } = req.body;
    if (!apiKey || !code) {
        return res.status(400).json({ status: false, message: 'Faltan datos: apiKey, code' });
    }

    const user = await db.findUser('key', apiKey);
    if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado' });

    const normalized = code.trim().toUpperCase();
    const codes = await db.getCodes();
    const found = codes.find(c => c.code === normalized);

    if (!found) return res.status(404).json({ status: false, message: 'Código no válido' });
    if (!found.active) return res.status(400).json({ status: false, message: 'Este código ya no está activo' });
    if (found.uses >= found.maxUses) return res.status(400).json({ status: false, message: 'Este código ya alcanzó su límite de usos' });
    if (found.usedBy.includes(user.email)) return res.status(400).json({ status: false, message: 'Ya canjeaste este código antes' });

    const newLimit = (user.limit || 100) + found.requests;
    await db.updateUserBy('id', user.id, { limit: newLimit });

    found.uses += 1;
    found.usedBy.push(user.email);
    if (found.uses >= found.maxUses) found.active = false;
    await db.saveCodes(codes);

    res.json({
        status: true,
        message: `¡Código canjeado! +${found.requests} solicitudes agregadas`,
        new_limit: newLimit
    });
});

// ============== ADMIN: CREAR CÓDIGO ==============
router.post('/admin/create-code', async (req, res) => {
    const { adminKey, code, requests, maxUses } = req.body;

    if (adminKey !== ADMIN.key) return res.status(403).json({ status: false, message: 'No autorizado' });
    if (!code || !requests || !maxUses) return res.status(400).json({ status: false, message: 'Faltan datos' });

    const normalized = code.trim().toUpperCase();
    const codes = await db.getCodes();
    if (codes.find(c => c.code === normalized)) {
        return res.status(400).json({ status: false, message: 'Ese código ya existe' });
    }

    codes.push({
        code: normalized,
        requests: parseInt(requests),
        maxUses: parseInt(maxUses),
        uses: 0,
        usedBy: [],
        active: true,
        createdAt: new Date().toISOString()
    });
    await db.saveCodes(codes);

    res.json({ status: true, message: 'Código creado', code: normalized });
});

// ============== ADMIN: VER TODOS LOS USUARIOS Y CÓDIGOS ==============
router.get('/admin/all', async (req, res) => {
    const { apiKey } = req.query;
    if (apiKey !== ADMIN.key) return res.status(403).json({ status: false, message: 'No autorizado' });

    const allUsers = await db.getUsers();
    const users = allUsers.map(({ password, ...safe }) => safe);
    const codes = await db.getCodes();

    res.json({
        status: true,
        totalUsers: users.length,
        totalCodes: codes.filter(c => c.active).length,
        users,
        codes
    });
});

// ============== ADMIN: CAMBIAR PLAN/ROL DE UN USUARIO ==============
router.post('/admin/set-role', async (req, res) => {
    const { adminKey, email, plan, limit } = req.body;
    if (adminKey !== ADMIN.key) return res.status(403).json({ status: false, message: 'No autorizado' });

    const user = await db.findUser('email', email);
    if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado' });

    const updates = {};
    if (plan) updates.plan = plan;
    if (limit) updates.limit = parseInt(limit);
    await db.updateUserBy('id', user.id, updates);

    res.json({ status: true, message: 'Usuario actualizado' });
});

// ============== ADMIN: ELIMINAR USUARIO ==============
router.post('/admin/delete', async (req, res) => {
    const { adminKey, email } = req.body;
    if (adminKey !== ADMIN.key) return res.status(403).json({ status: false, message: 'No autorizado' });

    const allUsers = await db.getUsers();
    const users = allUsers.filter(u => u.email !== email);
    await db.saveUsers(users);
    res.json({ status: true, message: 'Usuario eliminado' });
});

module.exports = router;
