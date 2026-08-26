const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const router = express.Router();
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;
const MAX_OUTPUT_SIZE = 7 * 1024 * 1024;
const FILTERS = ['grayscale','sepia','negative','blur','brightness','contrast','saturate','sharpen','pixelate','vintage','emboss','duotone','warm','cool','vignette','sharpen-hd','rainbow','glitch','frost','night','sunset','film'];
const FILTER_SET = new Set(FILTERS);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/octet-stream')) return cb(new Error('Solo se permiten imágenes.'));
        cb(null, true);
    }
});

function number(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function overlay(width, height, body) {
    return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
}

async function size(image) {
    const m = await image.metadata();
    return { width: Math.max(1, m.width || 1200), height: Math.max(1, m.height || 800) };
}

async function applyFilter(input, filter, intensity) {
    const image = sharp(input, { failOn: 'warning', limitInputPixels: MAX_PIXELS }).rotate();
    switch (filter) {
        case 'grayscale': return image.grayscale();
        case 'sepia': return image.grayscale().tint('#704214');
        case 'negative': return image.negate();
        case 'blur': return image.blur(number(intensity, 3, 0.3, 20));
        case 'brightness': return image.modulate({ brightness: number(intensity, 1.25, 0.25, 2) });
        case 'contrast': { const c = number(intensity, 1.35, 0.5, 2); return image.linear(c, 128 * (1 - c)); }
        case 'saturate': return image.modulate({ saturation: number(intensity, 1.5, 0, 3) });
        case 'sharpen': return image.sharpen({ sigma: number(intensity, 2, 0.3, 10) });
        case 'pixelate': { const { width } = await size(image); const block = Math.round(number(intensity, 12, 2, 40)); const small = Math.max(1, Math.floor(width / block)); return image.resize({ width: small, withoutEnlargement: true }).resize({ width, kernel: sharp.kernel.nearest }); }
        case 'vintage': return image.modulate({ saturation: 0.75, brightness: 1.05 }).linear(1.08, -8).tint('#f0d2a0');
        case 'emboss': return image.grayscale().convolve({ width: 3, height: 3, kernel: [-2,-1,0,-1,1,1,0,1,2] }).linear(1.2, 110);
        case 'duotone': { const { width, height } = await size(image); const o = overlay(width, height, '<defs><linearGradient id="d" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#172554"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#d)"/>'); return image.grayscale().composite([{ input: o, blend: 'color' }]); }
        case 'warm': return image.modulate({ saturation: 1.12, brightness: 1.04 }).tint('#ffd0a3');
        case 'cool': return image.modulate({ saturation: 1.05, brightness: 1.02 }).tint('#9fc8ff');
        case 'vignette': { const { width, height } = await size(image); const s = number(intensity, 0.65, 0.2, 1); const o = overlay(width, height, `<defs><radialGradient id="v"><stop offset="45%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${s}"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#v)"/>`); return image.composite([{ input: o, blend: 'multiply' }]); }
        case 'sharpen-hd': return image.sharpen({ sigma: number(intensity, 3, 0.5, 10), m1: 1.5, m2: 2.5 }).modulate({ contrast: 1.05 });
        case 'rainbow': return image.modulate({ saturation: number(intensity, 1.8, 1, 3), hue: 25 });
        case 'glitch': { const { width, height } = await size(image); const shift = Math.round(number(intensity, 12, 4, 40)); const bar = Math.max(3, Math.round(height * 0.025)); const o = overlay(width, height, `<rect x="${shift}" y="${Math.round(height*.27)}" width="${Math.max(1,width-shift)}" height="${bar}" fill="#ff00aa" opacity=".32"/><rect x="0" y="${Math.round(height*.61)}" width="${Math.max(1,width-shift)}" height="${bar}" fill="#00eaff" opacity=".32"/>`); return image.modulate({ saturation: 1.35, brightness: 1.02 }).composite([{ input: o, blend: 'screen' }]); }
        case 'frost': return image.modulate({ saturation: .8, brightness: 1.12 }).tint('#d8efff').linear(1.04, 4);
        case 'night': return image.modulate({ saturation: .72, brightness: .72 }).tint('#243b72').linear(1.05, -4);
        case 'sunset': return image.modulate({ saturation: 1.35, brightness: 1.03 }).tint('#ff9b5e').linear(1.04, 3);
        case 'film': return image.modulate({ saturation: .88, brightness: 1.02 }).linear(1.12, -12).tint('#e8c69a');
        default: throw new Error('Filtro no permitido.');
    }
}

async function renderJpeg(input, filter, intensity) {
    const filtered = await applyFilter(input, filter, intensity);
    let output;
    for (const quality of [88,78,68,58]) {
        output = await filtered.jpeg({ quality, mozjpeg: true }).toBuffer();
        if (output.length <= MAX_OUTPUT_SIZE) break;
    }
    return output;
}

router.post('/', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ status:false, creator:'FamilyBot-MD', message:'Debes subir una imagen usando el campo "image".' });
    const filter = String(req.body.filter || 'grayscale').trim().toLowerCase();
    if (!FILTER_SET.has(filter)) return res.status(400).json({ status:false, creator:'FamilyBot-MD', message:'Filtro no válido.', filters:FILTERS });
    try {
        const output = await renderJpeg(req.file.buffer, filter, req.body.intensity);
        if (output.length > MAX_OUTPUT_SIZE) return res.status(413).json({ status:false, creator:'FamilyBot-MD', message:'La imagen procesada es demasiado grande.' });
        if (String(req.query.format).toLowerCase() === 'image') return res.status(200).type('jpg').set('Content-Length', String(output.length)).set('Cache-Control','no-store').send(output);
        return res.json({ status:true, creator:'FamilyBot-MD', filter, mimetype:'image/jpeg', size:output.length, result:{ url:`data:image/jpeg;base64,${output.toString('base64')}` } });
    } catch (error) {
        console.error('[IMAGE FILTER ERROR]', error);
        return res.status(/Input|image|format|pixel|corrupt|unsupported|Vips/i.test(error.message||'') ? 422 : 500).json({ status:false, creator:'FamilyBot-MD', message:'No se pudo procesar la imagen.' });
    }
});

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) return res.status(400).json({ status:false, creator:'FamilyBot-MD', message:error.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera el límite de 10 MB.' : 'No se pudo recibir la imagen.' });
    if (error) return res.status(400).json({ status:false, creator:'FamilyBot-MD', message:error.message || 'Archivo no válido.' });
    next();
});

router.meta = { title:'Filtro de imagen', description:'Aplica filtros a imágenes y devuelve una imagen compatible con bots de WhatsApp.', icon:'fas fa-image', method:'POST', fields:[{name:'image',label:'Imagen',type:'file'},{name:'filter',label:'Filtro',type:'select',options:FILTERS.map(value=>({value,label:value}))},{name:'intensity',label:'Intensidad',type:'text',placeholder:'Opcional'}], resultType:'image', resultField:'result.url', example:'POST /api/image/filter?apiKey=TU_API_KEY&format=image' };

module.exports = router;
