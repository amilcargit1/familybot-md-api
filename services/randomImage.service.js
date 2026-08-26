const cache = new Map();
const TTL = 15 * 60 * 1000;
const TIMEOUT = 3500;

async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
        const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'FamilyBot-MD-API/1.0' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

async function getRandomImage(type, search) {
    const cached = cache.get(type);
    if (cached && cached.expiresAt > Date.now()) return cached.url;

    const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(search)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const data = await fetchJson(api);
    const pages = Object.values(data?.query?.pages || {}).filter(page => typeof page?.imageinfo?.[0]?.url === 'string');
    if (!pages.length) throw new Error(`Sin imágenes para ${type}`);

    const url = pages[Math.floor(Math.random() * pages.length)].imageinfo[0].url;
    cache.set(type, { url, expiresAt: Date.now() + TTL });
    return url;
}

module.exports = { getRandomImage };
