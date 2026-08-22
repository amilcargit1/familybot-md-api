const express = require('express');
const router = express.Router();

/*
 * ╔══════════════════════════════════════════════╗
 * ║              FamilyBot-MD API               ║
 * ║               Anime Reactions               ║
 * ╚══════════════════════════════════════════════╝
 *
 * Endpoint:
 *
 * GET /api/anime/reaction?apiKey=TU_API_KEY&type=hug
 *
 * Proxy:
 *
 * GET /api/anime/reaction/image?apiKey=TU_API_KEY&type=hug
 *
 * El bot descarga la imagen desde nuestro propio servidor.
 */

// ======================================================
// CONFIGURACIÓN
// ======================================================

const NEKOSBEST_API =
    'https://nekos.best/api/v2';

const WAIFU_API =
    'https://api.waifu.pics/sfw';

const TIMEOUT_MS = 10000;

const MAX_RETRIES = 2;

// ======================================================
// USER AGENT
// ======================================================

const USER_AGENT =
    'FamilyBot-MD-API (https://github.com/amilcargit1/familybot-md-api)';

// ======================================================
// REACCIONES NEKOSBEST
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
// FALLBACK WAIFU.PICS
// ======================================================

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

    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}

// ======================================================
// VALIDAR URL
// ======================================================

function isValidUrl(url) {

    if (
        typeof url !== 'string'
    ) {
        return false;
    }

    try {

        const parsed =
            new URL(url);

        return (
            parsed.protocol === 'http:' ||
            parsed.protocol === 'https:'
        );

    } catch {

        return false;
    }
}

// ======================================================
// FETCH JSON
// ======================================================

async function fetchJson(
    url,
    options = {}
) {

    const controller =
        new AbortController();

    const timeout =
        setTimeout(() => {

            controller.abort();

        }, TIMEOUT_MS);

    try {

        const response =
            await fetch(url, {

                method: 'GET',

                headers: {

                    'Accept':
                        'application/json',

                    'User-Agent':
                        USER_AGENT,

                    ...options.headers
                },

                signal:
                    controller.signal
            });

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const contentType =
            response.headers.get(
                'content-type'
            ) || '';

        if (
            !contentType
                .toLowerCase()
                .includes('application/json')
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
// FETCH IMAGEN
// ======================================================

async function fetchImage(url) {

    const controller =
        new AbortController();

    const timeout =
        setTimeout(() => {

            controller.abort();

        }, TIMEOUT_MS);

    try {

        const response =
            await fetch(url, {

                method: 'GET',

                headers: {

                    /*
                     * IMPORTANTE:
                     * Estos headers se envían cuando
                     * nuestra API descarga la imagen.
                     */

                    'User-Agent':
                        USER_AGENT,

                    'Accept':
                        'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',

                    'Referer':
                        'https://nekos.best/'
                },

                signal:
                    controller.signal
            });

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const contentType =
            response.headers.get(
                'content-type'
            ) || '';

        if (
            !contentType
                .toLowerCase()
                .startsWith('image/')
        ) {

            throw new Error(
                `Contenido no válido: ${contentType}`
            );
        }

        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            );

        if (
            !buffer ||
            buffer.length === 0
        ) {

            throw new Error(
                'La imagen está vacía'
            );
        }

        return {

            buffer,

            contentType
        };

    } finally {

        clearTimeout(timeout);
    }
}

// ======================================================
// NEKOSBEST
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

            if (
                !data ||
                !Array.isArray(
                    data.results
                ) ||
                data.results.length === 0
            ) {

                throw new Error(
                    'NekosBest no devolvió resultados'
                );
            }

            const result =
                data.results[0];

            if (
                !result ||
                !isValidUrl(result.url)
            ) {

                throw new Error(
                    'NekosBest devolvió una URL inválida'
                );
            }

            return {

                success: true,

                provider:
                    'nekos.best',

                result
            };

        } catch (error) {

            lastError =
                error;

            console.error(
                `[NEKOSBEST] ${type} | intento ${attempt}/${MAX_RETRIES}: ${error.message}`
            );

            if (
                attempt <
                MAX_RETRIES
            ) {

                await sleep(500);
            }
        }
    }

    throw (
        lastError ||
        new Error(
            'NekosBest no disponible'
        )
    );
}

// ======================================================
// WAIFU.PICS
// ======================================================

async function getFromWaifu(type) {

    const fallbackType =
        WAIFU_FALLBACK[type];

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
        !isValidUrl(data.url)
    ) {

        throw new Error(
            'Waifu.pics devolvió una URL inválida'
        );
    }

    return {

        success: true,

        provider:
            'waifu.pics',

        result: {

            url:
                data.url
        }
    };
}

// ======================================================
// OBTENER REACCIÓN
// ======================================================

async function getReaction(type) {

    /*
     * PRIMER PROVEEDOR
     */

    try {

        const response =
            await getFromNekosBest(
                type
            );

        return {

            ...response,

            fallback:
                false
        };

    } catch (nekosError) {

        console.error(
            `[ANIME] NekosBest falló para ${type}: ${nekosError.message}`
        );
    }

    /*
     * FALLBACK
     */

    try {

        const response =
            await getFromWaifu(
                type
            );

        return {

            ...response,

            fallback:
                true
        };

    } catch (fallbackError) {

        console.error(
            `[ANIME] Waifu.pics falló para ${type}: ${fallbackError.message}`
        );

        throw new Error(
            'Todos los proveedores fallaron'
        );
    }
}

// ======================================================
// GET /api/anime/reaction
// ======================================================
//
// Devuelve JSON.
// La URL devuelta apunta a nuestro PROXY.
//

router.get('/', async (req, res) => {

    const type =
        String(
            req.query.type || ''
        )
            .trim()
            .toLowerCase();

    // ==================================================
    // VALIDAR TYPE
    // ==================================================

    if (!type) {

        return res.status(400).json({

            status: false,

            creator:
                'familybot-md',

            message:
                'Debes especificar una reacción',

            example:
                '/api/anime/reaction?apiKey=TU_API_KEY&type=hug',

            available:
                [...ALLOWED]
        });
    }

    if (
        !ALLOWED.has(type)
    ) {

        return res.status(400).json({

            status: false,

            creator:
                'familybot-md',

            message:
                `La reacción "${type}" no existe`,

            available:
                [...ALLOWED]
        });
    }

    try {

        const response =
            await getReaction(type);

        const result =
            response.result;

        /*
         * Creamos una URL de nuestro propio servidor.
         *
         * El bot descargará desde:
         *
         * familybot-md-api.onrender.com
         *
         * y NO directamente desde NekosBest.
         */

        const host =
            `${req.protocol}://${req.get('host')}`;

        const apiKey =
            typeof req.query.apiKey === 'string'
                ? req.query.apiKey
                : '';

        const proxyUrl =
            `${host}/api/anime/reaction/image?apiKey=${encodeURIComponent(apiKey)}&type=${encodeURIComponent(type)}`;

        return res.status(200).json({

            status:
                true,

            creator:
                'familybot-md',

            type:
                type,

            /*
             * IMPORTANTE:
             * El bot utilizará esta URL.
             */

            url:
                proxyUrl,

            /*
             * URL original disponible
             * solamente como información.
             */

            original_url:
                result.url,

            provider:
                response.provider,

            fallback:
                response.fallback,

            anime:
                result.anime_name ||
                null,

            artist:
                result.artist_name ||
                null,

            source:
                result.source_url ||
                null,

            dimensions:
                result.dimensions ||
                null
        });

    } catch (error) {

        return res.status(502).json({

            status:
                false,

            creator:
                'familybot-md',

            type:
                type,

            message:
                'No se pudo obtener la reacción anime en este momento',

            provider:
                'nekos.best',

            fallback:
                'waifu.pics'
        });
    }
});

// ======================================================
// GET /api/anime/reaction/image
// ======================================================
//
// ESTE ES EL PROXY.
//
// El bot solicita esta URL.
//
// La API:
// 1. Consulta NekosBest.
// 2. Si falla usa Waifu.pics.
// 3. Descarga la imagen.
// 4. La envía directamente al bot.
//
// El bot nunca toca directamente NekosBest.
//

router.get('/image', async (req, res) => {

    const type =
        String(
            req.query.type || ''
        )
            .trim()
            .toLowerCase();

    // ==================================================
    // VALIDAR TYPE
    // ==================================================

    if (!type) {

        return res.status(400).send(
            'Falta el tipo de reacción'
        );
    }

    if (
        !ALLOWED.has(type)
    ) {

        return res.status(400).send(
            'Tipo de reacción inválido'
        );
    }

    try {

        /*
         * Obtener reacción.
         */

        const response =
            await getReaction(type);

        const imageUrl =
            response.result.url;

        /*
         * Descargar imagen desde el servidor
         * de la API.
         */

        const image =
            await fetchImage(
                imageUrl
            );

        /*
         * Headers importantes para WhatsApp.
         */

        res.setHeader(
            'Content-Type',
            image.contentType
        );

        res.setHeader(
            'Content-Length',
            image.buffer.length
        );

        res.setHeader(
            'Cache-Control',
            'public, max-age=300'
        );

        res.setHeader(
            'X-FamilyBot-Provider',
            response.provider
        );

        res.setHeader(
            'X-FamilyBot-Fallback',
            String(
                response.fallback
            )
        );

        /*
         * Enviar imagen.
         */

        return res
            .status(200)
            .send(image.buffer);

    } catch (error) {

        console.error(
            `[PROXY] Error descargando ${type}:`,
            error.message
        );

        return res.status(502).send(
            'No se pudo descargar la imagen'
        );
    }
});

// ======================================================
// EXPORTAR
// ======================================================

module.exports = router;