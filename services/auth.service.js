const bcrypt = require('bcryptjs');
const db = require('../db');
const ADMIN = require('../utils/adminConfig');
const { safeCompare } = require('../middlewares/requireAdmin');

async function register({ username, email, password }) {
    const exists = (await db.findUser('email', email)) || (await db.findUser('username', username));
    if (exists) {
        const error = new Error('Ese usuario o correo ya existe');
        error.statusCode = 400;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.createUser({ username, email, password: hashedPassword });

    return { username: user.username, email: user.email, key: user.key };
}

async function login({ email, password }) {
    if (safeCompare(email, ADMIN.email) && safeCompare(password, ADMIN.password)) {
        return {
            username: ADMIN.username,
            email: ADMIN.email,
            key: ADMIN.key,
            plan: 'ADMIN VIP',
            role: 'admin'
        };
    }

    const user = await db.findUser('email', email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        const error = new Error('Credenciales incorrectas');
        error.statusCode = 401;
        throw error;
    }

    return {
        username: user.username,
        email: user.email,
        key: user.key,
        plan: user.plan,
        role: 'user'
    };
}

module.exports = { register, login };
