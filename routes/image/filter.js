const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;
const MAX_OUTPUT_SIZE = 7 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten imágenes.'));
        }
        cb(null, true);
    }
});

const FILTERS = new Set([
    // Filtros existentes
    'grayscale', 'sepia', 'negative', 'blur', 'brightness',
    'contrast', 'saturate', 'sharpen', 'pixelate', 'vintage',
    // Nuevos efectos
    'emboss', 'duotone', 'warm', 'cool', 'vignette', 'sharpen-hd',
    'rainbow', 'glitch', 'frost', 'night', 'sunset', 'film'
]);

function number(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function svgOverlay(width, height, body) {
    return Buffer.from(`
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            ${body}
        </svg>
    `);
}

async function imageSize(image) {
    const metadata = await image.metadata();
    return {
        width: Math.max(1, metadata.width || 1200),
        height: Math.max(1, metadata.height || 800)
    };
}

async function applyFilter(input, filter, intensity) {
    const image = sharp(input, {
        failOn: 'warning',
        limitInputPixels: MAX_PIXELS
    }).rotate();

    const level = number(intensity, 1, 0.1, 3);

    switch (filter) {
        // ---------------- Existing filters ----------------
        case 'grayscale':
            return image.grayscale();

        case 'sepia':
            return image.grayscale().tint('#704214');

        case 'negative':
            return image.negate();

        case 'blur':
            return image.blur(number(intensity, 3, 0.3, 20));

        case 'brightness':
            return image.modulate({ brightness: number(intensity, 1.25, 0.25, 2) });

        case 'contrast': {
            const contrast = number(intensity, 1.35, 0.5, 2);
            return image.linear(contrast, 128 * (1 - contrast));
        }

        case 'saturate':
            return image.modulate({ saturation: number(intensity, 1.5, 0, 3) });

        case 'sharpen':
            return image.sharpen({ sigma: number(intensity, 2, 0.3, 10) });

        case 'pixelate': {
            const { width } = await imageSize(image);
            const block = Math.round(number(intensity, 12, 2, 40));
            const smallWidth = Math.max(1, Math.floor(width / block));
            return image
                .resize({ width: smallWidth, withoutEnlargement: true })
                .resize({ width, kernel: sharp.kernel.nearest });
        }

        case 'vintage':
            return image
                .modulate({ saturation: 0.75, brightness: 1.05 })
                .linear(1.08, -8)
                .tint('#f0d2a0');

        // ---------------- New effects ----------------
        case 'emboss':
            return image
                .grayscale()
                .convolve({
                    width: 3,
                    height: 3,
                    kernel: [-2, -1, 0, -1, 1, 1, 0, 1, 2]
                })
                .linear(1.2, 110);

        case 'duotone': {
            const { width, height } = await imageSize(image);
            const overlay = svgOverlay(width, height, `
                <defs>
                    <linearGradient id="duo" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0%" stop-color="#172554"/>
                        <stop offset="100%" stop-color="#f59e0b"/>
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#duo)"/>
            `);
            return image
                .grayscale()
                .composite([{ input: overlay, blend: 'color' }]);
        }

        case 'warm':
            return image
                .modulate({ saturation: 1.12, brightness: 1.04 })
                .tint('#ffd0a3');

        case 'cool':
            return image
                .modulate({ saturation: 1.05, brightness: 1.02 })
                .tint('#9fc8ff');

        case 'vignette': {
            const { width, height } = await imageSize(image);
            const strength = Math.round(number(intensity, 0.65, 0.2, 1) * 100);
            const overlay = svgOverlay(width, height, `
                <defs>
                    <radialGradient id="v" cx="50%" cy="50%" r="70%">
                        <stop offset="45%" stop-color="#000000" stop-opacity="0"/>
                        <stop offset="100%" stop-color="#000000" stop-opacity="${strength / 100}"/>
                    </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#v)"/>
            `);
            return image.composite([{ input: overlay, blend: 'multiply' }]);
        }

        case 'sharpen-hd':
            return image
                .sharpen({ sigma: number(intensity, 3, 0.5, 10), m1: 1.5, m2: 2.5 })
                .modulate({ contrast: 1.05 });

        case 'rainbow':
            return image.modulate({
                saturation: number(intensity, 1.8, 1, 3),
                hue: 25
            });

        case 'glitch': {
            const { width, height } = await imageSize(image);
            const shift = Math.round(number(intensity, 12, 4, 40));
            const barHeight = Math.max(3, Math.round(height * 0.025));
            const y1 = Math.round(height * 0.27);
            const y2 = Math.round(height * 0.61);
            const overlay = svgOverlay(width, height, `
                <rect x="${shift}" y="${y1}" width="${Math.max(1, width - shift)}" height="${barHeight}" fill="#ff00aa" opacity="0.32"/>
                <rect x="0" y="${y2}" width="${Math.max(1, width - shift)}" height="${barHeight}" fill="#00eaff" opacity="0.32"/>
                <rect x="0" y="${Math.round(height * 0.82)}" width="100%" height="${Math.max(2, Math.round(barHeight / 2))}" fill="#ffffff" opacity="0.14"/>
            `);
            return image
                .modulate({ saturation: 1.35, brightness: 1.02 })
                .composite([{ input: overlay, blend: 'screen' }]);
        }

        case 'frost':
            return image
                .modulate({ saturation: 0.8, brightness: 1.12 })
                .tint('#d8efff')
                .linear(1.04, 4);

        case 'night':
            return image
                .modulate({ saturation: 0.72, brightness: 0.72 })
                .tint('#243b72')
                .linear(1.05, -4);

        case 'sunset':
            return image
                .modulate({ saturation: 1.35, brightness: 1.03 })
                .tint('#ff9b5e')
                .linear(1.04, 3);

        case 'film':
            return image
                .modulate({ saturation: 0.88, brightness: 1.02 })
                .linear(1.12, -12)
                .tint('#e8c69a');

        default:
            throw new Error('Filtro no permitido.');
    }
}

router.post('/', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'Debes subir una imagen usando el campo "image".'
        });
    }

    const filter = String(req.body.filter || 'grayscale').trim().toLowerCase();
    if (!FILTERS.has(filter)) {
        return res.status(400).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'Filtro no válido.',
            filters: [...FILTERS]
        });
    }

    try {
        const filteredImage = await applyFilter(req.file.buffer, filter, req.body.intensity);
        const output = await filteredImage
            .jpeg({ quality: 88, mozjpeg: true })
            .toBuffer();

        if (output.length > MAX_OUTPUT_SIZE) {
            return res.status(413).json({
                status: false,
                creator: 'FamilyBot-MD',
                message: 'La imagen procesada es demasiado grande.'
            });
        }

        if (String(req.query.format).toLowerCase() === 'image') {
            return res.status(200)
                .type('jpg')
                .set('Cache-Control', 'no-store')
                .send(output);
        }

        return res.status(200).json({
            status: true,
            creator: 'FamilyBot-MD',
            filter,
            mimetype: 'image/jpeg',
            size: output.length,
            result: {
                url: `data:image/jpeg;base64,${output.toString('base64')}`
            }
        });
    } catch (error) {
        console.error('[IMAGE FILTER ERROR]', error);
        const isImageError = /Input|image|format|pixel|corrupt|unsupported/i.test(error.message || '');
        return res.status(isImageError ? 422 : 500).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: isImageError
                ? 'La imagen no es válida o no se puede procesar.'
                : 'No se pudo aplicar el filtro.'
        });
    }
});

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'La imagen supera el límite de 10 MB.'
            : 'No se pudo recibir la imagen.';
        return res.status(400).json({ status: false, creator: 'FamilyBot-MD', message });
    }
    if (error) {
        return res.status(400).json({ status: false, creator: 'FamilyBot-MD', message: error.message || 'Archivo no válido.' });
    }
    next();
});

router.meta = {
    title: 'Filtro de imagen',
    description: 'Aplica filtros y efectos a una imagen directamente desde la API.',
    icon: 'fas fa-image',
    method: 'POST',
    fields: [
        { name: 'image', label: 'Imagen', type: 'file' },
        {
            name: 'filter',
            label: 'Filtro',
            type: 'select',
            options: [
                { value: 'grayscale', label: 'Blanco y negro' },
                { value: 'sepia', label: 'Sepia' },
                { value: 'negative', label: 'Negativo' },
                { value: 'blur', label: 'Desenfoque' },
                { value: 'brightness', label: 'Brillo' },
                { value: 'contrast', label: 'Contraste' },
                { value: 'saturate', label: 'Saturación' },
                { value: 'sharpen', label: 'Nitidez' },
                { value: 'pixelate', label: 'Pixelado' },
                { value: 'vintage', label: 'Vintage' },
                { value: 'emboss', label: 'Relieve' },
                { value: 'duotone', label: 'Duotono' },
                { value: 'warm', label: 'Cálido' },
                { value: 'cool', label: 'Frío' },
                { value: 'vignette', label: 'Viñeta' },
                { value: 'sharpen-hd', label: 'Nitidez HD' },
                { value: 'rainbow', label: 'Arcoíris' },
                { value: 'glitch', label: 'Glitch' },
                { value: 'frost', label: 'Escarcha' },
                { value: 'night', label: 'Noche' },
                { value: 'sunset', label: 'Atardecer' },
                { value: 'film', label: 'Película' }
            ],
            default: 'grayscale'
        },
        { name: 'intensity', label: 'Intensidad', type: 'text', placeholder: 'Opcional: 3 para blur, 1.5 para brillo/saturación' }
    ],
    resultType: 'image',
    resultField: 'result.url'
};

module.exports = router;
