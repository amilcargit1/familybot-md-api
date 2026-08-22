const express = require('express');
const router = express.Router();

// API key de fastsaverapi.com (hardcodeada por decisión del dueño del proyecto)
const FASTSAVER_API_KEY = 'fs_sk_1s4a7m5t3k8i2m8d9i9m3a3k7t5g';

// GET /api/download/youtube?apiKey=...&url=...&type=video|audio
router.get('/', async (req, res) => {
    const { url, type = 'video' } = req.query;

    if (!url) {
        return res.status(400).json({ status: false, message: 'Debes proporcionar ?url= con el link del video de YouTube' });
    }

    if (!FASTSAVER_API_KEY) {
        return res.status(500).json({
            status: false,
            message: 'Falta configurar FASTSAVER_API_KEY en las variables de entorno del servidor. Consigue una gratis en https://fastsaverapi.com'
        });
    }

    try {
        // La API de fastsaver espera un "format": '720p' para video, o 'mp3' para solo audio
        const format = type === 'audio' ? 'mp3' : '720p';

        const apiRes = await fetch('https://api.fastsaver.io/v1/youtube/download', {
            method: 'POST',
            headers: {
                'X-Api-Key': FASTSAVER_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url, format })
        });
        const data = await apiRes.json();

        if (!data.ok) {
            return res.status(500).json({
                status: false,
                message: data.message || 'No se pudo procesar ese video de YouTube'
            });
        }

        res.json({
            status: true,
            creator: 'familybot-md',
            data: {
                video_id: data.video_id,
                duration_seconds: data.duration,
                type,
                download: data.download_url
            }
        });

    } catch (err) {
        console.error('Error YouTube:', err.message);
        res.status(500).json({ status: false, message: 'Error interno al procesar el video' });
    }
});

router.meta = {
    title: 'Descargar de YouTube',
    description: 'Descarga video o solo audio a partir del link',
    icon: 'fab fa-youtube',
    fields: [
        { name: 'url', label: 'Link de YouTube', placeholder: 'Pega el link del video...' },
        {
            name: 'type', label: 'Tipo', type: 'select', default: 'video',
            options: [
                { value: 'video', label: 'Video (con audio)' },
                { value: 'audio', label: 'Solo audio' }
            ]
        }
    ],
    resultType: 'link',
    resultField: 'data.download',
    previewFields: [{ label: 'Duración (segundos)', field: 'data.duration_seconds' }]
};

module.exports = router;
