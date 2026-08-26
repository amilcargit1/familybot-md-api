function success(res, data = undefined, message = 'OK', statusCode = 200) {
    const body = { status: true, message };
    if (data !== undefined) body.data = data;
    return res.status(statusCode).json(body);
}

function failure(res, message = 'Solicitud no válida', statusCode = 400, extra = undefined) {
    const body = { status: false, message };
    if (extra && typeof extra === 'object') Object.assign(body, extra);
    return res.status(statusCode).json(body);
}

module.exports = { success, failure };
