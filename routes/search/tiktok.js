const express = require('express');
const router = express.Router();

const TIKWM_SEARCH_API = 'https://www.tikwm.com/api/feed/search';

const TIMEOUT = 30000;
const MAX_RESULTS = 10;

const HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
};

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT) {
    const controller = new AbortController();

    const timer = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

router.get('/', async (req, res) => {
    try {
        const query = String(req.query.query || '').trim();

        if (!query) {
            return res.status(400).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message: 'Debes proporcionar una búsqueda.',
                example: '/api/search/tiktok?apiKey=familybot-md&query=gatos'
            });
        }

        if (query.length < 2) {
            return res.status(400).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message: 'La búsqueda debe tener al menos 2 caracteres.'
            });
        }

        if (query.length > 100) {
            return res.status(400).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message: 'La búsqueda no puede superar los 100 caracteres.'
            });
        }

        const response = await fetchWithTimeout(
            TIKWM_SEARCH_API,
            {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({
                    keywords: query,
                    count: MAX_RESULTS,
                    cursor: 0
                })
            }
        );

        const rawText = await response.text();

        let data;

        try {
            data = JSON.parse(rawText);
        } catch {
            console.error(
                '[TIKTOK SEARCH] Respuesta no JSON:',
                rawText.slice(0, 300)
            );

            return res.status(502).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message: 'TikTok Search devolvió una respuesta inválida.'
            });
        }

        if (!response.ok) {
            return res.status(502).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message: 'El servicio de búsqueda de TikTok no está disponible.',
                httpStatus: response.status
            });
        }

        if (
            data.code !== 0 ||
            !data.data ||
            !Array.isArray(data.data.videos)
        ) {
            return res.status(404).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message:
                    data.msg ||
                    'No se encontraron resultados para esa búsqueda.'
            });
        }

        const results = data.data.videos
            .slice(0, MAX_RESULTS)
            .map(video => ({
                id: video.id || null,

                title: video.title || null,

                author: {
                    id: video.author?.id || null,
                    uniqueId: video.author?.unique_id || null,
                    nickname: video.author?.nickname || null
                },

                duration: video.duration || 0,

                stats: {
                    plays: video.play_count || 0,
                    likes: video.digg_count || 0,
                    comments: video.comment_count || 0,
                    shares: video.share_count || 0
                },

                video: {
                    noWatermark: video.play || null,
                    watermark: video.wmplay || null,
                    hd: video.hdplay || null,
                    cover: video.cover || null
                }
            }));

        if (results.length === 0) {
            return res.status(404).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message: 'No se encontraron resultados.'
            });
        }

        return res.status(200).json({
            status: true,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',

            result: {
                query,
                total: results.length,
                results
            }
        });

    } catch (error) {
        console.error('[TIKTOK SEARCH ERROR]', error);

        if (error.name === 'AbortError') {
            return res.status(504).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message:
                    'La búsqueda tardó demasiado. Inténtalo nuevamente.'
            });
        }

        return res.status(500).json({
            status: false,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',
            message: 'Error interno al buscar en TikTok.'
        });
    }
});

router.meta = {
    title: 'Buscar en TikTok',

    description:
        'Busca vídeos de TikTok por palabra clave',

    icon: 'fas fa-magnifying-glass',

    fields: [
        {
            name: 'query',
            label: 'Buscar',
            type: 'text',
            placeholder: 'Ej: gatos graciosos'
        }
    ],

    resultType: 'json',

    resultField: 'result'
};

module.exports = router;