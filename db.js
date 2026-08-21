const fs = require('fs');
const path = require('path');

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

function findUser(field, value) {
    const users = getUsers();
    return users.find(u => u[field] === value) || null;
}

function generateKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'FamilyBot-MD';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function createUser({ username, email, password }) {
    const users = getUsers();
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
    saveUsers(users);
    return newUser;
}

// Actualiza un usuario por id
function updateUserBy(field, value, newData) {
    const users = getUsers();
    const index = users.findIndex(u => u[field] === value);
    if (index === -1) return null;
    users[index] = { ...users[index], ...newData };
    saveUsers(users);
    return users[index];
}

// Suma una solicitud al usuario (contador diario + total), reseteando el
// contador diario si ya cambió el día.
function registerRequest(user) {
    const today = new Date().toISOString().split('T')[0];
    const requestToday = user.lastRequestDate === today ? (user.requestToday || 0) + 1 : 1;
    return updateUserBy('id', user.id, {
        requestToday,
        totalRequest: (user.totalRequest || 0) + 1,
        lastRequestDate: today
    });
}

function countUsers() {
    return getUsers().length;
}

// ============== CÓDIGOS DE CANJE ==============
const codesPath = path.join(dbDir, 'codes.json');
if (!fs.existsSync(codesPath)) fs.writeFileSync(codesPath, '[]', 'utf-8');

function getCodes() {
    try {
        return JSON.parse(fs.readFileSync(codesPath, 'utf-8'));
    } catch {
        return [];
    }
}
function saveCodes(codes) {
    fs.writeFileSync(codesPath, JSON.stringify(codes, null, 2), 'utf-8');
}

module.exports = {
    getUsers,
    findUser,
    createUser,
    updateUserBy,
    registerRequest,
    countUsers,
    getCodes,
    saveCodes
};
