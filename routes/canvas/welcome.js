const express = require('express');
const multer = require('multer');
const { generateWelcomeCanvas, STYLES } = require('../../services/welcomeCanvas.service');

const router = express.Router();
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE, files: 1 }, fileFilter: (req, file, cb) => {
    if (!file.mimetype || (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/octet-stream')) return cb(new Error('El avatar debe ser una imagen.'));
    cb(null, true);
} });

const text = (value, fallback, max) => {
    const valueText = String(value ?? '').trim().replace(/\s+/g, ' ');
    return (valueText || fallback).slice(0, max);
};
const param = (req, name, fallback = '') => req.body?.[name] ?? req.query?.[name] ?? fallback;
const wantsImage = req => String(req.query.format || '').toLowerCase() === 'image' || String(req.headers.accept || '').toLowerCase().includes('image/png');

router.post('/', upload.single('avatar'), async (req, res) => {
    try {
        const style = String(param(req, 'style', 'divine')).toLowerCase();
        if (!STYLES.has(style)) return res.status(400).json({ status: false, creator: 'FamilyBot-MD', message: 'Estilo no válido.', styles: [...STYLES] });
        const avatarUrl = String(param(req, 'avatarUrl', '')).trim();
        if (!req.file && !avatarUrl) return res.status(400).json({ status: false, creator: 'FamilyBot-MD', message: 'Envía avatar o avatarUrl.' });

        const image = await generateWelcomeCanvas({
            style, avatarBuffer: req.file?.buffer, avatarUrl,
            username: text(param(req, 'username'), 'Nuevo miembro', 34),
            groupName: text(param(req, 'groupName'), 'Nuestro grupo', 40),
            members: text(param(req, 'members'), '0 miembros', 12),
            message: text(param(req, 'message'), 'Bienvenido al grupo', 55),
            date: text(param(req, 'date'), new Date().toLocaleDateString('es-PE'), 24),
            title: text(param(req, 'title'), style === 'divine' ? 'WELCOME TO THE KINGDOM' : 'WELCOME', 32),
            footer: text(param(req, 'footer'), '✦ FamilyBot-MD ✦', 30)
        });

        if (wantsImage(req)) return res.status(200).type('png').set('Content-Length', String(image.length)).set('Cache-Control', 'no-store').send(image);
        return res.json({ status: true, creator: 'FamilyBot-MD', result: { url: `data:image/png;base64,${image.toString('base64')}`, format: 'png', style } });
    } catch (error) {
        console.error('[WELCOME CANVAS ERROR]', error);
        const status = /avatar|imagen|image|HTTP|URL|límite|MB|dirección local|privada|tardó demasiado|vacío/i.test(error.message || '') ? 422 : 500;
        return res.status(status).json({ status: false, creator: 'FamilyBot-MD', message: status === 422 ? error.message : 'No se pudo generar el Welcome Canvas.' });
    }
});

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) return res.status(400).json({ status: false, creator: 'FamilyBot-MD', message: error.code === 'LIMIT_FILE_SIZE' ? 'El avatar supera el límite de 4 MB.' : 'No se pudo recibir el avatar.' });
    if (error) return res.status(400).json({ status: false, creator: 'FamilyBot-MD', message: error.message || 'Archivo no válido.' });
    next();
});

router.meta = { title: 'Welcome Canvas', description: 'Genera una tarjeta de bienvenida profesional para grupos de WhatsApp.', icon: 'fas fa-crown', method: 'POST', fields: [
    { name: 'avatar', label: 'Avatar', type: 'file' }, { name: 'avatarUrl', label: 'Avatar URL', type: 'url', placeholder: 'https://...' }, { name: 'username', label: 'Usuario', type: 'text', placeholder: 'Nombre del nuevo miembro' }, { name: 'groupName', label: 'Grupo', type: 'text', placeholder: 'Nombre del grupo' }, { name: 'members', label: 'Miembros', type: 'text', placeholder: '25' }, { name: 'message', label: 'Mensaje', type: 'text', placeholder: 'Bienvenido al grupo' }, { name: 'date', label: 'Fecha', type: 'text', placeholder: '26/08/2026' }, { name: 'title', label: 'Título', type: 'text', placeholder: 'WELCOME' }, { name: 'footer', label: 'Pie', type: 'text', placeholder: '✦ FamilyBot-MD ✦' }, { name: 'style', label: 'Estilo', type: 'select', options: [...STYLES].map(v => ({ value: v, label: v })), default: 'divine' }
], resultType: 'image', resultField: 'result.url', directImage: true };
module.exports = router;
