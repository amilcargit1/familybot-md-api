const crypto = require('crypto');

function randomSecret(bytes = 16) {
    return crypto.randomBytes(bytes).toString('hex');
}

let alreadyWarned = false;
function warnGeneratedValue(varName, value) {
    if (alreadyWarned) return;
    alreadyWarned = true;
    console.warn('⚠️  ============================================================');
    console.warn(`⚠️  ${varName} no está configurada. Se generó un valor temporal:`);
    console.warn(`⚠️  ${value}`);
    console.warn('⚠️  Este valor cambia cada vez que el servidor reinicia.');
    console.warn(`⚠️  Configura ${varName} en las variables de entorno de Render para que sea estable.`);
    console.warn('⚠️  ============================================================');
}

// Identidad del administrador. Si no defines estas variables de entorno, se
// generan valores aleatorios seguros al arrancar (NUNCA usamos contraseñas
// o keys adivinables por defecto). Revisa los logs si necesitas el valor
// generado.
const ADMIN = {
    username: process.env.ADMIN_USERNAME || 'FamilyBot-MD',
    email: process.env.ADMIN_EMAIL || 'admin@familybot-md.local',
    password: process.env.ADMIN_PASSWORD || (() => {
        const generated = randomSecret(8);
        warnGeneratedValue('ADMIN_PASSWORD', generated);
        return generated;
    })(),
    key: process.env.ADMIN_KEY || (() => {
        const generated = randomSecret(16);
        warnGeneratedValue('ADMIN_KEY', generated);
        return generated;
    })()
};

module.exports = ADMIN;
