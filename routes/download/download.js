const express = require('express');
const dns = require('dns').promises;
const net = require('net');

const router = express.Router();

const TIMEOUT_MS = 20000;

// Límite máximo: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Tipos permitidos
const ALLOWED_TYPES = new Set([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',

    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/aac',

    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',

    'application/pdf',
    'application/zip',
    'application/octet-stream'
]);

/*
 * Comprueba si una IP pertenece a una red
 * privada, local o reservada.
 */
function isPrivateIP(ip) {
    const version = net.isIP(ip);

    if (version === 4) {
        const parts = ip.split('.').map(Number);

        const a = parts[0];
        const b = parts[1];

        // 0.0.0.0/8
        if (a === 0) return true;

        // 10.0.0.0/8
        if (a === 10) return true;

        // 127.0.0.0/8
        if (a === 127) return true;

        // 169.254.0.0/16
        if (a === 169 && b === 254) return true;

        // 172.16.0.0/12
        if (a === 172 && b >= 16 && b <= 31) {
            return true;
        }

        // 192.168.0.0/16
        if (a === 192 && b === 168) {
            return true;
        }

        // 100.64.0.0/10
        if (
            a === 100 &&
            b >= 64 &&
            b <= 127
        ) {
            return true;
        }

        // 198.18.0.0/15
        if (
            a === 198 &&
            (b === 18 || b === 19)
        ) {
            return true;
        }

        // 224.0.0.0/4 multicast
        if (a >= 224) return true;

        return false;
    }

    if (version === 6) {
        const normalized = ip.toLowerCase();

        // Loopback
        if (normalized === '::1') {
            return true;
        }

        // Unspecified
        if (normalized === '::') {
            return true;
        }

        // IPv6 link-local
        if (
            normalized.startsWith('fe8') ||
            normalized.startsWith('fe9') ||
            normalized.startsWith('fea') ||
            normalized.startsWith('feb')
        ) {
            return true;
        }

        // Unique local address fc00::/7
        if (
            normalized.startsWith('fc') ||
            normalized.startsWith('fd')
        ) {
            return true;
        }

        // Multicast ff00::/8
        if (normalized.startsWith('ff')) {
            return true;
        }

        // IPv4-mapped IPv6
        if (normalized.startsWith('::ffff:')) {
            const ipv4 = normalized.substring(7);

            if (net.isIP(ipv4) === 4) {
                return isPrivateIP(ipv4);
            }
        }

        return false;
    }

    return true;
}

/*
 * Valida el hostname y evita destinos locales.
 */
async function validateHostname(hostname) {
    const host = hostname.toLowerCase().replace(/\.$/, '');

    const blockedHosts = new Set([
        'localhost',
        'localhost.localdomain',
        'ip6-localhost',
        'ip6-loopback',
        'metadata.google.internal',
        'metadata'
    ]);

    if (blockedHosts.has(host)) {
        throw new Error('Host no permitido');
    }

    // Si ya es una IP
    if (net.isIP(host)) {
        if (isPrivateIP(host)) {
            throw new Error('IP privada o local no permitida');
        }

        return;
    }

    // Resolver DNS antes de realizar la petición
    const addresses = await dns.lookup(host, {
        all: true,
        verbatim: true
    });

    if (!addresses || addresses.length === 0) {
        throw new Error('No se pudo resolver el dominio');
    }

    for (const address of addresses) {
        if (isPrivateIP(address.address)) {
            throw new Error(
                'El dominio apunta a una IP privada o local'
            );
        }
    }
}

/*
 * Limpia el nombre de archivo.
 */
function sanitizeFilename(name) {
    if (!name) {
        return 'download';
    }

    return String(name)
        .replace(/["\\/:*?<>|]/g, '')
        .replace(/[\r\n\t]/g, '')
        .trim()
        .substring(0, 150) || 'download';
}

/*
 * Intenta obtener un nombre desde Content-Disposition.
 */
function getFilenameFromHeader(header) {
    if (!header) return null;

    const utfMatch = header.match(
        /filename\*=UTF-8''([^;]+)/i
    );

    if (utfMatch) {
        try {
            return decodeURIComponent(
                utfMatch[1].replace(/^["']|["']$/g, '')
            );
        } catch {}
    }

    const normalMatch = header.match(
        /filename="?([^";]+)"?/i
    );

    if (normalMatch) {
        return normalMatch[1];
    }

    return null;
}

/*
 * Obtiene una extensión básica según Content-Type.
 */
function extensionFromType(type) {
    const map = {
        'video/mp4': '.mp4',
        'video/webm': '.webm',
        'video/quicktime': '.mov',
        'video/x-matroska': '.mkv',

        'audio/mpeg': '.mp3',
        'audio/mp3': '.mp3',
        'audio/wav': '.wav',
        'audio/ogg': '.ogg',
        'audio/webm': '.webm',
        'audio/mp4': '.m4a',
        'audio/aac': '.aac',

        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',

        'application/pdf': '.pdf',
        'application/zip': '.zip'
    };

    return map[type] || '';
}

/*
 * GET /api/tools/download
 *
 * Ejemplo:
 *
 * /api/tools/download?apiKey=TU_KEY&url=https://ejemplo.com/video.mp4
 */
router.get('/', async (req, res) => {
    const rawUrl = String(
        req.query.url || ''
    ).trim();

    if (!rawUrl) {
        return res.status(400).json({
            status: false,
            message: 'Falta el parámetro "url"',
            example:
                '/api/tools/download?apiKey=TU_KEY&url=https://example.com/file.mp4'
        });
    }

    if (rawUrl.length > 2048) {
        return res.status(400).json({
            status: false,
            message: 'La URL es demasiado larga'
        });
    }

    let target;

    try {
        target = new URL(rawUrl);
    } catch {
        return res.status(400).json({
            status: false,
            message: 'La URL no es válida'
        });
    }

    /*
     * Solo HTTP/HTTPS.
     */
    if (
        target.protocol !== 'http:' &&
        target.protocol !== 'https:'
    ) {
        return res.status(400).json({
            status: false,
            message:
                'Solo se permiten URLs HTTP y HTTPS'
        });
    }

    /*
     * No permitimos credenciales dentro de la URL.
     */
    if (target.username || target.password) {
        return res.status(400).json({
            status: false,
            message:
                'Las URLs con usuario o contraseña no están permitidas'
        });
    }

    try {
        await validateHostname(target.hostname);
    } catch (error) {
        return res.status(403).json({
            status: false,
            message:
                'Destino no permitido',
            error: error.message
        });
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, TIMEOUT_MS);

    try {
        /*
         * redirect: manual evita que el servidor
         * siga automáticamente hacia otro dominio.
         */
        const response = await fetch(target.toString(), {
            method: 'GET',

            redirect: 'manual',

            headers: {
                'User-Agent':
                    'FamilyBot-MD-API/1.0',
                'Accept':
                    'video/*,audio/*,image/*,application/pdf,application/zip,application/octet-stream;q=0.8,*/*;q=0.1'
            },

            signal: controller.signal
        });

        /*
         * No seguimos redirects automáticamente.
         */
        if (
            response.status >= 300 &&
            response.status < 400
        ) {
            return res.status(400).json({
                status: false,
                message:
                    'La URL realiza una redirección. Usa la URL final del archivo.'
            });
        }

        if (!response.ok) {
            return res.status(502).json({
                status: false,
                message:
                    'El servidor externo no pudo entregar el archivo',
                provider_status:
                    response.status
            });
        }

        /*
         * Content-Type
         */
        let contentType =
            response.headers.get('content-type') || '';

        contentType =
            contentType
                .split(';')[0]
                .trim()
                .toLowerCase();

        /*
         * Algunos servidores devuelven octet-stream
         * aunque sea un archivo válido.
         */
        if (!ALLOWED_TYPES.has(contentType)) {
            return res.status(415).json({
                status: false,
                message:
                    'Tipo de archivo no permitido',
                content_type:
                    contentType || 'desconocido'
            });
        }

        /*
         * Content-Length
         */
        const contentLengthHeader =
            response.headers.get('content-length');

        const contentLength =
            contentLengthHeader
                ? Number(contentLengthHeader)
                : null;

        if (
            Number.isFinite(contentLength) &&
            contentLength > MAX_FILE_SIZE
        ) {
            return res.status(413).json({
                status: false,
                message:
                    'El archivo supera el límite de 50 MB',
                size:
                    `${Math.round(contentLength / 1024 / 1024)} MB`
            });
        }

        /*
         * El body debe existir para poder hacer streaming.
         */
        if (!response.body) {
            return res.status(502).json({
                status: false,
                message:
                    'El servidor no devolvió contenido'
            });
        }

        let filename =
            getFilenameFromHeader(
                response.headers.get(
                    'content-disposition'
                )
            );

        if (!filename) {
            filename =
                target.pathname
                    .split('/')
                    .pop() || 'download';
        }

        filename = sanitizeFilename(filename);

        /*
         * Si no tiene extensión, añadimos una.
         */
        if (
            !filename.includes('.') &&
            contentType !== 'application/octet-stream'
        ) {
            filename += extensionFromType(
                contentType
            );
        }

        /*
         * Cabeceras de respuesta.
         */
        res.status(200);

        res.setHeader(
            'Content-Type',
            contentType
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${filename}"`
        );

        res.setHeader(
            'X-Content-Type-Options',
            'nosniff'
        );

        res.setHeader(
            'Cache-Control',
            'no-store'
        );

        if (
            Number.isFinite(contentLength)
        ) {
            res.setHeader(
                'Content-Length',
                String(contentLength)
            );
        }

        /*
         * Streaming con límite real de tamaño.
         */
        const reader =
            response.body.getReader();

        let totalBytes = 0;

        try {
            while (true) {
                const {
                    done,
                    value
                } = await reader.read();

                if (done) break;

                if (!value) continue;

                totalBytes += value.byteLength;

                /*
                 * Protección por si el servidor externo
                 * mintió en Content-Length.
                 */
                if (totalBytes > MAX_FILE_SIZE) {
                    await reader.cancel();

                    if (!res.headersSent) {
                        return res.status(413).json({
                            status: false,
                            message:
                                'El archivo supera el límite de 50 MB'
                        });
                    }

                    res.destroy(
                        new Error(
                            'File exceeds maximum size'
                        )
                    );

                    return;
                }

                if (!res.write(value)) {
                    await new Promise(resolve => {
                        res.once(
                            'drain',
                            resolve
                        );
                    });
                }
            }

            res.end();

        } catch (streamError) {
            console.error(
                '[DOWNLOAD STREAM]',
                streamError.message
            );

            if (!res.destroyed) {
                res.destroy(streamError);
            }
        }

    } catch (error) {
        console.error(
            '[DOWNLOAD API]',
            error.message
        );

        if (error.name === 'AbortError') {
            return res.status(504).json({
                status: false,
                message:
                    'Tiempo de espera agotado descargando el archivo'
            });
        }

        if (!res.headersSent) {
            return res.status(502).json({
                status: false,
                message:
                    'No se pudo descargar el archivo',
                error: error.message
            });
        }

    } finally {
        clearTimeout(timeout);
    }
});

router.meta = {
    title: 'Download',
    description:
        'Descarga archivos multimedia desde una URL directa',
    icon: 'fas fa-download',

    fields: [
        {
            name: 'url',
            label: 'URL del archivo',
            placeholder:
                'https://example.com/video.mp4'
        }
    ],

    resultType: 'file'
};

module.exports = router;