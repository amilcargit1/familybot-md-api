
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
    const uptimeMs = global.startTime ? Date.now() - global.startTime : 0;
    res.json({
        status: true,
        service: 'familybot-md-api',
        uptime_seconds: Math.floor(uptimeMs / 1000),
        registeredUsers: db.countUsers(),
        node_version: process.version,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
