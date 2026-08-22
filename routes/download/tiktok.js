const express = require('express');
const router = express.Router();

// GET /api/download/tiktok?apiKey=...&url=...
router.get('/', async (req, res) => {
    const videoURL = req.query.url;

    if (!videoURL) {
        return res.status(400).json({ status: false, message: 'Debes proporcionar ?url= con el link del video de TikTok' });
    }

    try {
        const apiRes = await fetch('https://www.tikwm.com/api/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10'
            },
            body: JSON.stringify({ url: videoURL })
        });
        const data = await apiRes.json();

        if (data.code !== 0 || !data.data) {
            return res.status(500).json({
                status: false,
                message: data.msg || 'No se pudo procesar ese link de TikTok'
            });
        }

        const v = data.data;

        res.json({
            status: true,
            creator: 'familybot-md',
            data: {
                title: v.title,
                duration: v.duration,
                author: {
                    username: `@${v.author?.unique_id}`,
                    nickname: v.author?.nickname,
                    avatar: v.author?.avatar
                },
                stats: {
                    plays: v.play_count,
                    likes: v.digg_count,
                    comments: v.comment_count,
                    shares: v.share_count
                },
                media: {
                    no_watermark: v.play,
                    watermark: v.wmplay,
                    hd: v.hdplay,
                    music: v.music
                }
            }
        });

    } catch (err) {
        console.error('Error TikTok:', err);
        res.status(500).json({ status: false, message: 'Error interno al procesar el video' });
    }
});

router.meta = {
    title: 'Descargar video de TikTok',
    description: 'Descarga sin marca de agua a partir del link',
    icon: 'fab fa-tiktok',
    fields: [
        { name: 'url', label: 'Link de TikTok', placeholder: 'Pega el link del video...' }
    ],
    resultType: 'link',
    resultField: 'data.media.no_watermark',
    previewFields: [
        { label: 'Título', field: 'data.title' },
        { label: 'Autor', field: 'data.author.nickname' }
    ]
};

module.exports = router;
