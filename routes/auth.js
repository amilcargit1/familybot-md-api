const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const ADMIN = require('../utils/adminConfig');
const { requireAdmin, safeCompare } = require('../middlewares/requireAdmin');

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

    // Login del administrador (comparación segura contra timing attacks)
    if (safeCompare(email, ADMIN.email) && safeCompare(password, ADMIN.password)) {
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

// ============== OLVIDÉ MI CONTRASEÑA ==============
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ status: false, message: 'Falta el correo' });

    const user = await db.findUser('email', email);
    // Por seguridad respondemos igual exista o no el correo (no revelamos si existe una cuenta con ese email)
    if (!user) {
        return res.json({ status: true, message: 'Si ese correo tiene una cuenta, se envió un link de recuperación.' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expires = Date.now() + 15 * 60 * 1000; // el link vale por 15 minutos
    await db.updateUserBy('id', user.id, { resetToken: token, resetExpires: expires });

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    let emailSent = false;

    // Envío real por correo (opcional): regístrate gratis en https://resend.com
    if (RESEND_API_KEY) {
        try {
            const emailRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: process.env.RESEND_FROM || 'FamilyBot-MD <onboarding@resend.dev>',
                    to: email,
                    subject: 'Recupera tu contraseña - FamilyBot-MD',
                    html: `<p>Hola ${user.username},</p><p>Toca este link para elegir una nueva contraseña (válido 15 minutos):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si no pediste esto, ignora este correo.</p>`
                })
            });
            emailSent = emailRes.ok;
        } catch (err) {
            console.error('Error enviando correo de recuperación:', err.message);
        }
    }

    res.json({
        status: true,
        message: emailSent
            ? 'Te enviamos un correo con el link de recuperación.'
            : 'No se pudo enviar el correo automático (o no está configurado). Usa este link directo:',
        // Solo mandamos el link directo en la respuesta si NO se pudo enviar por correo
        reset_link: emailSent ? undefined : resetUrl
    });
});

// ============== RESTABLECER CONTRASEÑA ==============
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ status: false, message: 'Faltan datos' });
    if (newPassword.length < 6) return res.status(400).json({ status: false, message: 'La contraseña debe tener al menos 6 caracteres' });

    const users = await db.getUsers();
    const user = users.find(u => u.resetToken === token);

    if (!user) return res.status(400).json({ status: false, message: 'Link inválido o ya usado' });
    if (!user.resetExpires || Date.now() > user.resetExpires) {
        return res.status(400).json({ status: false, message: 'Este link expiró. Solicita uno nuevo desde "Olvidé mi contraseña".' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.updateUserBy('id', user.id, { password: hashedPassword, resetToken: null, resetExpires: null });

    res.json({ status: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
});

// ============== TOP 5 USUARIOS (leaderboard) ==============
router.get('/leaderboard', async (req, res) => {
    const users = await db.getUsers();
    const top = users
        .filter(u => (u.totalRequest || 0) > 0)
        .sort((a, b) => (b.totalRequest || 0) - (a.totalRequest || 0))
        .slice(0, 5)
        .map(u => ({ username: u.username, totalRequest: u.totalRequest || 0 }));

    res.json({ status: true, leaderboard: top });
});

// ============== ADMIN: CREAR CÓDIGO ==============
router.post('/admin/create-code', requireAdmin, async (req, res) => {
    const { code, requests, maxUses } = req.body;
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
router.get('/admin/all', requireAdmin, async (req, res) => {
    const allUsers = await db.getUsers();
    const users = allUsers.map(({ password, resetToken, ...safe }) => safe);
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
router.post('/admin/set-role', requireAdmin, async (req, res) => {
    const { email, plan, limit } = req.body;

    const user = await db.findUser('email', email);
    if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado' });

    const updates = {};
    if (plan) updates.plan = plan;
    if (limit) updates.limit = parseInt(limit);
    await db.updateUserBy('id', user.id, updates);

    res.json({ status: true, message: 'Usuario actualizado' });
});

// ============== ADMIN: ELIMINAR USUARIO ==============
router.post('/admin/delete', requireAdmin, async (req, res) => {
    const { email } = req.body;

    const allUsers = await db.getUsers();
    const users = allUsers.filter(u => u.email !== email);
    await db.saveUsers(users);
    res.json({ status: true, message: 'Usuario eliminado' });
});

// ============== ADMIN: ELIMINAR CÓDIGO ==============
router.post('/admin/delete-code', requireAdmin, async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ status: false, message: 'Falta el código' });

    const normalized = code.trim().toUpperCase();
    const codes = await db.getCodes();
    const filtered = codes.filter(c => c.code !== normalized);

    if (filtered.length === codes.length) {
        return res.status(404).json({ status: false, message: 'Código no encontrado' });
    }

    await db.saveCodes(filtered);
    res.json({ status: true, message: 'Código eliminado' });
});

module.exports = router;
