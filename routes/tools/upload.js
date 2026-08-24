const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'temp');

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const EXPIRE_TIME = 60 * 60 * 1000; // 1 hora

const ALLOWED_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',

    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',

    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/webm': '.webm',

    'application/pdf': '.pdf',
    'application/zip': '.zip'
};

function ensureDirectory() {
    fs.mkdirSync(UPLOAD_DIR, {
        recursive: true
    });
}

function generateId() {
    return crypto.randomBytes(9).toString('base64url');
}

function cleanFilename(name) {
    return String(name || 'file')
        .replace(/["\\/:*?<>|]/g, '')
        .replace(/[\r\n\t]/g, '')
        .trim()
        .substring(0, 100) || 'file';
}

function cleanupFiles() {
    ensureDirectory();

    const now = Date.now();

    for (const file of fs.readdirSync(UPLOAD_DIR)) {
        const filePath = path.join(UPLOAD_DIR, file);

        try {
            const stat = fs.statSync(filePath);

            if (now - stat.mtimeMs > EXPIRE_TIME) {
                fs.unlinkSync(filePath);
            }
        } catch {}
    }
}

/*
 * PUT /api/tools/upload
 *
 * Headers:
 *
 * Content-Type: video/mp4
 * x-filename: video.mp4
 *
 * Body:
 * archivo binario
 */
router.put('/', async (req, res) => {
    ensureDirectory();
    cleanupFiles();

    const contentType = String(
        req.headers['content-type'] || ''
    )
        .split(';')[0]
        .trim()
        .toLowerCase();

    if (!ALLOWED_TYPES[contentType]) {
        return res.status(415).json({
            status: false,
            message: 'Tipo de archivo no permitido',
            allowed: Object.keys(ALLOWED_TYPES)
        });
    }

    const contentLength = Number(
        req.headers['content-length'] || 0
    );

    if (contentLength > MAX_SIZE) {
        return res.status(413).json({
            status: false,
            message: 'El archivo supera el límite de 50 MB'
        });
    }

    const id = generateId();

    let filename =
        req.headers['x-filename'] ||
        `file${ALLOWED_TYPES[contentType]}`;

    filename = cleanFilename(filename);

    if (!path.extname(filename)) {
        filename += ALLOWED_TYPES[contentType];
    }

    const storedFilename = `${id}-${filename}`;

    const filePath = path.join(
        UPLOAD_DIR,
        storedFilename
    );

    let totalSize = 0;
    let finished = false;

    const writeStream = fs.createWriteStream(filePath);

    try {
        await new Promise((resolve, reject) => {

            req.on('data', chunk => {
                totalSize += chunk.length;

                if (totalSize > MAX_SIZE) {
                    req.destroy();

                    writeStream.destroy();

                    reject(
                        new Error('MAX_SIZE')
                    );

                    return;
                }

                if (!writeStream.write(chunk)) {
                    req.pause();

                    writeStream.once(
                        'drain',
                        () => req.resume()
                    );
                }
            });

            req.on('end', () => {
                writeStream.end();
            });

            req.on('error', reject);

            writeStream.on(
                'finish',
                () => {
                    finished = true;
                    resolve();
                }
            );

            writeStream.on(
                'error',
                reject
            );
        });

    } catch (error) {

        try {
            writeStream.destroy();
        } catch {}

        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch {}

        if (error.message === 'MAX_SIZE') {
            return res.status(413).json({
                status: false,
                message:
                    'El archivo supera el límite de 50 MB'
            });
        }

        console.error(
            '[UPLOAD]',
            error.message
        );

        return res.status(500).json({
            status: false,
            message:
                'No se pudo guardar el archivo'
        });
    }

    if (!finished) {
        return res.status(500).json({
            status: false,
            message:
                'La subida no terminó correctamente'
        });
    }

    const baseUrl =
        `${req.protocol}://${req.get('host')}`;

    const url =
        `${baseUrl}/api/tools/file/${id}`;

    return res.status(201).json({
        status: true,
        mode: 'temporary',
        id,
        filename,
        size: totalSize,
        type: contentType,
        expiresIn: '1 hora',
        url
    });
});

router.meta = {
    title: 'Upload',
    description:
        'Sube archivos temporalmente',
    icon: 'fas fa-cloud-upload-alt',

    fields: [
        {
            name: 'file',
            label: 'Archivo',
            placeholder:
                'Enviar archivo binario'
        }
    ],

    resultType: 'json'
};

module.exports = router;