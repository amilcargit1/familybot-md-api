const express = require('express');
const router = express.Router();
const { getRandomImage } = require('../../services/randomImage.service');

router.get('/', async (req, res) => {
    try {
        const url = await getRandomImage('wallpaper', 'wallpaper nature landscape');
        res.json({ status: true, creator: 'FamilyBot-MD', result: { url, provider: 'Wikimedia Commons', type: 'wallpaper' } });
    } catch (error) {
        console.error('[WALLPAPER ERROR]', error.message);
        res.status(502).json({ status: false, creator: 'FamilyBot-MD', message: 'No se pudo obtener un fondo aleatorio.', error: 'Servicio externo no disponible' });
    }
});

router.meta = { title: 'Wallpaper aleatorio', description: 'Obtiene una imagen aleatoria para fondo de pantalla', icon: 'fas fa-image', fields: [], resultType: 'image', resultField: 'result.url' };
module.exports = router;
