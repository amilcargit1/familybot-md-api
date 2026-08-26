const express = require('express');
const multer = require('multer');
const { generateWelcomeCanvas, STYLES } = require('../../services/welcomeCanvas.service');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 } });
const text = (v, fallback, max) => String(v ?? '').trim().slice(0, max) || fallback;
const param = (req, n, f = '') => req.body?.[n] ?? req.query?.[n] ?? f;

router.post('/', upload.single('avatar'), async (req, res) => {
  try {
    const style = String(param(req, 'style', 'dark')).toLowerCase();
    if (!STYLES.has(style)) return res.status(400).json({ status:false, message:'Estilo no válido.', styles:[...STYLES] });
    const avatarUrl = String(param(req, 'avatarUrl', '')).trim();
    if (!req.file && !avatarUrl) return res.status(400).json({ status:false, message:'Envía avatar o avatarUrl.' });
    const image = await generateWelcomeCanvas({ style, avatarBuffer:req.file?.buffer, avatarUrl,
      username:text(param(req,'username'),'Miembro',34), groupName:text(param(req,'groupName'),'Nuestro grupo',40),
      members:text(param(req,'members'),'0',12), message:text(param(req,'message'),'Hasta pronto',55),
      date:text(param(req,'date'),new Date().toLocaleDateString('es-PE'),24), title:text(param(req,'title'),'GOODBYE',32),
      footer:text(param(req,'footer'),'✦ FamilyBot-MD ✦',30) });
    if (String(req.query.format || '').toLowerCase() === 'image') return res.type('png').set('Cache-Control','no-store').send(image);
    res.json({ status:true, creator:'FamilyBot-MD', result:{ url:`data:image/png;base64,${image.toString('base64')}`, format:'png', style } });
  } catch (e) { console.error('[GOODBYE CANVAS ERROR]',e); res.status(500).json({status:false,creator:'FamilyBot-MD',message:'No se pudo generar el Goodbye Canvas.'}); }
});
router.meta = { title:'Goodbye Canvas', description:'Genera una tarjeta de despedida para un miembro de un grupo de WhatsApp.', icon:'fas fa-door-open', method:'POST', fields:[
 {name:'avatar',label:'Avatar',type:'file'},{name:'avatarUrl',label:'Avatar URL',type:'url',placeholder:'https://...'},{name:'username',label:'Usuario',type:'text',placeholder:'Nombre'}, {name:'groupName',label:'Grupo',type:'text',placeholder:'Nombre del grupo'}, {name:'members',label:'Miembros',type:'text',placeholder:'24'}, {name:'message',label:'Mensaje',type:'text',placeholder:'Hasta pronto'}, {name:'date',label:'Fecha',type:'text',placeholder:'Opcional'}, {name:'title',label:'Título',type:'text',placeholder:'GOODBYE'}, {name:'footer',label:'Pie',type:'text',placeholder:'✦ FamilyBot-MD ✦'}, {name:'style',label:'Estilo',type:'select',options:[...STYLES].map(v=>({value:v,label:v})),default:'dark'} ], resultType:'image' };
module.exports = router;
