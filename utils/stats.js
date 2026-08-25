const stats = {
    startedAt: new Date().toISOString(),
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    endpoints: {}
};

function normalizePath(path) {
    return path.replace(/\/\d+(?=\/|$)/g, '/:id');
}

function recordRequest(req, res, startedAt) {
    const path = normalizePath(req.path || req.originalUrl.split('?')[0]);
    const key = `${req.method} ${path}`;
    const responseTime = Date.now() - startedAt;

    stats.totalRequests += 1;
    stats.totalResponseTime += responseTime;

    if (res.statusCode >= 200 && res.statusCode < 400) {
        stats.successfulRequests += 1;
    } else {
        stats.failedRequests += 1;
    }

    if (!stats.endpoints[key]) {
        stats.endpoints[key] = {
            method: req.method,
            path,
            requests: 0,
            successes: 0,
            failures: 0,
            totalResponseTime: 0,
            lastRequestAt: null
        };
    }

    const endpoint = stats.endpoints[key];
    endpoint.requests += 1;
    endpoint.totalResponseTime += responseTime;
    endpoint.lastRequestAt = new Date().toISOString();

    if (res.statusCode >= 200 && res.statusCode < 400) {
        endpoint.successes += 1;
    } else {
        endpoint.failures += 1;
    }
}

function getStats() {
    const endpoints = Object.values(stats.endpoints).map(endpoint => ({
        ...endpoint,
        averageResponseTime: endpoint.requests ? Math.round(endpoint.totalResponseTime / endpoint.requests) : 0
    }));

    return {
        startedAt: stats.startedAt,
        uptimeSeconds: Math.floor(process.uptime()),
        totalRequests: stats.totalRequests,
        successfulRequests: stats.successfulRequests,
        failedRequests: stats.failedRequests,
        averageResponseTime: stats.totalRequests ? Math.round(stats.totalResponseTime / stats.totalRequests) : 0,
        endpoints
    };
}

function statsMiddleware(req, res, next) {
    const startedAt = Date.now();
    res.on('finish', () => recordRequest(req, res, startedAt));
    next();
}

module.exports = { statsMiddleware, getStats };
