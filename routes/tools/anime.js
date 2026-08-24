const express = require('express');

const router = express.Router();

const TIMEOUT_MS = 15000;
const MAX_RESULTS = 5;

function cleanText(text) {
    if (!text) return null;

    return String(text)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
}

async function requestJikan(url) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, TIMEOUT_MS);

    try {
        return await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'User-Agent': 'FamilyBot-MD-API/1.0'
            },
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
}

router.get('/', async (req, res) => {
    const q = String(
        req.query.q ||
        req.query.name ||
        req.query.search ||
        ''
    ).trim();

    if (!q) {
        return res.status(400).json({
            status: false,
            message: 'Falta el parámetro "q"',
            example:
                '/api/tools/anime?apiKey=TU_KEY&q=naruto'
        });
    }

    if (q.length < 2 || q.length > 100) {
        return res.status(400).json({
            status: false,
            message:
                'La búsqueda debe tener entre 2 y 100 caracteres'
        });
    }

    try {
        const url =
            `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=${MAX_RESULTS}&sfw=true`;

        const response = await requestJikan(url);

        /*
         * Jikan puede responder 429 cuando se alcanza
         * su límite de solicitudes.
         */
        if (response.status === 429) {
            const retryAfter =
                response.headers.get('Retry-After');

            return res.status(429).json({
                status: false,
                message:
                    'Jikan está limitando temporalmente las solicitudes',
                retry_after: retryAfter
                    ? `${retryAfter} segundos`
                    : 'Espera unos segundos e intenta nuevamente'
            });
        }

        if (response.status === 404) {
            return res.status(404).json({
                status: false,
                message:
                    `No se encontró el anime "${q}"`
            });
        }

        if (!response.ok) {
            const body = await response.text().catch(() => '');

            console.error(
                '[ANIME API] Jikan:',
                response.status,
                body
            );

            return res.status(502).json({
                status: false,
                message:
                    'El servicio de anime no está disponible temporalmente',
                provider_status: response.status
            });
        }

        const json = await response.json();

        if (!json.data || !Array.isArray(json.data)) {
            return res.status(502).json({
                status: false,
                message:
                    'La respuesta del servicio de anime no es válida'
            });
        }

        if (json.data.length === 0) {
            return res.status(404).json({
                status: false,
                message:
                    `No se encontró ningún anime para "${q}"`
            });
        }

        const results = json.data.map(anime => ({
            mal_id: anime.mal_id || null,

            title: anime.title || null,

            title_japanese:
                anime.title_japanese || null,

            title_english:
                anime.title_english || null,

            type: anime.type || null,

            episodes:
                anime.episodes ?? null,

            status:
                anime.status || null,

            airing:
                anime.airing ?? false,

            aired: anime.aired
                ? {
                    from: anime.aired.from || null,
                    to: anime.aired.to || null,
                    string: anime.aired.string || null
                }
                : null,

            duration:
                anime.duration || null,

            rating:
                anime.rating || null,

            score:
                anime.score ?? null,

            scored_by:
                anime.scored_by ?? null,

            rank:
                anime.rank ?? null,

            popularity:
                anime.popularity ?? null,

            members:
                anime.members ?? null,

            favorites:
                anime.favorites ?? null,

            synopsis:
                cleanText(anime.synopsis),

            background:
                cleanText(anime.background),

            season:
                anime.season || null,

            year:
                anime.year ?? null,

            genres:
                Array.isArray(anime.genres)
                    ? anime.genres.map(g => g.name)
                    : [],

            studios:
                Array.isArray(anime.studios)
                    ? anime.studios.map(s => s.name)
                    : [],

            producers:
                Array.isArray(anime.producers)
                    ? anime.producers.map(p => p.name)
                    : [],

            image:
                anime.images?.jpg?.large_image_url ||
                anime.images?.jpg?.image_url ||
                anime.images?.webp?.large_image_url ||
                anime.images?.webp?.image_url ||
                null,

            trailer:
                anime.trailer?.url ||
                anime.trailer?.youtube_id ||
                null,

            url:
                anime.url || null
        }));

        return res.status(200).json({
            status: true,
            creator: 'FamilyBot-MD API',
            query: q,
            total: results.length,
            results
        });

    } catch (error) {
        console.error(
            '[ANIME API ERROR]',
            error.message
        );

        if (error.name === 'AbortError') {
            return res.status(504).json({
                status: false,
                message:
                    'Tiempo de espera agotado al consultar el anime'
            });
        }

        return res.status(502).json({
            status: false,
            message:
                'No se pudo conectar con el servicio de anime',
            error: error.message
        });
    }
});

router.meta = {
    title: 'Anime Info',
    description:
        'Busca información detallada de animes',
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