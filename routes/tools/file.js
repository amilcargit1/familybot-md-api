const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const UPLOAD_DIR = path.join(
    process.cwd(),
    'uploads',
    'temp'
);

const EXPIRE_TIME = 60 * 60 * 1000;

function cleanupFiles() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        return;
    }

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

function findFile(id) {
    if (!fs.existsSync(UPLOAD_DIR)) {
        return null;
    }

    const files = fs.readdirSync(
        UPLOAD_DIR
    );

    const filename = files.find(file =>
        file.startsWith(`${id}-`)
    );

    if (!filename) {
        return null;
    }

    return path.join(
        UPLOAD_DIR,
        filename
    );
}

/*
 * GET /api/tools/file/:id
 */
router.get('/:id', (req, res) => {
    cleanupFiles();

    const id = String(
        req.params.id || ''
    ).trim();

    if (
        !/^[A-Za-z0-9_-]{8,30}$/.test(id)
    ) {
        return res.status(400).json({
            status: false,
            message: 'ID inválido'
        });
    }

    const filePath = findFile(id);

    if (
        !filePath ||
        !fs.existsSync(filePath)
    ) {
        return res.status(404).json({
            status: false,
            message:
                'Archivo no encontrado o expirado'
        });
    }

    const filename = path.basename(
        filePath
    ).replace(`${id}-`, '');

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
    );

    res.setHeader(
        'Cache-Control',
        'no-store'
    );

    res.setHeader(
        'X-Content-Type-Options',
        'nosniff'
    );

    return res.sendFile(filePath);
});

router.meta = {
    title: 'File Download',
    description:
        'Descarga un archivo temporal',
    icon: 'fas fa-file-download'
};

module.exports = router;