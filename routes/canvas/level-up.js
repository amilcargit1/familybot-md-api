const express = require('express');
const multer = require('multer');
const { generateWelcomeCanvas, STYLES } = require('../../services/welcomeCanvas.service');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024, files: 1 }, fileFilter: (req, file, cb) => {
  if (!file.mimetype || (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/octet-stream')) return cb(new Error('El avatar debe ser una imagen.'));
  cb(null, true);
} });
const p = (r,n,f='') => r.body?.[n] ?? r.query?.[n] ?? f;
const t = (v,f,m) => { const s = String(v ?? '').trim().replace(/\s+/g,' '); return (s || f).slice(0,m); };
const wantsImage = r => String(r.query.format||'').toLowerCase()==='image' || String(r.headers.accept||'').toLowerCase().includes('image/png');

router.post('/', upload.single('avatar'), async (req,res) => {
  try {
    const style = String(p(req,'style','galaxy')).toLowerCase();
    if (!STYLES.has(style)) return res.status(400).json({status:false,creator:'FamilyBot-MD',message:'Estilo no válido.',styles:[...STYLES]});
    const avatarUrl = String(p(req,'avatarUrl','')).trim();
    if (!req.file && !avatarUrl) return res.status(400).json({status:false,creator:'FamilyBot-MD',message:'Envía avatar o avatarUrl.'});
    const level = t(p(req,'level'),'Nivel 2',18);
    const xp = t(p(req,'xp'),'0 XP',24);
    const image = await generateWelcomeCanvas({ style, avatarBuffer:req.file?.buffer, avatarUrl,
      username:t(p(req,'username'),'Usuario',34), groupName:t(p(req,'groupName'),'¡Felicidades!',40), members:level,
      message:t(p(req,'message'),'Has subido de nivel',55), date:xp, title:t(p(req,'title'),'LEVEL UP!',32), footer:t(p(req,'footer'),'✦ FamilyBot-MD ✦',30) });
    if (wantsImage(req)) return res.status(200).type('png').set('Content-Length',String(image.length)).set('Cache-Control','no-store').send(image);
    return res.json({status:true,creator:'FamilyBot-MD',result:{url:`data:image/png;base64,${image.toString('base64')}`,format:'png',style}});
  } catch(e) { console.error('[LEVEL UP CANVAS ERROR]',e); return res.status(500).json({status:false,creator:'FamilyBot-MD',message:'No se pudo generar el Level Up Canvas.'}); }
});
router.use((error,req,res,next)=>{ if(error instanceof multer.MulterError) return res.status(400).json({status:false,creator:'FamilyBot-MD',message:error.code==='LIMIT_FILE_SIZE'?'El avatar supera el límite de 4 MB.':'No se pudo recibir el avatar.'}); if(error) return res.status(400).json({status:false,creator:'FamilyBot-MD',message:error.message||'Archivo no válido.'}); next(); });
router.meta={title:'Level Up Canvas',description:'Genera una tarjeta cuando un usuario sube de nivel.',icon:'fas fa-level-up-alt',method:'POST',fields:[{name:'avatar',label:'Avatar',type:'file'},{name:'avatarUrl',label:'Avatar URL',type:'url'},{name:'username',label:'Usuario',type:'text'},{name:'groupName',label:'Texto superior',type:'text',placeholder:'¡Felicidades!'},{name:'level',label:'Nivel',type:'text',placeholder:'Nivel 2'},{name:'xp',label:'XP',type:'text',placeholder:'0 XP'},{name:'message',label:'Mensaje',type:'text',placeholder:'Has subido de nivel'},{name:'title',label:'Título',type:'text',placeholder:'LEVEL UP!'},{name:'footer',label:'Pie',type:'text',placeholder:'✦ FamilyBot-MD ✦'},{name:'style',label:'Estilo',type:'select',options:[...STYLES].map(v=>({value:v,label:v})),default:'galaxy'}],resultType:'image',resultField:'result.url',directImage:true};
module.exports=router;
