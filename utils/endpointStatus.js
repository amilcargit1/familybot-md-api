const http = require('http');
const https = require('https');

/**
 * Builds an admin-safe snapshot of every endpoint discovered by loadRoutes.
 * "support" describes what the application exposes; "status" is runtime state.
 * No API keys, request bodies or credentials are included in the snapshot.
 */
function buildEndpointCatalog(app) {
    return (app.locals.apiEndpoints || []).map((endpoint) => ({
        ...endpoint,
        support: 'supported',
        status: 'available',
        lastCheckedAt: null,
        responseTimeMs: null,
        error: null
    }));
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
        const req = client.request(parsed, { method: 'GET', timeout: timeoutMs, headers: { 'User-Agent': 'FamilyBot-MD-EndpointMonitor/1.0', Accept: 'application/json,text/plain,*/*' } }, (res) => {
            res.resume();
            res.on('end', () => {
                const code = res.statusCode || 0;
                finish(code >= 200 && code < 500
                    ? { status: code < 400 ? 'available' : 'error', httpStatus: code, error: code >= 400 ? `HTTP ${code}` : null }
                    : { status: 'error', httpStatus: code, error: `HTTP ${code}` });
            });
        });
        req.on('timeout', () => { req.destroy(); finish({ status: 'error', error: 'Tiempo de espera agotado.' }); });
        req.on('error', (error) => finish({ status: 'error', error: error.message }));
        req.end();
    });
}

async function checkEndpoint(baseUrl, endpoint) {
    // GET-only, parameter-free smoke checks are safe only for endpoints whose
    // metadata says GET and that do not require a request body.
    if (String(endpoint.method || 'GET').toUpperCase() !== 'GET') {
        return { status: 'supported', checked: false, lastCheckedAt: new Date().toISOString(), responseTimeMs: null, error: 'Requiere datos de entrada; no se ejecutó automáticamente.' };
    }

    const result = await checkUrl(new URL(endpoint.path, baseUrl).toString());
    return { ...result, checked: true, lastCheckedAt: new Date().toISOString() };
}

async function checkAllGetEndpoints(app, baseUrl) {
    const endpoints = buildEndpointCatalog(app);
    const results = await Promise.all(endpoints.map(async (endpoint) => ({
        ...endpoint,
        ...(await checkEndpoint(baseUrl, endpoint))
    })));
    return results;
}

module.exports = { buildEndpointCatalog, checkAllGetEndpoints };
