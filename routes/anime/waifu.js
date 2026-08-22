const express = require('express');
const router = express.Router();

// GET /api/anime/waifu?apiKey=...
router.get('/', async (req, res) => {
    try {
        const apiRes = await fetch('https://api.waifu.pics/sfw/waifu');
        const data = await apiRes.json();

        if (!data.url) {
            return res.status(500).json({ status: false, message: 'No se pudo obtener una imagen' });
        }

        res.json({ status: true, creator: 'familybot-md', url: data.url });

    } catch (err) {
        console.error('Error waifu:', err.message);
        res.status(500).json({ status: false, message: 'Error interno' });
    }
});

module.exports = router;