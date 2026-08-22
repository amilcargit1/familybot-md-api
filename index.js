const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
global.startTime = Date.now();

const { authHandler } = require('./middlewares/auth');
const loadRoutes = require('./utils/loadRoutes');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.listen(PORT, () => {
    console.log(`🚀 FamilyBot-MD API escuchando en el puerto ${PORT}`);
});