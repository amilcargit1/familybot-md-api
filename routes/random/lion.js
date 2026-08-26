const express = require('express');
const router = express.Router();
const { getRandomImage } = require('../../services/randomImage.service');

router.get('/', async (req, res) => {
    try {
        const url = await getRandomImage('lion', 'lion animal');
        res.json({ status: true, creator: 'FamilyBot-MD', result: { url, provider: 'Wikimedia Commons', type: 'lion' } });
    } catch (error) {
        console.error('[LION ERROR]', error.message);
        res.status(502).json({ status: false, creator: 'FamilyBot-MD', message: 'No se pudo obtener un león.', error: 'Servicio externo no disponible' });
    }
});

router.meta = { title: 'León aleatorio', description: 'Obtiene una imagen aleatoria de un león', icon: 'fas fa-paw', fields: [], resultType: 'image', resultField: 'result.url' };
module.exports = router;
