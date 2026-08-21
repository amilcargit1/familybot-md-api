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

// Salud del servicio (Render la usa para saber si el servicio está vivo)
app.get('/', (req, res) => {
    res.json({
        status: true,
        service: 'FamilyBot-MD API',
        creator: 'AmilcarGit',
        message: 'La API está funcionando correctamente 🚀'
    });
});

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

// ============== 404 ==============
app.use((req, res) => {
    res.status(404).json({ status: false, message: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
    console.log(`🚀 FamilyBot-MD API escuchando en el puerto ${PORT}`);
});