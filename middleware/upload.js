const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'video/mp4',
    'application/pdf'
]);

function ensureUploadDir() {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function sanitizeExtension(filename) {
    const ext = path.extname(filename || '').toLowerCase();
    return ext.length <= 10 && /^[.a-z0-9]+$/.test(ext) ? ext : '';
}

function uploadHandler(req, res, next) {
    ensureUploadDir();

    const contentType = req.headers['content-type'] || '';
    const match = contentType.match(/multipart\/form-data;\s*boundary=([^;]+)/i);

    if (!match) {
        return res.status(400).json({ status: false, message: 'La solicitud debe usar multipart/form-data' });
    }

    const length = Number(req.headers['content-length'] || 0);
    if (length > MAX_FILE_SIZE + 1024 * 1024) {
        return res.status(413).json({ status: false, message: 'El archivo supera el tamaño máximo permitido' });
    }

    const chunks = [];
    let total = 0;
    const boundary = Buffer.from(`--${match[1].replace(/^"|"$/g, '')}`);

    req.on('data', chunk => {
        total += chunk.length;
        if (total > MAX_FILE_SIZE + 1024 * 1024) {
            req.destroy();
            return;
        }
        chunks.push(chunk);
    });

    req.on('error', () => {
        if (!res.headersSent) res.status(400).json({ status: false, message: 'Error al recibir el archivo' });
    });

    req.on('end', () => {
        try {
            const body = Buffer.concat(chunks);
            const parts = splitMultipart(body, boundary);
            const filePart = parts.find(part => /filename="[^"]+"/i.test(part.headers));

            if (!filePart) {
                return res.status(400).json({ status: false, message: 'No se encontró ningún archivo' });
            }

            const filenameMatch = filePart.headers.match(/filename="([^"]*)"/i);
            const typeMatch = filePart.headers.match(/content-type:\s*([^\r\n]+)/i);
            const originalName = filenameMatch ? path.basename(filenameMatch[1]) : '';
            const mimeType = typeMatch ? typeMatch[1].trim().toLowerCase() : '';
            const file = filePart.data;

            if (!ALLOWED_TYPES.has(mimeType)) {
                return res.status(415).json({ status: false, message: 'Tipo de archivo no permitido' });
            }

            if (!file.length || file.length > MAX_FILE_SIZE) {
                return res.status(413).json({ status: false, message: 'El archivo supera el tamaño máximo permitido' });
            }

            const filename = `${crypto.randomBytes(16).toString('hex')}${sanitizeExtension(originalName)}`;
            const destination = path.join(UPLOAD_DIR, filename);
            fs.writeFileSync(destination, file, { flag: 'wx' });

            req.file = {
                originalName,
                filename,
                path: destination,
                size: file.length,
                mimetype: mimeType
            };

            next();
        } catch (error) {
            if (!res.headersSent) res.status(400).json({ status: false, message: 'No se pudo procesar el archivo' });
        }
    });
}

function splitMultipart(body, boundary) {
    const parts = [];
    let offset = 0;

    while (true) {
        const start = body.indexOf(boundary, offset);
        if (start === -1) break;

        const contentStart = body.indexOf(Buffer.from('\r\n\r\n'), start);
        if (contentStart === -1) break;

        const nextBoundary = body.indexOf(boundary, contentStart + 4);
        if (nextBoundary === -1) break;

        const headerBuffer = body.subarray(start + boundary.length + 2, contentStart);
        const dataEnd = nextBoundary - 2;
        const data = body.subarray(contentStart + 4, dataEnd);

        parts.push({ headers: headerBuffer.toString('utf8'), data });
        offset = nextBoundary;
    }

    return parts;
}

module.exports = { uploadHandler, UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_TYPES };
