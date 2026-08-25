const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
global.startTime = Date.now();

const { authHandler } = require('./middlewares/auth');
const loadRoutes = require('./utils/loadRoutes');
const { statsMiddleware } = require('./utils/stats');

app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(statsMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Demasiadas solicitudes desde esta IP. Espera unos minutos e intenta de nuevo.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { status: false, message: 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.' }
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dash', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dash.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

loadRoutes(app, authHandler);

app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ status: false, message: 'Ruta no encontrada' });
    }
    res.status(404).send('<h1 style="font-family:sans-serif;color:#fff;background:#0a0b0e;padding:40px">Esta página todavía no existe. <a href="/" style="color:#ec4899">Volver al inicio</a></h1>');
});

app.use((err, req, res, next) => {
    console.error('Error no controlado:', err);
    res.status(500).json({ status: false, message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`🚀 FamilyBot-MD API escuchando en el puerto ${PORT}`);
});
