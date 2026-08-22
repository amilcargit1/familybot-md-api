const express = require('express');
const router = express.Router();
const ytdl = require('@distube/ytdl-core');

// GET /api/download/youtube?apiKey=...&url=...&type=video|audio
router.get('/', async (req, res) => {
    const { url, type = 'video' } = req.query;

    if (!url) {
        return res.status(400).json({ status: false, message: 'Debes proporcionar ?url= con el link del video de YouTube' });
    }
    if (!ytdl.validateURL(url)) {
        return res.status(400).json({ status: false, message: 'Ese no parece un link válido de YouTube' });
    }

    try {
        const info = await ytdl.getInfo(url);
        const details = info.videoDetails;

        let downloadUrl;
        if (type === 'audio') {
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
            const best = audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
            downloadUrl = best?.url;
        } else {
            // Formatos "progresivos" traen video + audio juntos (no requieren unir archivos)
            const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
            const best = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
            downloadUrl = best?.url;
        }

        if (!downloadUrl) {
            return res.status(500).json({ status: false, message: 'No se encontró un formato descargable para ese video' });
        }

        res.json({
            status: true,
            creator: 'familybot-md',
            data: {
                title: details.title,
                duration_seconds: details.lengthSeconds,
                thumbnail: details.thumbnails?.pop()?.url,
                author: details.author?.name,
                views: details.viewCount,
                type,
                download: downloadUrl
            }
        });

    } catch (err) {
        console.error('Error YouTube:', err.message);
        res.status(500).json({ status: false, message: 'No se pudo procesar ese video. Puede que YouTube haya bloqueado la solicitud temporalmente.' });
    }
});

module.exports = router;