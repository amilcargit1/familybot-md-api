const express = require('express')
const router = express.Router()

const NEKOSBEST_API = 'https://nekos.best/api/v2'
const WAIFU_API = 'https://api.waifu.pics/sfw'
const TIMEOUT_MS = 12000
const MAX_RETRIES = 2
const USER_AGENT = 'FamilyBot-MD-API'

const ALLOWED = new Set([
    'angry','baka','bite','bleh','blowkiss','blush','bonk','bored','carry','clap','confused','cry','cuddle','dance','facepalm','feed','handhold','handshake','happy','highfive','hug','kabedon','kick','kiss','lappillow','laugh','lick','lurk','nod','nom','nope','nya','pat','peck','poke','pout','punch','run','salute','shake','shoot','shocked','shrug','sip','slap','sleep','smile','smug','spin','stare','tableflip','teehee','think','thumbsup','tickle','wag','wave','wink','yawn','yeet'
])

const WAIFU_FALLBACK = {
    bite:'bite', blush:'blush', bonk:'bonk', bored:'bored', cry:'cry', cuddle:'cuddle', dance:'dance', happy:'happy', highfive:'highfive', handhold:'handhold', hug:'hug', kiss:'kiss', laugh:'laugh', lick:'lick', nom:'nom', pat:'pat', poke:'poke', pout:'pout', punch:'punch', slap:'slap', smile:'smile', smug:'smug', wave:'wave', wink:'wink', yeet:'yeet'
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const randomId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`

function validUrl(value) {
    if (typeof value !== 'string') return false
    try {
        const u = new URL(value)
        return u.protocol === 'https:' || u.protocol === 'http:'
    } catch { return false }
}

async function fetchJson(url) {
    let lastError
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
        try {
            const response = await fetch(url, {
                headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
                signal: controller.signal
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const type = response.headers.get('content-type') || ''
            if (!type.toLowerCase().includes('application/json')) throw new Error(`Respuesta no JSON: ${type}`)
            return await response.json()
        } catch (error) {
            lastError = error
            console.error(`[REACTION JSON] intento ${attempt}/${MAX_RETRIES}: ${error.message}`)
            if (attempt < MAX_RETRIES) await sleep(500)
        } finally { clearTimeout(timer) }
    }
    throw lastError || new Error('No se pudo obtener JSON')
}

async function downloadImage(url) {
    if (!validUrl(url)) throw new Error('URL de imagen inválida')
    let lastError
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
        try {
            const response = await fetch(url, {
                headers: { Accept: 'image/avif,image/webp,image/apng,image/gif,image/svg+xml,image/*,*/*;q=0.8', 'User-Agent': USER_AGENT },
                signal: controller.signal
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const contentType = response.headers.get('content-type') || ''
            if (!contentType.toLowerCase().startsWith('image/')) throw new Error(`Contenido inválido: ${contentType}`)
            const buffer = Buffer.from(await response.arrayBuffer())
            if (!buffer.length) throw new Error('Imagen vacía')
            return { buffer, contentType }
        } catch (error) {
            lastError = error
            console.error(`[REACTION IMAGE] intento ${attempt}/${MAX_RETRIES}: ${error.message}`)
            if (attempt < MAX_RETRIES) await sleep(500)
        } finally { clearTimeout(timer) }
    }
    throw lastError || new Error('No se pudo descargar la imagen')
}

async function getNekosBest(type) {
    const data = await fetchJson(`${NEKOSBEST_API}/${encodeURIComponent(type)}?amount=1&v=${randomId()}`)
    if (!Array.isArray(data?.results) || !data.results.length) throw new Error('NekosBest no devolvió resultados')
    const result = data.results[Math.floor(Math.random() * data.results.length)]
    if (!validUrl(result?.url)) throw new Error('NekosBest devolvió una URL inválida')
    return result
}

async function getWaifuPics(type) {
    const category = WAIFU_FALLBACK[type]
    if (!category) throw new Error(`Waifu.pics no soporta ${type}`)
    const data = await fetchJson(`${WAIFU_API}/${encodeURIComponent(category)}?v=${randomId()}`)
    if (!validUrl(data?.url)) throw new Error('Waifu.pics devolvió una URL inválida')
    return { url: data.url }
}

async function getFinalImage(type) {
    try {
        const result = await getNekosBest(type)
        return { image: await downloadImage(result.url), provider: 'nekos.best', fallback: false, source: result.source_url || null }
    } catch (error) {
        console.error(`[FALLBACK 1] NekosBest ${type}: ${error.message}`)
    }
    try {
        const result = await getWaifuPics(type)
        return { image: await downloadImage(result.url), provider: 'waifu.pics', fallback: true, source: null }
    } catch (error) {
        console.error(`[FALLBACK 2] Waifu.pics ${type}: ${error.message}`)
    }
    throw new Error(`Todos los proveedores fallaron para ${type}`)
}

router.get('/', async (req, res) => {
    const type = String(req.query.type || '').trim().toLowerCase()
    if (!type) return res.status(400).json({ status:false, creator:'FamilyBot-MD', message:'Debes especificar una reacción', available:[...ALLOWED] })
    if (!ALLOWED.has(type)) return res.status(400).json({ status:false, creator:'FamilyBot-MD', message:`La reacción "${type}" no existe`, available:[...ALLOWED] })

    try {
        const result = await getFinalImage(type)
        const format = String(req.query.format || 'json').toLowerCase()
        if (format === 'image') {
            res.setHeader('Content-Type', result.image.contentType)
            res.setHeader('Content-Length', result.image.buffer.length)
            res.setHeader('Cache-Control', 'no-store')
            res.setHeader('X-FamilyBot-Provider', result.provider)
            return res.status(200).send(result.image.buffer)
        }
        if (format !== 'json') return res.status(400).json({ status:false, message:'format debe ser json o image' })

        const apiKey = typeof req.query.apiKey === 'string' ? req.query.apiKey : ''
        const host = `${req.protocol}://${req.get('host')}`
        const imageUrl = `${host}/api/anime/reaction/image?apiKey=${encodeURIComponent(apiKey)}&type=${encodeURIComponent(type)}&v=${randomId()}`
        return res.json({ status:true, creator:'FamilyBot-MD', type, url:imageUrl, proxy:true, cache:false, provider:result.provider })
    } catch (error) {
        console.error(`[REACTION] ${type}: ${error.message}`)
        return res.status(502).json({ status:false, creator:'FamilyBot-MD', type, message:'No se pudo obtener ninguna imagen de reacción' })
    }
})

router.get('/image', async (req, res) => {
    const type = String(req.query.type || '').trim().toLowerCase()
    if (!type) return res.status(400).json({ status:false, message:'Falta el tipo de reacción' })
    if (!ALLOWED.has(type)) return res.status(400).json({ status:false, message:'Tipo de reacción inválido' })
    try {
        const result = await getFinalImage(type)
        res.setHeader('Content-Type', result.image.contentType)
        res.setHeader('Content-Length', result.image.buffer.length)
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
        res.setHeader('X-FamilyBot-Provider', result.provider)
        res.setHeader('X-FamilyBot-Fallback', String(result.fallback))
        return res.status(200).send(result.image.buffer)
    } catch (error) {
        console.error(`[REACTION FINAL] ${type}: ${error.message}`)
        return res.status(502).json({ status:false, creator:'FamilyBot-MD', type, message:'No se pudo obtener ninguna imagen de reacción' })
    }
})

router.meta = {
    title:'Reaction',
    description:'Genera una reacción anime SFW y puede devolver JSON con URL o la imagen directamente para WhatsApp.',
    icon:'fas fa-plug',
    fields:[
        { name:'type', label:'Reacción', type:'select', default:'happy', options:[...ALLOWED].map(value => ({ value, label:value })) },
        { name:'format', label:'Formato', type:'select', default:'json', options:[{value:'json',label:'JSON + URL'},{value:'image',label:'Imagen directa (WhatsApp)'}] }
    ],
    resultType:'image',
    resultField:'url',
    example:{ status:true, creator:'FamilyBot-MD', type:'happy', url:'https://tu-api.com/api/anime/reaction/image?type=happy', proxy:true }
}

module.exports = router
