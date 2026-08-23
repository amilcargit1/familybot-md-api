const express = require('express')
const router = express.Router()

const TIKWM_API = 'https://www.tikwm.com/api/'
const TIMEOUT = 30000

function isTikTokUrl(value) {
    try {
        const url = new URL(value)
        const host = url.hostname.toLowerCase()

        return (
            host === 'tiktok.com' ||
            host.endsWith('.tiktok.com')
        )
    } catch {
        return false
    }
}

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT) {
    const controller = new AbortController()

    const timer = setTimeout(() => {
        controller.abort()
    }, timeout)

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        })
    } finally {
        clearTimeout(timer)
    }
}

router.get('/', async (req, res) => {
    const { url } = req.query

    if (!url) {
        return res.status(400).json({
            status: false,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',
            message: 'Debes proporcionar una URL de TikTok.',
            example: '/api/download/tiktok?apiKey=familybot-md&url=https://www.tiktok.com/...'
        })
    }

    if (!isTikTokUrl(url)) {
        return res.status(400).json({
            status: false,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',
            message: 'La URL proporcionada no parece ser una URL válida de TikTok.'
        })
    }

    try {
        const response = await fetchWithTimeout(
            TIKWM_API,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'FamilyBot-MD'
                },
                body: new URLSearchParams({
                    url,
                    hd: '1'
                })
            }
        )

        const text = await response.text()

        let data

        try {
            data = JSON.parse(text)
        } catch {
            return res.status(502).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message: 'El servicio de TikTok devolvió una respuesta inválida.'
            })
        }

        if (!response.ok || data.code !== 0 || !data.data) {
            return res.status(502).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message: data.msg || 'No se pudo obtener el vídeo de TikTok.'
            })
        }

        const video = data.data

        return res.status(200).json({
            status: true,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',
            result: {
                id: video.id || null,
                title: video.title || null,

                author: {
                    id: video.author?.id || null,
                    uniqueId: video.author?.unique_id || null,
                    nickname: video.author?.nickname || null
                },

                video: {
                    url: video.play || video.wmplay || null,
                    hd: video.hdplay || video.play || null,
                    watermark: video.wmplay || null,
                    cover: video.cover || null
                },

                music: {
                    url: video.music || null,
                    title: video.music_info?.title || null,
                    author: video.music_info?.author || null
                },

                stats: {
                    playCount: video.play_count || 0,
                    likeCount: video.digg_count || 0,
                    commentCount: video.comment_count || 0,
                    shareCount: video.share_count || 0
                },

                duration: video.duration || 0
            }
        })

    } catch (error) {
        console.error('[TIKTOK ERROR]', error)

        if (error.name === 'AbortError') {
            return res.status(504).json({
                status: false,
                creator: 'AmilcarGit',
                bot: 'FamilyBot-MD',
                message: 'La solicitud a TikTok tardó demasiado. Inténtalo nuevamente.'
            })
        }

        return res.status(500).json({
            status: false,
            creator: 'AmilcarGit',
            bot: 'FamilyBot-MD',
            message: 'Error interno al procesar el vídeo de TikTok.'
        })
    }
})

router.meta = {
    title: 'TikTok Downloader',
    description: 'Descarga vídeos de TikTok sin necesidad de una API key externa',
    icon: 'fab fa-tiktok',
    fields: [
        {
            name: 'url',
            label: 'URL de TikTok',
            type: 'text',
            placeholder: 'https://www.tiktok.com/@usuario/video/...'
        }
    ],
    resultType: 'json',
    resultField: 'result'
}

module.exports = router