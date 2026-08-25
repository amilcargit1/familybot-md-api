const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    if (data.error) console.error(`❌ Error de Upstash Redis en comando [${command[0]}]:`, data.error);
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
    return `FamilyBot-MD-${crypto.randomBytes(24).toString('hex')}`;
}

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

async function createUser({ username, email, password, key, limit = 100 }) {
    const users = await getUsers();
    const newUser = {
        id: crypto.randomUUID(),
        username,
        email,
        password,
        key: key || generateKey(),
        plan: 'free',
        limit,
        requestToday: 0,
        totalRequest: 0,
        lastRequestDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    await saveUsers(users);
    return newUser;
}

async function updateUserBy(field, value, newData) {
    const users = await getUsers();
    const index = users.findIndex(u => u[field] === value);
    if (index === -1) return null;
    users[index] = { ...users[index], ...newData };
    await saveUsers(users);
    return users[index];
}

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
