const express = require('express');

const router = express.Router();

const COIN_STICKERS = {
    cara: 'https://i.postimg.cc/tRcgpr8r/1000603575.webp',
    cruz: 'https://i.postimg.cc/KYQZVQPb/1000603574.webp'
};

function flipCoin() {
    return Math.random() < 0.5 ? 'cara' : 'cruz';
}

router.get('/', (req, res) => {
    try {
        const side = flipCoin();
        const sticker = COIN_STICKERS[side];

        return res.status(200).json({
            status: true,
            creator: 'FamilyBot-MD',
            type: 'coin',
            result: {
                side,
                label: side === 'cara' ? 'Cara' : 'Cruz',
                emoji: '🪙',
                sticker,
                message: `🪙 ¡Salió ${side === 'cara' ? 'Cara' : 'Cruz'}!`
            }
        });

    } catch (error) {
        console.error('[COIN ERROR]', error);

        return res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            type: 'coin',
            message: 'No se pudo lanzar la moneda.'
        });
    }
});

router.meta = {
    title: 'Cara o cruz',
    description: 'Lanza una moneda y obtiene automáticamente el sticker de Cara o Cruz',
    icon: 'fas fa-coins',
    fields: [],
    resultType: 'json',
    resultField: 'result'
};

module.exports = router;