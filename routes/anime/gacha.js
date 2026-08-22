const express = require('express');
const router = express.Router();

const CATEGORIES = ['waifu', 'neko', 'husbando', 'kitsune'];

// GET /api/anime/gacha?apiKey=...
// Cada vez que se llama, tira una imagen de una categoría al azar (como una "tirada" de gacha)
router.get('/', async (req, res) => {
    try {
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const apiRes = await fetch(`https://nekos.best/api/v2/${category}`);
        const data = await apiRes.json();
        const result = data.results?.[0];

        if (!result) {
            return res.status(500).json({ status: false, message: 'No se pudo obtener una imagen' });
        }

        res.json({
            status: true,
            creator: 'familybot-md',
            category,
            url: result.url,
            artist: result.artist_name || null,
            source: result.source_url || null
        });

    } catch (err) {
        console.error('Error gacha:', err.message);
        res.status(500).json({ status: false, message: 'Error interno' });
    }
});

module.exports = router;