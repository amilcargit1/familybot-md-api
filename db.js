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
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
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
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return []; }
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

async function getUsers() { return getCollection('users'); }
async function saveUsers(users) { return saveCollection('users', users); }

async function findUser(field, value) {
    const users = await getUsers();
    return users.find(u => u[field] === value) || null;
}

async function createUser({ username, email, password, key, limit = 100 }) {
    const users = await getUsers();
    const newUser = {
        id: crypto.randomUUID(), username, email, password,
        key: key || generateKey(), plan: 'free', limit,
        requestToday: 0, totalRequest: 0,
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

async function getCodes() { return getCollection('codes'); }
async function saveCodes(codes) { return saveCollection('codes', codes); }

// ==================== MÉTRICAS ====================
const EMPTY_STATS = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTimeMs: 0,
    endpointRequests: {},
    daily: {},
    recentRequests: []
};

function normalizeStats(raw) {
    if (!raw || typeof raw !== 'object') return { ...EMPTY_STATS };
    return {
        totalRequests: Number(raw.totalRequests) || 0,
        successfulRequests: Number(raw.successfulRequests) || 0,
        failedRequests: Number(raw.failedRequests) || 0,
        totalResponseTimeMs: Number(raw.totalResponseTimeMs) || 0,
        endpointRequests: raw.endpointRequests || {},
        daily: raw.daily || {},
        recentRequests: Array.isArray(raw.recentRequests) ? raw.recentRequests.slice(0, 50) : []
    };
}

async function incrementStats({ endpoint, method = 'GET', statusCode, responseTimeMs }) {
    const isSuccess = statusCode < 400;
    const safeEndpoint = String(endpoint || 'unknown').slice(0, 200);
    const safeMethod = String(method || 'GET').toUpperCase().slice(0, 10);
    const day = new Date().toISOString().slice(0, 10);
    const responseTime = Math.max(0, Math.round(Number(responseTimeMs) || 0));
    const recent = JSON.stringify({
        timestamp: new Date().toISOString(),
        method: safeMethod,
        endpoint: safeEndpoint,
        statusCode: Number(statusCode) || 500,
        responseTimeMs: responseTime
    });

    if (USE_REDIS) {
        const commands = [
            ['HINCRBY', 'familybot:stats', 'totalRequests', 1],
            ['HINCRBY', 'familybot:stats', isSuccess ? 'successfulRequests' : 'failedRequests', 1],
            ['HINCRBY', 'familybot:stats', 'totalResponseTimeMs', responseTime],
            ['HINCRBY', 'familybot:stats:endpoints', safeEndpoint, 1],
            ['HINCRBY', `familybot:stats:daily:${day}`, 'totalRequests', 1],
            ['HINCRBY', `familybot:stats:daily:${day}`, isSuccess ? 'successfulRequests' : 'failedRequests', 1],
            ['HINCRBY', `familybot:stats:daily:${day}`, 'totalResponseTimeMs', responseTime],
            ['LPUSH', 'familybot:stats:recent', recent],
            ['LTRIM', 'familybot:stats:recent', 0, 49]
        ];
        await Promise.all(commands.map(redisCommand));
        return;
    }

    const filePath = localPath('stats');
    let stats;
    try { stats = normalizeStats(JSON.parse(fs.readFileSync(filePath, 'utf-8'))); }
    catch { stats = { ...EMPTY_STATS }; }

    stats.totalRequests += 1;
    stats[isSuccess ? 'successfulRequests' : 'failedRequests'] += 1;
    stats.totalResponseTimeMs += responseTime;
    stats.endpointRequests[safeEndpoint] = (stats.endpointRequests[safeEndpoint] || 0) + 1;

    if (!stats.daily[day]) stats.daily[day] = { totalRequests: 0, successfulRequests: 0, failedRequests: 0, totalResponseTimeMs: 0 };
    stats.daily[day].totalRequests += 1;
    stats.daily[day][isSuccess ? 'successfulRequests' : 'failedRequests'] += 1;
    stats.daily[day].totalResponseTimeMs += responseTime;
    stats.recentRequests.unshift(JSON.parse(recent));
    stats.recentRequests = stats.recentRequests.slice(0, 50);

    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2), 'utf-8');
}

async function getStats({ days = 7 } = {}) {
    const safeDays = Math.min(Math.max(Number(days) || 7, 1), 31);

    if (USE_REDIS) {
        const [globalRaw, endpointsRaw, recentRaw] = await Promise.all([
            redisCommand(['HGETALL', 'familybot:stats']),
            redisCommand(['HGETALL', 'familybot:stats:endpoints']),
            redisCommand(['LRANGE', 'familybot:stats:recent', 0, 49])
        ]);

        const global = {};
        for (let i = 0; i < (globalRaw || []).length; i += 2) global[globalRaw[i]] = Number(globalRaw[i + 1]) || 0;
        const endpointRequests = {};
        for (let i = 0; i < (endpointsRaw || []).length; i += 2) endpointRequests[endpointsRaw[i]] = Number(endpointsRaw[i + 1]) || 0;
        const recentRequests = (recentRaw || []).map(item => {
            try { return JSON.parse(item); } catch { return null; }
        }).filter(Boolean);

        const daily = {};
        for (let i = 0; i < safeDays; i++) {
            const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
            const raw = await redisCommand(['HGETALL', `familybot:stats:daily:${date}`]);
            const day = {};
            for (let j = 0; j < (raw || []).length; j += 2) day[raw[j]] = Number(raw[j + 1]) || 0;
            daily[date] = {
                totalRequests: day.totalRequests || 0,
                successfulRequests: day.successfulRequests || 0,
                failedRequests: day.failedRequests || 0,
                totalResponseTimeMs: day.totalResponseTimeMs || 0
            };
        }
        return normalizeStats({ ...global, endpointRequests, daily, recentRequests });
    }

    let stats;
    try { stats = normalizeStats(JSON.parse(fs.readFileSync(localPath('stats'), 'utf-8'))); }
    catch { stats = { ...EMPTY_STATS }; }

    const filteredDaily = {};
    for (let i = 0; i < safeDays; i++) {
        const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        filteredDaily[date] = stats.daily[date] || { totalRequests: 0, successfulRequests: 0, failedRequests: 0, totalResponseTimeMs: 0 };
    }
    stats.daily = filteredDaily;
    return stats;
}

module.exports = {
    getUsers, saveUsers, findUser, createUser, updateUserBy,
    registerRequest, countUsers, getCodes, saveCodes,
    incrementStats, getStats, isPersistent: USE_REDIS
};
