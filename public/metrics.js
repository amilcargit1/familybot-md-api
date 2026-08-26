(() => {
    'use strict';

    const REFRESH_MS = 15000;
    let timer = null;

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
    }

    function formatNumber(value) {
        return new Intl.NumberFormat('es-PE').format(Number(value) || 0);
    }

    function formatMs(value) {
        const ms = Number(value) || 0;
        return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
    }

    function ensurePanel() {
        if (document.getElementById('fb-live-metrics')) return document.getElementById('fb-live-metrics');
        const main = document.querySelector('main');
        if (!main) return null;

        const panel = document.createElement('section');
        panel.id = 'fb-live-metrics';
        panel.innerHTML = `
            <style>
                #fb-live-metrics { margin: 28px 0; animation: fadeIn .35s ease; }
                .fbm-head { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }
                .fbm-title { font-size:1rem; color:var(--text-secondary); display:flex; align-items:center; gap:8px; }
                .fbm-title::before { content:''; width:4px; height:16px; border-radius:4px; background:var(--accent-gradient); }
                .fbm-live { font-size:.68rem; color:var(--text-secondary); display:flex; align-items:center; gap:6px; }
                .fbm-live i { color:#22c55e; font-size:.5rem; }
                .fbm-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
                .fbm-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:15px; transition:transform .2s ease,box-shadow .2s ease; }
                .fbm-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px var(--glow); }
                .fbm-label { color:var(--text-secondary); font-size:.68rem; text-transform:uppercase; letter-spacing:.04em; }
                .fbm-value { margin-top:5px; font-size:1.35rem; font-weight:800; }
                .fbm-sub { margin-top:3px; color:var(--text-secondary); font-size:.68rem; }
                .fbm-wide { grid-column:1/-1; }
                .fbm-table { width:100%; border-collapse:collapse; margin-top:8px; font-size:.72rem; }
                .fbm-table th,.fbm-table td { text-align:left; padding:8px 5px; border-bottom:1px solid var(--border-color); }
                .fbm-table th { color:var(--text-secondary); font-weight:600; }
                .fbm-code { color:var(--accent-cyan); font-family:monospace; word-break:break-all; }
                .fbm-status-ok { color:#22c55e; } .fbm-status-error { color:#ef4444; }
                .fbm-bars { display:grid; gap:8px; margin-top:10px; }
                .fbm-bar-row { display:grid; grid-template-columns:minmax(90px,1fr) 2fr 40px; gap:8px; align-items:center; font-size:.68rem; }
                .fbm-bar-bg { height:7px; background:var(--surface-alt); border-radius:8px; overflow:hidden; }
                .fbm-bar { height:100%; width:0; background:var(--accent-gradient); border-radius:8px; transition:width .5s ease; }
                @media (max-width:480px) { .fbm-grid{grid-template-columns:1fr 1fr;} .fbm-bar-row{grid-template-columns:85px 1fr 35px;} }
            </style>
            <div class="fbm-head">
                <div class="fbm-title">Métricas de la API</div>
                <div class="fbm-live"><i class="fas fa-circle"></i><span id="fbm-updated">Actualizando...</span></div>
            </div>
            <div class="fbm-grid">
                <div class="fbm-card"><div class="fbm-label">Solicitudes</div><div class="fbm-value" id="fbm-total">—</div><div class="fbm-sub">totales</div></div>
                <div class="fbm-card"><div class="fbm-label">Éxito</div><div class="fbm-value" id="fbm-success">—</div><div class="fbm-sub" id="fbm-success-sub">—</div></div>
                <div class="fbm-card"><div class="fbm-label">Errores</div><div class="fbm-value" id="fbm-failed">—</div><div class="fbm-sub">respuestas 4xx/5xx</div></div>
                <div class="fbm-card"><div class="fbm-label">Respuesta</div><div class="fbm-value" id="fbm-latency">—</div><div class="fbm-sub">promedio</div></div>
                <div class="fbm-card fbm-wide"><div class="fbm-label">Endpoints más utilizados</div><div class="fbm-bars" id="fbm-top">Cargando...</div></div>
                <div class="fbm-card fbm-wide"><div class="fbm-label">Actividad diaria · 7 días</div><table class="fbm-table"><thead><tr><th>Fecha</th><th>Solicitudes</th><th>Éxito</th><th>Errores</th><th>Promedio</th></tr></thead><tbody id="fbm-daily"><tr><td colspan="5">Cargando...</td></tr></tbody></table></div>
                <div class="fbm-card fbm-wide"><div class="fbm-label">Últimas solicitudes</div><table class="fbm-table"><thead><tr><th>Método</th><th>Endpoint</th><th>Estado</th><th>Tiempo</th></tr></thead><tbody id="fbm-recent"><tr><td colspan="4">Cargando...</td></tr></tbody></table></div>
            </div>`;
        main.appendChild(panel);
        return panel;
    }

    function render(data) {
        ensurePanel();
        const req = data.requests || {};
        const top = Array.isArray(data.topEndpoints) ? data.topEndpoints : [];
        const daily = Array.isArray(data.daily) ? data.daily : [];
        const recent = Array.isArray(data.recentRequests) ? data.recentRequests : [];

        document.getElementById('fbm-total').textContent = formatNumber(req.total);
        document.getElementById('fbm-success').textContent = `${Number(req.successRate || 0).toFixed(2)}%`;
        document.getElementById('fbm-success-sub').textContent = `${formatNumber(req.successful)} correctas`;
        document.getElementById('fbm-failed').textContent = formatNumber(req.failed);
        document.getElementById('fbm-latency').textContent = formatMs(req.averageResponseTimeMs);
        document.getElementById('fbm-updated').textContent = `Actualizado ${new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;

        const max = Math.max(1, ...top.map(item => Number(item.requests) || 0));
        document.getElementById('fbm-top').innerHTML = top.length ? top.map(item => `
            <div class="fbm-bar-row"><span class="fbm-code">${escapeHtml(item.endpoint)}</span><span class="fbm-bar-bg"><span class="fbm-bar" style="width:${Math.min(100,((Number(item.requests)||0)/max)*100)}%"></span></span><strong>${formatNumber(item.requests)}</strong></div>`).join('') : '<div class="fbm-sub">Todavía no hay solicitudes registradas.</div>';

        document.getElementById('fbm-daily').innerHTML = daily.slice().reverse().map(day => `<tr><td>${escapeHtml(day.date)}</td><td>${formatNumber(day.requests)}</td><td class="fbm-status-ok">${formatNumber(day.successful)}</td><td class="fbm-status-error">${formatNumber(day.failed)}</td><td>${escapeHtml(formatMs(day.averageResponseTimeMs))}</td></tr>`).join('') || '<tr><td colspan="5">Sin datos</td></tr>';

        document.getElementById('fbm-recent').innerHTML = recent.slice(0,10).map(item => `<tr><td>${escapeHtml(item.method)}</td><td class="fbm-code">${escapeHtml(item.endpoint)}</td><td class="${Number(item.statusCode)<400?'fbm-status-ok':'fbm-status-error'}">${escapeHtml(item.statusCode)}</td><td>${escapeHtml(formatMs(item.responseTimeMs))}</td></tr>`).join('') || '<tr><td colspan="4">Sin solicitudes recientes.</td></tr>';
    }

    async function load() {
        if (location.pathname !== '/dash') return;
        try {
            const response = await fetch('/api/auth/stats', { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!data.status) throw new Error(data.message || 'Respuesta inválida');
            render(data);
        } catch (error) {
            const panel = ensurePanel();
            if (panel) document.getElementById('fbm-updated').textContent = 'No disponible';
            console.error('FamilyBot metrics:', error);
        }
    }

    function start() {
        if (location.pathname !== '/dash') return;
        load();
        timer = setInterval(load, REFRESH_MS);
        window.addEventListener('beforeunload', () => clearInterval(timer), { once:true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
    else start();
})();
