const express = require('express');
const router = express.Router();
const API_URL = 'https://randomfox.ca/floof/';

async function fetchJson(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'FamilyBot-MD-API' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

router.get('/', async (req, res) => {
  try {
    const data = await fetchJson(API_URL);
    if (!data || typeof data.image !== 'string' || !data.image) throw new Error('Respuesta inválida');
    res.json({ status: true, creator: 'FamilyBot-MD', result: { url: data.image, provider: 'RandomFox', type: 'fox' } });
  } catch (error) {
    console.error('[FOX ERROR]', error.message);
    res.status(502).json({ status: false, creator: 'FamilyBot-MD', message: 'No se pudo obtener un zorro en este momento.', error: 'Servicio externo no disponible' });
  }
});
router.meta = { title: 'Zorro aleatorio', description: 'Obtiene una imagen aleatoria de un zorro', icon: 'fas fa-paw', fields: [], resultType: 'image', resultField: 'result.url' };
module.exports = router;
