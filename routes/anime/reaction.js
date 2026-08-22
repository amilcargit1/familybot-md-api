const express = require('express');
const router = express.Router();

const ALLOWED = ['hug', 'pat', 'slap', 'kiss', 'cry'];

// GET /api/anime/reaction?apiKey=...&type=hug|pat|slap|kiss|cry
router.get('/', async (req, res) => {
    const { type } = req.query;

    if (!type || !ALLOWED.includes(type)) {
        return res.status(400).json({ status: false, message: `Tipo inválido. Usa uno de: ${ALLOWED.join(', ')}` });
    }

    try {
        const apiRes = await fetch(`https://api.waifu.pics/sfw/${type}`);
        const data = await apiRes.json();

        if (!data.url) {
            return res.status(500).json({ status: false, message: 'No se pudo obtener una imagen' });
        }

        res.json({ status: true, creator: 'familybot-md', type, url: data.url });

    } catch (err) {
        console.error('Error reaction:', err.message);
        res.status(500).json({ status: false, message: 'Error interno' });
    }
});

module.exports = router;
