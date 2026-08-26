const express = require('express');
const multer = require('multer');
const { generateWelcomeCanvas, STYLES } = require('../../services/welcomeCanvas.service');

const router = express.Router();
const MAX_FILE_SIZE = 4 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('El avatar debe ser una imagen.'));
        }
        cb(null, true);
    }
});

function text(value, fallback, max) {
    const valueText = String(value ?? '').trim();
    return (valueText || fallback).slice(0, max);
}

router.post('/', upload.single('avatar'), async (req, res) => {
    try {
        const style = String(req.body.style || 'divine').toLowerCase();
        if (!STYLES.has(style)) {
            return res.status(400).json({
                status: false,
                creator: 'FamilyBot-MD',
                message: 'Estilo no válido.',
                styles: [...STYLES]
            });
        }

        if (!req.file && !req.body.avatarUrl) {
            return res.status(400).json({
                status: false,
                creator: 'FamilyBot-MD',
                message: 'Envía el avatar como archivo "avatar" o proporciona "avatarUrl".'
            });
        }

        const image = await generateWelcomeCanvas({
            style,
            avatarBuffer: req.file?.buffer,
            avatarUrl: req.body.avatarUrl,
            username: text(req.body.username, 'Nuevo miembro', 34),
            groupName: text(req.body.groupName, 'Nuestro grupo', 40),
            members: text(req.body.members, '0', 12),
            message: text(req.body.message, 'Bienvenido al grupo', 55),
            date: text(req.body.date, new Date().toLocaleDateString('es-PE'), 24)
        });

        if (String(req.query.format || '').toLowerCase() === 'image') {
            return res.status(200)
                .type('png')
                .set('Cache-Control', 'no-store')
                .send(image);
        }

        return res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: {
                url: `data:image/png;base64,${image.toString('base64')}`,
                format: 'png',
                style
            }
        });
    } catch (error) {
        console.error('[WELCOME CANVAS ERROR]', error);
        const status = /avatar|imagen|image|HTTP|URL|límite|MB/i.test(error.message || '') ? 422 : 500;
        return res.status(status).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: status === 422 ? error.message : 'No se pudo generar el Welcome Canvas.'
        });
    }
});

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'El avatar supera el límite de 4 MB.'
            : 'No se pudo recibir el avatar.';
        return res.status(400).json({ status: false, creator: 'FamilyBot-MD', message });
    }
    if (error) return res.status(400).json({ status: false, creator: 'FamilyBot-MD', message: error.message || 'Archivo no válido.' });
    next();
});

router.meta = {
    title: 'Welcome Canvas',
    description: 'Genera una tarjeta de bienvenida profesional para grupos de WhatsApp.',
    icon: 'fas fa-crown',
    method: 'POST',
    fields: [
        { name: 'avatar', label: 'Avatar', type: 'file' },
        { name: 'avatarUrl', label: 'Avatar URL', type: 'url', placeholder: 'https://...' },
        { name: 'username', label: 'Usuario', type: 'text', placeholder: 'Nombre del nuevo miembro' },
        { name: 'groupName', label: 'Grupo', type: 'text', placeholder: 'Nombre del grupo' },
        { name: 'members', label: 'Miembros', type: 'text', placeholder: '123' },
        { name: 'message', label: 'Mensaje', type: 'text', placeholder: 'Bienvenido al grupo' },
        { name: 'date', label: 'Fecha', type: 'text', placeholder: 'Opcional' },
        {
            name: 'style',
            label: 'Estilo',
            type: 'select',
            options: [
                { value: 'divine', label: 'Divine' },
                { value: 'royal', label: 'Royal' },
                { value: 'neon', label: 'Neon' },
                { value: 'galaxy', label: 'Galaxy' },
                { value: 'dark', label: 'Dark' }
            ],
            default: 'divine'
        }
    ],
    resultType: 'image',
    resultField: 'result.url',
    example: {
        method: 'POST',
        path: '/api/canvas/welcome?apiKey=TU_KEY&format=image',
        contentType: 'multipart/form-data',
        fields: {
            avatar: 'avatar.jpg',
            username: 'Juan',
            groupName: 'Mi Grupo',
            members: '25',
            message: '¡Bienvenido al grupo!',
            style: 'neon'
        }
    }
};

module.exports = router;
