const express = require('express');
const router = express.Router();
const { getRandomImage } = require('../../services/randomImage.service');

async function sendImage(url, res) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
    try { const r = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'FamilyBot-MD/1.0' } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const type = r.headers.get('content-type') || ''; if (!type.toLowerCase().startsWith('image/')) throw new Error('Contenido no es imagen'); const b = Buffer.from(await r.arrayBuffer()); if (!b.length || b.length > 10 * 1024 * 1024) throw new Error('Imagen inválida o demasiado grande'); return res.status(200).set('Content-Type', type).set('Content-Length', String(b.length)).set('Cache-Control', 'no-store').send(b); } finally { clearTimeout(timeout); }
}

router.get('/', async (req, res) => { try { const url = await getRandomImage('bird', 'bird animal'); const format = String(req.query.format || 'json').toLowerCase(); if (format === 'image') return await sendImage(url, res); if (format !== 'json') return res.status(400).json({ status: false, message: 'format debe ser json o image' }); return res.json({ status: true, creator: 'FamilyBot-MD', result: { url, provider: 'Wikimedia Commons', type: 'bird' } }); } catch (error) { console.error('[BIRD ERROR]', error.message); return res.status(502).json({ status: false, creator: 'FamilyBot-MD', message: 'No se pudo obtener un ave.', error: 'Servicio externo no disponible' }); } });
router.meta = { title: 'Ave aleatoria', description: 'Obtiene una imagen aleatoria de un ave.', icon: 'fas fa-dove', method: 'GET', fields: [{ name: 'format', label: 'Formato', type: 'select', default: 'json', options: [{ value: 'json', label: 'JSON + URL' }, { value: 'image', label: 'Imagen directa (WhatsApp)' }] }], resultType: 'image', resultField: 'result.url', example: { method: 'GET', path: '/api/random/bird?apiKey=TU_API_KEY&format=image' } };
module.exports = router;
