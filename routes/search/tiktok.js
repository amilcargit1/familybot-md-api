const express = require('express');
const router = express.Router();

// GET /api/search/tiktok?apiKey=...&query=...
router.get('/', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ status: false, message: 'Debes proporcionar ?query= con lo que quieres buscar' });
    }

    try {
        const apiRes = await fetch(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=10`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10'
            }
        });
        const data = await apiRes.json();

        if (data.code !== 0 || !data.data?.videos) {
            return res.status(500).json({ status: false, message: 'No se encontraron resultados para esa búsqueda' });
        }

        const results = data.data.videos.map(v => ({
            title: v.title,
            author: v.author?.nickname,
            duration: v.duration,
            plays: v.play_count,
            likes: v.digg_count,
            no_watermark: v.play,
            cover: v.cover
        }));

        res.json({ status: true, creator: 'familybot-md', total: results.length, results });

    } catch (err) {
        console.error('Error búsqueda TikTok:', err.message);
        res.status(500).json({ status: false, message: 'Error interno al buscar' });
    }
});

module.exports = router;