const express = require('express');
const router = express.Router();

// GET /api/tools/translate?apiKey=...&text=...&to=es (idioma destino opcional, "es" por defecto)
router.get('/', async (req, res) => {
    const { text, to = 'es' } = req.query;

    if (!text) {
        return res.status(400).json({ status: false, message: 'Falta el parámetro ?text=' });
    }

    try {
        const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(text)}`;
        const apiRes = await fetch(apiUrl);
        const data = await apiRes.json();

        // La respuesta viene como un array anidado raro; unimos todos los fragmentos traducidos
        const translated = data[0].map(chunk => chunk[0]).join('');
        const detectedLang = data[2];

        res.json({
            status: true,
            creator: 'familybot-md',
            data: {
                original: text,
                translated,
                from: detectedLang,
                to
            }
        });

    } catch (err) {
        console.error('Error traductor:', err.message);
        res.status(500).json({ status: false, message: 'Error al traducir el texto' });
    }
});

module.exports = router;