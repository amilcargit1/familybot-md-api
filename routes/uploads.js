const express = require('express');
const multer = require('multer');

const router = express.Router();

// Compatible con el sistema actual de FamilyBot-MD y Render:
// - No depende de ../middleware/upload (ese middleware no existe en este proyecto).
// - Usa memoria temporal para no depender del disco de Render.
// - Límite de 10 MB, igual que routes/tools/upload.js.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.meta = {
    type: 'media',
    title: 'Subir archivo',
    description: 'Carga segura de archivos multimedia y documentos.',
    icon: 'fas fa-cloud-arrow-up',
    method: 'POST',
    fields: [
        { name: 'file', label: 'Archivo', type: 'file' }
    ],
    resultType: 'link',
    resultField: 'url'
};

// POST /api/uploads
// El archivo se mantiene en memoria y se envía al proveedor externo.
router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            status: false,
            message: 'Debes subir un archivo con el campo "file"'
        });
    }

    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append(
            'fileToUpload',
            new Blob([req.file.buffer], { type: req.file.mimetype }),
            req.file.originalname
        );

        const uploadRes = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: form
        });

        const url = (await uploadRes.text()).trim();

        if (!uploadRes.ok || !url.startsWith('http')) {
            return res.status(502).json({
                status: false,
                message: 'No se pudo subir el archivo (el proveedor externo falló)'
            });
        }

        return res.status(201).json({
            status: true,
            message: 'Archivo subido correctamente',
            creator: 'familybot-md',
            file: {
                name: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            },
            url
        });
    } catch (err) {
        console.error('Error de upload:', err.message);
        return res.status(500).json({
            status: false,
            message: 'Error interno al subir el archivo'
        });
    }
});

// No se implementa DELETE aquí porque los archivos se almacenan en el
// proveedor externo. El antiguo código intentaba borrar un archivo local
// mediante middleware/upload, que no existe y además no sería persistente
// en el disco temporal de Render.

module.exports = router;
