const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
global.startTime = Date.now();

const { authHandler } = require('./middlewares/auth');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- Páginas (sin necesidad de escribir .html) ----
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dash', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dash.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ---- Rutas públicas ----
app.use('/api/status', require('./routes/status'));
app.use('/api/auth', require('./routes/auth'));

// ---- Rutas protegidas (requieren ?apiKey=) ----
// Herramientas
app.use('/api/tools/qr', authHandler, require('./routes/tools/qr'));
app.use('/api/tools/translate', authHandler, require('./routes/tools/translate'));

// Descargas
app.use('/api/download/tiktok', authHandler, require('./routes/download/tiktok'));
app.use('/api/download/youtube', authHandler, require('./routes/download/youtube'));
app.use('/api/download/instagram', authHandler, require('./routes/download/instagram'));

// Búsquedas
app.use('/api/search/tiktok', authHandler, require('./routes/search/tiktok'));

// Anime
app.use('/api/anime/reaction', authHandler, require('./routes/anime/reaction'));
app.use('/api/anime/waifu', authHandler, require('./routes/anime/waifu'));
app.use('/api/anime/gacha', authHandler, require('./routes/anime/gacha'));

// ---- 404 ----
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ status: false, message: 'Ruta no encontrada' });
    }
    res.status(404).send('<h1 style="font-family:sans-serif;color:#fff;background:#0a0b0e;padding:40px">Esta página todavía no existe. <a href="/" style="color:#ec4899">Volver al inicio</a></h1>');
});

app.listen(PORT, () => {
    console.log(`🚀 FamilyBot-MD API escuchando en el puerto ${PORT}`);
});
