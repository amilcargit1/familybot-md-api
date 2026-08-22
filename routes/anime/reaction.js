const express = require('express');
const router = express.Router();

/*
 * ╔══════════════════════════════════════════════╗
 * ║          FamilyBot-MD Anime API             ║
 * ║              Anime Reactions                ║
 * ╚══════════════════════════════════════════════╝
 *
 * Endpoint:
 *
 * GET /api/anime/reaction?apiKey=TU_API_KEY&type=hug
 *
 * Proveedor principal:
 * https://nekos.best/api/v2
 *
 * Fallback:
 * https://api.waifu.pics/sfw
 */

// ======================================================
// CONFIGURACIÓN
// ======================================================

const NEKOSBEST_API = 'https://nekos.best/api/v2';
const WAIFU_API = 'https://api.waifu.pics/sfw';

const TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

// ======================================================
// 59 REACCIONES DE NEKOSBEST
// ======================================================

const ALLOWED = new Set([
    'angry',
    'baka',
    'bite',
    'bleh',
    'blowkiss',
    'blush',
    'bonk',
    'bored',
    'carry',
    'clap',
    'confused',
    'cry',
    'cuddle',
    'dance',
    'facepalm',
    'feed',
    'handhold',
    'handshake',
    'happy',
    'highfive',
    'hug',
    'kabedon',
    'kick',
    'kiss',
    'lappillow',
    'laugh',
    'lurk',
    'nod',
    'nom',
    'nope',
    'nya',
    'pat',
    'peck',
    'poke',
    'pout',
    'punch',
    'run',
    'salute',
    'shake',
    'shoot',
    'shocked',
    'shrug',
    'sip',
    'slap',
    'sleep',
    'smile',
    'smug',
    'spin',
    'stare',
    'tableflip',
    'teehee',
    'think',
    'thumbsup',
    'tickle',
    'wag',
    'wave',
    'wink',
    'yawn',
    'yeet'
]);

// ======================================================
// REACCIONES COMPATIBLES CON WAIFU.PICS
// ======================================================
//
// Waifu.pics no tiene todas las categorías de NekosBest.
// Por eso solamente usamos fallback cuando existe
// una categoría equivalente.
//

const WAIFU_FALLBACK = {
    bite: 'bite',
    blush: 'blush',
    bored: 'bored',
    cry: 'cry',
    cuddle: 'cuddle',
    dance: 'dance',
    happy: 'happy',
    highfive: 'highfive',
    hug: 'hug',
    kiss: 'kiss',
    laugh: 'laugh',
    lick: 'lick',
    nom: 'nom',
    pat: 'pat',
    poke: 'poke',
    punch: 'punch',
    shoot: 'shoot',
    slap: 'slap',
    smile: 'smile',
    smug: 'smug',
    wave: 'wave',
    wink: 'wink',
    yeet: 'yeet'
};

// ======================================================
// SLEEP
// ======================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ======================================================
// FETCH CON TIMEOUT
// ======================================================

async function fetchJson(url, options = {}) {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, TIMEOUT_MS);

    try {

        const response = await fetch(url, {
            method: 'GET',

            headers: {
                'Accept': 'application/json',

                // NekosBest exige un User-Agent identificable.
                'User-Agent':
                    'FamilyBot-MD-API (https://github.com/amilcargit1/familybot-md-api)',

                ...options.headers
            },

            signal: controller.signal
        });

        // ==================================================
        // ERROR HTTP
        // ==================================================

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        // ==================================================
        // VALIDAR CONTENT-TYPE
        // ==================================================

        const contentType =
            response.headers.get('content-type') || '';

        if (
            !contentType.toLowerCase().includes('application/json')
        ) {

            throw new Error(
                'La respuesta no es JSON'
            );
        }

        return await response.json();

    } finally {

        clearTimeout(timeout);
    }
}

// ======================================================
// OBTENER DE NEKOSBEST
// ======================================================

async function getFromNekosBest(type) {

    let lastError = null;

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        try {

            const url =
                `${NEKOSBEST_API}/${encodeURIComponent(type)}?amount=1`;

            const data =
                await fetchJson(url);

            // ==================================================
            // VALIDAR ESTRUCTURA
            // ==================================================

            if (
                !data ||
                !Array.isArray(data.results) ||
                data.results.length === 0
            ) {

                throw new Error(
                    'NekosBest no devolvió resultados'
                );
            }

            const result = data.results[0];

            if (
                !result ||
                typeof result.url !== 'string'
            ) {

                throw new Error(
                    'NekosBest devolvió una URL inválida'
                );
            }

            if (
                !result.url.startsWith('http://') &&
                !result.url.startsWith('https://')
            ) {

                throw new Error(
                    'La URL recibida no es válida'
                );
            }

            return {
                success: true,
                provider: 'nekos.best',
                result
            };

        } catch (error) {

            lastError = error;

            console.error(
                `[NEKOSBEST] ${type} | intento ${attempt}/${MAX_RETRIES}:`,
                error.message
            );

            if (attempt < MAX_RETRIES) {
                await sleep(500);
            }
        }
    }

    throw lastError || new Error(
        'NekosBest no disponible'
    );
}

// ======================================================
// FALLBACK WAIFU.PICS
// ======================================================

async function getFromWaifu(type) {

    const fallbackType =
        WAIFU_FALLBACK[type];

    // No existe equivalente
    if (!fallbackType) {

        throw new Error(
            `No existe fallback para ${type}`
        );
    }

    const url =
        `${WAIFU_API}/${encodeURIComponent(fallbackType)}`;

    const data =
        await fetchJson(url);

    if (
        !data ||
        typeof data.url !== 'string'
    ) {

        throw new Error(
            'Waifu.pics devolvió una respuesta inválida'
        );
    }

    if (
        !data.url.startsWith('http://') &&
        !data.url.startsWith('https://')
    ) {

        throw new Error(
            'La URL del fallback no es válida'
        );
    }

    return {
        success: true,
        provider: 'waifu.pics',
        result: {
            url: data.url
        }
    };
}

// ======================================================
// GET /api/anime/reaction
// ======================================================

router.get('/', async (req, res) => {

    // ==================================================
    // OBTENER TYPE
    // ==================================================

    const type =
        String(req.query.type || '')
            .trim()
            .toLowerCase();

    // ==================================================
    // TYPE FALTANTE
    // ==================================================

    if (!type) {

        return res.status(400).json({

            status: false,

            creator: 'familybot-md',

            message:
                'Debes especificar una reacción',

            example:
                '/api/anime/reaction?apiKey=TU_API_KEY&type=hug',

            available:
                [...ALLOWED]
        });
    }

    // ==================================================
    // TYPE INVÁLIDO
    // ==================================================

    if (!ALLOWED.has(type)) {

        return res.status(400).json({

            status: false,

            creator: 'familybot-md',

            message:
                `La reacción "${type}" no existe`,

            available:
                [...ALLOWED]
        });
    }

    // ==================================================
    // NEKOSBEST
    // ==================================================

    try {

        const response =
            await getFromNekosBest(type);

        const result =
            response.result;

        return res.status(200).json({

            status: true,

            creator: 'familybot-md',

            type,

            url: result.url,

            provider:
                response.provider,

            fallback: false,

            anime:
                result.anime_name || null,

            artist:
                result.artist_name || null,

            source:
                result.source_url || null,

            dimensions:
                result.dimensions || null
        });

    } catch (nekosError) {

        console.error(
            `[ANIME] NekosBest falló para "${type}":`,
            nekosError.message
        );

        // ==================================================
        // FALLBACK
        // ==================================================

        try {

            const fallback =
                await getFromWaifu(type);

            return res.status(200).json({

                status: true,

                creator: 'familybot-md',

                type,

                url:
                    fallback.result.url,

                provider:
                    fallback.provider,

                fallback: true,

                message:
                    'Se utilizó el proveedor de respaldo'
            });

        } catch (fallbackError) {

            console.error(
                `[ANIME] Fallback falló para "${type}":`,
                fallbackError.message
            );

            // ==================================================
            // TODOS LOS PROVEEDORES FALLARON
            // ==================================================

            return res.status(502).json({

                status: false,

                creator: 'familybot-md',

                type,

                message:
                    'No se pudo obtener la reacción anime en este momento',

                providers: {
                    primary: 'nekos.best',
                    fallback: 'waifu.pics'
                },

                /*
                 * No mostramos errores internos en producción.
                 */
                ...(process.env.NODE_ENV !== 'production'
                    ? {
                        debug: {
                            nekosbest:
                                nekosError.message,

                            fallback:
                                fallbackError.message
                        }
                    }
                    : {})
            });
        }
    }
});

// ======================================================
// EXPORTAR ROUTER
// ======================================================

module.exports = router;