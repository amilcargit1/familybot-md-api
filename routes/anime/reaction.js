const express = require('express');
const router = express.Router();

/*
 * ╔══════════════════════════════════════╗
 * ║       FamilyBot-MD Anime API        ║
 * ║          Anime Reactions            ║
 * ╚══════════════════════════════════════╝
 *
 * GET:
 * /api/anime/reaction?apiKey=TU_API_KEY&type=hug
 */

// Reacciones SFW disponibles
const ALLOWED = new Set([
    'awoo',
    'bite',
    'blush',
    'bored',
    'cry',
    'cuddle',
    'dance',
    'happy',
    'highfive',
    'hug',
    'kiss',
    'laugh',
    'lick',
    'nom',
    'pat',
    'poke',
    'punch',
    'shoot',
    'slap',
    'smile',
    'smug',
    'wave',
    'wink',
    'yeet'
]);

const PROVIDER = 'https://api.waifu.pics/sfw';

// Tiempo máximo de espera
const TIMEOUT_MS = 10000;

/**
 * Realiza una petición segura al proveedor.
 */
async function fetchWithTimeout(url) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'GET',

            headers: {
                'Accept': 'application/json',
                'User-Agent': 'FamilyBot-MD-API/2.0'
            },

            signal: controller.signal
        });

        // Comprobar estado HTTP
        if (!response.ok) {
            throw new Error(
                `El proveedor respondió con HTTP ${response.status}`
            );
        }

        // Comprobar que realmente sea JSON
        const contentType =
            response.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
            throw new Error(
                'El proveedor no devolvió una respuesta JSON'
            );
        }

        return await response.json();

    } finally {
        clearTimeout(timeout);
    }
}

/**
 * GET /api/anime/reaction
 */
router.get('/', async (req, res) => {

    // Obtener type
    const type = String(
        req.query.type || ''
    )
        .trim()
        .toLowerCase();

    // ==========================================
    // FALTA TYPE
    // ==========================================

    if (!type) {
        return res.status(400).json({
            status: false,
            creator: 'familybot-md',

            message: 'Falta el parámetro type',

            example:
                '/api/anime/reaction?apiKey=TU_API_KEY&type=hug',

            available: [...ALLOWED]
        });
    }

    // ==========================================
    // TYPE INVÁLIDO
    // ==========================================

    if (!ALLOWED.has(type)) {
        return res.status(400).json({
            status: false,
            creator: 'familybot-md',

            message:
                `La reacción "${type}" no es válida`,

            available: [...ALLOWED]
        });
    }

    // ==========================================
    // PETICIÓN AL PROVEEDOR
    // ==========================================

    try {

        const url =
            `${PROVIDER}/${encodeURIComponent(type)}`;

        const data =
            await fetchWithTimeout(url);

        // ======================================
        // VALIDAR RESPUESTA
        // ======================================

        if (
            !data ||
            typeof data.url !== 'string' ||
            !data.url.startsWith('http')
        ) {
            throw new Error(
                'El proveedor devolvió una respuesta inválida'
            );
        }

        // ======================================
        // RESPUESTA EXITOSA
        // ======================================

        return res.status(200).json({
            status: true,

            creator: 'familybot-md',

            type: type,

            url: data.url,

            provider: 'waifu.pics'
        });

    } catch (err) {

        // ======================================
        // MANEJO DE ERRORES
        // ======================================

        const errorMessage =
            err?.name === 'AbortError'
                ? 'El proveedor tardó demasiado en responder'
                : err?.message || 'Error desconocido';

        console.error(
            `[ANIME/REACTION] ${type}: ${errorMessage}`
        );

        return res.status(502).json({
            status: false,

            creator: 'familybot-md',

            type: type,

            message:
                'No se pudo obtener la reacción anime en este momento',

            /*
             * En desarrollo mostramos el error.
             * En producción no mostramos información interna.
             */
            ...(process.env.NODE_ENV !== 'production'
                ? {
                    error: errorMessage
                }
                : {})
        });
    }
});

module.exports = router;