const express = require('express');
const router = express.Router();
const API_URL = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=panda%20animal&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url&format=json&origin=*';
async function getImage() { const r = await fetch(API_URL, { headers: { 'User-Agent': 'FamilyBot-MD-API/1.0' } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); const d = await r.json(); const pages = Object.values(d.query?.pages || {}).filter(p => p.imageinfo?.[0]?.url); if (!pages.length) throw new Error('Sin imágenes'); return pages[Math.floor(Math.random()*pages.length)].imageinfo[0].url; }
router.get('/', async (req,res)=>{ try { const url=await getImage(); res.json({status:true,creator:'FamilyBot-MD',result:{url,provider:'Wikimedia Commons',type:'panda'}}); } catch(e){ console.error('[PANDA ERROR]',e.message); res.status(502).json({status:false,creator:'FamilyBot-MD',message:'No se pudo obtener un panda.',error:'Servicio externo no disponible'}); }});
router.meta={title:'Panda aleatorio',description:'Obtiene una imagen aleatoria de un panda',icon:'fas fa-paw',fields:[],resultType:'image',resultField:'result.url'};
module.exports=router;
