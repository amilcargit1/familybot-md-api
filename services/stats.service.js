const db = require('../db');

function buildTopEndpoints(endpointRequests = {}) {
    return Object.entries(endpointRequests)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, requests]) => ({ endpoint, requests }));
}

function buildDailyStats(daily = {}) {
    return Object.entries(daily).map(([date, value]) => ({
        date,
        requests: value.totalRequests || 0,
        successful: value.successfulRequests || 0,
        failed: value.failedRequests || 0,
        averageResponseTimeMs: value.totalRequests
            ? Math.round(value.totalResponseTimeMs / value.totalRequests)
            : 0
    }));
}

function buildRequestSummary(stats) {
    const totalRequests = stats.totalRequests || 0;
    const successfulRequests = stats.successfulRequests || 0;
    const failedRequests = stats.failedRequests || 0;

    return {
        total: totalRequests,
        successful: successfulRequests,
        failed: failedRequests,
        successRate: totalRequests
            ? Number(((successfulRequests / totalRequests) * 100).toFixed(2))
            : 100,
        averageResponseTimeMs: totalRequests
            ? Math.round((stats.totalResponseTimeMs || 0) / totalRequests)
            : 0
    };
}

async function getDashboardStats(apiEndpoints = []) {
    const [users, stats] = await Promise.all([
        db.countUsers(),
        db.getStats({ days: 7 })
    ]);

    return {
        status: true,
        generatedAt: new Date().toISOString(),
        users,
        endpoints: Array.isArray(apiEndpoints) ? apiEndpoints.length : 0,
        requests: buildRequestSummary(stats),
        topEndpoints: buildTopEndpoints(stats.endpointRequests),
        daily: buildDailyStats(stats.daily),
        recentRequests: Array.isArray(stats.recentRequests) ? stats.recentRequests : [],
        storage: db.isPersistent ? 'redis' : 'local'
    };
}

module.exports = {
    getDashboardStats,
    buildTopEndpoints,
    buildDailyStats,
    buildRequestSummary
};
