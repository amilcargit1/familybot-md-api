const express = require('express');
const router = express.Router();
const { getRandomImage } = require('../../services/randomImage.service');

router.get('/', async (req, res) => {
    try {
        const url = await getRandomImage('panda', 'panda animal');
        res.json({ status: true, creator: 'FamilyBot-MD', result: { url, provider: 'Wikimedia Commons', type: 'panda' } });
    } catch (error) {
        console.error('[PANDA ERROR]', error.message);
        res.status(502).json({ status: false, creator: 'FamilyBot-MD', message: 'No se pudo obtener un panda.', error: 'Servicio externo no disponible' });
    }
});

router.meta = { title: 'Panda aleatorio', description: 'Obtiene una imagen aleatoria de un panda', icon: 'fas fa-paw', fields: [], resultType: 'image', resultField: 'result.url' };
module.exports = router;
