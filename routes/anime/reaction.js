const express = require('express')
const router = express.Router()

const NEKOSBEST_API = 'https://nekos.best/api/v2'
const WAIFU_API = 'https://api.waifu.pics/sfw'

const TIMEOUT_MS = 10000
const MAX_RETRIES = 2

const USER_AGENT =
    'FamilyBot-MD-API/1.0'

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
    'lick',
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
])

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
}

function sleep(ms) {
    return new Promise(resolve =>
        setTimeout(resolve, ms)
    )
}

function isValidUrl(url) {
    if (typeof url !== 'string') {
        return false
    }

    try {
        const parsed = new URL(url)

        return (
            parsed.protocol === 'http:' ||
            parsed.protocol === 'https:'
        )
    } catch {
        return false
    }
}

async function fetchJson(url) {
    const controller =
        new AbortController()

    const timer =
        setTimeout(() => {
            controller.abort()
        }, TIMEOUT_MS)

    try {
        const response =
            await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'User-Agent': USER_AGENT
                },
                signal: controller.signal
            })

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            )
        }

        const contentType =
            response.headers.get(
                'content-type'
            ) || ''

        if (
            !contentType
                .toLowerCase()
                .includes('application/json')
        ) {
            throw new Error(
                'La respuesta no es JSON'
            )
        }

        return await response.json()
    } finally {
        clearTimeout(timer)
    }
}

async function fetchImage(url) {
    const controller =
        new AbortController()

    const timer =
        setTimeout(() => {
            controller.abort()
        }, TIMEOUT_MS)

    try {
        const response =
            await fetch(url, {
                method: 'GET',
                headers: {
                    Accept:
                        'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'User-Agent':
                        USER_AGENT,
                    Referer:
                        'https://nekos.best/'
                },
                signal: controller.signal
            })

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            )
        }

        const contentType =
            response.headers.get(
                'content-type'
            ) || ''

        if (
            !contentType
                .toLowerCase()
                .startsWith('image/')
        ) {
            throw new Error(
                `Contenido inválido: ${contentType}`
            )
        }

        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            )

        if (
            !buffer ||
            buffer.length === 0
        ) {
            throw new Error(
                'La imagen está vacía'
            )
        }

        return {
            buffer,
            contentType
        }
    } finally {
        clearTimeout(timer)
    }
}

async function getFromNekosBest(type) {
    let lastError = null

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {
        try {
            const url =
                `${NEKOSBEST_API}/${encodeURIComponent(type)}?amount=1&v=${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 10)}`

            const data =
                await fetchJson(url)

            if (
                !data ||
                !Array.isArray(data.results) ||
                data.results.length === 0
            ) {
                throw new Error(
                    'NekosBest no devolvió resultados'
                )
            }

            const result =
                data.results[
                    Math.floor(
                        Math.random() *
                        data.results.length
                    )
                ]

            if (
                !result ||
                !isValidUrl(result.url)
            ) {
                throw new Error(
                    'NekosBest devolvió una URL inválida'
                )
            }

            return {
                success: true,
                provider: 'nekos.best',
                result
            }
        } catch (error) {
            lastError = error

            console.error(
                `[NEKOSBEST] ${type} intento ${attempt}/${MAX_RETRIES}: ${error.message}`
            )

            if (
                attempt < MAX_RETRIES
            ) {
                await sleep(500)
            }
        }
    }

    throw (
        lastError ||
        new Error(
            'NekosBest no disponible'
        )
    )
}

async function getFromWaifu(type) {
    const fallbackType =
        WAIFU_FALLBACK[type]

    if (!fallbackType) {
        throw new Error(
            `No existe fallback para ${type}`
        )
    }

    const url =
        `${WAIFU_API}/${encodeURIComponent(fallbackType)}?v=${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`

    const data =
        await fetchJson(url)

    if (
        !data ||
        !isValidUrl(data.url)
    ) {
        throw new Error(
            'Waifu.pics devolvió una URL inválida'
        )
    }

    return {
        success: true,
        provider: 'waifu.pics',
        result: {
            url: data.url
        }
    }
}

async function getReaction(type) {
    try {
        const response =
            await getFromNekosBest(type)

        return {
            ...response,
            fallback: false
        }
    } catch (error) {
        console.error(
            `[ANIME] NekosBest falló: ${error.message}`
        )
    }

    try {
        const response =
            await getFromWaifu(type)

        return {
            ...response,
            fallback: true
        }
    } catch (error) {
        console.error(
            `[ANIME] Waifu.pics falló: ${error.message}`
        )

        throw new Error(
            'Todos los proveedores fallaron'
        )
    }
}

router.get('/', async (req, res) => {
    const type =
        String(
            req.query.type || ''
        )
            .trim()
            .toLowerCase()

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
        })
    }

    if (!ALLOWED.has(type)) {
        return res.status(400).json({
            status: false,
            creator: 'familybot-md',
            message:
                `La reacción "${type}" no existe`,
            available:
                [...ALLOWED]
        })
    }

    try {
        const response =
            await getReaction(type)

        const result =
            response.result

        const host =
            `${req.protocol}://${req.get('host')}`

        const apiKey =
            typeof req.query.apiKey === 'string'
                ? req.query.apiKey
                : ''

        const cacheBust =
            `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 10)}`

        const proxyUrl =
            `${host}/api/anime/reaction/image?apiKey=${encodeURIComponent(apiKey)}&type=${encodeURIComponent(type)}&v=${cacheBust}`

        return res.status(200).json({
            status: true,
            creator: 'familybot-md',
            type,
            url: proxyUrl,
            original_url: result.url,
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
        })
    } catch (error) {
        console.error(
            `[REACTION] ${type}: ${error.message}`
        )

        return res.status(502).json({
            status: false,
            creator: 'familybot-md',
            type,
            message:
                'No se pudo obtener la reacción anime en este momento',
            provider:
                'nekos.best',
            fallback:
                'waifu.pics'
        })
    }
})

router.get('/image', async (req, res) => {
    const type =
        String(
            req.query.type || ''
        )
            .trim()
            .toLowerCase()

    if (!type) {
        return res.status(400).send(
            'Falta el tipo de reacción'
        )
    }

    if (!ALLOWED.has(type)) {
        return res.status(400).send(
            'Tipo de reacción inválido'
        )
    }

    try {
        const response =
            await getReaction(type)

        const imageUrl =
            response.result.url

        const image =
            await fetchImage(
                imageUrl
            )

        res.setHeader(
            'Content-Type',
            image.contentType
        )

        res.setHeader(
            'Content-Length',
            image.buffer.length
        )

        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate'
        )

        res.setHeader(
            'Pragma',
            'no-cache'
        )

        res.setHeader(
            'Expires',
            '0'
        )

        res.setHeader(
            'Surrogate-Control',
            'no-store'
        )

        res.setHeader(
            'X-FamilyBot-Provider',
            response.provider
        )

        res.setHeader(
            'X-FamilyBot-Fallback',
            String(
                response.fallback
            )
        )

        return res
            .status(200)
            .send(image.buffer)
    } catch (error) {
        console.error(
            `[PROXY] ${type}: ${error.message}`
        )

        return res.status(502).send(
            'No se pudo descargar la imagen'
        )
    }
})

module.exports = router