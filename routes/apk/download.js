const express = require('express')
const dns = require('node:dns').promises
const net = require('node:net')

const router = express.Router()

const MAX_SIZE = Number(process.env.APK_MAX_SIZE || 200 * 1024 * 1024)
const TIMEOUT_MS = Number(process.env.APK_DOWNLOAD_TIMEOUT || 30000)
const USER_AGENT = 'FamilyBot-MD-API/1.0'

function esIpPrivada(ip) {
  if (!net.isIP(ip)) return true
  if (ip === '127.0.0.1' || ip === '::1') return true
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true
  const partes = ip.split('.').map(Number)
  if (partes.length === 4 && partes[0] === 172 && partes[1] >= 16 && partes[1] <= 31) return true
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true
  return false
}

async function validarDestino(url) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') throw new Error('Solo se permiten URLs HTTPS')
  if (parsed.username || parsed.password) throw new Error('La URL no puede contener credenciales')

  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) throw new Error('Destino no permitido')

  const resultados = await dns.lookup(host, { all: true })
  if (!resultados.length || resultados.some(({ address }) => esIpPrivada(address))) {
    throw new Error('Destino no permitido')
  }
  return parsed
}

function esApk(contentType, url) {
  const tipo = String(contentType || '').toLowerCase()
  return tipo.includes('application/vnd.android.package-archive') ||
    tipo.includes('application/octet-stream') ||
    url.pathname.toLowerCase().endsWith('.apk')
}

router.get('/download', async (req, res) => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : ''
  if (!rawUrl) return res.status(400).json({ ok: false, error: 'Falta el parámetro url' })

  let url
  try {
    url = await validarDestino(rawUrl)
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'application/vnd.android.package-archive,application/octet-stream;q=0.9,*/*;q=0.1' }
    })

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      return res.status(400).json({ ok: false, error: 'La URL redirige; usa directamente una URL HTTPS autorizada al APK' })
    }
    if (!response.ok) return res.status(502).json({ ok: false, error: `El servidor respondió HTTP ${response.status}` })
    if (!esApk(response.headers.get('content-type'), url)) return res.status(415).json({ ok: false, error: 'El recurso no parece ser un APK' })

    const length = Number(response.headers.get('content-length') || 0)
    if (length > MAX_SIZE) return res.status(413).json({ ok: false, error: `El APK supera el límite de ${MAX_SIZE} bytes` })

    const buffer = Buffer.from(await response.arrayBuffer())
    if (!buffer.length) return res.status(502).json({ ok: false, error: 'El archivo está vacío' })
    if (buffer.length > MAX_SIZE) return res.status(413).json({ ok: false, error: `El APK supera el límite de ${MAX_SIZE} bytes` })

    const firma = buffer.subarray(0, 2).toString('ascii')
    if (firma !== 'PK') return res.status(415).json({ ok: false, error: 'El archivo no tiene una firma APK/ZIP válida' })

    const nombre = decodeURIComponent(url.pathname.split('/').pop() || 'aplicacion.apk').replace(/[^a-zA-Z0-9._-]/g, '_')
    res.setHeader('Content-Type', 'application/vnd.android.package-archive')
    res.setHeader('Content-Disposition', `attachment; filename="${nombre.endsWith('.apk') ? nombre : `${nombre}.apk`}"`)
    res.setHeader('Content-Length', buffer.length)
    return res.send(buffer)
  } catch (error) {
    const mensaje = error.name === 'AbortError' ? 'La descarga superó el tiempo máximo' : error.message
    return res.status(502).json({ ok: false, error: mensaje })
  } finally {
    clearTimeout(timer)
  }
})

router.get('/limits', (_req, res) => {
  res.json({ ok: true, maxBytes: MAX_SIZE, maxMB: Math.round((MAX_SIZE / 1024 / 1024) * 100) / 100, timeoutMs: TIMEOUT_MS })
})

module.exports = router
