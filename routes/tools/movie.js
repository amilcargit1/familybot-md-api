const express = require('express');

const router = express.Router();

const TIMEOUT_MS = 15000;
const MAX_QUERY_LENGTH = 100;

function cleanHtml(text) {
    if (!text) return null;

    return String(text)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function isValidQuery(query) {
    return (
        query.length >= 2 &&
        query.length <= MAX_QUERY_LENGTH
    );
}

async function fetchWithTimeout(url) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'User-Agent': 'FamilyBot-MD-API/1.0'
            },
            signal: controller.signal
        });

        return response;

    } finally {
        clearTimeout(timeout);
    }
}

/*
 * GET
 *
 * /api/tools/movie?apiKey=TU_KEY&q=breaking%20bad
 *
 * Devuelve hasta 10 resultados.
 */
router.get('/', async (req, res) => {
    const query = String(
        req.query.q ||
        req.query.search ||
        req.query.name ||
        ''
    ).trim();

    if (!query) {
        return res.status(400).json({
            status: false,
            message: 'Falta el parámetro "q"',
            example:
                '/api/tools/movie?apiKey=TU_KEY&q=breaking%20bad'
        });
    }

    if (!isValidQuery(query)) {
        return res.status(400).json({
            status: false,
            message:
                'La búsqueda debe tener entre 2 y 100 caracteres'
        });
    }

    try {
        const url =
            `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;

        const response = await fetchWithTimeout(url);

        if (!response.ok) {
            throw new Error(
                `TVMaze respondió HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(404).json({
                status: false,
                message: `No se encontraron resultados para "${query}"`
            });
        }

        const results = data.slice(0, 10).map(item => {
            const show = item.show || {};

            return {
                id: show.id || null,

                title: show.name || null,

                type: show.type || null,

                language: show.language || null,

                genres: Array.isArray(show.genres)
                    ? show.genres
                    : [],

                status: show.status || null,

                runtime: show.runtime || null,

                average_runtime:
                    show.averageRuntime || null,

                premiered: show.premiered || null,

                ended: show.ended || null,

                rating: show.rating?.average || null,

                votes: show.weight || null,

                country: show.network?.country
                    ? {
                        name:
                            show.network.country.name ||
                            null,
                        code:
                            show.network.country.code ||
                            null,
                        timezone:
                            show.network.country.timezone ||
                            null
                    }
                    : show.webChannel?.country
                        ? {
                            name:
                                show.webChannel.country.name ||
                                null,
                            code:
                                show.webChannel.country.code ||
                                null,
                            timezone:
                                show.webChannel.country.timezone ||
                                null
                        }
                        : null,

                network: show.network?.name || null,

                web_channel:
                    show.webChannel?.name || null,

                official_site:
                    show.officialSite || null,

                imdb:
                    show.externals?.imdb || null,

                thetvdb:
                    show.externals?.thetvdb || null,

                tvrage:
                    show.externals?.tvrage || null,

                image: {
                    medium:
                        show.image?.medium || null,

                    original:
                        show.image?.original || null
                },

                summary:
                    cleanHtml(show.summary),

                url:
                    show.url || null
            };
        });

        return res.status(200).json({
            status: true,
            creator: 'FamilyBot-MD API',
            query,
            total: results.length,
            results
        });

    } catch (error) {
        console.error(
            '[MOVIE API]',
            error.message
        );

        if (error.name === 'AbortError') {
            return res.status(504).json({
                status: false,
                message:
                    'Tiempo de espera agotado al consultar la información'
            });
        }

        return res.status(502).json({
            status: false,
            message:
                'No se pudo consultar la información',
            error: error.message
        });
    }
});

router.meta = {
    title: 'Movie Info',
    description:
        'Busca información de películas y series',
    icon: 'fas fa-film',

    fields: [
        {
            name: 'q',
            label: 'Película o serie',
            placeholder: 'Breaking Bad'
        }
    ],

    resultType: 'json',
    resultField: 'results'
};

module.exports = router;