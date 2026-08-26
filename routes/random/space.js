const express = require('express');
const router = express.Router();
const { getRandomImage } = require('../../services/randomImage.service');

router.get('/', async (req, res) => {
    try {
        const url = await getRandomImage('space', 'space galaxy nebula');
        res.json({ status: true, creator: 'FamilyBot-MD', result: { url, provider: 'Wikimedia Commons', type: 'space' } });
    } catch (error) {
        console.error('[SPACE ERROR]', error.message);
        res.status(502).json({ status: false, creator: 'FamilyBot-MD', message: 'No se pudo obtener una imagen del espacio.', error: 'Servicio externo no disponible' });
    }
});

router.meta = { title: 'Espacio aleatorio', description: 'Obtiene una imagen aleatoria del espacio', icon: 'fas fa-star', fields: [], resultType: 'image', resultField: 'result.url' };
module.exports = router;
