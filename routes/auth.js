const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const ADMIN = require('../utils/adminConfig');
const { requireAdmin } = require('../middlewares/requireAdmin');
const authService = require('../services/auth.service');
const statsService = require('../services/stats.service');
const bcrypt = require('bcryptjs');

// Registro
router.post('/register', async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            const error = new Error('Faltan datos: username, email, password');
            error.statusCode = 400;
            throw error;
        }
        const data = await authService.register({ username, email, password });
        res.json({ status: true, message: 'Registro exitoso', key: data.key });
    } catch (err) { next(err); }
});

// Login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            const error = new Error('Faltan datos: email, password');
            error.statusCode = 400;
            throw error;
        }
        const data = await authService.login({ email, password });
        res.json({ status: true, data });
    } catch (err) { next(err); }
});

// Mi perfil
router.get('/me', async (req, res, next) => {
    try {
        const { apiKey } = req.query;
        if (!apiKey) return res.status(400).json({ status: false, message: 'ApiKey requerida' });
        const user = await db.findUser('key', apiKey);
        if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado' });
        const today = new Date().toISOString().split('T')[0];
        const requestToday = user.lastRequestDate === today ? user.requestToday : 0;
        res.json({ status: true, data: { username: user.username, email: user.email, plan: user.plan, requests: { today: requestToday, total: user.totalRequest || 0, limit: user.limit || 100, remaining: (user.limit || 100) - requestToday } } });
    } catch (err) { next(err); }
});

// Actualizar perfil
router.post('/update-profile', async (req, res, next) => {
    try {
        const { apiKey, username, password } = req.body;
        if (!apiKey) return res.status(400).json({ status: false, message: 'ApiKey requerida' });
        const user = await db.findUser('key', apiKey);
        if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado' });
        const updates = {};
        if (username && username.trim()) updates.username = username.trim();
        if (password && password.trim()) updates.password = await bcrypt.hash(password.trim(), 10);
        if (!Object.keys(updates).length) return res.status(400).json({ status: false, message: 'No enviaste ningún cambio' });
        await db.updateUserBy('id', user.id, updates);
        res.json({ status: true, message: 'Perfil actualizado correctamente' });
    } catch (err) { next(err); }
});

// Estadísticas globales
router.get('/stats', async (req, res, next) => {
    try {
        const data = await statsService.getDashboardStats(req.app.locals.apiEndpoints);
        res.json(data);
    } catch (err) { next(err); }
});

// Canjear código
router.post('/redeem', async (req, res, next) => {
    try {
        const { apiKey, code } = req.body;
        if (!apiKey || !code) return res.status(400).json({ status: false, message: 'Faltan datos: apiKey, code' });
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
        res.json({ status: true, message: `¡Código canjeado! +${found.requests} solicitudes agregadas`, new_limit: newLimit });
    } catch (err) { next(err); }
});

// Recuperación de contraseña
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ status: false, message: 'Falta el correo' });
        const user = await db.findUser('email', email);
        if (!user) return res.json({ status: true, message: 'Si ese correo tiene una cuenta, se envió un link de recuperación.' });
        const token = crypto.randomBytes(24).toString('hex');
        const expires = Date.now() + 15 * 60 * 1000;
        await db.updateUserBy('id', user.id, { resetToken: token, resetExpires: expires });
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        let emailSent = false;
        if (RESEND_API_KEY) {
            try {
                const emailRes = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM || 'FamilyBot-MD <onboarding@resend.dev>', to: email, subject: 'Recupera tu contraseña - FamilyBot-MD', html: `<p>Hola ${user.username},</p><p>Toca este link para elegir una nueva contraseña (válido 15 minutos):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si no pediste esto, ignora este correo.</p>` }) });
                emailSent = emailRes.ok;
            } catch (err) { console.error('Error enviando correo de recuperación:', err.message); }
        }
        res.json({ status: true, message: emailSent ? 'Te enviamos un correo con el link de recuperación.' : 'No se pudo enviar el correo automático (o no está configurado). Usa este link directo:', reset_link: emailSent ? undefined : resetUrl });
    } catch (err) { next(err); }
});

router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ status: false, message: 'Faltan datos' });
        if (newPassword.length < 6) return res.status(400).json({ status: false, message: 'La contraseña debe tener al menos 6 caracteres' });
        const users = await db.getUsers();
        const user = users.find(u => u.resetToken === token);
        if (!user) return res.status(400).json({ status: false, message: 'Link inválido o ya usado' });
        if (!user.resetExpires || Date.now() > user.resetExpires) return res.status(400).json({ status: false, message: 'Este link expiró. Solicita uno nuevo desde "Olvidé mi contraseña".' });
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.updateUserBy('id', user.id, { password: hashedPassword, resetToken: null, resetExpires: null });
        res.json({ status: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
    } catch (err) { next(err); }
});

router.get('/leaderboard', async (req, res, next) => {
    try {
        const users = await db.getUsers();
        const top = users.filter(u => (u.totalRequest || 0) > 0).sort((a, b) => (b.totalRequest || 0) - (a.totalRequest || 0)).slice(0, 5).map(u => ({ username: u.username, totalRequest: u.totalRequest || 0 }));
        res.json({ status: true, leaderboard: top });
    } catch (err) { next(err); }
});

// Admin
router.post('/admin/create-code', requireAdmin, async (req, res, next) => {
    try {
        const { code, requests, maxUses } = req.body;
        if (!code || !requests || !maxUses) return res.status(400).json({ status: false, message: 'Faltan datos' });
        const normalized = code.trim().toUpperCase();
        const codes = await db.getCodes();
        if (codes.find(c => c.code === normalized)) return res.status(400).json({ status: false, message: 'Ese código ya existe' });
        codes.push({ code: normalized, requests: parseInt(requests), maxUses: parseInt(maxUses), uses: 0, usedBy: [], active: true, createdAt: new Date().toISOString() });
        await db.saveCodes(codes);
        res.json({ status: true, message: 'Código creado', code: normalized });
    } catch (err) { next(err); }
});

router.get('/admin/all', requireAdmin, async (req, res, next) => {
    try {
        const allUsers = await db.getUsers();
        const users = allUsers.map(({ password, resetToken, ...safe }) => safe);
        const codes = await db.getCodes();
        res.json({ status: true, totalUsers: users.length, totalCodes: codes.filter(c => c.active).length, users, codes });
    } catch (err) { next(err); }
});

router.post('/admin/set-role', requireAdmin, async (req, res, next) => {
    try {
        const { email, plan, limit } = req.body;
        const user = await db.findUser('email', email);
        if (!user) return res.status(404).json({ status: false, message: 'Usuario no encontrado' });
        const updates = {};
        if (plan) updates.plan = plan;
        if (limit) updates.limit = parseInt(limit);
        await db.updateUserBy('id', user.id, updates);
        res.json({ status: true, message: 'Usuario actualizado' });
    } catch (err) { next(err); }
});

router.post('/admin/delete', requireAdmin, async (req, res, next) => {
    try {
        const { email } = req.body;
        const allUsers = await db.getUsers();
        await db.saveUsers(allUsers.filter(u => u.email !== email));
        res.json({ status: true, message: 'Usuario eliminado' });
    } catch (err) { next(err); }
});

router.post('/admin/delete-code', requireAdmin, async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ status: false, message: 'Falta el código' });
        const normalized = code.trim().toUpperCase();
        const codes = await db.getCodes();
        const filtered = codes.filter(c => c.code !== normalized);
        if (filtered.length === codes.length) return res.status(404).json({ status: false, message: 'Código no encontrado' });
        await db.saveCodes(filtered);
        res.json({ status: true, message: 'Código eliminado' });
    } catch (err) { next(err); }
});

module.exports = router;
