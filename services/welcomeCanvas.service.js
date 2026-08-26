const sharp = require('sharp');

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

const STYLES = new Set(['divine', 'royal', 'neon', 'galaxy', 'dark']);

const THEMES = {
    divine: {
        bg1: '#070611',
        bg2: '#17112b',
        glow: '#f5c542',
        glow2: '#8b5cf6',
        text: '#fffaf0',
        muted: '#d8d2e8',
        accent: '#f5c542'
    },
    royal: {
        bg1: '#090706',
        bg2: '#21150a',
        glow: '#fbbf24',
        glow2: '#92400e',
        text: '#fff7d6',
        muted: '#e7d9b0',
        accent: '#fbbf24'
    },
    neon: {
        bg1: '#05070d',
        bg2: '#111827',
        glow: '#22d3ee',
        glow2: '#ec4899',
        text: '#f8fafc',
        muted: '#cbd5e1',
        accent: '#22d3ee'
    },
    galaxy: {
        bg1: '#030313',
        bg2: '#171044',
        glow: '#a78bfa',
        glow2: '#38bdf8',
        text: '#f5f3ff',
        muted: '#d8d4fe',
        accent: '#a78bfa'
    },
    dark: {
        bg1: '#050505',
        bg2: '#171717',
        glow: '#ef4444',
        glow2: '#7f1d1d',
        text: '#fafafa',
        muted: '#d4d4d4',
        accent: '#ef4444'
    }
};

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function cleanText(value, fallback, max = 42) {
    const text = String(value ?? '').trim().replace(/\s+/g, ' ');
    return escapeXml((text || fallback).slice(0, max));
}

function number(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

async function fetchAvatar(url) {
    if (!url) return null;
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('avatarUrl no es una URL válida.');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('avatarUrl debe usar HTTP o HTTPS.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
        const response = await fetch(parsed, {
            signal: controller.signal,
            headers: { 'User-Agent': 'FamilyBot-MD-WelcomeCanvas/1.0' }
        });
        if (!response.ok) throw new Error(`No se pudo descargar el avatar (HTTP ${response.status}).`);
        const contentLength = Number(response.headers.get('content-length') || 0);
        if (contentLength > MAX_AVATAR_BYTES) throw new Error('El avatar supera el límite de 4 MB.');
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_AVATAR_BYTES) throw new Error('El avatar supera el límite de 4 MB.');
        return buffer;
    } finally {
        clearTimeout(timer);
    }
}

function backgroundSvg(theme, style) {
    const stars = Array.from({ length: style === 'galaxy' ? 80 : 35 }, (_, i) => {
        const x = (i * 83) % WIDTH;
        const y = (i * 47) % HEIGHT;
        const r = i % 5 === 0 ? 2 : 1;
        const opacity = 0.2 + ((i % 7) * 0.1);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${opacity.toFixed(2)}"/>`;
    }).join('');

    return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${theme.bg1}"/><stop offset="1" stop-color="${theme.bg2}"/></linearGradient>
  <radialGradient id="g1"><stop offset="0" stop-color="${theme.glow}" stop-opacity="0.35"/><stop offset="1" stop-color="${theme.glow}" stop-opacity="0"/></radialGradient>
  <radialGradient id="g2"><stop offset="0" stop-color="${theme.glow2}" stop-opacity="0.28"/><stop offset="1" stop-color="${theme.glow2}" stop-opacity="0"/></radialGradient>
  <linearGradient id="line" x1="0" x2="1"><stop stop-color="${theme.glow}" stop-opacity="0"/><stop offset="0.5" stop-color="${theme.glow}" stop-opacity="0.9"/><stop offset="1" stop-color="${theme.glow}" stop-opacity="0"/></linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#bg)"/>
<circle cx="180" cy="120" r="300" fill="url(#g1)"/>
<circle cx="1050" cy="500" r="360" fill="url(#g2)"/>
${stars}
<rect x="70" y="70" width="1060" height="490" rx="42" fill="#000" opacity="0.18" stroke="${theme.glow}" stroke-opacity="0.35" stroke-width="2"/>
<rect x="110" y="182" width="980" height="2" fill="url(#line)"/>
<rect x="110" y="515" width="980" height="2" fill="url(#line)"/>
</svg>`);
}

function textSvg(theme, data) {
    const style = data.style;
    const title = style === 'divine' ? 'WELCOME TO THE KINGDOM' : 'WELCOME';
    const subtitle = cleanText(data.message, '¡Bienvenido al grupo!', 55);
    const username = cleanText(data.username, 'Nuevo miembro', 34);
    const group = cleanText(data.groupName, 'Nuestro grupo', 40);
    const members = cleanText(data.members, '0', 12);
    const date = cleanText(data.date, new Date().toLocaleDateString('es-PE'), 24);
    const accent = theme.accent;

    return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<style>
.title{font-family:Arial,Helvetica,sans-serif;font-weight:800;letter-spacing:4px}.name{font-family:Arial,Helvetica,sans-serif;font-weight:800}.body{font-family:Arial,Helvetica,sans-serif}.small{font-family:Arial,Helvetica,sans-serif;letter-spacing:1px}
</style>
<text x="600" y="126" text-anchor="middle" fill="${accent}" font-size="25" class="title">${escapeXml(title)}</text>
<text x="600" y="164" text-anchor="middle" fill="${theme.muted}" font-size="18" class="small">${subtitle}</text>
<text x="780" y="315" fill="${theme.text}" font-size="52" class="name">${username}</text>
<text x="780" y="356" fill="${theme.muted}" font-size="23" class="body">${group}</text>
<text x="780" y="410" fill="${theme.text}" font-size="21" class="body">👥 ${members} miembros</text>
<text x="780" y="450" fill="${theme.muted}" font-size="18" class="small">${date}</text>
<text x="780" y="490" fill="${accent}" font-size="20" class="body">✦ FamilyBot-MD ✦</text>
</svg>`);
}

function avatarSvg(theme) {
    return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="390" height="390" viewBox="0 0 390 390" xmlns="http://www.w3.org/2000/svg">
<defs><radialGradient id="a"><stop stop-color="${theme.glow}" stop-opacity="0.9"/><stop offset="1" stop-color="${theme.glow2}" stop-opacity="0.2"/></radialGradient></defs>
<circle cx="195" cy="195" r="170" fill="none" stroke="url(#a)" stroke-width="10"/>
<circle cx="195" cy="195" r="153" fill="#08080d" stroke="${theme.glow}" stroke-opacity="0.5" stroke-width="3"/>
</svg>`);
}

async function generateWelcomeCanvas(options = {}) {
    const style = STYLES.has(String(options.style || '').toLowerCase())
        ? String(options.style).toLowerCase()
        : 'divine';
    const theme = THEMES[style];

    const base = sharp(backgroundSvg(theme, style));
    const composites = [];

    const avatarBuffer = options.avatarBuffer || await fetchAvatar(options.avatarUrl);
    if (avatarBuffer) {
        const avatar = await sharp(avatarBuffer)
            .resize(300, 300, { fit: 'cover' })
            .composite([{ input: avatarSvg(theme), blend: 'over' }])
            .png()
            .toBuffer();
        composites.push({ input: avatar, left: 170, top: 190 });
    } else {
        composites.push({ input: avatarSvg(theme), left: 0, top: 150 });
    }

    composites.push({ input: textSvg(theme, { ...options, style }), left: 0, top: 0 });

    const output = await base
        .composite(composites)
        .png({ compressionLevel: 9 })
        .toBuffer();

    return output;
}

module.exports = { generateWelcomeCanvas, STYLES };
