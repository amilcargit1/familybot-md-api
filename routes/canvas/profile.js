const express = require('express');
const multer = require('multer');
const { generateProfileCanvas, STYLES } = require('../../services/profileCanvas.service');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 }, fileFilter: (req, file, cb) => {
  if (!file.mimetype || (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/octet-stream')) return cb(new Error('El avatar debe ser una imagen.'));
  cb(null, true);
} });
const p = (req, n, f = '') => req.body?.[n] ?? req.query?.[n] ?? f;
const t = (v, f, m) => { const s = String(v ?? '').trim().replace(/\s+/g, ' '); return (s || f).slice(0, m); };

router.post('/', upload.single('avatar'), async (req, res) => {
  try {
    const style = String(p(req, 'style', 'royal')).toLowerCase();
    if (!STYLES.has(style)) return res.status(400).json({ status: false, creator: 'FamilyBot-MD', message: 'Estilo no válido.', styles: [...STYLES] });
    const avatarUrl = String(p(req, 'avatarUrl', '')).trim();
    if (!req.file && !avatarUrl) return res.status(400).json({ status: false, creator: 'FamilyBot-MD', message: 'Envía el avatar como archivo "avatar" o proporciona "avatarUrl".' });

    const image = await generateProfileCanvas({ style, avatarBuffer: req.file?.buffer, avatarUrl,
      username: t(p(req, 'username'), 'Usuario', 34), level: t(p(req, 'level'), 'Nivel 1', 18), xp: t(p(req, 'xp'), '0 XP', 24),
      coins: t(p(req, 'coins'), '0 monedas', 24), rank: t(p(req, 'rank'), 'Sin ranking', 24), bio: t(p(req, 'bio'), 'Sin biografía', 55),
      title: t(p(req, 'title'), 'PROFILE', 32), footer: t(p(req, 'footer'), '✦ FamilyBot-MD ✦', 30) });

    const wantsImage = String(req.query.format || '').toLowerCase() === 'image' || String(req.headers.accept || '').toLowerCase().includes('image/png');
    if (wantsImage) return res.status(200).type('png').set('Content-Length', String(image.length)).set('Cache-Control', 'no-store').send(image);
    return res.json({ status: true, creator: 'FamilyBot-MD', result: { url: `data:image/png;base64,${image.toString('base64')}`, format: 'png', style } });
  } catch (e) {
    console.error('[PROFILE CANVAS ERROR]', e);
    const status = /avatar|imagen|image|HTTP|URL|límite|MB|dirección local|privada|tardó demasiado|vacío/i.test(e.message || '') ? 422 : 500;
    return res.status(status).json({ status: false, creator: 'FamilyBot-MD', message: status === 422 ? e.message : 'No se pudo generar el Profile Canvas.' });
  }
});
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ status:false, creator:'FamilyBot-MD', message:error.code === 'LIMIT_FILE_SIZE' ? 'El avatar supera el límite de 4 MB.' : 'No se pudo recibir el avatar.' });
  if (error) return res.status(400).json({ status:false, creator:'FamilyBot-MD', message:error.message || 'Archivo no válido.' });
  next();
});
router.meta = { title:'Profile Canvas', description:'Perfil automático y flexible para cualquier bot.', icon:'fas fa-user', method:'POST', fields:[
 {name:'avatar',label:'Avatar',type:'file'},{name:'avatarUrl',label:'Avatar URL',type:'url',placeholder:'https://...'},{name:'username',label:'Usuario',type:'text',placeholder:'Nombre'},
 {name:'level',label:'Nivel',type:'text',placeholder:'Nivel 1'},{name:'xp',label:'XP',type:'text',placeholder:'0 XP'},{name:'coins',label:'Monedas',type:'text',placeholder:'0 monedas'},
 {name:'rank',label:'Ranking',type:'text',placeholder:'Sin ranking'},{name:'bio',label:'Biografía',type:'text',placeholder:'Sin biografía'},{name:'title',label:'Título',type:'text',placeholder:'PROFILE'},
 {name:'footer',label:'Pie',type:'text',placeholder:'✦ FamilyBot-MD ✦'},{name:'style',label:'Estilo',type:'select',options:[...STYLES].map(v=>({value:v,label:v})),default:'royal'} ],
 resultType:'image', resultField:'result.url', directImage:true };
module.exports = router;
