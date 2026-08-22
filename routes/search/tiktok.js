const express = require('express');
const router = express.Router();

const HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B334b Safari/531.21.10'
};

// GET /api/search/tiktok?apiKey=...&query=...
router.get('/', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({ status: false, message: 'Debes proporcionar ?query= con lo que quieres buscar' });
    }

    let apiRes;
    try {
        // Igual que el endpoint de descarga (que sí funciona): POST con body JSON
        apiRes = await fetch('https://www.tikwm.com/api/feed/search', {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ keywords: query, count: 10, cursor: 0 })
        });
    } catch (networkErr) {
        // Esto captura errores de red reales (DNS, timeout, conexión rechazada, etc.)
        console.error('Error de red al buscar en TikTok:', networkErr.message);
        return res.status(500).json({ status: false, message: `Error de red al contactar el proveedor: ${networkErr.message}` });
    }

    const rawText = await apiRes.text();
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (parseErr) {
        // El proveedor respondió algo que no es JSON (por ejemplo una página de error o bloqueo)
        console.error('Respuesta no-JSON de tikwm:', rawText.slice(0, 300));
        return res.status(500).json({
            status: false,
            message: 'El proveedor de búsqueda no devolvió datos válidos (puede estar bloqueando la IP del servidor temporalmente)',
            raw_preview: rawText.slice(0, 200)
        });
    }

    if (data.code !== 0 || !data.data?.videos) {
        return res.status(404).json({
            status: false,
            message: data.msg || 'No se encontraron resultados para esa búsqueda'
        });
    }

    const results = data.data.videos.map(v => ({
        title: v.title,
        author: v.author?.nickname,
        duration: v.duration,
        plays: v.play_count,
        likes: v.digg_count,
        no_watermark: v.play,
        cover: v.cover
    }));

    res.json({ status: true, creator: 'familybot-md', total: results.length, results });
});

router.meta = {
    title: 'Buscar en TikTok',
    description: 'Busca videos por palabra clave',
    icon: 'fas fa-magnifying-glass',
    fields: [
        { name: 'query', label: 'Buscar', placeholder: 'Ej: gatitos graciosos' }
    ],
    resultType: 'raw'
};

module.exports = router;
