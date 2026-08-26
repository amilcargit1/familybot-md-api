const express = require('express');
const { STYLES } = require('../../services/welcomeCanvas.service');

const router = express.Router();

router.get('/', (req, res) => {
    const styles = [...STYLES];

    res.json({
        status: true,
        creator: 'FamilyBot-MD',
        result: {
            styles,
            default: 'divine',
            endpoint: '/api/canvas/welcome'
        }
    });
});

router.meta = {
    title: 'Welcome Styles',
    description: 'Lista los estilos disponibles para Welcome Canvas.',
    icon: 'fas fa-palette',
    method: 'GET',
    fields: [],
    resultType: 'json',
    resultField: 'result.styles'
};

module.exports = router;
