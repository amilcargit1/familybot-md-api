const express = require('express');
const router = express.Router();

const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
    '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
    '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
    '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢',
    '🤫', '🤥', '😶', '🫠', '😐', '😑', '😬', '🙄',
    '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤',
    '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷',
    '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺',
    '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖',
    '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀',
    '😿', '😾', '🙈', '🙉', '🙊', '💋', '💯', '🔥',
    '✨', '⭐', '🌟', '💫', '⚡', '💥', '🎉', '🎊',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
    '💘', '💝', '💟', '👍', '👎', '👌', '✌️', '🤞',
    '🤟', '🤘', '🤙', '👋', '👏', '🙌', '🫶', '🙏',
    '💪', '👀', '🧠', '👑', '💎', '🎯', '🚀', '🌈'
];

router.get('/', (req, res) => {
    try {
        const index = Math.floor(Math.random() * emojis.length);
        const emoji = emojis[index];

        res.json({
            status: true,
            creator: 'FamilyBot-MD',
            result: {
                emoji,
                index: index + 1,
                total: emojis.length
            }
        });

    } catch (error) {
        console.error('[EMOJI ERROR]', error);

        res.status(500).json({
            status: false,
            creator: 'FamilyBot-MD',
            message: 'No se pudo obtener un emoji.'
        });
    }
});

router.meta = {
    title: 'Emoji aleatorio',
    description: 'Devuelve un emoji aleatorio',
    icon: 'fas fa-face-smile',
    fields: [],
    resultType: 'text',
    resultField: 'emoji'
};

module.exports = router;