const express = require('express');
const router = express.Router();

const API_URL = 'https://dog.ceo/api/breeds/image/random';

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
            throw new Error(`Dog API respondió ${response.status}`);
        }

        const data = await response.json();

        if (
            !data ||
            data.status !== 'success' ||
            !data.message
        ) {
            throw new Error('Respuesta inválida de Dog API');
        }

        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: {
                url: data.message,
                provider: 'Dog CEO',
                type: 'dog'
            }
        });

    } catch (error) {
        console.error('[DOG ERROR]', error);

        res.status(502).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'No se pudo obtener un perro en este momento.',
            error: 'Servicio externo no disponible'
        });
    }
});

router.meta = {
    title: 'Perro aleatorio',
    description: 'Obtiene una imagen aleatoria de un perro',
    icon: 'fas fa-dog',
    fields: [],
    resultType: 'image',
    resultField: 'result.url'
};

module.exports = router;