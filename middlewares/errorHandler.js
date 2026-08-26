/**
 * Manejador centralizado de errores de Express.
 * No expone stack traces ni detalles internos en producción.
 */
function errorHandler(err, req, res, next) {
    if (res.headersSent) return next(err);

    const status = Number.isInteger(err?.statusCode)
        ? err.statusCode
        : Number.isInteger(err?.status)
            ? err.status
            : 500;

    const safeStatus = status >= 400 && status <= 599 ? status : 500;
    const isProduction = process.env.NODE_ENV === 'production';

    if (safeStatus >= 500) {
        console.error('Unhandled error:', err);
    }

    let message = 'Error interno del servidor';

    if (safeStatus < 500) {
        message = err?.message || 'Solicitud no válida';
    } else if (!isProduction && err?.message) {
        message = err.message;
    }

    res.status(safeStatus).json({
        status: false,
        message
    });
}

module.exports = errorHandler;
