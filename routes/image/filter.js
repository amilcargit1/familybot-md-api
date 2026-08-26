// commands/filtro.js
// Ejemplo de comando para tu bot de WhatsApp que usa /api/image/filter
//
// Uso en WhatsApp: responde a una foto con ".filtro sepia"

import { getMediaBuffer } from '../utils/apiImage.js';

export const desc = 'Aplica un filtro a una imagen (responde a una foto con .filtro <nombre>)';
export const alias = ['filtro', 'filter'];
export const categoria = 'imagen';

const API_BASE = 'https://familybot-md-api.onrender.com';
const API_KEY = 'PON_AQUI_TU_API_KEY';

export default async function filtro({ sock, msg, args, chatId, config }) {
    // 1. Verificar que el usuario respondió a una imagen
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quotedMsg?.imageMessage || msg.message?.imageMessage;

    if (!imageMessage) {
        await sock.sendMessage(chatId, {
            text: `❌ Responde a una foto con \`${config.prefijo}filtro <nombre>\`\n\nFiltros: grayscale, sepia, negative, blur, vintage, glitch, sunset, night, etc.`
        }, { quoted: msg });
        return;
    }

    const filterName = args[0] || 'grayscale';

    await sock.sendMessage(chatId, { text: '⏳ Aplicando filtro...' }, { quoted: msg });

    try {
        // 2. Descargar la imagen que el usuario mandó en WhatsApp
        const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
        const imageBuffer = await downloadMediaMessage(
            { message: quotedMsg ? { imageMessage } : msg.message },
            'buffer',
            {}
        );

        // 3. Subirla a la API como multipart/form-data (usando ?format=image
        //    para recibir el resultado en binario, no como data URI en JSON)
        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer]), 'imagen.jpg');
        formData.append('filter', filterName);

        const apiUrl = `${API_BASE}/api/image/filter?apiKey=${API_KEY}&format=image`;
        const apiRes = await fetch(apiUrl, { method: 'POST', body: formData });

        if (!apiRes.ok) {
            const errorData = await apiRes.json().catch(() => ({}));
            throw new Error(errorData.message || 'La API devolvió un error');
        }

        // 4. Como pedimos ?format=image, la respuesta YA es la imagen en binario
        const resultBuffer = Buffer.from(await apiRes.arrayBuffer());

        await sock.sendMessage(chatId, {
            image: resultBuffer,
            caption: `✅ Filtro aplicado: *${filterName}*`
        }, { quoted: msg });

    } catch (error) {
        console.error('Error en comando filtro:', error);
        await sock.sendMessage(chatId, { text: `❌ ${error.message || 'No se pudo aplicar el filtro'}` }, { quoted: msg });
    }
}