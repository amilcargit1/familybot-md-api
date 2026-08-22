const express = require('express');
const router = express.Router();

/*
 * ╔══════════════════════════════════════════════════╗
 * ║              FamilyBot-MD API                   ║
 * ║                 Random Waifu                    ║
 * ╚══════════════════════════════════════════════════╝
 *
 * Endpoint:
 *
 * GET /api/anime/waifu?apiKey=TU_API_KEY
 *
 * Proveedores:
 *
 * 1. NekosBest
 * 2. Waifu.im
 * 3. Waifu.pics
 *
 * Si uno falla, automáticamente intenta el siguiente.
 */

// ======================================================
// CONFIGURACIÓN
// ======================================================

const TIMEOUT_MS = 8000;

// ======================================================
// PROVEEDORES
// ======================================================

const PROVIDERS = [
    {
        name: 'nekos.best',
        url: 'https://nekos.best/api/v2/waifu'
    },

    {
        name: 'waifu.im',
        url: 'https://api.waifu.im/images?IncludedTags=waifu'
    },

    {
        name: 'waifu.pics',
        url: 'https://api.waifu.pics/sfw/waifu'
    }
];

// ======================================================
// FETCH CON TIMEOUT
// ======================================================

async function fetchJson(url, extraHeaders = {}) {

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

                    /*
                     * User-Agent identificable para NekosBest.
                     */
                    'User-Agent':
                        'FamilyBot-MD-API (https://github.com/amilcargit1/familybot-md-api)',

                    ...extraHeaders
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
        // VALIDAR JSON
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
                'La respuesta no es JSON'
            );
        }

        return await response.json();

    } finally {

        clearTimeout(timeout);
    }
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
            parsed.protocol === 'https:' ||
            parsed.protocol === 'http:'
        );

    } catch {

        return false;
    }
}

// ======================================================
// PROVEEDOR 1
// NEKOSBEST
// ======================================================

async function getNekosBest() {

    const provider =
        PROVIDERS[0];

    const data =
        await fetchJson(
            provider.url
        );

    // NekosBest:
    // { results: [{ url, dimensions, ... }] }

    if (
        !data ||
        !Array.isArray(data.results) ||
        data.results.length === 0
    ) {

        throw new Error(
            'No devolvió resultados'
        );
    }

    const result =
        data.results[0];

    if (
        !result ||
        !isValidUrl(result.url)
    ) {

        throw new Error(
            'URL inválida'
        );
    }

    return {

        provider:
            provider.name,

        url:
            result.url,

        artist:
            result.artist_name || null,

        artist_url:
            result.artist_href || null,

        source:
            result.source_url || null,

        dimensions:
            result.dimensions || null
    };
}

// ======================================================
// PROVEEDOR 2
// WAIFU.IM
// ======================================================

async function getWaifuIm() {

    const provider =
        PROVIDERS[1];

    const data =
        await fetchJson(
            provider.url,
            {
                /*
                 * Fijamos la versión actual
                 * para evitar cambios inesperados.
                 */
                'Accept-Version': 'v7'
            }
        );

    // Waifu.im v7:
    // { items: [{ url, ... }] }

    if (
        !data ||
        !Array.isArray(data.items) ||
        data.items.length === 0
    ) {

        throw new Error(
            'No devolvió imágenes'
        );
    }

    const image =
        data.items[0];

    if (
        !image ||
        !isValidUrl(image.url)
    ) {

        throw new Error(
            'URL inválida'
        );
    }

    return {

        provider:
            provider.name,

        url:
            image.url,

        artist:
            Array.isArray(image.artists) &&
            image.artists.length > 0
                ? image.artists[0].name
                : null,

        artist_url:
            Array.isArray(image.artists) &&
            image.artists.length > 0
                ? (
                    image.artists[0].pixiv ||
                    image.artists[0].twitter ||
                    null
                )
                : null,

        source:
            image.source || null,

        dimensions: {

            width:
                image.width || null,

            height:
                image.height || null
        }
    };
}

// ======================================================
// PROVEEDOR 3
// WAIFU.PICS
// ======================================================

async function getWaifuPics() {

    const provider =
        PROVIDERS[2];

    const data =
        await fetchJson(
            provider.url
        );

    // Waifu.pics:
    // { url: "..." }

    if (
        !data ||
        !isValidUrl(data.url)
    ) {

        throw new Error(
            'URL inválida'
        );
    }

    return {

        provider:
            provider.name,

        url:
            data.url,

        artist:
            null,

        artist_url:
            null,

        source:
            null,

        dimensions:
            null
    };
}

// ======================================================
// EJECUTAR PROVEEDOR
// ======================================================

async function executeProvider(index) {

    switch (index) {

        case 0:
            return await getNekosBest();

        case 1:
            return await getWaifuIm();

        case 2:
            return await getWaifuPics();

        default:
            throw new Error(
                'Proveedor desconocido'
            );
    }
}

// ======================================================
// GET /api/anime/waifu
// ======================================================

router.get('/', async (req, res) => {

    const errors = [];

    // ==================================================
    // CASCADA
    // ==================================================

    for (
        let i = 0;
        i < PROVIDERS.length;
        i++
    ) {

        const provider =
            PROVIDERS[i];

        try {

            console.log(
                `[ANIME/WAIFU] Probando ${provider.name}...`
            );

            const result =
                await executeProvider(i);

            // ==================================================
            // ÉXITO
            // ==================================================

            console.log(
                `[ANIME/WAIFU] ${provider.name} respondió correctamente`
            );

            return res.status(200).json({

                status: true,

                creator:
                    'familybot-md',

                type:
                    'waifu',

                url:
                    result.url,

                provider:
                    result.provider,

                /*
                 * false = funcionó el primero
                 * true  = se necesitó fallback
                 */
                fallback:
                    i > 0,

                fallbackLevel:
                    i,

                artist:
                    result.artist,

                artist_url:
                    result.artist_url,

                source:
                    result.source,

                dimensions:
                    result.dimensions
            });

        } catch (error) {

            const errorMessage =
                error?.name === 'AbortError'
                    ? 'Timeout'
                    : (
                        error?.message ||
                        'Error desconocido'
                    );

            console.error(
                `[ANIME/WAIFU] ${provider.name} falló: ${errorMessage}`
            );

            errors.push({

                provider:
                    provider.name,

                error:
                    errorMessage
            });
        }
    }

    // ==================================================
    // TODOS FALLARON
    // ==================================================

    console.error(
        '[ANIME/WAIFU] Todos los proveedores fallaron'
    );

    return res.status(502).json({

        status: false,

        creator:
            'familybot-md',

        type:
            'waifu',

        message:
            'Todos los proveedores de waifus están temporalmente fuera de servicio',

        providers:
            PROVIDERS.map(
                provider =>
                    provider.name
            ),

        /*
         * Solo mostramos detalles fuera de producción.
         */
        ...(process.env.NODE_ENV !== 'production'
            ? {
                debug:
                    errors
            }
            : {})
    });
});

// ======================================================
// EXPORTAR
// ======================================================

module.exports = router;