const express = require('express');
const router = express.Router();

const choices = {
    piedra: '🪨',
    papel: '📄',
    tijera: '✂️'
};

const aliases = {
    piedra: 'piedra',
    papel: 'papel',
    tijera: 'tijera',
    rock: 'piedra',
    paper: 'papel',
    scissors: 'tijera'
};

function getWinner(player, bot) {
    if (player === bot) {
        return 'empate';
    }

    if (
        (player === 'piedra' && bot === 'tijera') ||
        (player === 'papel' && bot === 'piedra') ||
        (player === 'tijera' && bot === 'papel')
    ) {
        return 'jugador';
    }

    return 'bot';
}

router.get('/', (req, res) => {
    try {
        const input = String(
            req.query.choice ||
            req.query.opcion ||
            ''
        ).toLowerCase().trim();

        if (!input) {
            return res.status(400).json({
                status: false,
                creator: 'FamilyBot-MD',
                message: 'Debes indicar una opción.',
                options: [
                    'piedra',
                    'papel',
                    'tijera'
                ]
            });
        }

        const player = aliases[input];

        if (!player) {
            return res.status(400).json({
                status: false,
                creator: 'FamilyBot-MD',
                message: 'Opción inválida.',
                options: [
                    'piedra',
                    'papel',
                    'tijera'
                ]
            });
        }

        const available = Object.keys(choices);
        const bot = available[
            Math.floor(Math.random() * available.length)
        ];

        const winner = getWinner(player, bot);

        let message;

        if (winner === 'empate') {
            message = '🤝 ¡Empate!';
        } else if (winner === 'jugador') {
            message = '🎉 ¡Ganaste!';
        } else {
            message = '😈 ¡La API ganó!';
        }

        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: {
                player: {
                    choice: player,
                    emoji: choices[player]
                },
                bot: {
                    choice: bot,
                    emoji: choices[bot]
                },
                winner,
                message
            }
        });

    } catch (error) {
        console.error('[RPS ERROR]', error);

        res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'No se pudo jugar piedra, papel o tijera.'
        });
    }
});

router.meta = {
    title: 'Piedra, papel o tijera',
    description: 'Juega piedra, papel o tijera contra la API',
    icon: 'fas fa-hand-scissors',
    fields: [
        {
            name: 'choice',
            label: 'Tu elección',
            type: 'select',
            options: [
                {
                    value: 'piedra',
                    label: '🪨 Piedra'
                },
                {
                    value: 'papel',
                    label: '📄 Papel'
                },
                {
                    value: 'tijera',
                    label: '✂️ Tijera'
                }
            ],
            default: 'piedra'
        }
    ],
    resultType: 'json',
    resultField: 'result'
};

module.exports = router;