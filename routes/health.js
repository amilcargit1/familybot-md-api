const express = require('express');
const router = express.Router();

const startedAt = new Date().toISOString();
const version = process.env.npm_package_version || '1.0.0';

router.get('/', (req, res) => {
    const uptimeSeconds = Math.floor(process.uptime());

    res.status(200).json({
        status: true,
        service: 'FamilyBot-MD API',
        health: 'ok',
        version,
        environment: process.env.NODE_ENV || 'development',
        uptime: {
            seconds: uptimeSeconds,
            startedAt
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
