const http = require('http');
const https = require('https');

// Los cambios de monitorización viven en memoria. No desactivan la ruta real.
const disabledEndpoints = new Set();

function isDisabled(path) {
    return disabledEndpoints.has(String(path));
}

function setEndpointEnabled(path, enabled) {
    const key = String(path);
    if (enabled) disabledEndpoints.delete(key);
    else disabledEndpoints.add(key);
    return !disabledEndpoints.has(key);
}

function isInternalAdminEndpoint(endpoint) {
    return String(endpoint?.path || '').startsWith('/api/admin/');
}

function getPublicApiEndpoints(app) {
    return (app.locals.apiEndpoints || []).filter((endpoint) => !isInternalAdminEndpoint(endpoint));
}

function buildEndpointCatalog(app) {
    return getPublicApiEndpoints(app).map((endpoint) => {
        const enabled = !isDisabled(endpoint.path);
        return {
            ...endpoint,
            support: 'supported',
            monitoringEnabled: enabled,
            status: enabled ? 'available' : 'disabled',
            lastCheckedAt: null,
            responseTimeMs: null,
            httpStatus: null,
            error: enabled ? null : 'Monitorización desactivada por un administrador.'
        };
    });
}

function getRequestModule(baseUrl) {
    return String(baseUrl).startsWith('https:') ? https : http;
}

function checkUrl(url, timeoutMs = 8000) {
    return new Promise((resolve) => {
        const started = Date.now();
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            resolve({ ...result, responseTimeMs: Date.now() - started });
        };

        let parsed;
        try {
            parsed = new URL(url);
        } catch {
            return finish({ status: 'error', error: 'URL de comprobación inválida.' });
        }

        const client = getRequestModule(parsed.protocol);
        const req = client.request(parsed, {
            method: 'GET',
            timeout: timeoutMs,
            headers: {
                'User-Agent': 'FamilyBot-MD-EndpointMonitor/1.0',
                Accept: 'application/json,text/plain,*/*'
            }
        }, (res) => {
            res.resume();
            res.on('end', () => {
                const code = res.statusCode || 0;
                if (code === 401 || code === 403) {
                    return finish({ status: 'auth_required', httpStatus: code, error: `HTTP ${code}: requiere autenticación.` });
                }
                if (code === 400 || code === 404 || code === 405 || code === 422) {
                    return finish({ status: 'needs_input', httpStatus: code, error: `HTTP ${code}: requiere datos o una petición específica.` });
                }
                if (code >= 200 && code < 400) {
                    return finish({ status: 'available', httpStatus: code, error: null });
                }
                return finish({ status: 'error', httpStatus: code, error: `HTTP ${code}` });
            });
        });

        req.on('timeout', () => {
            req.destroy();
            finish({ status: 'error', error: 'Tiempo de espera agotado.' });
        });
        req.on('error', (error) => finish({ status: 'error', error: error.message }));
        req.end();
    });
}

async function checkEndpoint(baseUrl, endpoint) {
    if (isDisabled(endpoint.path)) {
        return {
            status: 'disabled',
            monitoringEnabled: false,
            checked: false,
            lastCheckedAt: new Date().toISOString(),
            responseTimeMs: null,
            httpStatus: null,
            error: 'Monitorización desactivada por un administrador.'
        };
    }

    if (String(endpoint.method || 'GET').toUpperCase() !== 'GET') {
        return {
            status: 'needs_input',
            monitoringEnabled: true,
            checked: false,
            lastCheckedAt: new Date().toISOString(),
            responseTimeMs: null,
            httpStatus: null,
            error: 'Requiere datos de entrada; no se ejecutó automáticamente.'
        };
    }

    const result = await checkUrl(new URL(endpoint.path, baseUrl).toString());
    return {
        ...result,
        monitoringEnabled: true,
        checked: true,
        lastCheckedAt: new Date().toISOString()
    };
}

async function checkAllGetEndpoints(app, baseUrl) {
    const endpoints = buildEndpointCatalog(app);
    return Promise.all(endpoints.map(async (endpoint) => ({
        ...endpoint,
        ...(await checkEndpoint(baseUrl, endpoint))
    })));
}

module.exports = {
    buildEndpointCatalog,
    checkAllGetEndpoints,
    isDisabled,
    setEndpointEnabled
};