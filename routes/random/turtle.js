const express = require('express');
const router = express.Router();
const { getRandomImage } = require('../../services/randomImage.service');

router.get('/', async (req, res) => {
    try {
        const url = await getRandomImage('turtle', 'turtle animal');
        res.json({ status: true, creator: 'FamilyBot-MD', result: { url, provider: 'Wikimedia Commons', type: 'turtle' } });
    } catch (error) {
        console.error('[TURTLE ERROR]', error.message);
        res.status(502).json({ status: false, creator: 'FamilyBot-MD', message: 'No se pudo obtener una tortuga.', error: 'Servicio externo no disponible' });
    }
});

router.meta = { title: 'Tortuga aleatoria', description: 'Obtiene una imagen aleatoria de una tortuga', icon: 'fas fa-paw', fields: [], resultType: 'image', resultField: 'result.url' };
module.exports = router;
