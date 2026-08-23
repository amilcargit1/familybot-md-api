const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    const uptimeMs = global.startTime ? Date.now() - global.startTime : 0;
    res.json({
        status: true,
        service: 'familybot-md-api',
        uptime_seconds: Math.floor(uptimeMs / 1000),
        registeredUsers: await db.countUsers(),
        storage: db.isPersistent ? 'redis (persistente)' : 'json-local (se pierde en cada redeploy)',
        node_version: process.version,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
