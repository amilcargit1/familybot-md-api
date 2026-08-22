const express = require('express');
const router = express.Router();

/*
 * ╔══════════════════════════════════════════════╗
 * ║          FamilyBot-MD Anime API             ║
 * ║              Waifu Aleatoria                ║
 * ╚══════════════════════════════════════════════╝
 *
 * Endpoint:
 *
 * GET /api/anime/waifu?apiKey=TU_API_KEY
 *
 * Proveedor principal:
 * https://nekos.best/api/v2/waifu
 *
 * Fallback:
 * https://api.waifu.pics/sfw/waifu
 */

// ======================================================
// CONFIGURACIÓN
// ======================================================

const NEKOSBEST_API =
    'https://nekos.best/api/v2/waifu';

const WAIFU_API =
    'https://api.waifu.pics/sfw/waifu';

const TIMEOUT_MS = 10000;

const MAX_RETRIES = 2;

// ======================================================
// ESPERA
// ======================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ======================================================
// FETCH JSON CON TIMEOUT
// ======================================================

async function fetchJson(url) {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, TIMEOUT_MS);

    try {

        const response = await fetch(url, {

            method: 'GET',

            headers: {

                'Accept':
                    'application/json',

                /*
                 * NekosBest requiere un User-Agent
                 * identificable.
                 */
                'User-Agent':
                    'FamilyBot-MD-API (https://github.com/amilcargit1/familybot-md-api)',

                'Cache-Control':
                    'no-cache'
            },

            signal:
                controller.signal
        });

        // ==================================================
        // VALIDAR HTTP
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
            response.headers.get(
                'content-type'
            ) || '';

        if (
            !contentType
                .toLowerCase()
                .includes('application/json')
        ) {

            throw new Error(
                'El proveedor no devolvió JSON'
            );
        }

        return await response.json();

    } finally {

        clearTimeout(timeout);
    }
}

// ======================================================
// NEKOSBEST
// ======================================================

async function getFromNekosBest() {

    let lastError = null;

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        try {

            const data =
                await fetchJson(
                    NEKOSBEST_API
                );

            // ==================================================
            // VALIDAR RESPUESTA
            // ==================================================

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

            // ==================================================
            // VALIDAR URL
            // ==================================================

            if (
                !result ||
                typeof result.url !== 'string'
            ) {

                throw new Error(
                    'NekosBest devolvió una URL inválida'
                );
            }

            if (
                !result.url.startsWith(
                    'https://'
                ) &&
                !result.url.startsWith(
                    'http://'
                )
            ) {

                throw new Error(
                    'La URL de la imagen no es válida'
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
                `[NEKOSBEST/WAIFU] Intento ${attempt}/${MAX_RETRIES}:`,
                error.message
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
// FALLBACK WAIFU.PICS
// ======================================================

async function getFromWaifuPics() {

    const data =
        await fetchJson(
            WAIFU_API
        );

    // ==================================================
    // VALIDAR RESPUESTA
    // ==================================================

    if (
        !data ||
        typeof data.url !== 'string'
    ) {

        throw new Error(
            'Waifu.pics devolvió una respuesta inválida'
        );
    }

    // ==================================================
    // VALIDAR URL
    // ==================================================

    if (
        !data.url.startsWith(
            'https://'
        ) &&
        !data.url.startsWith(
            'http://'
        )
    ) {

        throw new Error(
            'La URL del fallback no es válida'
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
// GET /api/anime/waifu
// ======================================================

router.get('/', async (req, res) => {

    // ==================================================
    // NEKOSBEST
    // ==================================================

    try {

        const response =
            await getFromNekosBest();

        const result =
            response.result;

        return res.status(200).json({

            status: true,

            creator:
                'familybot-md',

            type:
                'waifu',

            url:
                result.url,

            provider:
                response.provider,

            fallback:
                false,

            artist:
                result.artist_name ||
                null,

            artist_url:
                result.artist_href ||
                null,

            source:
                result.source_url ||
                null,

            dimensions:
                result.dimensions ||
                null
        });

    } catch (nekosError) {

        console.error(
            '[ANIME/WAIFU] NekosBest falló:',
            nekosError.message
        );

        // ==================================================
        // FALLBACK
        // ==================================================

        try {

            const fallback =
                await getFromWaifuPics();

            return res.status(200).json({

                status: true,

                creator:
                    'familybot-md',

                type:
                    'waifu',

                url:
                    fallback.result.url,

                provider:
                    fallback.provider,

                fallback:
                    true,

                message:
                    'Se utilizó el proveedor de respaldo'
            });

        } catch (fallbackError) {

            console.error(
                '[ANIME/WAIFU] Fallback falló:',
                fallbackError.message
            );

            // ==================================================
            // TODOS LOS PROVEEDORES FALLARON
            // ==================================================

            return res.status(502).json({

                status: false,

                creator:
                    'familybot-md',

                type:
                    'waifu',

                message:
                    'No se pudo obtener una waifu en este momento',

                providers: {

                    primary:
                        'nekos.best',

                    fallback:
                        'waifu.pics'
                },

                // Solo mostrar información de debug
                // fuera de producción.
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
// EXPORTAR
// ======================================================

module.exports = router;