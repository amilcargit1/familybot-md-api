const express = require('express');
const router = express.Router();

const API_URL = 'https://api.thecatapi.com/v1/images/search';

async function fetchWithTimeout(url, timeout = 10000) {
    const controller = new AbortController();

    const timer = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        return await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'FamilyBot-MD-API'
            }
        });
    } finally {
        clearTimeout(timer);
    }
}

router.get('/', async (req, res) => {
    try {
        const response = await fetchWithTimeout(API_URL);

        if (!response.ok) {
            throw new Error(`Cat API respondió ${response.status}`);
        }

        const data = await response.json();

        if (
            !Array.isArray(data) ||
            !data[0] ||
            !data[0].url
        ) {
            throw new Error('Respuesta inválida de The Cat API');
        }

        const cat = data[0];

        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: {
                url: cat.url,
                provider: 'The Cat API',
                type: 'cat',
                width: cat.width || null,
                height: cat.height || null
            }
        });

    } catch (error) {
        console.error('[CAT ERROR]', error);

        res.status(502).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'No se pudo obtener un gato en este momento.',
            error: 'Servicio externo no disponible'
        });
    }
});

router.meta = {
    title: 'Gato aleatorio',
    description: 'Obtiene una imagen aleatoria de un gato',
    icon: 'fas fa-cat',
    fields: [],
    resultType: 'image',
    resultField: 'result.url'
};

module.exports = router;