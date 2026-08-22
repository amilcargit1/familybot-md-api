const express = require('express');
const router = express.Router();

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
};

function extractMedia(html) {
    const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    return {
        media: videoMatch?.[1] || imageMatch?.[1],
        type: videoMatch ? 'video' : (imageMatch ? 'image' : null),
        title: titleMatch?.[1]?.replace(/&quot;/g, '"')
    };
}

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
        // Intento 1: la página normal del post
        const pageRes = await fetch(url, { headers: BROWSER_HEADERS });
        const html = await pageRes.text();
        let result = extractMedia(html);

        // Intento 2 (respaldo): la versión "embed", que a veces Instagram sirve
        // de forma más simple para posts públicos
        if (!result.media) {
            const embedUrl = url.replace(/\/?$/, '/') + 'embed/captioned/';
            const embedRes = await fetch(embedUrl, { headers: BROWSER_HEADERS });
            const embedHtml = await embedRes.text();
            result = extractMedia(embedHtml);
        }

        if (!result.media) {
            return res.status(500).json({
                status: false,
                message: 'No se pudo extraer el contenido. Instagram bloquea activamente el scraping sin sesión, sobre todo en Reels e Historias — funciona mejor con publicaciones de fotos públicas.'
            });
        }

        res.json({
            status: true,
            creator: 'familybot-md',
            data: {
                type: result.type,
                title: result.title || 'Publicación de Instagram',
                media: result.media
            }
        });

    } catch (err) {
        console.error('Error Instagram:', err.message);
        res.status(500).json({ status: false, message: 'Error interno al procesar el link' });
    }
});

router.meta = {
    title: 'Descargar de Instagram',
    description: 'Descarga fotos/videos públicos a partir del link',
    icon: 'fab fa-instagram',
    fields: [
        { name: 'url', label: 'Link de Instagram', placeholder: 'Pega el link de Instagram...' }
    ],
    resultType: 'link',
    resultField: 'data.media',
    previewFields: [{ label: 'Título', field: 'data.title' }]
};

module.exports = router;
