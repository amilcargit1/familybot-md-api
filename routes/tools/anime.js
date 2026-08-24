const express = require('express');

const router = express.Router();

const TIMEOUT_MS = 15000;
const MAX_RESULTS = 10;

/**
 * Realiza una petición con timeout.
 */
async function fetchJSON(url) {
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

        const text = await response.text();

        let data = null;

        try {
            data = JSON.parse(text);
        } catch {
            data = null;
        }

        return {
            response,
            data
        };

    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Normaliza el formato de Tenrai/Jikan.
 */
function formatAnime(anime) {
    return {
        mal_id: anime.mal_id || null,

        title: anime.title || null,

        title_english:
            anime.title_english || null,

        title_japanese:
            anime.title_japanese || null,

        type:
            anime.type || null,

        source:
            anime.source || null,

        episodes:
            anime.episodes ?? null,

        status:
            anime.status || null,

        airing:
            anime.airing ?? false,

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
            anime.synopsis || null,

        background:
            anime.background || null,

        season:
            anime.season || null,

        year:
            anime.year ?? null,

        aired: anime.aired
            ? {
                from: anime.aired.from || null,
                to: anime.aired.to || null,
                string: anime.aired.string || null
            }
            : null,

        genres: Array.isArray(anime.genres)
            ? anime.genres.map(g => g.name)
            : [],

        studios: Array.isArray(anime.studios)
            ? anime.studios.map(s => s.name)
            : [],

        producers: Array.isArray(anime.producers)
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
            null,

        url:
            anime.url || null
    };
}

/**
 * GET /api/tools/anime
 *
 * Ejemplo:
 * /api/tools/anime?apiKey=TU_KEY&q=naruto
 */
router.get('/', async (req, res) => {
    const query = String(
        req.query.q ||
        req.query.name ||
        req.query.search ||
        ''
    ).trim();

    if (!query) {
        return res.status(400).json({
            status: false,
            message: 'Falta el parámetro "q"',
            example:
                '/api/tools/anime?apiKey=TU_KEY&q=naruto'
        });
    }

    if (query.length < 2 || query.length > 100) {
        return res.status(400).json({
            status: false,
            message:
                'La búsqueda debe tener entre 2 y 100 caracteres'
        });
    }

    const encodedQuery = encodeURIComponent(query);

    /*
     * ============================================================
     * 1. TENRAI — FUENTE PRINCIPAL
     * ============================================================
     *
     * Tenrai es compatible con el esquema de Jikan.
     */
    try {
        const tenraiURL =
            `https://api.tenrai.org/v1/anime?q=${encodedQuery}&limit=${MAX_RESULTS}`;

        const { response, data } =
            await fetchJSON(tenraiURL);

        if (response.ok && data) {
            const animeData =
                Array.isArray(data.data)
                    ? data.data
                    : Array.isArray(data)
                        ? data
                        : [];

            if (animeData.length > 0) {
                const results =
                    animeData
                        .slice(0, MAX_RESULTS)
                        .map(formatAnime);

                return res.status(200).json({
                    status: true,
                    creator: 'FamilyBot-MD API',
                    provider: 'Tenrai',
                    query,
                    total: results.length,
                    results
                });
            }
        }

        console.warn(
            '[ANIME] Tenrai no devolvió resultados. Probando Jikan...'
        );

    } catch (error) {
        console.warn(
            '[ANIME] Tenrai error:',
            error.message
        );
    }

    /*
     * ============================================================
     * 2. JIKAN — RESPALDO
     * ============================================================
     */
    try {
        const jikanURL =
            `https://api.jikan.moe/v4/anime?q=${encodedQuery}&limit=${MAX_RESULTS}&sfw=true`;

        const { response, data } =
            await fetchJSON(jikanURL);

        if (response.status === 429) {
            return res.status(503).json({
                status: false,
                message:
                    'Los servicios de anime están temporalmente ocupados. Intenta nuevamente en unos segundos.'
            });
        }

        if (!response.ok || !data) {
            throw new Error(
                `Jikan HTTP ${response.status}`
            );
        }

        if (
            !Array.isArray(data.data) ||
            data.data.length === 0
        ) {
            return res.status(404).json({
                status: false,
                message:
                    `No se encontró ningún anime para "${query}"`
            });
        }

        const results =
            data.data
                .slice(0, MAX_RESULTS)
                .map(formatAnime);

        return res.status(200).json({
            status: true,
            creator: 'FamilyBot-MD API',
            provider: 'Jikan',
            query,
            total: results.length,
            results
        });

    } catch (error) {
        console.error(
            '[ANIME API]',
            error.message
        );

        if (error.name === 'AbortError') {
            return res.status(504).json({
                status: false,
                message:
                    'Tiempo de espera agotado consultando los servicios de anime'
            });
        }

        return res.status(502).json({
            status: false,
            message:
                'Los servicios de anime no están disponibles temporalmente',
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