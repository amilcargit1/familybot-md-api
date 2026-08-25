const express = require('express')

const router = express.Router()

const jokes = [
    '¿Qué hace una abeja en el gimnasio? ¡Zum-ba!',
    '¿Qué le dijo un techo a otro techo? Techo de menos.',
    '¿Qué hace una computadora cuando tiene frío? ¡Cierra Windows!',
    '¿Por qué el libro de matemáticas estaba triste? Porque tenía demasiados problemas.',
    '¿Qué le dice una iguana a su hermana gemela? Somos iguanitas.',
    '¿Cuál es el colmo de un electricista? No encontrar su corriente de trabajo.',
    '¿Qué hace un pez? ¡Nada!',
    '¿Qué le dijo el cero al ocho? Bonito cinturón.',
    '¿Por qué el tomate se puso rojo? Porque vio la ensalada desnuda.',
    '¿Qué hace una vaca cuando sale el sol? Sombra.',
    '¿Cuál es el animal más antiguo? La cebra, porque está en blanco y negro.',
    '¿Qué le dijo una pared a otra? Nos vemos en la esquina.',
    '¿Cómo se despiden los químicos? Ácido un placer.',
    '¿Cuál es el café más peligroso? El ex-preso.',
    '¿Qué hace una escoba en el gimnasio? Barre ejercicios.',
    '¿Por qué el lápiz está feliz? Porque tiene buena punta.',
    '¿Qué dijo el semáforo cuando lo miraron? No me mires, me estoy cambiando.',
    '¿Qué le dijo el mar a la playa? Ola.',
    '¿Cuál es el animal que siempre llega tarde? El delfín, porque va de-l-fin.',
    '¿Qué hace una naranja en una biblioteca? Busca su jugo favorito.',
    '¿Por qué la computadora fue al médico? Porque tenía un virus.',
    '¿Qué le dijo una impresora a otra? ¿Esa hoja es tuya o es impresión mía?',
    '¿Cuál es el colmo de un jardinero? Que siempre lo dejen plantado.',
    '¿Qué hace un perro con un taladro? ¡Taladrando!',
    '¿Por qué el reloj fue al psicólogo? Porque tenía problemas de tiempo.',
    '¿Qué le dijo el azúcar al café? Sin ti mi vida es amarga.',
    '¿Cuál es el pez más divertido? El pez-payaso.',
    '¿Qué hace una cebolla cuando llora? Se pela de risa.',
    '¿Por qué el celular fue a terapia? Porque tenía demasiadas llamadas perdidas.',
    '¿Qué le dijo el WiFi al celular? Siento que tenemos conexión.'
]

function randomItem(array) {
    return array[
        Math.floor(
            Math.random() *
            array.length
        )
    ]
}

router.get('/', async (req, res) => {
    try {
        const joke = randomItem(jokes)

        return res.status(200).json({
            status: true,
            creator: 'FamilyBot-MD',
            type: 'joke',
            joke
        })
    } catch (error) {
        console.error(
            '[JOKE]',
            error
        )

        return res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            type: 'joke',
            message: 'No se pudo obtener un chiste'
        })
    }
})

router.meta = {
    title: 'Chiste aleatorio',
    description: 'Devuelve un chiste corto al azar',
    icon: 'fas fa-face-laugh',
    fields: [],
    resultType: 'text',
    resultField: 'joke',
    example: { status: true, creator: 'FamilyBot-MD', type: 'joke', joke: '¿Qué hace una abeja en el gimnasio? ¡Zum-ba!' }
};

module.exports = router
