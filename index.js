const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const START_TIME = Date.now();

const ADMIN_KEY = process.env.ADMIN_KEY || 'familybot-md';

app.use(express.json());

// ============== ALMACENAMIENTO: JSON local ==============
const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'users.json');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '[]', 'utf-8');

function getUsers() {
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch {
        return [];
    }
}
function saveUsers(users) {
    fs.writeFileSync(dbPath, JSON.stringify(users, null, 2), 'utf-8');
}
function generateKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'FamilyBot-MD';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============== MIDDLEWARE DE AUTENTICACIÓN ==============
function authHandler(req, res, next) {
    const { apiKey } = req.query;
    if (!apiKey) {
        return res.status(401).json({ status: false, message: 'API Key requerida (usa ?apiKey=TU_KEY)' });
    }
    if (apiKey === ADMIN_KEY) {
        req.user = { role: 'admin' };
        return next();
    }
    const users = getUsers();
    const user = users.find(u => u.key === apiKey);
    if (!user) {
        return res.status(401).json({ status: false, message: 'API Key inválida' });
    }
    req.user = user;
    next();
}

// ============== RUTAS PÚBLICAS ==============

// Sirve la interfaz web (public/index.html) en la raíz
app.use(express.static(path.join(__dirname, 'public')));

// Rutas "limpias" para las páginas (sin tener que escribir .html)
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/dash', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dash.html')));

app.get('/api/status', (req, res) => {
    res.json({
        status: true,
        service: 'familybot-md-api',
        uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
        registeredUsers: getUsers().length,
        node_version: process.version,
        timestamp: new Date().toISOString()
    });
});

// Estadísticas usadas por la interfaz web (public/index.html)
app.get('/api/auth/stats', (req, res) => {
    res.json({ status: true, users: getUsers().length, endpoints: 5 });
});

// Registro de usuario -> devuelve una API key
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ status: false, message: 'Faltan datos: username, email, password' });
    }

    const users = getUsers();
    if (users.find(u => u.email === email || u.username === username)) {
        return res.status(400).json({ status: false, message: 'Ese usuario o correo ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password: hashedPassword,
        key: generateKey(),
        plan: 'free',
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);

    res.json({ status: true, message: 'Registro exitoso', key: newUser.key });
});

// Login -> confirma credenciales
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: false, message: 'Faltan datos: email, password' });
    }

    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({ status: false, message: 'Credenciales incorrectas' });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
        return res.status(401).json({ status: false, message: 'Credenciales incorrectas' });
    }

    res.json({
        status: true,
        data: { username: user.username, email: user.email, key: user.key, plan: user.plan }
    });
});

// ============== RUTA PROTEGIDA DE PRUEBA ==============

// Genera un código QR a partir de un texto/URL
app.get('/api/tools/qr', authHandler, async (req, res) => {
    const { text } = req.query;
    if (!text) {
        return res.status(400).json({ status: false, message: 'Falta el parámetro ?text=' });
    }
    try {
        const qrImage = await QRCode.toDataURL(text);
        res.json({ status: true, creator: 'familybot-md', result: qrImage });
    } catch (err) {
        res.status(500).json({ status: false, message: 'Error generando el QR' });
    }
});

// Descarga video de TikTok (sin marca de agua) a partir de un link
app.get('/api/download/tiktok', authHandler, async (req, res) => {
    const videoURL = req.query.url;

    if (!videoURL) {
        return res.status(400).json({ status: false, message: 'Debes proporcionar ?url= con el link del video de TikTok' });
    }

    try {
        const apiRes = await fetch('https://www.tikwm.com/api/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: videoURL })
        });
        const data = await apiRes.json();

        if (data.code !== 0 || !data.data) {
            return res.status(500).json({
                status: false,
                message: data.msg || 'No se pudo procesar ese link de TikTok'
            });
        }

        const v = data.data;

        res.json({
            status: true,
            creator: 'familybot-md',
            data: {
                title: v.title,
                duration: v.duration,
                author: {
                    username: `@${v.author?.unique_id}`,
                    nickname: v.author?.nickname,
                    avatar: v.author?.avatar
                },
                stats: {
                    plays: v.play_count,
                    likes: v.digg_count,
                    comments: v.comment_count,
                    shares: v.share_count
                },
                media: {
                    no_watermark: v.play,
                    watermark: v.wmplay,
                    hd: v.hdplay,
                    music: v.music
                }
            }
        });

    } catch (err) {
        console.error('Error TikTok:', err);
        res.status(500).json({ status: false, message: 'Error interno al procesar el video' });
    }
});

// ============== 404 (páginas / rutas no encontradas) ==============
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ status: false, message: 'Ruta no encontrada' });
    }
    // Página aún no creada (ej: /login, /register, /dash) — la iremos agregando paso a paso
    res.status(404).send('<h1 style="font-family:sans-serif;color:#fff;background:#0a0b0e;padding:40px">Esta página todavía no existe — la agregaremos en el siguiente paso. <a href="/" style="color:#ec4899">Volver al inicio</a></h1>');
});

app.listen(PORT, () => {
    console.log(`🚀 FamilyBot-MD API escuchando en el puerto ${PORT}`);
});
