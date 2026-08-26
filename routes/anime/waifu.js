const express = require('express');
const router = express.Router();

const API_URL = 'https://api.waifu.pics/sfw/waifu';
const TIMEOUT_MS = 10000;

async function getWaifu() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(API_URL, {
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Proveedor HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            throw new Error('Respuesta del proveedor no válida');
        }

        const data = await response.json();
        if (!data?.url) {
            throw new Error('El proveedor no devolvió una imagen');
        }

        const imageUrl = new URL(data.url);
        if (!['https:', 'http:'].includes(imageUrl.protocol)) {
            throw new Error('URL de imagen inválida');
        }

        return data.url;
    } finally {
        clearTimeout(timer);
    }
}

async function getImageBuffer(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'image/avif,image/webp,image/apng,image/gif,image/jpeg,image/png,*/*;q=0.8'
            },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Imagen HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().startsWith('image/')) {
            throw new Error(`Contenido no es imagen: ${contentType}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (!buffer.length) {
            throw new Error('Imagen vacía');
        }

        return { buffer, contentType };
    } finally {
        clearTimeout(timer);
    }
}

// GET /api/anime/waifu?apiKey=...&format=json|image
router.get('/', async (req, res) => {
    try {
        const url = await getWaifu();
        const format = String(req.query.format || 'json').toLowerCase();

        if (format === 'image') {
            const image = await getImageBuffer(url);
            res.setHeader('Content-Type', image.contentType);
            res.setHeader('Content-Length', image.buffer.length);
            res.setHeader('Cache-Control', 'no-store');
            return res.status(200).send(image.buffer);
        }

        if (format !== 'json') {
            return res.status(400).json({
                status: false,
                message: 'format debe ser json o image'
            });
        }

        return res.json({
            status: true,
            creator: 'familybot-md',
            url
        });
    } catch (err) {
        console.error('Error waifu:', err.message);
        return res.status(502).json({
            status: false,
            message: 'No se pudo obtener la imagen de Waifu'
        });
    }
});

router.meta = {
    title: 'Waifu aleatoria',
    description: 'Imagen aleatoria SFW. Puede devolver JSON o la imagen directamente.',
    icon: 'fas fa-image',
    fields: [
        {
            name: 'format',
            label: 'Formato',
            type: 'select',
            default: 'json',
            options: [
                { value: 'json', label: 'JSON + URL' },
                { value: 'image', label: 'Imagen directa (WhatsApp)' }
            ]
        }
    ],
    resultType: 'image',
    resultField: 'url',
    example: {
        status: true,
        creator: 'familybot-md',
        url: 'https://cdn.waifu.pics/abc123.png'
    }
};

module.exports = router;
