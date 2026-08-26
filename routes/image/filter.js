const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;

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
    'grayscale',
    'sepia',
    'negative',
    'blur',
    'brightness',
    'contrast',
    'saturate',
    'sharpen',
    'pixelate',
    'vintage'
]);

function number(value, fallback, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

async function applyFilter(input, filter, intensity) {
    let image = sharp(input, {
        failOn: 'warning',
        limitInputPixels: MAX_PIXELS
    }).rotate();

    switch (filter) {
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
            const metadata = await image.metadata();
            const width = metadata.width || 800;
            const block = Math.round(number(intensity, 12, 2, 40));
            const smallWidth = Math.max(1, Math.floor(width / block));
            return image.resize({ width: smallWidth, withoutEnlargement: true })
                .resize({ width, kernel: sharp.kernel.nearest });
        }

        case 'vintage':
            return image
                .modulate({ saturation: 0.75, brightness: 1.05 })
                .linear(1.08, -8)
                .tint('#f0d2a0');

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
        const intensity = req.body.intensity;
        const output = await applyFilter(req.file.buffer, filter, intensity)
            .jpeg({ quality: 90, mozjpeg: true })
            .toBuffer();

        res.status(200)
            .type('jpg')
            .set('Cache-Control', 'no-store')
            .send(output);
    } catch (error) {
        console.error('[IMAGE FILTER ERROR]', error);
        const isImageError = /Input|image|format|pixel|corrupt|unsupported/i.test(error.message || '');
        res.status(isImageError ? 422 : 500).json({
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
    description: 'Aplica filtros a una imagen directamente desde la API.',
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
                { value: 'vintage', label: 'Vintage' }
            ],
            default: 'grayscale'
        },
        { name: 'intensity', label: 'Intensidad', type: 'text', placeholder: 'Ej: 3 para blur, 1.5 para brillo/saturación' }
    ],
    resultType: 'image',
    resultField: null
};

module.exports = router;
