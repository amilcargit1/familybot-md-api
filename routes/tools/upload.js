const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB máximo
});

// POST /api/tools/upload?apiKey=...  (multipart/form-data, campo "file")
// No usa almacenamiento local (el disco de Render es temporal); reenvía el
// archivo a catbox.moe, un hosting gratis y anónimo, y devuelve el link.
router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: false, message: 'Debes subir un archivo con el campo "file"' });
    }

    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);

        const uploadRes = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: form
        });
        const url = (await uploadRes.text()).trim();

        if (!url.startsWith('http')) {
            return res.status(500).json({ status: false, message: 'No se pudo subir el archivo (el proveedor externo falló)' });
        }

        res.json({ status: true, creator: 'familybot-md', url });

    } catch (err) {
        console.error('Error de upload:', err.message);
        res.status(500).json({ status: false, message: 'Error interno al subir el archivo' });
    }
});

router.meta = {
    title: 'Subir archivo',
    description: 'Sube una imagen, video u otro archivo y obtén un link público (máx. 10 MB)',
    icon: 'fas fa-cloud-arrow-up',
    method: 'POST',
    fields: [
        { name: 'file', label: 'Archivo', type: 'file' }
    ],
    resultType: 'link',
    resultField: 'url',
    example: { status: true, creator: 'familybot-md', url: 'https://files.catbox.moe/abc123.png' }
};

module.exports = router;
