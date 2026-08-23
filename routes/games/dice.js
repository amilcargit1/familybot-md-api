const express = require('express');

const router = express.Router();

const DICE_STICKERS = {
    1: 'https://i.postimg.cc/ZKmMBZkF/1000603566.webp',
    2: 'https://i.postimg.cc/LsGyHFBj/1000603568.webp',
    3: 'https://i.postimg.cc/x83gyJrK/1000603567.webp',
    4: 'https://i.postimg.cc/xTgtXz3S/1000603571.webp',
    5: 'https://i.postimg.cc/BvPg7w99/1000603570.webp',
    6: 'https://i.postimg.cc/Bb4B6S8J/1000603569.webp'
};

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

router.get('/', async (req, res) => {
    try {
        const result = rollDice();
        const sticker = DICE_STICKERS[result];

        return res.status(200).json({
            status: true,
            creator: 'FamilyBot-MD',
            type: 'dice',
            result: {
                value: result,
                sides: 6,
                sticker,
                message: `🎲 Resultado: ${result}`
            }
        });

    } catch (error) {
        console.error('[DICE]', error);

        return res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            type: 'dice',
            message: 'No se pudo lanzar el dado'
        });
    }
});

router.meta = {
    title: 'Dado',
    description: 'Lanza un dado y obtiene automáticamente el sticker correspondiente al resultado',
    icon: 'fas fa-dice',
    fields: [],
    resultType: 'json',
    resultField: 'result'
};

module.exports = router;