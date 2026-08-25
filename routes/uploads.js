const express = require('express');
const fs = require('fs');
const router = express.Router();
const { uploadHandler } = require('../middleware/upload');

router.meta = {
    type: 'media',
    title: 'Subir archivo',
    description: 'Carga segura de archivos multimedia y documentos.',
    icon: 'fas fa-cloud-arrow-up',
    fields: [],
    resultType: 'raw'
};

router.post('/', uploadHandler, (req, res) => {
    res.status(201).json({
        status: true,
        message: 'Archivo subido correctamente',
        file: {
            name: req.file.originalName,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
        }
    });
});

router.delete('/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-f0-9]{32}\.[a-z0-9]+$/i.test(filename)) {
        return res.status(400).json({ status: false, message: 'Nombre de archivo inválido' });
    }

    const filePath = require('path').join(require('../middleware/upload').UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ status: false, message: 'Archivo no encontrado' });
    }

    fs.unlinkSync(filePath);
    res.json({ status: true, message: 'Archivo eliminado correctamente' });
});

module.exports = router;
