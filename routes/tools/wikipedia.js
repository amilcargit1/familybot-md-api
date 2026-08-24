const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    const q = String(req.query.q || req.query.search || '').trim();

    if (!q) {
        return res.status(400).json({
            status: false,
            message: 'Falta ?q=',
            example:
                '/api/tools/wikipedia?apiKey=TU_KEY&q=Albert%20Einstein'
        });
    }

    if (q.length > 200) {
        return res.status(400).json({
            status: false,
            message: 'La búsqueda es demasiado larga'
        });
    }

    try {
        const url =
            `https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=5&prop=pageimages|extracts|info&exintro=1&explaintext=1&inprop=url&format=json&origin=*`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Wikipedia HTTP ${response.status}`);
        }

        const json = await response.json();

        const pages = Object.values(
            json.query?.pages || {}
        );

        if (!pages.length) {
            return res.status(404).json({
                status: false,
                message: 'No se encontró información'
            });
        }

        const results = pages.map(page => ({
            pageid: page.pageid,
            title: page.title,
            description: page.extract || null,
            image: page.thumbnail?.source || null,
            url: page.fullurl ||
                `https://es.wikipedia.org/?curid=${page.pageid}`
        }));

        return res.json({
            status: true,
            total: results.length,
            results
        });

    } catch (error) {
        console.error('[WIKIPEDIA API]', error.message);

        return res.status(502).json({
            status: false,
            message: 'No se pudo consultar Wikipedia'
        });
    }
});

router.meta = {
    title: 'Wikipedia',
    description: 'Busca información en Wikipedia',
    icon: 'fab fa-wikipedia-w',
    fields: [
        {
            name: 'q',
            label: 'Búsqueda',
            placeholder: 'Albert Einstein'
        }
    ],
    resultType: 'json',
    resultField: 'results'
};

module.exports = router;