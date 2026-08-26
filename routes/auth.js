const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireAdmin } = require('../middlewares/requireAdmin');
const authService = require('../services/auth.service');
const statsService = require('../services/stats.service');
const bcrypt = require('bcryptjs');
const { success, failure } = require('../utils/response');
const { required, string } = require('../utils/validation');

router.post('/register', async (req, res, next) => {
    try {
        required(req.body, ['username', 'email', 'password']);
        const username = string(req.body.username, 'username', { min: 2, max: 50 });
        const email = string(req.body.email, 'email', { min: 3, max: 254 }).toLowerCase();
        const password = string(req.body.password, 'password', { min: 6, max: 128 });
        const data = await authService.register({ username, email, password });
        return res.json({ status: true, message: 'Registro exitoso', key: data.key });
    } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
    try {
        required(req.body, ['email', 'password']);
        const email = string(req.body.email, 'email', { min: 3, max: 254 }).toLowerCase();
        const password = string(req.body.password, 'password', { min: 6, max: 128 });
        const data = await authService.login({ email, password });
        return res.json({ status: true, data });
    } catch (err) { next(err); }
});

router.get('/me', async (req, res, next) => {
    try {
        const apiKey = string(req.query.apiKey, 'apiKey', { min: 1, max: 512 });
        const user = await db.findUser('key', apiKey);
        if (!user) return failure(res, 'Usuario no encontrado', 404);
        const today = new Date().toISOString().split('T')[0];
        const requestToday = user.lastRequestDate === today ? user.requestToday : 0;
        return success(res, { username: user.username, email: user.email, plan: user.plan, requests: { today: requestToday, total: user.totalRequest || 0, limit: user.limit || 100, remaining: (user.limit || 100) - requestToday } });
    } catch (err) { next(err); }
});

router.post('/update-profile', async (req, res, next) => {
    try {
        required(req.body, ['apiKey']);
        const apiKey = string(req.body.apiKey, 'apiKey', { min: 1, max: 512 });
        const user = await db.findUser('key', apiKey);
        if (!user) return failure(res, 'Usuario no encontrado', 404);
        const updates = {};
        if (req.body.username?.trim()) updates.username = string(req.body.username, 'username', { min: 2, max: 50 });
        if (req.body.password?.trim()) updates.password = await bcrypt.hash(string(req.body.password, 'password', { min: 6, max: 128 }), 10);
        if (!Object.keys(updates).length) return failure(res, 'No enviaste ningún cambio');
        await db.updateUserBy('id', user.id, updates);
        return success(res, undefined, 'Perfil actualizado correctamente');
    } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
    try { return res.json(await statsService.getDashboardStats(req.app.locals.apiEndpoints)); }
    catch (err) { next(err); }
});

router.post('/redeem', async (req, res, next) => {
    try {
        required(req.body, ['apiKey', 'code']);
        const apiKey = string(req.body.apiKey, 'apiKey', { min: 1, max: 512 });
        const code = string(req.body.code, 'code', { min: 1, max: 100 }).toUpperCase();
        const user = await db.findUser('key', apiKey);
        if (!user) return failure(res, 'Usuario no encontrado', 404);
        const codes = await db.getCodes();
        const found = codes.find(c => c.code === code);
        if (!found) return failure(res, 'Código no válido', 404);
        if (!found.active) return failure(res, 'Este código ya no está activo');
        if (found.uses >= found.maxUses) return failure(res, 'Este código ya alcanzó su límite de usos');
        if (found.usedBy.includes(user.email)) return failure(res, 'Ya canjeaste este código antes');
        const newLimit = (user.limit || 100) + found.requests;
        await db.updateUserBy('id', user.id, { limit: newLimit });
        found.uses += 1;
        found.usedBy.push(user.email);
        if (found.uses >= found.maxUses) found.active = false;
        await db.saveCodes(codes);
        return success(res, { new_limit: newLimit }, `¡Código canjeado! +${found.requests} solicitudes agregadas`);
    } catch (err) { next(err); }
});

router.post('/forgot-password', async (req, res, next) => {
    try {
        const email = string(req.body?.email, 'email', { min: 3, max: 254 }).toLowerCase();
        const user = await db.findUser('email', email);
        if (!user) return success(res, undefined, 'Si ese correo tiene una cuenta, se envió un link de recuperación.');
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
        return res.json({ status: true, message: emailSent ? 'Te enviamos un correo con el link de recuperación.' : 'No se pudo enviar el correo automático (o no está configurado). Usa este link directo:', reset_link: emailSent ? undefined : resetUrl });
    } catch (err) { next(err); }
});

router.post('/reset-password', async (req, res, next) => {
    try {
        required(req.body, ['token', 'newPassword']);
        const token = string(req.body.token, 'token', { min: 1, max: 256 });
        const newPassword = string(req.body.newPassword, 'newPassword', { min: 6, max: 128 });
        const users = await db.getUsers();
        const user = users.find(u => u.resetToken === token);
        if (!user) return failure(res, 'Link inválido o ya usado');
        if (!user.resetExpires || Date.now() > user.resetExpires) return failure(res, 'Este link expiró. Solicita uno nuevo desde "Olvidé mi contraseña".');
        await db.updateUserBy('id', user.id, { password: await bcrypt.hash(newPassword, 10), resetToken: null, resetExpires: null });
        return success(res, undefined, 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
    } catch (err) { next(err); }
});

router.get('/leaderboard', async (req, res, next) => {
    try {
        const users = await db.getUsers();
        const top = users.filter(u => (u.totalRequest || 0) > 0).sort((a, b) => (b.totalRequest || 0) - (a.totalRequest || 0)).slice(0, 5).map(u => ({ username: u.username, totalRequest: u.totalRequest || 0 }));
        return success(res, top, 'OK');
    } catch (err) { next(err); }
});

router.post('/admin/create-code', requireAdmin, async (req, res, next) => {
    try {
        required(req.body, ['code', 'requests', 'maxUses']);
        const normalized = string(req.body.code, 'code', { min: 1, max: 100 }).toUpperCase();
        const requests = Number(req.body.requests), maxUses = Number(req.body.maxUses);
        if (!Number.isSafeInteger(requests) || requests < 1 || !Number.isSafeInteger(maxUses) || maxUses < 1) return failure(res, 'requests y maxUses deben ser enteros positivos');
        const codes = await db.getCodes();
        if (codes.find(c => c.code === normalized)) return failure(res, 'Ese código ya existe');
        codes.push({ code: normalized, requests, maxUses, uses: 0, usedBy: [], active: true, createdAt: new Date().toISOString() });
        await db.saveCodes(codes);
        return success(res, { code: normalized }, 'Código creado');
    } catch (err) { next(err); }
});

router.get('/admin/all', requireAdmin, async (req, res, next) => {
    try {
        const allUsers = await db.getUsers();
        const users = allUsers.map(({ password, resetToken, ...safe }) => safe);
        const codes = await db.getCodes();
        return res.json({ status: true, totalUsers: users.length, totalCodes: codes.filter(c => c.active).length, users, codes });
    } catch (err) { next(err); }
});

router.post('/admin/set-role', requireAdmin, async (req, res, next) => {
    try {
        const email = string(req.body?.email, 'email', { min: 3, max: 254 }).toLowerCase();
        const user = await db.findUser('email', email);
        if (!user) return failure(res, 'Usuario no encontrado', 404);
        const updates = {};
        if (req.body.plan) updates.plan = string(req.body.plan, 'plan', { min: 1, max: 50 });
        if (req.body.limit !== undefined) {
            const limit = Number(req.body.limit);
            if (!Number.isSafeInteger(limit) || limit < 1) return failure(res, 'limit debe ser un entero positivo');
            updates.limit = limit;
        }
        await db.updateUserBy('id', user.id, updates);
        return success(res, undefined, 'Usuario actualizado');
    } catch (err) { next(err); }
});

router.post('/admin/delete', requireAdmin, async (req, res, next) => {
    try {
        const email = string(req.body?.email, 'email', { min: 3, max: 254 }).toLowerCase();
        const allUsers = await db.getUsers();
        await db.saveUsers(allUsers.filter(u => u.email !== email));
        return success(res, undefined, 'Usuario eliminado');
    } catch (err) { next(err); }
});

router.post('/admin/delete-code', requireAdmin, async (req, res, next) => {
    try {
        const normalized = string(req.body?.code, 'code', { min: 1, max: 100 }).toUpperCase();
        const codes = await db.getCodes();
        const filtered = codes.filter(c => c.code !== normalized);
        if (filtered.length === codes.length) return failure(res, 'Código no encontrado', 404);
        await db.saveCodes(filtered);
        return success(res, undefined, 'Código eliminado');
    } catch (err) { next(err); }
});

module.exports = router;
