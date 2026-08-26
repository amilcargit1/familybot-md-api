const express = require('express');
const router = express.Router();

const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;
const NEKOSBEST_API = 'https://nekos.best/api/v2';
const USER_AGENT = 'FamilyBot-MD-API';

const CATEGORIES = ['waifu', 'neko', 'husbando', 'kitsune'];
const RARITIES = [
    { name: 'Common', emoji: '⚪', chance: 55 },
    { name: 'Rare', emoji: '🔵', chance: 30 },
    { name: 'Epic', emoji: '🟣', chance: 12 },
    { name: 'Legendary', emoji: '🟡', chance: 3 }
];

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generateGachaId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
}

function generateRarity() {
    const value = Math.random() * 100;
    let total = 0;
    for (const rarity of RARITIES) {
        total += rarity.chance;
        if (value <= total) return rarity;
    }
    return RARITIES[0];
}

function isValidHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
}

async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'User-Agent': USER_AGENT,
                'Cache-Control': 'no-cache'
            },
            signal: controller.signal
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/json')) {
            throw new Error('La respuesta no es JSON');
        }

        return response.json();
    } finally {
        clearTimeout(timer);
    }
}

async function downloadImage(url) {
    if (!isValidHttpUrl(url)) throw new Error('URL de imagen inválida');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'image/avif,image/webp,image/apng,image/gif,image/jpeg,image/png,*/*;q=0.8',
                'User-Agent': USER_AGENT
            },
            signal: controller.signal
        });

        if (!response.ok) throw new Error(`Imagen HTTP ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().startsWith('image/')) {
            throw new Error(`Contenido no es imagen: ${contentType}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (!buffer.length) throw new Error('Imagen vacía');

        return { buffer, contentType };
    } finally {
        clearTimeout(timer);
    }
}

async function getFromNekosBest(category) {
    const data = await fetchJson(`${NEKOSBEST_API}/${category}?amount=1`);

    if (!Array.isArray(data?.results) || !data.results.length) {
        throw new Error('NekosBest no devolvió resultados');
    }

    const result = randomItem(data.results);
    if (!result || !isValidHttpUrl(result.url)) {
        throw new Error('La URL recibida no es válida');
    }

    return {
        url: result.url,
        artist: result.artist_name || null,
        artist_url: result.artist_href || null,
        source: result.source_url || null,
        dimensions: result.dimensions || null
    };
}

function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

async function getGachaResult() {
    const gachaId = generateGachaId();
    const rarity = generateRarity();
    const categories = shuffle(CATEGORIES);
    const errors = [];
    const attempts = Math.min(MAX_ATTEMPTS, categories.length);

    for (let i = 0; i < attempts; i++) {
        const category = categories[i];
        try {
            const result = await getFromNekosBest(category);
            return {
                gachaId,
                rarity,
                category,
                attempts: i + 1,
                fallback: i > 0,
                result,
                errors
            };
        } catch (error) {
            errors.push({ category, error: error.message });
        }
    }

    throw new Error(`Gacha falló: ${gachaId}`);
}

// GET /api/anime/gacha?apiKey=...&format=json|image
router.get('/', async (req, res) => {
    const format = String(req.query.format || 'json').toLowerCase();

    if (!['json', 'image'].includes(format)) {
        return res.status(400).json({
            status: false,
            message: 'format debe ser json o image'
        });
    }

    try {
        const data = await getGachaResult();

        if (format === 'image') {
            const image = await downloadImage(data.result.url);
            res.setHeader('Content-Type', image.contentType);
            res.setHeader('Content-Length', image.buffer.length);
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('X-FamilyBot-Gacha-Id', data.gachaId);
            res.setHeader('X-FamilyBot-Rarity', data.rarity.name);
            return res.status(200).send(image.buffer);
        }

        return res.status(200).json({
            status: true,
            creator: 'familybot-md',
            category: data.category,
            url: data.result.url,
            gachaId: data.gachaId,
            rarity: data.rarity.name,
            rarityEmoji: data.rarity.emoji,
            rarityChance: `${data.rarity.chance}%`,
            artist: data.result.artist,
            artist_url: data.result.artist_url,
            source: data.result.source,
            dimensions: data.result.dimensions,
            provider: 'nekos.best',
            attempts: data.attempts,
            fallback: data.fallback,
            message: `🎰 ¡Gacha! Obtuviste ${data.rarity.emoji} ${data.rarity.name}`
        });
    } catch (error) {
        console.error('Error gacha:', error.message);
        return res.status(502).json({
            status: false,
            creator: 'familybot-md',
            message: 'No se pudo completar la tirada de Gacha en este momento'
        });
    }
});

router.meta = {
    title: 'Anime Gacha',
    description: 'Tirada aleatoria con rareza. Puede devolver JSON o la imagen directamente.',
    icon: 'fas fa-dice',
    fields: [
        {
            name: 'format',
            label: 'Formato',
            type: 'select',
            default: 'json',
            options: [
                { value: 'json', label: 'JSON + URL' },
                { value: 'image', label: 'Imagen directa (WhatsApp)' }
            ]
        }
    ],
    resultType: 'image',
    resultField: 'url'
};

module.exports = router;
