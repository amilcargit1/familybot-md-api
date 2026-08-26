const express = require('express');
const router = express.Router();
const { getRandomImage } = require('../../services/randomImage.service');

router.get('/', async (req, res) => {
    try {
        const url = await getRandomImage('fox', 'fox animal');
        res.json({ status: true, creator: 'FamilyBot-MD', result: { url, provider: 'Wikimedia Commons', type: 'fox' } });
    } catch (error) {
        console.error('[FOX ERROR]', error.message);
        res.status(502).json({ status: false, creator: 'FamilyBot-MD', message: 'No se pudo obtener un zorro en este momento.', error: 'Servicio externo no disponible' });
    }
});

router.meta = { title: 'Zorro aleatorio', description: 'Obtiene una imagen aleatoria de un zorro', icon: 'fas fa-paw', fields: [], resultType: 'image', resultField: 'result.url' };
module.exports = router;
