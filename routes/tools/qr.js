const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

// GET /api/tools/qr?apiKey=...&text=...
// Add &format=image to receive a WhatsApp-ready PNG directly.
router.get('/', async (req, res) => {
    const text = String(req.query.text || '').trim();

    if (!text) {
        return res.status(400).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'Falta el parámetro ?text='
        });
    }

    if (text.length > 4096) {
        return res.status(400).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'El texto es demasiado largo (máximo 4096 caracteres).'
        });
    }

    try {
        const qrBuffer = await QRCode.toBuffer(text, {
            type: 'png',
            width: 800,
            margin: 2,
            errorCorrectionLevel: 'M'
        });

        if (String(req.query.format || '').toLowerCase() === 'image') {
            return res.status(200)
                .type('png')
                .set('Content-Length', String(qrBuffer.length))
                .set('Cache-Control', 'no-store')
                .send(qrBuffer);
        }

        const qrImage = `data:image/png;base64,${qrBuffer.toString('base64')}`;

        return res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: qrImage,
            mimetype: 'image/png'
        });
    } catch (err) {
        console.error('[QR ERROR]', err);
        return res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'Error generando el QR'
        });
    }
});

router.meta = {
    title: 'Generar código QR',
    description: 'Convierte un texto o link en un código QR. Usa format=image para recibir el PNG directamente.',
    icon: 'fas fa-qrcode',
    method: 'GET',
    fields: [
        { name: 'text', label: 'Texto o URL', placeholder: 'Escribe un texto o URL...' }
    ],
    resultType: 'image',
    resultField: 'result',
    example: {
        method: 'GET',
        path: '/api/tools/qr?apiKey=TU_API_KEY&text=Hola&format=image'
    }
};

module.exports = router;
