function required(body, fields) {
    const missing = fields.filter(field => {
        const value = body?.[field];
        return value === undefined || value === null || String(value).trim() === '';
    });

    if (missing.length) {
        const error = new Error(`Faltan datos: ${missing.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }
}

function string(value, field, { min = 1, max = 255 } = {}) {
    if (typeof value !== 'string') {
        const error = new Error(`${field} debe ser texto`);
        error.statusCode = 400;
        throw error;
    }

    const normalized = value.trim();
    if (normalized.length < min || normalized.length > max) {
        const error = new Error(`${field} debe tener entre ${min} y ${max} caracteres`);
        error.statusCode = 400;
        throw error;
    }

    return normalized;
}

function positiveInteger(value, field) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) {
        const error = new Error(`${field} debe ser un número entero positivo`);
        error.statusCode = 400;
        throw error;
    }
    return number;
}

module.exports = { required, string, positiveInteger };
