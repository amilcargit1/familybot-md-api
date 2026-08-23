const fs = require('fs');
const path = require('path');

// ============== ALMACENAMIENTO: Redis (Upstash) opcional, o JSON local ==============
// Si configuras UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en las
// variables de entorno, los datos se guardan en Upstash (persisten para
// siempre, sobreviven a los redeploys). Si no los configuras, todo sigue
// funcionando igual que antes con archivos JSON locales (pero esos se
// pierden en cada redeploy en Render Free).
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

const dbDir = path.join(__dirname, 'data');
if (!USE_REDIS && !fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

async function redisCommand(command) {
    const res = await fetch(UPSTASH_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(command)
    });
    const data = await res.json();
    return data.result;
}

function localPath(name) {
    return path.join(dbDir, `${name}.json`);
}

async function getCollection(name) {
    if (USE_REDIS) {
        const raw = await redisCommand(['GET', `familybot:${name}`]);
        return raw ? JSON.parse(raw) : [];
    }
    const filePath = localPath(name);
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]', 'utf-8');
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
        return [];
    }
}

async function saveCollection(name, data) {
    if (USE_REDIS) {
        await redisCommand(['SET', `familybot:${name}`, JSON.stringify(data)]);
        return;
    }
    fs.writeFileSync(localPath(name), JSON.stringify(data, null, 2), 'utf-8');
}

function generateKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'FamilyBot-MD';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============== USUARIOS ==============
async function getUsers() {
    return getCollection('users');
}

async function saveUsers(users) {
    return saveCollection('users', users);
}

async function findUser(field, value) {
    const users = await getUsers();
    return users.find(u => u[field] === value) || null;
}

async function createUser({ username, email, password }) {
    const users = await getUsers();
    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password,
        key: generateKey(),
        plan: 'free',
        limit: 100,
        requestToday: 0,
        totalRequest: 0,
        lastRequestDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    await saveUsers(users);
    return newUser;
}

// Actualiza un usuario por id (u otro campo)
async function updateUserBy(field, value, newData) {
    const users = await getUsers();
    const index = users.findIndex(u => u[field] === value);
    if (index === -1) return null;
    users[index] = { ...users[index], ...newData };
    await saveUsers(users);
    return users[index];
}

// Suma una solicitud al usuario (contador diario + total)
async function registerRequest(user) {
    const today = new Date().toISOString().split('T')[0];
    const requestToday = user.lastRequestDate === today ? (user.requestToday || 0) + 1 : 1;
    return updateUserBy('id', user.id, {
        requestToday,
        totalRequest: (user.totalRequest || 0) + 1,
        lastRequestDate: today
    });
}

async function countUsers() {
    const users = await getUsers();
    return users.length;
}

// ============== CÓDIGOS DE CANJE ==============
async function getCodes() {
    return getCollection('codes');
}

async function saveCodes(codes) {
    return saveCollection('codes', codes);
}

module.exports = {
    getUsers,
    saveUsers,
    findUser,
    createUser,
    updateUserBy,
    registerRequest,
    countUsers,
    getCodes,
    saveCodes,
    isPersistent: USE_REDIS
};
