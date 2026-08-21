const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

// GET /api/tools/qr?apiKey=...&text=...
router.get('/', async (req, res) => {
    const { text } = req.query;
    if (!text) {
        return res.status(400).json({ status: false, message: 'Falta el parámetro ?text=' });
    }
    try {
        const qrImage = await QRCode.toDataURL(text);
        res.json({ status: true, creator: 'familybot-md', result: qrImage });
    } catch (err) {
        res.status(500).json({ status: false, message: 'Error generando el QR' });
    }
});

module.exports = router;
