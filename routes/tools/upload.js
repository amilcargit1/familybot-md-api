const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const UPLOAD_DIR = path.join(
    process.cwd(),
    'uploads',
    'temp'
);

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
    return crypto
        .randomBytes(9)
        .toString('base64url');
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
        const filePath = path.join(
            UPLOAD_DIR,
            file
        );

        try {
            const stat = fs.statSync(filePath);

            if (
                now - stat.mtimeMs >
                EXPIRE_TIME
            ) {
                fs.unlinkSync(filePath);
            }
        } catch {}
    }
}

/*
 * Página web
 *
 * GET /api/tools/upload
 */
router.get('/', (req, res) => {
    res.setHeader(
        'Content-Type',
        'text/html; charset=utf-8'
    );

    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>FamilyBot Upload</title>

<style>
* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;

    display: flex;
    justify-content: center;
    align-items: center;

    padding: 20px;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    background:
        linear-gradient(
            135deg,
            #111827,
            #1e293b,
            #312e81
        );

    color: white;
}

.container {
    width: 100%;
    max-width: 500px;

    padding: 30px;

    border-radius: 24px;

    background:
        rgba(255,255,255,0.08);

    border:
        1px solid
        rgba(255,255,255,0.15);

    backdrop-filter:
        blur(15px);

    box-shadow:
        0 20px 60px
        rgba(0,0,0,0.35);
}

.logo {
    text-align: center;
    font-size: 45px;
}

h1 {
    text-align: center;
    margin: 10px 0 5px;
}

.subtitle {
    text-align: center;
    opacity: 0.7;
    margin-bottom: 25px;
}

.drop {
    border: 2px dashed
        rgba(255,255,255,0.3);

    border-radius: 18px;

    padding: 35px 20px;

    text-align: center;

    cursor: pointer;

    transition: 0.2s;
}

.drop:hover {
    background:
        rgba(255,255,255,0.08);
}

.drop-icon {
    font-size: 45px;
    margin-bottom: 10px;
}

input[type="file"] {
    display: none;
}

.filename {
    margin-top: 15px;

    word-break: break-word;

    opacity: 0.8;
}

button {
    width: 100%;

    margin-top: 20px;

    padding: 15px;

    border: none;

    border-radius: 14px;

    font-size: 17px;

    font-weight: bold;

    cursor: pointer;

    background: white;
    color: #111827;
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.progress {
    width: 100%;

    height: 10px;

    margin-top: 20px;

    border-radius: 10px;

    overflow: hidden;

    background:
        rgba(255,255,255,0.15);

    display: none;
}

.progress-bar {
    width: 0%;

    height: 100%;

    background: #22c55e;

    transition: width 0.2s;
}

.result {
    display: none;

    margin-top: 20px;

    padding: 18px;

    border-radius: 15px;

    background:
        rgba(34,197,94,0.12);

    border:
        1px solid
        rgba(34,197,94,0.3);
}

.result a {
    color: #86efac;

    word-break: break-all;
}

.error {
    display: none;

    margin-top: 20px;

    padding: 15px;

    border-radius: 15px;

    background:
        rgba(239,68,68,0.15);

    color: #fecaca;
}

.info {
    text-align: center;

    margin-top: 20px;

    font-size: 13px;

    opacity: 0.6;
}
</style>
</head>

<body>

<div class="container">

    <div class="logo">📤</div>

    <h1>FamilyBot Upload</h1>

    <div class="subtitle">
        Sube tus archivos temporalmente
    </div>

    <label class="drop" for="file">

        <div class="drop-icon">
            📁
        </div>

        <strong>
            Seleccionar archivo
        </strong>

        <div class="filename"
             id="filename">
            Ningún archivo seleccionado
        </div>

    </label>

    <input
        type="file"
        id="file"
    >

    <button
        id="upload"
        disabled>
        🚀 SUBIR ARCHIVO
    </button>

    <div class="progress"
         id="progress">

        <div
            class="progress-bar"
            id="progressBar">
        </div>

    </div>

    <div
        class="result"
        id="result">

        <strong>
            ✅ Archivo subido
        </strong>

        <br><br>

        <div id="resultInfo"></div>

        <br>

        🔗 <a
            id="downloadUrl"
            target="_blank">
        </a>

    </div>

    <div
        class="error"
        id="error">
    </div>

    <div class="info">
        Máximo 50 MB · Expira en 1 hora
    </div>

</div>

<script>

const fileInput =
    document.getElementById('file');

const uploadButton =
    document.getElementById('upload');

const filename =
    document.getElementById('filename');

const progress =
    document.getElementById('progress');

const progressBar =
    document.getElementById('progressBar');

const result =
    document.getElementById('result');

const resultInfo =
    document.getElementById('resultInfo');

const downloadUrl =
    document.getElementById('downloadUrl');

const errorBox =
    document.getElementById('error');

const MAX_SIZE =
    50 * 1024 * 1024;

fileInput.addEventListener(
    'change',
    () => {

        result.style.display = 'none';
        errorBox.style.display = 'none';

        const file =
            fileInput.files[0];

        if (!file) {

            filename.textContent =
                'Ningún archivo seleccionado';

            uploadButton.disabled = true;

            return;
        }

        filename.textContent =
            file.name;

        if (file.size > MAX_SIZE) {

            errorBox.textContent =
                '❌ El archivo supera el límite de 50 MB.';

            errorBox.style.display =
                'block';

            uploadButton.disabled = true;

            return;
        }

        uploadButton.disabled = false;
    }
);

uploadButton.addEventListener(
    'click',
    () => {

        const file =
            fileInput.files[0];

        if (!file) {
            return;
        }

        uploadButton.disabled = true;

        progress.style.display =
            'block';

        progressBar.style.width =
            '0%';

        result.style.display =
            'none';

        errorBox.style.display =
            'none';

        const xhr =
            new XMLHttpRequest();

        const apiKey =
            new URLSearchParams(
                window.location.search
            ).get('apiKey');

        if (!apiKey) {

            errorBox.textContent =
                '❌ Falta el apiKey en la URL.';

            errorBox.style.display =
                'block';

            uploadButton.disabled = false;

            return;
        }

        const url =
            window.location.pathname +
            '?apiKey=' +
            encodeURIComponent(apiKey);

        xhr.open(
            'PUT',
            url,
            true
        );

        xhr.setRequestHeader(
            'Content-Type',
            file.type ||
            'application/octet-stream'
        );

        xhr.setRequestHeader(
            'x-filename',
            file.name
        );

        xhr.upload.addEventListener(
            'progress',
            event => {

                if (event.lengthComputable) {

                    const percent =
                        Math.round(
                            (
                                event.loaded /
                                event.total
                            ) * 100
                        );

                    progressBar.style.width =
                        percent + '%';
                }
            }
        );

        xhr.onload = () => {

            uploadButton.disabled = false;

            let data;

            try {
                data =
                    JSON.parse(xhr.responseText);
            } catch {

                errorBox.textContent =
                    '❌ Respuesta inválida del servidor.';

                errorBox.style.display =
                    'block';

                return;
            }

            if (
                xhr.status >= 200 &&
                xhr.status < 300 &&
                data.status
            ) {

                result.style.display =
                    'block';

                resultInfo.innerHTML =
                    '📁 ' +
                    data.filename +
                    '<br>' +
                    '📦 ' +
                    formatSize(data.size) +
                    '<br>' +
                    '⏱️ Expira en ' +
                    data.expiresIn;

                downloadUrl.href =
                    data.url;

                downloadUrl.textContent =
                    data.url;

                progressBar.style.width =
                    '100%';

            } else {

                errorBox.textContent =
                    '❌ ' +
                    (
                        data.message ||
                        'No se pudo subir el archivo'
                    );

                errorBox.style.display =
                    'block';
            }
        };

        xhr.onerror = () => {

            uploadButton.disabled = false;

            errorBox.textContent =
                '❌ Error de conexión con la API.';

            errorBox.style.display =
                'block';
        };

        xhr.send(file);
    }
);

function formatSize(bytes) {

    if (bytes < 1024) {
        return bytes + ' B';
    }

    if (bytes < 1024 * 1024) {
        return (
            bytes / 1024
        ).toFixed(2) + ' KB';
    }

    return (
        bytes /
        1024 /
        1024
    ).toFixed(2) + ' MB';
}

</script>

</body>
</html>
    `);
});

/*
 * PUT /api/tools/upload
 *
 * Recibe el archivo directamente.
 */
router.put('/', async (req, res) => {

    ensureDirectory();
    cleanupFiles();

    const contentType =
        String(
            req.headers['content-type'] || ''
        )
            .split(';')[0]
            .trim()
            .toLowerCase();

    if (!ALLOWED_TYPES[contentType]) {

        return res.status(415).json({
            status: false,
            message:
                'Tipo de archivo no permitido',

            allowed:
                Object.keys(ALLOWED_TYPES)
        });
    }

    const contentLength =
        Number(
            req.headers['content-length'] || 0
        );

    if (
        contentLength > MAX_SIZE
    ) {

        return res.status(413).json({
            status: false,
            message:
                'El archivo supera el límite de 50 MB'
        });
    }

    const id =
        generateId();

    let filename =
        req.headers['x-filename'] ||
        `file${ALLOWED_TYPES[contentType]}`;

    filename =
        cleanFilename(filename);

    if (!path.extname(filename)) {

        filename +=
            ALLOWED_TYPES[contentType];
    }

    const storedFilename =
        `${id}-${filename}`;

    const filePath =
        path.join(
            UPLOAD_DIR,
            storedFilename
        );

    let totalSize = 0;

    const writeStream =
        fs.createWriteStream(
            filePath
        );

    try {

        await new Promise(
            (resolve, reject) => {

                req.on(
                    'data',
                    chunk => {

                        totalSize +=
                            chunk.length;

                        if (
                            totalSize >
                            MAX_SIZE
                        ) {

                            req.destroy();

                            writeStream.destroy();

                            reject(
                                new Error(
                                    'MAX_SIZE'
                                )
                            );

                            return;
                        }

                        if (
                            !writeStream.write(
                                chunk
                            )
                        ) {

                            req.pause();

                            writeStream.once(
                                'drain',
                                () => req.resume()
                            );
                        }
                    }
                );

                req.on(
                    'end',
                    () => {
                        writeStream.end();
                    }
                );

                req.on(
                    'error',
                    reject
                );

                writeStream.on(
                    'finish',
                    resolve
                );

                writeStream.on(
                    'error',
                    reject
                );
            }
        );

    } catch (error) {

        try {
            writeStream.destroy();
        } catch {}

        try {
            if (
                fs.existsSync(filePath)
            ) {
                fs.unlinkSync(filePath);
            }
        } catch {}

        if (
            error.message ===
            'MAX_SIZE'
        ) {

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

        expiresIn:
            '1 hora',

        url
    });
});

router.meta = {

    title:
        'Upload',

    description:
        'Sube archivos temporalmente',

    icon:
        'fas fa-cloud-upload-alt',

    fields: [
        {
            name:
                'file',

            label:
                'Archivo'
        }
    ],

    resultType:
        'json'
};

module.exports = router;