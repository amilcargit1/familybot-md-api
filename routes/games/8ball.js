const express = require('express');
const router = express.Router();

const answers = [
    {
        answer: 'Sí, definitivamente.',
        type: 'positive'
    },
    {
        answer: 'Todo apunta a que sí.',
        type: 'positive'
    },
    {
        answer: 'Sin ninguna duda.',
        type: 'positive'
    },
    {
        answer: 'Puedes confiar en ello.',
        type: 'positive'
    },
    {
        answer: 'Las posibilidades son altas.',
        type: 'positive'
    },
    {
        answer: 'Probablemente sí.',
        type: 'positive'
    },
    {
        answer: 'La respuesta parece ser sí.',
        type: 'positive'
    },
    {
        answer: 'Definitivamente no.',
        type: 'negative'
    },
    {
        answer: 'No cuentes con ello.',
        type: 'negative'
    },
    {
        answer: 'Las posibilidades son bajas.',
        type: 'negative'
    },
    {
        answer: 'Probablemente no.',
        type: 'negative'
    },
    {
        answer: 'La respuesta parece ser no.',
        type: 'negative'
    },
    {
        answer: 'No es un buen momento para saberlo.',
        type: 'uncertain'
    },
    {
        answer: 'Pregunta nuevamente más tarde.',
        type: 'uncertain'
    },
    {
        answer: 'El futuro todavía no está claro.',
        type: 'uncertain'
    },
    {
        answer: 'No puedo verlo con claridad.',
        type: 'uncertain'
    },
    {
        answer: 'Tal vez.',
        type: 'uncertain'
    },
    {
        answer: 'Todo puede cambiar.',
        type: 'uncertain'
    }
];

router.get('/', (req, res) => {
    try {
        const question = String(
            req.query.question ||
            req.query.pregunta ||
            ''
        ).trim();

        if (!question) {
            return res.status(400).json({
                status: false,
                creator: 'FamilyBot-MD',
                message: 'Debes hacer una pregunta.',
                example: '/api/games/8ball?apiKey=familybot-md&question=¿Tendré suerte?'
            });
        }

        const result = answers[
            Math.floor(Math.random() * answers.length)
        ];

        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: {
                question,
                answer: result.answer,
                type: result.type,
                emoji: '🎱'
            }
        });

    } catch (error) {
        console.error('[8BALL ERROR]', error);

        res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'No se pudo consultar la bola mágica.'
        });
    }
});

router.meta = {
    title: 'Bola mágica',
    description: 'Haz una pregunta y recibe una respuesta de la bola mágica',
    icon: 'fas fa-circle-question',
    fields: [
        {
            name: 'question',
            label: 'Pregunta',
            type: 'text',
            placeholder: '¿Tendré suerte hoy?'
        }
    ],
    resultType: 'json',
    resultField: 'result'
};

module.exports = router;