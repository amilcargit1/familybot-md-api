const express = require('express')
const router = express.Router()

const NEKOSBEST_API = 'https://nekos.best/api/v2'
const WAIFU_API = 'https://api.waifu.pics/sfw'

const TIMEOUT_MS = 10000
const MAX_RETRIES = 2

const USER_AGENT = 'FamilyBot-MD-API/1.0'

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

async function downloadImage(url) {
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
                        USER_AGENT
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

async function getNekosBest(type) {
    let lastError = null

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {
        try {
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
        } catch (error) {
            lastError = error

            console.error(
                `[NekosBest] ${type} intento ${attempt}: ${error.message}`
            )

            if (
                attempt <
                MAX_RETRIES
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

async function getWaifuPics(type) {
    const fallback =
        WAIFU_FALLBACK[type]

    if (!fallback) {
        throw new Error(
            `Waifu.pics no tiene fallback para ${type}`
        )
    }

    const url =
        `${WAIFU_API}/${encodeURIComponent(fallback)}?v=${randomId()}`

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

async function getImageFromNekosBest(type) {
    const result =
        await getNekosBest(type)

    try {
        const image =
            await downloadImage(
                result.url
            )

        return {
            image,
            provider: 'nekos.best',
            fallback: false,
            originalUrl:
                result.url,
            result
        }
    } catch (error) {
        console.error(
            `[NekosBest IMAGE] ${type}: ${error.message}`
        )

        throw error
    }
}

async function getImageFromWaifu(type) {
    const result =
        await getWaifuPics(type)

    const image =
        await downloadImage(
            result.url
        )

    return {
        image,
        provider: 'waifu.pics',
        fallback: true,
        originalUrl:
            result.url,
        result
    }
}

async function getFinalImage(type) {
    try {
        return await getImageFromNekosBest(
            type
        )
    } catch (nekosError) {
        console.error(
            `[FALLBACK] NekosBest falló completamente: ${nekosError.message}`
        )
    }

    try {
        return await getImageFromWaifu(
            type
        )
    } catch (waifuError) {
        console.error(
            `[FALLBACK] Waifu.pics también falló: ${waifuError.message}`
        )

        throw new Error(
            'NekosBest y Waifu.pics no pudieron entregar una imagen'
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
        const host =
            `${req.protocol}://${req.get('host')}`

        const apiKey =
            typeof req.query.apiKey === 'string'
                ? req.query.apiKey
                : ''

        const cacheBust =
            randomId()

        const proxyUrl =
            `${host}/api/anime/reaction/image?apiKey=${encodeURIComponent(apiKey)}&type=${encodeURIComponent(type)}&v=${cacheBust}`

        return res.status(200).json({
            status: true,
            creator: 'familybot-md',
            type,
            url: proxyUrl,
            proxy: true,
            cache: false
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
                'No se pudo preparar la reacción anime'
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
        const result =
            await getFinalImage(type)

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
            `[PROXY FINAL] ${type}: ${error.message}`
        )

        return res.status(502).send(
            'No se pudo obtener ninguna imagen de reacción'
        )
    }
})

module.exports = router