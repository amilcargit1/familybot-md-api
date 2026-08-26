const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
global.startTime = Date.now();

const { authHandler } = require('./middlewares/auth');
const { statsMiddleware } = require('./middlewares/stats');
const loadRoutes = require('./utils/loadRoutes');

// Render está detrás de un proxy; sin esto, todas las IPs se verían iguales.
app.set('trust proxy', 1);

app.use(compression());
app.use(express.json());

// ---- Métricas automáticas de la API ----
app.use('/api/', statsMiddleware);

// ---- Motor visual FamilyBot-MD ----
const publicDir = path.join(__dirname, 'public');
const particleScript = `\n<script src="/assets_particles.js"></script>\n<script>\n(function () {\n    function startParticles() {\n        if (!window.FamilyBotParticles) return;\n        const theme = localStorage.getItem('familybot_particle_theme') || 'fantasia';\n        const intensity = localStorage.getItem('familybot_particle_intensity') || 'medium';\n        const enabled = localStorage.getItem('familybot_particle_enabled');\n        if (enabled !== 'false') window.FamilyBotParticles.start(theme, intensity);\n    }\n    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startParticles, { once: true });\n    else startParticles();\n})();\n</script>\n<script src="/metrics.js"></script>\n`;

function sendPage(res, fileName) {
    const filePath = path.join(publicDir, fileName);
    fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.status(500).send('No se pudo cargar la página.');
        if (!html.includes('/assets_particles.js')) html = html.replace('</body>', `${particleScript}</body>`);
        res.type('html').send(html);
    });
}

app.get('/', (req, res) => sendPage(res, 'index.html'));
app.use(express.static(publicDir));

// ---- Límite de solicitudes por IP ----
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Demasiadas solicitudes desde esta IP. Espera unos minutos e intenta de nuevo.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Demasiados intentos. Espera unos minutos antes de volver a intentar.' }
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ---- Páginas ----
app.get('/login', (req, res) => sendPage(res, 'login.html'));
app.get('/register', (req, res) => sendPage(res, 'register.html'));
app.get('/dash', (req, res) => sendPage(res, 'dash.html'));
app.get('/profile', (req, res) => sendPage(res, 'profile.html'));
app.get('/admin', (req, res) => sendPage(res, 'admin.html'));
app.get('/docs', (req, res) => sendPage(res, 'docs.html'));
app.get('/forgot-password', (req, res) => sendPage(res, 'forgot-password.html'));
app.get('/reset-password', (req, res) => sendPage(res, 'reset-password.html'));

// ---- Carga automática de TODAS las rutas dentro de /routes ----
loadRoutes(app, authHandler);

// ---- 404 ----
app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ status: false, message: 'Ruta no encontrada' });
    res.status(404).send('<h1 style="font-family:sans-serif;color:#fff;background:#0a0b0e;padding:40px">Esta página todavía no existe. <a href="/" style="color:#ec4899">Volver al inicio</a></h1>');
});

// ---- Manejador de errores ----
app.use((err, req, res, next) => {
    console.error('Error no controlado:', err);
    res.status(500).json({ status: false, message: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => console.log(`🚀 FamilyBot-MD API escuchando en el puerto ${PORT}`));
