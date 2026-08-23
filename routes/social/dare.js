const express = require('express');
const router = express.Router();

const dares = [
    'Manda un emoji que represente tu estado de ánimo.',
    'Cambia tu foto de perfil durante 10 minutos.',
    'Escribe "hola" al último contacto con el que hablaste.',
    'Manda un audio diciendo una frase con voz de robot.',
    'Escribe una frase sin utilizar la letra A.',
    'Manda tres emojis y deja que alguien adivine lo que significan.',
    'Haz una foto haciendo una cara graciosa.',
    'Escribe tu nombre usando solamente emojis.',
    'Manda un audio cantando una canción durante 10 segundos.',
    'Escribe una frase completamente al revés.',
    'Cuenta un chiste en el grupo.',
    'Manda un sticker que describa tu personalidad.',
    'Di tres cosas que te hagan feliz.',
    'Escribe una frase romántica sin usar la palabra amor.',
    'Manda el último emoji que utilizaste.',
    'Cambia tu nombre de WhatsApp durante 5 minutos.',
    'Manda un audio diciendo el abecedario rápidamente.',
    'Escribe una historia usando exactamente cinco palabras.',
    'Manda una foto de algo que tengas cerca.',
    'Describe tu día usando solo tres emojis.',
    'Escribe una frase motivacional inventada.',
    'Manda un audio riéndote durante cinco segundos.',
    'Di cuál es tu comida favorita.',
    'Escribe una palabra y haz que alguien la defina.',
    'Manda un sticker al azar.',
    'Escribe una frase sin utilizar la letra E.',
    'Di cuál fue tu última búsqueda en Internet.',
    'Manda un audio hablando como un personaje de anime.',
    'Escribe una pregunta absurda.',
    'Inventa un apodo para la persona de arriba.',
    'Manda un emoji que casi nunca utilizas.',
    'Cuenta algo divertido que te haya pasado.',
    'Escribe una frase utilizando solo palabras de cuatro letras.',
    'Manda un saludo dramático.',
    'Di qué superpoder elegirías.',
    'Escribe cómo sería tu vida si fueras famoso.',
    'Manda un audio diciendo "FamilyBot-MD" tres veces.',
    'Inventa un nombre para un personaje.',
    'Describe una película sin decir su nombre.',
    'Escribe una frase como si fueras un villano.',
    'Manda un audio con tu mejor imitación.',
    'Di qué animal te gustaría ser.',
    'Escribe una mini historia de terror.',
    'Manda un emoji que represente tu personalidad.',
    'Di qué lugar te gustaría visitar.',
    'Escribe una frase usando solamente emojis y números.',
    'Manda un saludo a alguien del grupo.',
    'Inventa una nueva palabra y explica su significado.',
    'Di cuál es tu canción favorita.',
    'Escribe una frase como si fueras un pirata.',
    'Manda un audio diciendo una frase con voz de bebé.',
    'Cuenta algo que casi nadie sepa de ti.',
    'Escribe una frase como si fueras un profesor.',
    'Manda un sticker sin contexto.',
    'Di qué personaje ficticio serías.',
    'Inventa un superhéroe y dale un nombre.',
    'Escribe una predicción sobre el futuro.',
    'Manda tres emojis al azar.',
    'Cuenta cuál fue tu primer videojuego.',
    'Escribe una frase como si fueras un rey.',
    'Manda un audio diciendo una frase muy rápido.',
    'Di qué aplicación utilizas más.',
    'Inventa un nuevo planeta.',
    'Describe tu personalidad con tres palabras.',
    'Escribe un mensaje misterioso.',
    'Manda un saludo en otro idioma.',
    'Di cuál es tu película favorita.',
    'Escribe una frase que parezca una profecía.',
    'Manda un emoji que nunca hayas usado.',
    'Inventa un nombre para un grupo de amigos.',
    'Cuenta cuál sería tu trabajo ideal.',
    'Escribe una frase como un detective.',
    'Manda un audio diciendo una frase al revés.',
    'Di qué objeto llevarías a una isla desierta.',
    'Inventa una regla absurda.',
    'Escribe una frase de villano de película.',
    'Manda un saludo exageradamente formal.',
    'Cuenta tu recuerdo más gracioso.',
    'Di qué época histórica visitarías.',
    'Escribe una frase como si fueras un extraterrestre.',
    'Manda un audio diciendo una palabra diez veces.',
    'Inventa una nueva comida.',
    'Di qué personaje de anime elegirías como compañero.',
    'Escribe un mensaje que parezca una amenaza pero sea gracioso.',
    'Manda tres palabras aleatorias.',
    'Cuenta qué harías si ganaras la lotería.',
    'Inventa un nombre para una mascota.',
    'Escribe una frase como si fueras un cantante.',
    'Di cuál es tu videojuego favorito.',
    'Manda un audio diciendo una frase con acento inventado.',
    'Inventa una aplicación y explica para qué sirve.',
    'Escribe una frase que contenga tres animales.',
    'Di qué habilidad te gustaría aprender.',
    'Manda un emoji que describa tu día.',
    'Inventa un nuevo emoji y explica cómo sería.',
    'Cuenta qué harías si pudieras viajar en el tiempo.',
    'Escribe una frase que parezca de una película.',
    'Manda un saludo usando solamente emojis.',
    'Di qué personaje ficticio te representa.',
    'Inventa un planeta y describe cómo sería.',
    'Escribe una frase utilizando tres idiomas.',
    'Manda un audio diciendo tu nombre con voz dramática.',
    'Di qué invento crearías si pudieras.',
    'Escribe un mensaje completamente misterioso.',
    'Manda un sticker que represente tu personalidad.'
];

router.get('/', (req, res) => {
    try {
        const index = Math.floor(Math.random() * dares.length);

        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: {
                dare: dares[index],
                number: index + 1,
                total: dares.length
            }
        });

    } catch (error) {
        console.error('[DARE ERROR]', error);

        res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'No se pudo obtener un reto.'
        });
    }
});

router.meta = {
    title: 'Reto aleatorio',
    description: 'Devuelve un reto aleatorio para jugar con amigos',
    icon: 'fas fa-bolt',
    fields: [],
    resultType: 'text',
    resultField: 'result.dare'
};

module.exports = router;