const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    const q = String(req.query.q || req.query.name || '').trim();

    if (!q) {
        return res.status(400).json({
            status: false,
            message: 'Falta ?q=',
            example: '/api/tools/anime?apiKey=TU_KEY&q=naruto'
        });
    }

    if (q.length > 100) {
        return res.status(400).json({
            status: false,
            message: 'La búsqueda es demasiado larga'
        });
    }

    try {
        const url =
            `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=5`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Jikan HTTP ${response.status}`);
        }

        const json = await response.json();

        if (!json.data || json.data.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'No se encontró ningún anime'
            });
        }

        const results = json.data.map(anime => ({
            mal_id: anime.mal_id,
            title: anime.title,
            title_japanese: anime.title_japanese || null,
            type: anime.type,
            episodes: anime.episodes,
            status: anime.status,
            score: anime.score,
            year: anime.year,
            synopsis: anime.synopsis,
            image: anime.images?.jpg?.large_image_url ||
                   anime.images?.jpg?.image_url ||
                   null,
            url: anime.url,
            genres: (anime.genres || []).map(g => g.name)
        }));

        return res.json({
            status: true,
            total: results.length,
            results
        });

    } catch (error) {
        console.error('[ANIME API]', error.message);

        return res.status(502).json({
            status: false,
            message: 'No se pudo consultar la información del anime'
        });
    }
});

router.meta = {
    title: 'Anime Info',
    description: 'Busca información de animes',
    icon: 'fas fa-dragon',
    fields: [
        {
            name: 'q',
            label: 'Anime',
            placeholder: 'Naruto'
        }
    ],
    resultType: 'json',
    resultField: 'results'
};

module.exports = router;