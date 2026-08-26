const express = require('express');
const router = express.Router();
const { getRandomImage } = require('../../services/randomImage.service');

async function fetchImageBuffer(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'FamilyBot-MD/1.0' }
        });

        if (!response.ok) {
            throw new Error(`Proveedor respondió HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
            throw new Error('El proveedor no devolvió una imagen.');
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (!buffer.length) throw new Error('El proveedor devolvió una imagen vacía.');
        if (buffer.length > 10 * 1024 * 1024) throw new Error('La imagen supera el límite permitido.');

        return { buffer, contentType };
    } finally {
        clearTimeout(timeout);
    }
}

router.get('/', async (req, res) => {
    try {
        const url = await getRandomImage('wallpaper', 'wallpaper nature landscape');

        if (String(req.query.format || '').toLowerCase() === 'image') {
            const { buffer, contentType } = await fetchImageBuffer(url);
            return res.status(200)
                .set('Content-Type', contentType)
                .set('Content-Length', String(buffer.length))
                .set('Cache-Control', 'no-store')
                .send(buffer);
        }

        return res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: { url, provider: 'Wikimedia Commons', type: 'wallpaper' }
        });
    } catch (error) {
        console.error('[WALLPAPER ERROR]', error.message);
        return res.status(502).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'No se pudo obtener un fondo aleatorio.',
            error: 'Servicio externo no disponible'
        });
    }
});

router.meta = {
    title: 'Wallpaper aleatorio',
    description: 'Obtiene una imagen aleatoria para fondo de pantalla. Usa format=image para recibirla directamente.',
    icon: 'fas fa-image',
    method: 'GET',
    fields: [],
    resultType: 'image',
    resultField: 'result.url',
    example: { method: 'GET', path: '/api/random/wallpaper?apiKey=TU_API_KEY&format=image' }
};

module.exports = router;
