const express = require('express');
const router = express.Router();

const TIKWM_SEARCH_API = 'https://www.tikwm.com/api/feed/search';

const TIMEOUT = 30000;
const DEFAULT_COUNT = 10;
const MAX_COUNT = 20;

function clean(value) {
    return typeof value === 'string' ? value.trim() : '';
}

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
    const stats = video.stats || {};

    return {
        id: video.id || video.aweme_id || null,

        title:
            video.title ||
            video.desc ||
            video.description ||
            null,

        author: {
            id: author.id || author.uid || null,
            uniqueId:
                author.unique_id ||
                author.uniqueId ||
                author.uniqueId ||
                null,
            nickname:
                author.nickname ||
                author.name ||
                null,
            avatar:
                author.avatar ||
                author.avatar_thumb ||
                author.avatarLarger ||
                null
        },

        video: {
            url:
                video.play ||
                video.play_url ||
                video.video_url ||
                video.download ||
                null,

            noWatermark:
                video.play ||
                video.hdplay ||
                video.play_url ||
                null,

            hd:
                video.hdplay ||
                video.play ||
                null,

            watermark:
                video.wmplay ||
                video.wm_play ||
                null,

            cover:
                video.cover ||
                video.origin_cover ||
                video.dynamic_cover ||
                null
        },

        music: {
            url:
                video.music ||
                video.music_url ||
                null,

            title:
                video.music_info?.title ||
                video.music_info?.musicName ||
                null,

            author:
                video.music_info?.author ||
                video.music_info?.musicAuthor ||
                null
        },

        duration:
            video.duration ||
            video.video?.duration ||
            0,

        stats: {
            plays:
                video.play_count ||
                stats.playCount ||
                stats.play_count ||
                0,

            likes:
                video.digg_count ||
                stats.diggCount ||
                stats.likeCount ||
                0,

            comments:
                video.comment_count ||
                stats.commentCount ||
                0,

            shares:
                video.share_count ||
                stats.shareCount ||
                0
        }
    };
}

router.get('/', async (req, res) => {
    const query = clean(req.query.query || req.query.q);

    let count = parseInt(req.query.count, 10);

    if (!Number.isFinite(count)) {
        count = DEFAULT_COUNT;
    }

    count = Math.min(Math.max(count, 1), MAX_COUNT);

    let cursor = parseInt(req.query.cursor, 10);

    if (!Number.isFinite(cursor) || cursor < 0) {
        cursor = 0;
    }

    if (!query) {
        return res.status(400).json({
            status: false,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',
            message: 'Debes proporcionar una búsqueda.',
            example:
                '/api/search/tiktok?apiKey=familybot-md&query=anime'
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
        const body = new URLSearchParams();

        body.set('keywords', query);
        body.set('count', String(count));
        body.set('cursor', String(cursor));

        const response = await fetchWithTimeout(
            TIKWM_SEARCH_API,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded; charset=UTF-8',

                    'Accept': 'application/json, text/plain, */*',

                    'User-Agent':
                        'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',

                    'Origin': 'https://www.tikwm.com',

                    'Referer': 'https://www.tikwm.com/'
                },

                body: body.toString()
            }
        );

        const text = await response.text();

        let data = null;

        try {
            data = JSON.parse(text);
        } catch (jsonError) {
            console.error(
                '[TIKTOK SEARCH] Respuesta no JSON:',
                text.substring(0, 500)
            );

            return res.status(502).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message:
                    'TikTok Search devolvió una respuesta no válida.',
                upstream: {
                    status: response.status,
                    contentType:
                        response.headers.get('content-type') || null
                }
            });
        }

        if (!response.ok) {
            return res.status(502).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message:
                    data?.msg ||
                    'TikTok Search no está disponible actualmente.',
                upstreamStatus: response.status
            });
        }

        /*
         * TikWM puede cambiar ligeramente la estructura.
         * Buscamos los vídeos en varias ubicaciones posibles.
         */

        let videos = [];

        if (Array.isArray(data?.data?.videos)) {
            videos = data.data.videos;
        } else if (Array.isArray(data?.data?.video)) {
            videos = data.data.video;
        } else if (Array.isArray(data?.videos)) {
            videos = data.videos;
        } else if (Array.isArray(data?.data)) {
            videos = data.data;
        }

        const results = videos
            .map(normalizeVideo)
            .filter(Boolean)
            .slice(0, count);

        if (!results.length) {
            return res.status(404).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message:
                    data?.msg ||
                    'No se encontraron vídeos para esa búsqueda.',

                result: {
                    query,
                    total: 0,
                    results: []
                }
            });
        }

        return res.status(200).json({
            status: true,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',

            result: {
                query,
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

        if (error.name === 'AbortError') {
            return res.status(504).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message:
                    'La búsqueda de TikTok tardó demasiado. Inténtalo nuevamente.'
            });
        }

        return res.status(500).json({
            status: false,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',
            message:
                'Error interno al buscar en TikTok.',
            error: error.message
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
            placeholder: 'Ej: edits'
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