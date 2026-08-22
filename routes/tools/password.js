const express = require('express');
const router = express.Router();

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?';

function randomChar(chars) {
    return chars[Math.floor(Math.random() * chars.length)];
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

router.get('/', (req, res) => {
    try {
        let length = Number.parseInt(req.query.length, 10);

        if (!Number.isInteger(length)) {
            length = 16;
        }

        // Límites para evitar contraseñas absurdamente grandes
        length = Math.max(4, Math.min(length, 128));

        const useUppercase = req.query.uppercase !== 'false';
        const useNumbers = req.query.numbers !== 'false';
        const useSymbols = req.query.symbols !== 'false';

        let pool = LOWERCASE;
        const passwordChars = [];

        passwordChars.push(randomChar(LOWERCASE));

        if (useUppercase) {
            pool += UPPERCASE;
            passwordChars.push(randomChar(UPPERCASE));
        }

        if (useNumbers) {
            pool += NUMBERS;
            passwordChars.push(randomChar(NUMBERS));
        }

        if (useSymbols) {
            pool += SYMBOLS;
            passwordChars.push(randomChar(SYMBOLS));
        }

        while (passwordChars.length < length) {
            passwordChars.push(randomChar(pool));
        }

        const password = shuffle(passwordChars).join('');

        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: {
                password,
                length: password.length,
                options: {
                    uppercase: useUppercase,
                    numbers: useNumbers,
                    symbols: useSymbols
                }
            }
        });

    } catch (error) {
        console.error('[PASSWORD ERROR]', error);

        res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'No se pudo generar la contraseña.'
        });
    }
});

router.meta = {
    title: 'Generador de contraseñas',
    description: 'Genera contraseñas aleatorias y personalizables',
    icon: 'fas fa-key',
    fields: [
        {
            name: 'length',
            label: 'Longitud',
            type: 'number',
            placeholder: '16',
            default: 16
        },
        {
            name: 'uppercase',
            label: 'Mayúsculas',
            type: 'select',
            options: ['true', 'false'],
            default: 'true'
        },
        {
            name: 'numbers',
            label: 'Números',
            type: 'select',
            options: ['true', 'false'],
            default: 'true'
        },
        {
            name: 'symbols',
            label: 'Símbolos',
            type: 'select',
            options: ['true', 'false'],
            default: 'true'
        }
    ],
    resultType: 'json',
    resultField: 'result'
};

module.exports = router;