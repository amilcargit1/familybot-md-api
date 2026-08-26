const sharp = require('sharp');

const WIDTH = 1200;
const HEIGHT = 630;
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const AVATAR_TIMEOUT_MS = 5000;
const STYLES = new Set(['divine', 'royal', 'neon', 'galaxy', 'dark']);

const THEMES = {
  divine: { bg1:'#070611', bg2:'#17112b', glow:'#f5c542', glow2:'#8b5cf6', text:'#fffaf0', muted:'#d8d2e8', accent:'#f5c542' },
  royal: { bg1:'#090706', bg2:'#21150a', glow:'#fbbf24', glow2:'#92400e', text:'#fff7d6', muted:'#e7d9b0', accent:'#fbbf24' },
  neon: { bg1:'#05070d', bg2:'#111827', glow:'#22d3ee', glow2:'#ec4899', text:'#f8fafc', muted:'#cbd5e1', accent:'#22d3ee' },
  galaxy: { bg1:'#030313', bg2:'#171044', glow:'#a78bfa', glow2:'#38bdf8', text:'#f5f3ff', muted:'#d8d4fe', accent:'#a78bfa' },
  dark: { bg1:'#050505', bg2:'#171717', glow:'#ef4444', glow2:'#7f1d1d', text:'#fafafa', muted:'#d4d4d4', accent:'#ef4444' }
};

function esc(v){ return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }
function clean(v, fallback, max){ const s=String(v ?? '').trim().replace(/\s+/g,' '); return esc((s || fallback).slice(0,max)); }
function blocked(host){ host=String(host||'').toLowerCase().replace(/^\[|\]$/g,''); return host==='localhost'||host.endsWith('.localhost')||host==='127.0.0.1'||host==='0.0.0.0'||host==='::1'||host.startsWith('127.')||host.startsWith('10.')||host.startsWith('192.168.')||/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)||host.endsWith('.local'); }
async function fetchAvatar(url){
  if(!url) return null;
  let u; try{u=new URL(url);}catch{throw new Error('avatarUrl no es una URL válida.');}
  if(!['http:','https:'].includes(u.protocol)||blocked(u.hostname)) throw new Error('avatarUrl no es válida.');
  const c=new AbortController(); const timer=setTimeout(()=>c.abort(),AVATAR_TIMEOUT_MS);
  try{
    const r=await fetch(u,{signal:c.signal,redirect:'follow',headers:{'User-Agent':'FamilyBot-MD-ProfileCanvas/1.0',Accept:'image/*'}});
    if(!r.ok) throw new Error(`No se pudo descargar el avatar (HTTP ${r.status}).`);
    const type=String(r.headers.get('content-type')||'').toLowerCase();
    if(type&&!type.startsWith('image/')) throw new Error('avatarUrl no apunta a una imagen.');
    const b=Buffer.from(await r.arrayBuffer()); if(!b.length) throw new Error('El avatar está vacío.'); if(b.length>MAX_AVATAR_BYTES) throw new Error('El avatar supera 4 MB.'); return b;
  }catch(e){if(e?.name==='AbortError')throw new Error('La descarga del avatar tardó demasiado.');throw e;}finally{clearTimeout(timer);}
}
function bg(t,style){
  const stars=Array.from({length:style==='galaxy'?80:35},(_,i)=>`<circle cx="${(i*83)%WIDTH}" cy="${(i*47)%HEIGHT}" r="${i%5===0?2:1}" fill="#fff" opacity="${(0.2+(i%7)*0.1).toFixed(2)}"/>`).join('');
  return Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient><radialGradient id="g"><stop stop-color="${t.glow}" stop-opacity=".35"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient><radialGradient id="g2"><stop stop-color="${t.glow2}" stop-opacity=".28"/><stop offset="1" stop-color="${t.glow2}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#b)"/><circle cx="170" cy="120" r="300" fill="url(#g)"/><circle cx="1050" cy="500" r="360" fill="url(#g2)"/>${stars}<rect x="55" y="55" width="1090" height="520" rx="44" fill="#000" opacity=".2" stroke="${t.glow}" stroke-opacity=".4" stroke-width="2"/></svg>`);
}
function textLayer(t,d){
  const title=clean(d.title,'PROFILE',30), name=clean(d.username,'Usuario',34), bio=clean(d.bio,'Mi perfil',55), level=clean(d.level,'',18), xp=clean(d.xp,'',24), coins=clean(d.coins,'',24), rank=clean(d.rank,'',24), footer=clean(d.footer,'✦ FamilyBot-MD ✦',30);
  const stats=[level&&`NIVEL: ${level}`,xp&&`XP: ${xp}`,coins&&`MONEDAS: ${coins}`,rank&&`RANK: ${rank}`].filter(Boolean);
  const statText=stats.map((s,i)=>`<text x="785" y="${390+i*36}" fill="${i===0?t.text:t.muted}" font-size="${i===0?22:20}" font-family="Arial,Helvetica,sans-serif">${s}</text>`).join('');
  return Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg"><text x="600" y="125" text-anchor="middle" fill="${t.accent}" font-size="28" font-family="Arial,Helvetica,sans-serif" font-weight="800" letter-spacing="5">${title}</text><text x="785" y="300" fill="${t.text}" font-size="52" font-family="Arial,Helvetica,sans-serif" font-weight="800">${name}</text><text x="785" y="345" fill="${t.muted}" font-size="22" font-family="Arial,Helvetica,sans-serif">${bio}</text>${statText}<text x="785" y="535" fill="${t.accent}" font-size="20" font-family="Arial,Helvetica,sans-serif">${footer}</text></svg>`);
}
function frame(t){return Buffer.from(`<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><circle cx="150" cy="150" r="144" fill="none" stroke="${t.glow}" stroke-width="9"/><circle cx="150" cy="150" r="132" fill="none" stroke="${t.glow2}" stroke-opacity=".7" stroke-width="3"/></svg>`);}
function mask(n=270){return Buffer.from(`<svg width="${n}" height="${n}" xmlns="http://www.w3.org/2000/svg"><circle cx="${n/2}" cy="${n/2}" r="${n/2}" fill="#fff"/></svg>`);}

async function generateProfileCanvas(options={}){
  const style=STYLES.has(String(options.style||'royal').toLowerCase())?String(options.style||'royal').toLowerCase():'royal';
  const t=THEMES[style]; const avatar=options.avatarBuffer||await fetchAvatar(options.avatarUrl); if(!avatar) throw new Error('Envía avatar o avatarUrl.');
  const image=await sharp(avatar).resize(270,270,{fit:'cover',position:'centre'}).composite([{input:mask(270),blend:'dest-in'}]).png().toBuffer();
  return sharp(bg(t,style)).composite([{input:image,left:165,top:205},{input:frame(t),left:150,top:190},{input:textLayer(t,options),left:0,top:0}]).png({compressionLevel:9}).toBuffer();
}
module.exports={generateProfileCanvas,STYLES};
