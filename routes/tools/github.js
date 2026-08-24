const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    const username = String(
        req.query.user || req.query.username || ''
    ).trim();

    if (!username) {
        return res.status(400).json({
            status: false,
            message: 'Falta ?user=',
            example:
                '/api/tools/github?apiKey=TU_KEY&user=octocat'
        });
    }

    if (!/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
        return res.status(400).json({
            status: false,
            message: 'Nombre de usuario de GitHub inválido'
        });
    }

    try {
        const response = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}`,
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'FamilyBot-MD-API'
                }
            }
        );

        if (response.status === 404) {
            return res.status(404).json({
                status: false,
                message: 'Usuario de GitHub no encontrado'
            });
        }

        if (!response.ok) {
            throw new Error(`GitHub HTTP ${response.status}`);
        }

        const user = await response.json();

        return res.json({
            status: true,
            result: {
                username: user.login,
                id: user.id,
                name: user.name,
                bio: user.bio,
                type: user.type,
                avatar: user.avatar_url,
                profile: user.html_url,
                company: user.company,
                location: user.location,
                blog: user.blog,
                public_repos: user.public_repos,
                public_gists: user.public_gists,
                followers: user.followers,
                following: user.following,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        });

    } catch (error) {
        console.error('[GITHUB API]', error.message);

        return res.status(502).json({
            status: false,
            message: 'No se pudo consultar GitHub'
        });
    }
});

router.meta = {
    title: 'GitHub User',
    description: 'Obtiene información pública de un usuario de GitHub',
    icon: 'fab fa-github',
    fields: [
        {
            name: 'user',
            label: 'Usuario',
            placeholder: 'octocat'
        }
    ],
    resultType: 'json',
    resultField: 'result'
};

module.exports = router;