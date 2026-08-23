const express = require('express')
const router = express.Router()

// Base de datos local de preguntas.
// No necesitas una API externa para la trivia.
const questions = require('../data/trivia.json')

function shuffle(array) {
  const result = [...array]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

router.get('/', (req, res) => {
  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(404).json({
        status: false,
        creator: 'FamilyBot-MD',
        message: 'No hay preguntas disponibles.'
      })
    }

    const category = String(req.query.category || '').trim()
    const difficulty = String(req.query.difficulty || '').trim()

    let available = questions

    if (category && category.toLowerCase() !== 'todas') {
      available = available.filter(
        item => item.category.toLowerCase() === category.toLowerCase()
      )
    }

    if (difficulty && difficulty.toLowerCase() !== 'todas') {
      available = available.filter(
        item => item.difficulty.toLowerCase() === difficulty.toLowerCase()
      )
    }

    if (!available.length) {
      return res.status(404).json({
        status: false,
        creator: 'FamilyBot-MD',
        message: 'No hay preguntas con esos filtros.',
        categories: [...new Set(questions.map(q => q.category))],
        difficulties: [...new Set(questions.map(q => q.difficulty))]
      })
    }

    const selected =
      available[Math.floor(Math.random() * available.length)]

    const options = shuffle(selected.options)
    const correctIndex = options.indexOf(selected.answer)

    return res.status(200).json({
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
    })
  } catch (error) {
    console.error('[TRIVIA ERROR]', error)

    return res.status(500).json({
      status: false,
      creator: 'FamilyBot-MD',
      message: 'Error al generar la trivia.'
    })
  }
})

module.exports = router
