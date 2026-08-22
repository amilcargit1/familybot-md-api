const express = require('express')
const router = express.Router()

const NEKOSBEST_API = 'https://nekos.best/api/v2'
const WAIFU_API = 'https://api.waifu.pics/sfw'

const TIMEOUT_MS = 12000
const MAX_RETRIES = 2

const USER_AGENT =
    'FamilyBot-MD-API (https://github.com/amilcargit1/familybot-md-api)'

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
    bonk: 'bonk',
    bored: 'bored',
    cry: 'cry',
    cuddle: 'cuddle',
    dance: 'dance',
    happy: 'happy',
    highfive: 'highfive',
    handhold: 'handhold',
    hug: 'hug',
    kiss: 'kiss',
    laugh: 'laugh',
    lick: 'lick',
    nom: 'nom',
    pat: 'pat',
    poke: 'poke',
    pout: 'pout',
    punch: 'punch',
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

function randomId() {
    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 12)}`
}

function isValidUrl(url) {
    if (typeof url !== 'string') {
        return false
    }

    try {
        const parsed = new URL(url)

        return (
            parsed.protocol === 'https:' ||
            parsed.protocol === 'http:'
        )
    } catch {
        return false
    }
}

function isImageContentType(contentType) {
    if (!contentType) {
        return false
    }

    return contentType
        .toLowerCase()
        .startsWith('image/')
}

async function fetchJson(url, extraHeaders = {}) {
    let lastError = null

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {
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
                            'application/json',
                        'User-Agent':
                            USER_AGENT,
                        ...extraHeaders
                    },
                    signal:
                        controller.signal
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
                    .includes(
                        'application/json'
                    )
            ) {
                throw new Error(
                    `Respuesta no JSON: ${contentType}`
                )
            }

            return await response.json()
        } catch (error) {
            lastError = error

            console.error(
                `[JSON] ${url} intento ${attempt}/${MAX_RETRIES}: ${error.message}`
            )

            if (
                attempt <
                MAX_RETRIES
            ) {
                await sleep(500)
            }
        } finally {
            clearTimeout(timer)
        }
    }

    throw (
        lastError ||
        new Error(
            'No se pudo obtener JSON'
        )
    )
}

async function downloadImage(url) {
    if (!isValidUrl(url)) {
        throw new Error(
            'URL de imagen inválida'
        )
    }

    let lastError = null

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {
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
                            'image/avif,image/webp,image/apng,image/gif,image/svg+xml,image/*,*/*;q=0.8',
                        'User-Agent':
                            USER_AGENT
                    },
                    signal:
                        controller.signal
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
                !isImageContentType(
                    contentType
                )
            ) {
                throw new Error(
                    `Contenido inválido: ${contentType}`
                )
            }

            const arrayBuffer =
                await response.arrayBuffer()

            const buffer =
                Buffer.from(
                    arrayBuffer
                )

            if (
                !buffer ||
                buffer.length === 0
            ) {
                throw new Error(
                    'Imagen vacía'
                )
            }

            return {
                buffer,
                contentType
            }
        } catch (error) {
            lastError = error

            console.error(
                `[IMAGE] ${url} intento ${attempt}/${MAX_RETRIES}: ${error.message}`
            )

            if (
                attempt <
                MAX_RETRIES
            ) {
                await sleep(500)
            }
        } finally {
            clearTimeout(timer)
        }
    }

    throw (
        lastError ||
        new Error(
            'No se pudo descargar la imagen'
        )
    )
}

async function getNekosBest(type) {
    const url =
        `${NEKOSBEST_API}/${encodeURIComponent(type)}?amount=1&v=${randomId()}`

    const data =
        await fetchJson(url)

    if (
        !data ||
        !Array.isArray(
            data.results
        ) ||
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

    return result
}

async function getWaifuPics(type) {
    const category =
        WAIFU_FALLBACK[type]

    if (!category) {
        throw new Error(
            `Waifu.pics no soporta ${type}`
        )
    }

    const url =
        `${WAIFU_API}/${encodeURIComponent(category)}?v=${randomId()}`

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
        url: data.url
    }
}

async function tryNekosBest(type) {
    const result =
        await getNekosBest(type)

    const image =
        await downloadImage(
            result.url
        )

    return {
        image,
        provider:
            'nekos.best',
        fallback: false,
        originalUrl:
            result.url,
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
    }
}

async function tryWaifuPics(type) {
    const result =
        await getWaifuPics(type)

    const image =
        await downloadImage(
            result.url
        )

    return {
        image,
        provider:
            'waifu.pics',
        fallback: true,
        originalUrl:
            result.url,
        anime: null,
        artist: null,
        source: null,
        dimensions: null
    }
}

async function getFinalImage(type) {
    try {
        return await tryNekosBest(
            type
        )
    } catch (error) {
        console.error(
            `[FALLBACK 1] NekosBest ${type}: ${error.message}`
        )
    }

    try {
        return await tryWaifuPics(
            type
        )
    } catch (error) {
        console.error(
            `[FALLBACK 2] Waifu.pics ${type}: ${error.message}`
        )
    }

    throw new Error(
        `Todos los proveedores fallaron para ${type}`
    )
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
            creator:
                'FamilyBot-MD',
            message:
                'Debes especificar una reacción',
            available:
                [...ALLOWED]
        })
    }

    if (!ALLOWED.has(type)) {
        return res.status(400).json({
            status: false,
            creator:
                'FamilyBot-MD',
            message:
                `La reacción "${type}" no existe`,
            available:
                [...ALLOWED]
        })
    }

    const apiKey =
        typeof req.query.apiKey ===
        'string'
            ? req.query.apiKey
            : ''

    const host =
        `${req.protocol}://${req.get('host')}`

    const cacheBust =
        randomId()

    const imageUrl =
        `${host}/api/anime/reaction/image?apiKey=${encodeURIComponent(apiKey)}&type=${encodeURIComponent(type)}&v=${cacheBust}`

    return res.status(200).json({
        status: true,
        creator:
            'FamilyBot-MD',
        type,
        url: imageUrl,
        proxy: true,
        cache: false,
        providers: [
            'nekos.best',
            'waifu.pics'
        ]
    })
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
        const result =
            await getFinalImage(
                type
            )

        res.setHeader(
            'Content-Type',
            result.image.contentType
        )

        res.setHeader(
            'Content-Length',
            result.image.buffer.length
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
            result.provider
        )

        res.setHeader(
            'X-FamilyBot-Fallback',
            String(
                result.fallback
            )
        )

        return res
            .status(200)
            .send(
                result.image.buffer
            )
    } catch (error) {
        console.error(
            `[REACTION FINAL] ${type}: ${error.message}`
        )

        return res.status(502).json({
            status: false,
            creator:
                'FamilyBot-MD',
            type,
            message:
                'No se pudo obtener ninguna imagen de reacción'
        })
    }
})

module.exports = router