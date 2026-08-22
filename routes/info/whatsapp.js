const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    try {
        const whatsappInfo = {
            name: 'WhatsApp',
            company: 'Meta Platforms, Inc.',
            type: 'Mensajería instantánea',
            founded: 2009,
            founders: [
                'Jan Koum',
                'Brian Acton'
            ],
            platforms: [
                'Android',
                'iOS',
                'Windows',
                'macOS',
                'Web'
            ],
            features: [
                'Mensajes de texto',
                'Llamadas de voz',
                'Videollamadas',
                'Estados',
                'Comunidades',
                'Canales',
                'Grupos',
                'WhatsApp Business',
                'Envío de imágenes y vídeos',
                'Envío de documentos',
                'Mensajes de voz',
                'Compartir ubicación'
            ],
            security: {
                encryption: 'Cifrado de extremo a extremo',
                privacy: 'Los mensajes y llamadas personales están protegidos mediante cifrado de extremo a extremo'
            },
            official: {
                website: 'https://www.whatsapp.com/',
                web: 'https://web.whatsapp.com/',
                business: 'https://business.whatsapp.com/'
            }
        };

        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: whatsappInfo
        });

    } catch (error) {
        console.error('[WHATSAPP INFO ERROR]', error);

        res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'No se pudo obtener la información de WhatsApp.'
        });
    }
});

router.meta = {
    title: 'Información de WhatsApp',
    description: 'Muestra información general sobre WhatsApp, sus funciones y plataformas',
    icon: 'fab fa-whatsapp',
    fields: [],
    resultType: 'json',
    resultField: 'result'
};

module.exports = router;