// utils/apiImage.js
// Helper reutilizable para el bot de WhatsApp: descarga la imagen/video de
// CUALQUIER endpoint de la API, sin importar si devuelve:
//   a) un link real (https://...)               -> TikTok, YouTube, waifu, gacha, etc.
//   b) un "data URI" en base64 dentro del JSON   -> QR, filtro de imagen
//   c) la imagen directo en binario (con ?format=image) -> filtro de imagen
//
// Devuelve siempre un Buffer, listo para pasarle a sock.sendMessage.

/**
 * Descarga cualquier link normal (https://...) y lo convierte a Buffer.
 */
async function urlToBuffer(url) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

/**
 * Convierte un "data URI" (data:image/jpeg;base64,XXXX) a Buffer.
 * Esto es lo que Baileys NO puede leer directo — hay que decodificarlo así.
 */
function dataUriToBuffer(dataUri) {
    const base64 = dataUri.split(',')[1];
    return Buffer.from(base64, 'base64');
}

/**
 * Función principal: dale la URL de un endpoint de la API (con su apiKey ya
 * incluida) y te devuelve un Buffer listo para enviar por WhatsApp,
 * detectando automáticamente el formato de la respuesta.
 */
async function getMediaBuffer(apiUrl) {
    const res = await fetch(apiUrl);
    const contentType = res.headers.get('content-type') || '';

    // Caso 1: la API devolvió la imagen/video directo en binario
    // (esto pasa cuando el endpoint soporta ?format=image, como el filtro)
    if (contentType.startsWith('image/') || contentType.startsWith('video/')) {
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    // Caso 2: la API devolvió JSON — hay que buscar dónde está el media adentro
    const data = await res.json();
    if (!data.status) {
        throw new Error(data.message || 'La API devolvió un error');
    }

    // Buscamos el campo típico donde guardamos el resultado (result.url, url, data.media, etc.)
    const candidate =
        data.result?.url ||
        data.url ||
        data.data?.media ||
        data.data?.download ||
        data.data?.media?.no_watermark;

    if (!candidate) {
        throw new Error('No se encontró ninguna imagen/video en la respuesta de la API');
    }

    // Caso 2a: es un data URI en base64
    if (candidate.startsWith('data:')) {
        return dataUriToBuffer(candidate);
    }

    // Caso 2b: es un link real, lo descargamos
    return urlToBuffer(candidate);
}

module.exports = { getMediaBuffer, urlToBuffer, dataUriToBuffer };