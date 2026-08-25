/**
 * FamilyBot-MD — Motor de partículas compartido.
 *
 * Un solo motor liviano (canvas 2D) reutilizado para los 10 "ambientes".
 * Cada tema es solo una configuración distinta (colores, forma, velocidad,
 * cantidad) del mismo motor — no hay 10 sistemas de animación separados,
 * así el panel se mantiene rápido incluso en celulares.
 *
 * Uso:
 *   FamilyBotParticles.start('sakura', 'medium');
 *   FamilyBotParticles.stop();
 *
 * Guarda la preferencia del usuario en localStorage:
 *   familybot_particle_theme, familybot_particle_intensity, familybot_particle_enabled
 */
(function () {
    const THEMES = {
        reino:      { colors: ['#f5c542', '#ffe066', '#fff3b0'], shape: 'spark',  drift: 'up',    speed: 0.4, glow: true  },
        lobo:       { colors: ['#94a3b8', '#cbd5e1', '#e2e8f0'], shape: 'circle', drift: 'float', speed: 0.15, glow: false, size: [3, 6] },
        fantasia:   { colors: ['#a855f7', '#22d3ee', '#ec4899'], shape: 'star',   drift: 'twinkle', speed: 0.2, glow: true },
        sakura:     { colors: ['#f9a8d4', '#fbcfe8', '#f472b6'], shape: 'petal',  drift: 'fall',  speed: 0.5, glow: false },
        galaxia:    { colors: ['#e0e7ff', '#c7d2fe', '#818cf8'], shape: 'star',   drift: 'twinkle', speed: 0.1, glow: true, meteor: true },
        cyberpunk:  { colors: ['#22d3ee', '#ec4899'],            shape: 'line',   drift: 'down',  speed: 2.2, glow: true },
        naturaleza: { colors: ['#84cc16', '#facc15', '#65a30d'], shape: 'circle', drift: 'float', speed: 0.2, glow: true, size: [2, 4] },
        invierno:   { colors: ['#ffffff', '#e0f2fe'],            shape: 'circle', drift: 'fall',  speed: 0.35, glow: false, size: [2, 5] },
        fuego:      { colors: ['#f97316', '#ef4444', '#fbbf24'], shape: 'spark',  drift: 'up',    speed: 0.8, glow: true },
        lluvia:     { colors: ['#38bdf8', '#0ea5e9'],            shape: 'line',   drift: 'down',  speed: 3, glow: false }
    };

    const INTENSITY_COUNT = { low: 25, medium: 50, high: 80 };

    let canvas, ctx, particles = [], animationId = null, currentTheme = null, currentIntensity = 'medium';

    function isSmallScreen() {
        return window.innerWidth < 420;
    }

    function createCanvas() {
        canvas = document.createElement('canvas');
        canvas.id = 'familybot-particles-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '0';
        canvas.style.opacity = '0.55';
        document.body.prepend(canvas);
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
    }

    function resize() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    function makeParticle(config) {
        const [minSize, maxSize] = config.size || [2, 4];
        return {
            x: Math.random() * canvas.width,
            y: config.drift === 'up' ? canvas.height + 10 : Math.random() * canvas.height,
            size: randomBetween(minSize, maxSize),
            speed: randomBetween(config.speed * 0.6, config.speed * 1.4),
            color: config.colors[Math.floor(Math.random() * config.colors.length)],
            alpha: randomBetween(0.3, 0.9),
            angle: Math.random() * Math.PI * 2,
            swayOffset: Math.random() * Math.PI * 2
        };
    }

    function drawParticle(p, config) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (config.glow) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
        }

        if (config.shape === 'line') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x, p.y + p.size * 4);
            ctx.stroke();
        } else if (config.shape === 'petal') {
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 1.8, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 'circle', 'star' y 'spark' se dibujan como un punto brillante (más liviano que dibujar estrellas reales)
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function updateParticle(p, config, time) {
        if (config.drift === 'fall') {
            p.y += p.speed;
            p.x += Math.sin(time / 800 + p.swayOffset) * 0.4;
            if (p.y > canvas.height + 10) { p.y = -10; p.x = Math.random() * canvas.width; }
        } else if (config.drift === 'up') {
            p.y -= p.speed;
            p.x += Math.sin(time / 600 + p.swayOffset) * 0.3;
            p.alpha -= 0.002;
            if (p.y < -10 || p.alpha <= 0) {
                p.y = canvas.height + 10;
                p.x = Math.random() * canvas.width;
                p.alpha = randomBetween(0.4, 0.9);
            }
        } else if (config.drift === 'down') {
            p.y += p.speed * 3;
            if (p.y > canvas.height + 10) { p.y = -10; p.x = Math.random() * canvas.width; }
        } else if (config.drift === 'float') {
            p.x += Math.sin(time / 1000 + p.swayOffset) * 0.3;
            p.y += Math.cos(time / 1200 + p.swayOffset) * 0.2;
        } else if (config.drift === 'twinkle') {
            p.alpha = 0.3 + Math.abs(Math.sin(time / 500 + p.swayOffset)) * 0.6;
        }
    }

    function loop(time) {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const config = THEMES[currentTheme];
        particles.forEach(p => {
            updateParticle(p, config, time);
            drawParticle(p, config);
        });

        // Meteoro ocasional (solo tema galaxia)
        if (config.meteor && Math.random() < 0.003) {
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = 2;
            const startX = Math.random() * canvas.width;
            ctx.beginPath();
            ctx.moveTo(startX, 0);
            ctx.lineTo(startX + 80, 80);
            ctx.stroke();
            ctx.restore();
        }

        animationId = requestAnimationFrame(loop);
    }

    function start(themeName, intensity) {
        stop();
        if (!THEMES[themeName]) themeName = 'fantasia';
        currentTheme = themeName;
        currentIntensity = intensity || 'medium';

        if (!canvas) createCanvas();
        resize();

        let count = INTENSITY_COUNT[currentIntensity] || INTENSITY_COUNT.medium;
        if (isSmallScreen()) count = Math.round(count * 0.5); // modo ligero automático en pantallas chicas

        const config = THEMES[currentTheme];
        particles = Array.from({ length: count }, () => makeParticle(config));

        animationId = requestAnimationFrame(loop);

        document.addEventListener('visibilitychange', handleVisibility);
    }

    function handleVisibility() {
        if (document.hidden) {
            if (animationId) cancelAnimationFrame(animationId);
        } else if (currentTheme) {
            animationId = requestAnimationFrame(loop);
        }
    }

    function stop() {
        if (animationId) cancelAnimationFrame(animationId);
        animationId = null;
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function destroy() {
        stop();
        if (canvas) {
            canvas.remove();
            canvas = null;
            ctx = null;
        }
        document.removeEventListener('visibilitychange', handleVisibility);
    }

    // ---- Auto-inicio según lo que el usuario haya elegido antes ----
    function initFromSavedPreferences() {
        const enabled = localStorage.getItem('familybot_particle_enabled');
        const theme = localStorage.getItem('familybot_particle_theme') || 'fantasia';
        const intensity = localStorage.getItem('familybot_particle_intensity') || 'medium';

        if (enabled === 'true') {
            start(theme, intensity);
        }
    }

    window.FamilyBotParticles = {
        start,
        stop,
        destroy,
        themes: Object.keys(THEMES),
        initFromSavedPreferences
    };
})();
