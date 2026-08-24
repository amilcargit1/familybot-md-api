const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
global.startTime = Date.now();

const { authHandler } = require('./middlewares/auth');
const loadRoutes = require('./utils/loadRoutes');

// Render está detrás de un proxy; sin esto, todas las IPs se verían iguales
// y el límite por IP no funcionaría correctamente.
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Límite de solicitudes por IP ----
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300, // máximo 300 solicitudes por IP en esa ventana
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Demasiadas solicitudes desde esta IP. Espera unos minutos e intenta de nuevo.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15, // máximo 15 intentos de login/registro en esa ventana (evita fuerza bruta)
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: false, message: 'Demasiados intentos. Espera unos minutos antes de volver a intentar.' }
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ---- Páginas (sin necesidad de escribir .html) ----
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dash', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dash.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ---- Carga automática de TODAS las rutas dentro de /routes ----
// Para agregar un endpoint nuevo: solo crea el archivo en la carpeta
// correcta (routes/<categoria>/<nombre>.js) — no hace falta editar este archivo.
loadRoutes(app, authHandler);

// ---- 404 ----
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ status: false, message: 'Ruta no encontrada' });
    }
    res.status(404).send('<h1 style="font-family:sans-serif;color:#fff;background:#0a0b0e;padding:40px">Esta página todavía no existe. <a href="/" style="color:#ec4899">Volver al inicio</a></h1>');
});

// ---- Manejador de errores (para que un error de Redis, DB, etc. no tumbe todo el servidor) ----
app.use((err, req, res, next) => {
    console.error('Error no controlado:', err);
    res.status(500).json({ status: false, message: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`🚀 FamilyBot-MD API escuchando en el puerto ${PORT}`);
});
