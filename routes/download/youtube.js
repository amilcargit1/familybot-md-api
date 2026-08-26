const express = require('express');
const router = express.Router();

// Provider credential must be configured in Render/environment variables.
const FASTSAVER_API_KEY = process.env.FASTSAVER_API_KEY;
const FASTSAVER_URL = 'https://api.fastsaver.io/v1/youtube/download';

// GET /api/download/youtube?apiKey=...&url=...&type=video|audio
router.get('/', async (req, res) => {
    const { url, type = 'video' } = req.query;

    if (!url) {
        return res.status(400).json({
            status: false,
            message: 'Debes proporcionar ?url= con el link del video de YouTube'
        });
    }

    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(String(url))) {
        return res.status(400).json({
            status: false,
            message: 'Ese no parece un link válido de YouTube'
        });
    }

    if (!['video', 'audio'].includes(String(type))) {
        return res.status(400).json({
            status: false,
            message: 'El parámetro type debe ser video o audio'
        });
    }

    if (!FASTSAVER_API_KEY) {
        return res.status(503).json({
            status: false,
            message: 'El servicio de YouTube no está configurado en el servidor'
        });
    }

    try {
        const format = type === 'audio' ? 'mp3' : '720p';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        let apiRes;
        try {
            apiRes = await fetch(FASTSAVER_URL, {
                method: 'POST',
                headers: {
                    'X-Api-Key': FASTSAVER_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ url, format }),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        let data;
        try {
            data = await apiRes.json();
        } catch {
            return res.status(502).json({
                status: false,
                message: 'El proveedor de YouTube devolvió una respuesta inválida'
            });
        }

        if (!apiRes.ok || !data.ok || !data.download_url) {
            return res.status(502).json({
                status: false,
                message: data.message || 'No se pudo procesar ese video de YouTube'
            });
        }

        return res.json({
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
        return res.status(502).json({
            status: false,
            message: err.name === 'AbortError'
                ? 'El proveedor de YouTube tardó demasiado en responder'
                : 'Error al procesar el video de YouTube'
        });
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
