const sharp = require('sharp');

const WIDTH = 1200;
const HEIGHT = 630;
const THEMES = {
  birthday: ['#26133d', '#7c3aed', '#f5d0fe'],
  marry: ['#3b1020', '#be185d', '#fce7f3'],
  divorce: ['#111827', '#475569', '#e2e8f0'],
  reward: ['#172554', '#2563eb', '#dbeafe'],
  achievement: ['#422006', '#d97706', '#fef3c7'],
  battle: ['#450a0a', '#dc2626', '#fee2e2'],
  economy: ['#052e16', '#16a34a', '#dcfce7'],
  stats: ['#082f49', '#0891b2', '#cffafe'],
  love: ['#500724', '#db2777', '#fce7f3'],
  game: ['#1e1b4b', '#6366f1', '#e0e7ff']
};

function clean(value, fallback, max) {
  const s = String(value ?? '').trim().replace(/\s+/g, ' ');
  return escapeXml((s || fallback).slice(0, max));
}
function escapeXml(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function svgFor(type, data) {
  const [bg1, accent, soft] = THEMES[type] || THEMES.game;
  const title = clean(data.title, type.toUpperCase(), 28);
  const name = clean(data.username, 'Usuario', 32);
  const second = clean(data.second, 'Resultado disponible', 48);
  const value = clean(data.value, '0', 24);
  const detail = clean(data.detail, 'FamilyBot-MD', 60);
  const footer = clean(data.footer, 'FamilyBot-MD', 30);
  const dots = Array.from({ length: 28 }, (_, i) => `<circle cx="${70 + ((i * 137) % 1060)}" cy="${70 + ((i * 83) % 490)}" r="${i % 4 === 0 ? 3 : 1.5}" fill="#fff" opacity=".18"/>`).join('');
  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="#050505"/></linearGradient><radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".42"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><circle cx="160" cy="120" r="330" fill="url(#glow)"/><circle cx="1080" cy="520" r="380" fill="url(#glow)"/>${dots}<rect x="55" y="55" width="1090" height="520" rx="42" fill="#000" opacity=".24" stroke="${accent}" stroke-opacity=".5" stroke-width="2"/><text x="600" y="125" text-anchor="middle" fill="${soft}" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="800" letter-spacing="5">${title}</text><text x="110" y="245" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="54" font-weight="800">${name}</text><text x="110" y="305" fill="${soft}" font-family="Arial,Helvetica,sans-serif" font-size="26">${second}</text><rect x="110" y="350" width="520" height="110" rx="24" fill="${accent}" opacity=".18" stroke="${accent}" stroke-opacity=".55"/><text x="145" y="422" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="46" font-weight="800">${value}</text><text x="700" y="390" fill="${soft}" font-family="Arial,Helvetica,sans-serif" font-size="22">${detail}</text><text x="110" y="535" fill="${soft}" font-family="Arial,Helvetica,sans-serif" font-size="20">${footer}</text></svg>`;
}
async function generateExtraCanvas(type, options = {}) {
  const data = {
    title: options.title,
    username: options.username,
    second: options.second,
    value: options.value,
    detail: options.detail,
    footer: options.footer
  };
  return sharp(Buffer.from(svgFor(type, data))).png({ compressionLevel: 9 }).toBuffer();
}
module.exports = { generateExtraCanvas, THEMES };
