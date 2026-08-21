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
            headers: { 'Content-Type': 'application/json' },
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

module.exports = router;
