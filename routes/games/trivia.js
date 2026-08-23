const express = require('express');
const router = express.Router();

const questions = require('../../data/trivia.json');

function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

router.get('/', (req, res) => {
    try {
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(404).json({
                status: false,
                creator: 'FamilyBot-MD',
                message: 'No hay preguntas disponibles.'
            });
        }

        const category = String(
            req.query.category || ''
        ).trim();

        const difficulty = String(
            req.query.difficulty || ''
        ).trim();

        let available = questions;

        // Filtrar por categoría
        if (
            category &&
            category.toLowerCase() !== 'todas'
        ) {
            available = available.filter(item =>
                String(item.category || '')
                    .toLowerCase() === category.toLowerCase()
            );
        }

        // Filtrar por dificultad
        if (
            difficulty &&
            difficulty.toLowerCase() !== 'todas'
        ) {
            available = available.filter(item =>
                String(item.difficulty || '')
                    .toLowerCase() === difficulty.toLowerCase()
            );
        }

        // No existen preguntas con los filtros indicados
        if (available.length === 0) {
            return res.status(404).json({
                status: false,
                creator: 'FamilyBot-MD',
                message: 'No hay preguntas con esos filtros.',
                categories: [
                    ...new Set(
                        questions.map(q => q.category)
                    )
                ],
                difficulties: [
                    ...new Set(
                        questions.map(q => q.difficulty)
                    )
                ]
            });
        }

        // Seleccionar pregunta aleatoria
        const selected = available[
            Math.floor(Math.random() * available.length)
        ];

        // Mezclar las opciones
        const options = shuffle(selected.options);

        // Obtener la nueva posición de la respuesta correcta
        const correctIndex = options.indexOf(
            selected.answer
        );

        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: {
                id: selected.id,
                question: selected.question,
                options,
                answer: selected.answer,
                correctIndex,
                category: selected.category,
                difficulty: selected.difficulty,
                totalQuestions: questions.length
            }
        });

    } catch (error) {
        console.error('[TRIVIA ERROR]', error);

        res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'No se pudo generar la trivia.'
        });
    }
});

router.meta = {
    title: 'Trivia',
    description: 'Obtén una pregunta aleatoria de trivia con opciones múltiples',
    icon: 'fas fa-brain',
    fields: [
        {
            name: 'category',
            label: 'Categoría',
            type: 'select',
            options: [
                {
                    value: 'todas',
                    label: '🎲 Todas'
                },
                {
                    value: 'Ciencia',
                    label: '🔬 Ciencia'
                },
                {
                    value: 'Geografía',
                    label: '🌎 Geografía'
                },
                {
                    value: 'Historia',
                    label: '📚 Historia'
                },
                {
                    value: 'Animales',
                    label: '🐾 Animales'
                },
                {
                    value: 'Literatura',
                    label: '📖 Literatura'
                },
                {
                    value: 'Arte',
                    label: '🎨 Arte'
                },
                {
                    value: 'Música',
                    label: '🎵 Música'
                },
                {
                    value: 'Deportes',
                    label: '⚽ Deportes'
                },
                {
                    value: 'Tecnología',
                    label: '💻 Tecnología'
                },
                {
                    value: 'Videojuegos',
                    label: '🎮 Videojuegos'
                },
                {
                    value: 'Cine',
                    label: '🎬 Cine'
                },
                {
                    value: 'Comida',
                    label: '🍔 Comida'
                },
                {
                    value: 'Naturaleza',
                    label: '🌿 Naturaleza'
                },
                {
                    value: 'Espacio',
                    label: '🚀 Espacio'
                },
                {
                    value: 'Cuerpo humano',
                    label: '🧠 Cuerpo humano'
                },
                {
                    value: 'General',
                    label: '🧩 General'
                }
            ],
            default: 'todas'
        },
        {
            name: 'difficulty',
            label: 'Dificultad',
            type: 'select',
            options: [
                {
                    value: 'todas',
                    label: '🎲 Todas'
                },
                {
                    value: 'fácil',
                    label: '🟢 Fácil'
                },
                {
                    value: 'medio',
                    label: '🟡 Medio'
                },
                {
                    value: 'difícil',
                    label: '🔴 Difícil'
                }
            ],
            default: 'todas'
        }
    ],
    resultType: 'json',
    resultField: 'result'
};

module.exports = router;