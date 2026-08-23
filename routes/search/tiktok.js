const express = require('express');
const router = express.Router();

const TIKWM_SEARCH_API = 'https://www.tikwm.com/api/feed/search';

const TIMEOUT = 30000;
const DEFAULT_COUNT = 10;
const MAX_COUNT = 20;

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

function normalizeVideo(video) {
    if (!video || typeof video !== 'object') {
        return null;
    }

    const author = video.author || {};

    return {
        id: video.id || video.aweme_id || null,

        title:
            video.title ||
            video.desc ||
            null,

        author: {
            id: author.id || author.uid || null,

            uniqueId:
                author.unique_id ||
                author.uniqueId ||
                null,

            nickname:
                author.nickname ||
                author.name ||
                null,

            avatar:
                author.avatar ||
                author.avatar_thumb ||
                null
        },

        video: {
            noWatermark:
                video.play ||
                video.hdplay ||
                null,

            hd:
                video.hdplay ||
                video.play ||
                null,

            watermark:
                video.wmplay ||
                null,

            cover:
                video.cover ||
                video.origin_cover ||
                null
        },

        music: {
            url:
                video.music ||
                null,

            title:
                video.music_info?.title ||
                null,

            author:
                video.music_info?.author ||
                null
        },

        duration:
            video.duration ||
            0,

        stats: {
            plays:
                video.play_count ||
                0,

            likes:
                video.digg_count ||
                0,

            comments:
                video.comment_count ||
                0,

            shares:
                video.share_count ||
                0
        }
    };
}

router.get('/', async (req, res) => {
    const query = String(
        req.query.query ||
        req.query.q ||
        ''
    ).trim();

    let count = parseInt(req.query.count, 10);

    if (!Number.isFinite(count)) {
        count = DEFAULT_COUNT;
    }

    count = Math.min(
        Math.max(count, 1),
        MAX_COUNT
    );

    let cursor = parseInt(
        req.query.cursor,
        10
    );

    if (!Number.isFinite(cursor) || cursor < 0) {
        cursor = 0;
    }

    // ─────────────────────────────
    // VALIDACIÓN
    // ─────────────────────────────

    if (!query) {
        return res.status(400).json({
            status: false,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',
            message: 'Debes proporcionar una búsqueda.',
            example:
                '/api/search/tiktok?apiKey=familybot-md&query=gatos'
        });
    }

    if (query.length < 2) {
        return res.status(400).json({
            status: false,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',
            message:
                'La búsqueda debe tener al menos 2 caracteres.'
        });
    }

    if (query.length > 100) {
        return res.status(400).json({
            status: false,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',
            message:
                'La búsqueda no puede superar los 100 caracteres.'
        });
    }

    try {

        // ─────────────────────────────
        // TIKWM SEARCH
        // GET
        // ─────────────────────────────

        const params = new URLSearchParams({
            keywords: query,
            count: String(count),
            cursor: String(cursor),
            hd: '1'
        });

        const url =
            `${TIKWM_SEARCH_API}?${params.toString()}`;

        const response = await fetchWithTimeout(
            url,
            {
                method: 'GET',

                headers: {
                    'Accept':
                        'application/json, text/plain, */*',

                    'Accept-Language':
                        'es-ES,es;q=0.9,en;q=0.8',

                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',

                    'Referer':
                        'https://www.tikwm.com/'
                }
            }
        );

        const contentType =
            response.headers.get('content-type') || '';

        const text =
            await response.text();

        // ─────────────────────────────
        // CLOUDFLARE / HTML
        // ─────────────────────────────

        if (
            !contentType.includes('application/json') ||
            text.trim().startsWith('<!DOCTYPE') ||
            text.trim().startsWith('<html')
        ) {

            console.error(
                '[TIKTOK SEARCH] TikWM devolvió HTML:',
                text.substring(0, 300)
            );

            return res.status(502).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',

                message:
                    'TikTok Search está protegido temporalmente por Cloudflare.',

                result: {
                    query,
                    results: []
                }
            });
        }

        let data;

        try {
            data = JSON.parse(text);
        } catch (error) {

            console.error(
                '[TIKTOK SEARCH] JSON inválido:',
                text.substring(0, 500)
            );

            return res.status(502).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',

                message:
                    'TikTok Search devolvió un JSON inválido.'
            });
        }

        // ─────────────────────────────
        // ERROR DE TIKWM
        // ─────────────────────────────

        if (!response.ok) {
            return res.status(502).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',

                message:
                    data?.msg ||
                    'TikTok Search no está disponible.',

                upstreamStatus:
                    response.status
            });
        }

        if (
            data.code !== undefined &&
            data.code !== 0
        ) {
            return res.status(502).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',

                message:
                    data.msg ||
                    'TikWM no pudo realizar la búsqueda.'
            });
        }

        // ─────────────────────────────
        // OBTENER RESULTADOS
        // ─────────────────────────────

        let videos = [];

        if (
            Array.isArray(
                data?.data?.videos
            )
        ) {
            videos = data.data.videos;
        }

        else if (
            Array.isArray(data?.videos)
        ) {
            videos = data.videos;
        }

        else if (
            Array.isArray(data?.data)
        ) {
            videos = data.data;
        }

        const results = videos
            .map(normalizeVideo)
            .filter(Boolean)
            .slice(0, count);

        // ─────────────────────────────
        // SIN RESULTADOS
        // ─────────────────────────────

        if (results.length === 0) {
            return res.status(404).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',

                message:
                    data?.msg ||
                    'No se encontraron vídeos.',

                result: {
                    query,
                    total: 0,
                    results: []
                }
            });
        }

        // ─────────────────────────────
        // RESPUESTA FINAL
        // ─────────────────────────────

        return res.status(200).json({
            status: true,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',

            result: {
                query,
                total: results.length,
                count: results.length,
                cursor,

                results
            }
        });

    } catch (error) {

        console.error(
            '[TIKTOK SEARCH ERROR]',
            error
        );

        if (
            error.name === 'AbortError'
        ) {
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

            message:
                'Error interno al buscar en TikTok.',

            error:
                error.message
        });
    }
});

// ─────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────

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
            placeholder: 'Ej: gatos'
        },

        {
            name: 'count',
            label: 'Cantidad',
            type: 'number',
            placeholder: '10',
            default: 10
        }
    ],

    resultType: 'json',

    resultField: 'result'
};

module.exports = router;