const express = require('express');
const router = express.Router();
const { getRandomImage } = require('../../services/randomImage.service');

router.get('/', async (req, res) => {
    try {
        const url = await getRandomImage('bird', 'bird animal');
        res.json({ status: true, creator: 'FamilyBot-MD', result: { url, provider: 'Wikimedia Commons', type: 'bird' } });
    } catch (error) {
        console.error('[BIRD ERROR]', error.message);
        res.status(502).json({ status: false, creator: 'FamilyBot-MD', message: 'No se pudo obtener un ave.', error: 'Servicio externo no disponible' });
    }
});

router.meta = { title: 'Ave aleatoria', description: 'Obtiene una imagen aleatoria de un ave', icon: 'fas fa-dove', fields: [], resultType: 'image', resultField: 'result.url' };
module.exports = router;
