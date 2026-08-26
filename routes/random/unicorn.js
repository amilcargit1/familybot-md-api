const express = require('express');
const router = express.Router();
const { getRandomImage } = require('../../services/randomImage.service');

router.get('/', async (req, res) => {
    try {
        const url = await getRandomImage('unicorn', 'unicorn illustration');
        res.json({ status: true, creator: 'FamilyBot-MD', result: { url, provider: 'Wikimedia Commons', type: 'unicorn' } });
    } catch (error) {
        console.error('[UNICORN ERROR]', error.message);
        res.status(502).json({ status: false, creator: 'FamilyBot-MD', message: 'No se pudo obtener un unicornio.', error: 'Servicio externo no disponible' });
    }
});

router.meta = { title: 'Unicornio aleatorio', description: 'Obtiene una imagen aleatoria de un unicornio', icon: 'fas fa-horse', fields: [], resultType: 'image', resultField: 'result.url' };
module.exports = router;
