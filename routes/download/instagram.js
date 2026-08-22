const express = require('express');
const router = express.Router();

// GET /api/download/instagram?apiKey=...&url=...
router.get('/', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ status: false, message: 'Debes proporcionar ?url= con el link de Instagram' });
    }
    if (!url.includes('instagram.com')) {
        return res.status(400).json({ status: false, message: 'Ese no parece un link válido de Instagram' });
    }

    try {
        const pageRes = await fetch(url, {
            headers: {
                // Instagram sirve contenido distinto según el User-Agent; este simula un navegador normal
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
            }
        });
        const html = await pageRes.text();

        const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);

        const media = videoMatch?.[1] || imageMatch?.[1];

        if (!media) {
            return res.status(500).json({
                status: false,
                message: 'No se pudo extraer el contenido. Puede que la publicación sea privada, o que sea una historia/reel que Instagram bloquea sin sesión.'
            });
        }

        res.json({
            status: true,
            creator: 'familybot-md',
            data: {
                type: videoMatch ? 'video' : 'image',
                title: titleMatch?.[1]?.replace(/&quot;/g, '"') || 'Publicación de Instagram',
                media
            }
        });

    } catch (err) {
        console.error('Error Instagram:', err.message);
        res.status(500).json({ status: false, message: 'Error interno al procesar el link' });
    }
});

module.exports = router;