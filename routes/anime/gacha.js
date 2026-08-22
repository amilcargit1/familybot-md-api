const express = require('express');
const router = express.Router();

/*
 * ╔══════════════════════════════════════════════════╗
 * ║                 FamilyBot-MD API                ║
 * ║                    Anime Gacha                  ║
 * ╚══════════════════════════════════════════════════╝
 *
 * Endpoint:
 *
 * GET /api/anime/gacha?apiKey=TU_API_KEY
 *
 * Sistema:
 *
 * 1. Elige una categoría aleatoria.
 * 2. Genera una rareza.
 * 3. Consulta NekosBest.
 * 4. Si falla, prueba otra categoría.
 * 5. Si todo falla, devuelve 502.
 */

// ======================================================
// CONFIGURACIÓN
// ======================================================

const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;

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
//
// Probabilidades aproximadas:
//
// Common     55%
// Rare       30%
// Epic       12%
// Legendary   3%
//

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
// PROVEEDOR
// ======================================================

const NEKOSBEST_API =
    'https://nekos.best/api/v2';

// ======================================================
// USER AGENT
// ======================================================
//
// NekosBest requiere un User-Agent identificable.
//

const USER_AGENT =
    'FamilyBot-MD-API (https://github.com/amilcargit1/familybot-md-api)';

// ======================================================
// SLEEP
// ======================================================

function sleep(ms) {

    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}

// ======================================================
// ELECCIÓN ALEATORIA
// ======================================================

function randomItem(array) {

    return array[
        Math.floor(
            Math.random() * array.length
        )
    ];
}

// ======================================================
// GENERAR ID DE TIRADA
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
// GENERAR RAREZA
// ======================================================

function generateRarity() {

    const random =
        Math.random() * 100;

    let accumulated = 0;

    for (const rarity of RARITIES) {

        accumulated +=
            rarity.chance;

        if (
            random <=
            accumulated
        ) {

            return rarity;
        }
    }

    return RARITIES[0];
}

// ======================================================
// FETCH CON TIMEOUT
// ======================================================

async function fetchJson(url) {

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
// OBTENER IMAGEN DE NEKOSBEST
// ======================================================

async function getFromNekosBest(category) {

    const url =
        `${NEKOSBEST_API}/${category}?amount=1`;

    const data =
        await fetchJson(url);

    // ==================================================
    // VALIDAR RESULTS
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
    // VALIDAR RESULTADO
    // ==================================================

    if (!result) {

        throw new Error(
            'Resultado vacío'
        );
    }

    // ==================================================
    // VALIDAR URL
    // ==================================================

    if (
        !isValidUrl(
            result.url
        )
    ) {

        throw new Error(
            'La URL recibida no es válida'
        );
    }

    // ==================================================
    // DEVOLVER DATOS
    // ==================================================

    return {

        url:
            result.url,

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
    };
}

// ======================================================
// CREAR ORDEN DE CATEGORÍAS
// ======================================================
//
// La primera categoría es aleatoria.
// Las siguientes sirven como fallback.
//

function createCategoryOrder() {

    const shuffled =
        [...CATEGORIES];

    for (
        let i = shuffled.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
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

    // ==================================================
    // INTENTOS
    // ==================================================

    for (
        let i = 0;
        i < Math.min(
            MAX_ATTEMPTS,
            categoryOrder.length
        );
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
                `[GACHA] ${gachaId} → éxito con ${category}`
            );

            return res.status(200).json({

                status: true,

                creator:
                    'familybot-md',

                gacha: {

                    id:
                        gachaId,

                    category:
                        category,

                    rarity:
                        rarity.name,

                    rarityEmoji:
                        rarity.emoji,

                    rarityChance:
                        `${rarity.chance}%`
                },

                result: {

                    url:
                        result.url,

                    artist:
                        result.artist,

                    artist_url:
                        result.artist_url,

                    source:
                        result.source,

                    dimensions:
                        result.dimensions
                },

                provider:
                    'nekos.best',

                attempts:
                    i + 1,

                fallback:
                    i > 0,

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
                `[GACHA] ${gachaId} → ${category} falló: ${errorMessage}`
            );

            errors.push({

                category:
                    category,

                error:
                    errorMessage
            });

            // ==================================================
            // PEQUEÑA ESPERA ANTES DEL FALLBACK
            // ==================================================

            if (
                i <
                MAX_ATTEMPTS - 1
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

        gacha: {

            id:
                gachaId,

            rarity:
                rarity.name,

            rarityEmoji:
                rarity.emoji
        },

        message:
            'No se pudo completar la tirada de Gacha en este momento',

        provider:
            'nekos.best',

        attempts:
            Math.min(
                MAX_ATTEMPTS,
                categoryOrder.length
            ),

        /*
         * No mostramos errores internos
         * en producción.
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