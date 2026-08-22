const express = require('express');
const router = express.Router();

/*
 * ╔══════════════════════════════════════════════╗
 * ║              FamilyBot-MD API               ║
 * ║                 Anime Gacha                 ║
 * ╚══════════════════════════════════════════════╝
 *
 * GET /api/anime/gacha?apiKey=TU_API_KEY
 *
 * Características:
 * - Categorías aleatorias
 * - Rarezas
 * - Timeout
 * - Reintentos
 * - Fallback entre categorías
 * - Validación de respuestas
 * - Compatible con el dashboard actual
 */

// ======================================================
// CONFIGURACIÓN
// ======================================================

const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;

const NEKOSBEST_API = 'https://nekos.best/api/v2';

const USER_AGENT =
    'FamilyBot-MD-API (https://github.com/amilcargit1/familybot-md-api)';

// ======================================================
// CATEGORÍAS
// ======================================================

const CATEGORIES = [
    'waifu',
    'neko',
    'husbando',
    'kitsune'
];

// ======================================================
// RAREZAS
// ======================================================

const RARITIES = [
    {
        name: 'Common',
        emoji: '⚪',
        chance: 55
    },
    {
        name: 'Rare',
        emoji: '🔵',
        chance: 30
    },
    {
        name: 'Epic',
        emoji: '🟣',
        chance: 12
    },
    {
        name: 'Legendary',
        emoji: '🟡',
        chance: 3
    }
];

// ======================================================
// ESPERA
// ======================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ======================================================
// ALEATORIO
// ======================================================

function randomItem(array) {
    return array[
        Math.floor(Math.random() * array.length)
    ];
}

// ======================================================
// ID DEL GACHA
// ======================================================

function generateGachaId() {

    return (
        Date.now().toString(36) +
        '-' +
        Math.random()
            .toString(36)
            .substring(2, 10)
    ).toUpperCase();
}

// ======================================================
// RAREZA
// ======================================================

function generateRarity() {

    const random = Math.random() * 100;

    let accumulated = 0;

    for (const rarity of RARITIES) {

        accumulated += rarity.chance;

        if (random <= accumulated) {
            return rarity;
        }
    }

    return RARITIES[0];
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
                'Accept': 'application/json',
                'User-Agent': USER_AGENT,
                'Cache-Control': 'no-cache'
            },

            signal: controller.signal
        });

        // --------------------------------------------------
        // HTTP
        // --------------------------------------------------

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        // --------------------------------------------------
        // CONTENT TYPE
        // --------------------------------------------------

        const contentType =
            response.headers.get('content-type') || '';

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

    if (typeof url !== 'string') {
        return false;
    }

    try {

        const parsed = new URL(url);

        return (
            parsed.protocol === 'https:' ||
            parsed.protocol === 'http:'
        );

    } catch {

        return false;
    }
}

// ======================================================
// OBTENER DE NEKOSBEST
// ======================================================

async function getFromNekosBest(category) {

    const url =
        `${NEKOSBEST_API}/${category}?amount=1`;

    const data =
        await fetchJson(url);

    // --------------------------------------------------
    // VALIDAR RESULTS
    // --------------------------------------------------

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

    // --------------------------------------------------
    // VALIDAR RESULTADO
    // --------------------------------------------------

    if (!result) {

        throw new Error(
            'Resultado vacío'
        );
    }

    // --------------------------------------------------
    // VALIDAR URL
    // --------------------------------------------------

    if (!isValidUrl(result.url)) {

        throw new Error(
            'La URL recibida no es válida'
        );
    }

    // --------------------------------------------------
    // DEVOLVER DATOS
    // --------------------------------------------------

    return {

        url: result.url,

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
// CREAR ORDEN DE CATEGORÍAS
// ======================================================

function createCategoryOrder() {

    const shuffled = [...CATEGORIES];

    for (
        let i = shuffled.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            shuffled[i],
            shuffled[j]
        ] = [
            shuffled[j],
            shuffled[i]
        ];
    }

    return shuffled;
}

// ======================================================
// GET /api/anime/gacha
// ======================================================

router.get('/', async (req, res) => {

    const gachaId =
        generateGachaId();

    const rarity =
        generateRarity();

    const categoryOrder =
        createCategoryOrder();

    const errors = [];

    const maxAttempts =
        Math.min(
            MAX_ATTEMPTS,
            categoryOrder.length
        );

    // ==================================================
    // CASCADA
    // ==================================================

    for (
        let i = 0;
        i < maxAttempts;
        i++
    ) {

        const category =
            categoryOrder[i];

        try {

            console.log(
                `[GACHA] ${gachaId} → ${category} → ${rarity.name}`
            );

            const result =
                await getFromNekosBest(
                    category
                );

            // ==================================================
            // ÉXITO
            // ==================================================

            console.log(
                `[GACHA] ${gachaId} → ${category} OK`
            );

            /*
             * IMPORTANTE:
             *
             * category y url están directamente
             * en el JSON para mantener compatibilidad
             * con el dashboard actual.
             */

            return res.status(200).json({

                status: true,

                creator:
                    'familybot-md',

                // ==============================================
                // CAMPOS PRINCIPALES DEL DASHBOARD
                // ==============================================

                category:
                    category,

                url:
                    result.url,

                // ==============================================
                // GACHA
                // ==============================================

                gachaId:
                    gachaId,

                rarity:
                    rarity.name,

                rarityEmoji:
                    rarity.emoji,

                rarityChance:
                    `${rarity.chance}%`,

                // ==============================================
                // INFORMACIÓN DE LA IMAGEN
                // ==============================================

                artist:
                    result.artist,

                artist_url:
                    result.artist_url,

                source:
                    result.source,

                dimensions:
                    result.dimensions,

                // ==============================================
                // PROVEEDOR
                // ==============================================

                provider:
                    'nekos.best',

                attempts:
                    i + 1,

                fallback:
                    i > 0,

                // ==============================================
                // MENSAJE
                // ==============================================

                message:
                    `🎰 ¡Gacha! Obtuviste ${rarity.emoji} ${rarity.name}`
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
                `[GACHA] ${gachaId} → ${category} → ${errorMessage}`
            );

            errors.push({

                category:
                    category,

                error:
                    errorMessage
            });

            // --------------------------------------------------
            // Esperar antes del siguiente proveedor/categoría
            // --------------------------------------------------

            if (
                i <
                maxAttempts - 1
            ) {

                await sleep(300);
            }
        }
    }

    // ==================================================
    // TODO FALLÓ
    // ==================================================

    console.error(
        `[GACHA] ${gachaId} → todos los intentos fallaron`
    );

    return res.status(502).json({

        status: false,

        creator:
            'familybot-md',

        gachaId:
            gachaId,

        message:
            'No se pudo completar la tirada de Gacha en este momento',

        provider:
            'nekos.best',

        attempts:
            maxAttempts,

        fallback:
            true,

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