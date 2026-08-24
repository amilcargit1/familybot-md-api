const express = require('express');
const { Transform } = require('stream');

const router = express.Router();

const MAX_SIZE = 16 * 1024 * 1024;
const TTL = 86400;
const UPLOAD_TIMEOUT = 60 * 1000;

const ALLOWED_TYPES = {
    'image/jpeg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'image/avif': true,
    'image/bmp': true
};

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FamilyBot - Image Upload</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;padding:20px;display:flex;justify-content:center;align-items:center;font-family:Arial,Helvetica,sans-serif;background:radial-gradient(circle at top,#3b0764 0%,#17112b 45%,#08080d 100%);color:white}
.container{width:100%;max-width:520px;padding:28px;border-radius:28px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);box-shadow:0 25px 80px rgba(0,0,0,.45);backdrop-filter:blur(20px)}
.logo{width:75px;height:75px;margin:auto;display:flex;justify-content:center;align-items:center;border-radius:22px;font-size:38px;background:linear-gradient(135deg,#ec4899,#8b5cf6);box-shadow:0 10px 35px rgba(236,72,153,.35)}
h1{text-align:center;margin:18px 0 5px;font-size:27px}.subtitle{text-align:center;color:rgba(255,255,255,.65);margin-bottom:25px}
.drop-area{display:block;padding:35px 20px;text-align:center;border:2px dashed rgba(255,255,255,.25);border-radius:22px;cursor:pointer;transition:.2s ease}
.drop-area:hover{background:rgba(255,255,255,.06);border-color:#ec4899}.drop-icon{font-size:48px;margin-bottom:12px}.drop-title{font-size:18px;font-weight:bold}.drop-info{margin-top:8px;font-size:13px;color:rgba(255,255,255,.55)}
input[type=file]{display:none}.preview{display:none;margin-top:20px;text-align:center}.preview img{max-width:100%;max-height:260px;border-radius:18px;object-fit:contain;box-shadow:0 10px 35px rgba(0,0,0,.35)}
.file-info{margin-top:12px;font-size:14px;color:rgba(255,255,255,.7);word-break:break-word}
.upload-btn{width:100%;margin-top:22px;padding:16px;border:none;border-radius:16px;background:linear-gradient(135deg,#ec4899,#a855f7);color:white;font-size:17px;font-weight:bold;cursor:pointer;box-shadow:0 10px 30px rgba(236,72,153,.25);transition:transform .15s,opacity .15s}
.upload-btn:hover{transform:translateY(-1px)}.upload-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.progress-container{display:none;margin-top:20px}.progress-background{width:100%;height:12px;overflow:hidden;border-radius:20px;background:rgba(255,255,255,.12)}
.progress-bar{width:0%;height:100%;border-radius:20px;background:linear-gradient(90deg,#ec4899,#8b5cf6);transition:width .15s ease}.progress-text{margin-top:8px;text-align:center;font-size:13px;color:rgba(255,255,255,.65)}
.result{display:none;margin-top:22px;padding:20px;border-radius:18px;background:rgba(34,197,94,.10);border:1px solid rgba(34,197,94,.3)}
.result-title{color:#86efac;font-size:18px;font-weight:bold}.result-url{display:block;margin-top:12px;padding:12px;border-radius:12px;background:rgba(0,0,0,.25);color:#93c5fd;word-break:break-all;text-decoration:none;font-size:13px}
.copy-btn{width:100%;margin-top:12px;padding:12px;border:none;border-radius:12px;background:rgba(255,255,255,.12);color:white;cursor:pointer;font-weight:bold}
.error{display:none;margin-top:20px;padding:15px;border-radius:15px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#fecaca;line-height:1.4}
.footer{margin-top:22px;text-align:center;font-size:12px;color:rgba(255,255,255,.45)}
</style>
</head>
<body>
<div class="container">
<div class="logo">🖼️</div>
<h1>FamilyBot Image Upload</h1>
<div class="subtitle">Sube una imagen y obtén un enlace directo</div>

<label class="drop-area" for="imageFile">
<div class="drop-icon">📁</div>
<div class="drop-title">Seleccionar imagen</div>
<div class="drop-info">PNG · JPG · GIF · WEBP · AVIF · BMP<br>Máximo 16 MB</div>
</label>

<input type="file" id="imageFile" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/bmp">

<div class="preview" id="preview">
<img id="previewImage" alt="Vista previa">
<div class="file-info" id="fileInfo"></div>
</div>

<button class="upload-btn" id="uploadBtn" disabled>🚀 SUBIR IMAGEN</button>

<div class="progress-container" id="progressContainer">
<div class="progress-background"><div class="progress-bar" id="progressBar"></div></div>
<div class="progress-text" id="progressText">Preparando...</div>
</div>

<div class="result" id="result">
<div class="result-title">✅ Imagen subida correctamente</div>
<div id="resultInfo" style="margin-top:10px;color:rgba(255,255,255,.65)"></div>
<a id="resultUrl" class="result-url" target="_blank" rel="noopener noreferrer"></a>
<button class="copy-btn" id="copyBtn">📋 COPIAR ENLACE</button>
</div>

<div class="error" id="error"></div>

<div class="footer">Enlace temporal · 24 horas<br>Powered by FamilyBot-MD</div>
</div>

<script>
const fileInput=document.getElementById('imageFile');
const uploadBtn=document.getElementById('uploadBtn');
const preview=document.getElementById('preview');
const previewImage=document.getElementById('previewImage');
const fileInfo=document.getElementById('fileInfo');
const progressContainer=document.getElementById('progressContainer');
const progressBar=document.getElementById('progressBar');
const progressText=document.getElementById('progressText');
const result=document.getElementById('result');
const resultInfo=document.getElementById('resultInfo');
const resultUrl=document.getElementById('resultUrl');
const copyBtn=document.getElementById('copyBtn');
const errorBox=document.getElementById('error');

const MAX_SIZE=16*1024*1024;
const ALLOWED_TYPES=['image/jpeg','image/png','image/gif','image/webp','image/avif','image/bmp'];
let selectedFile=null;

fileInput.addEventListener('change',function(){
    hideMessages();
    const file=this.files[0];
    if(!file){selectedFile=null;uploadBtn.disabled=true;return;}
    if(!ALLOWED_TYPES.includes(file.type)){
        showError('❌ Formato no permitido. Usa JPG, PNG, GIF, WEBP, AVIF o BMP.');
        this.value='';selectedFile=null;uploadBtn.disabled=true;return;
    }
    if(file.size>MAX_SIZE){
        showError('❌ La imagen supera el límite de 16 MB.');
        this.value='';selectedFile=null;uploadBtn.disabled=true;return;
    }
    selectedFile=file;
    fileInfo.textContent=file.name+' · '+formatSize(file.size);
    preview.style.display='block';
    uploadBtn.disabled=false;
    if(file.type!=='image/avif'){
        const reader=new FileReader();
        reader.onload=e=>previewImage.src=e.target.result;
        reader.readAsDataURL(file);
    }else previewImage.removeAttribute('src');
});

uploadBtn.addEventListener('click',function(){
    if(!selectedFile)return;
    hideMessages();
    uploadBtn.disabled=true;
    progressContainer.style.display='block';
    progressBar.style.width='0%';
    progressText.textContent='Preparando subida...';

    const xhr=new XMLHttpRequest();
    const apiKey=new URLSearchParams(window.location.search).get('apiKey');

    if(!apiKey){
        showError('❌ Falta la API Key. Abre el endpoint usando ?apiKey=TU_KEY');
        uploadBtn.disabled=false;
        progressContainer.style.display='none';
        return;
    }

    const url=window.location.pathname+'?apiKey='+encodeURIComponent(apiKey);
    xhr.open('PUT',url,true);
    xhr.timeout=60000;
    xhr.setRequestHeader('Content-Type',selectedFile.type);

    xhr.upload.addEventListener('progress',function(event){
        if(!event.lengthComputable)return;
        const percent=Math.round((event.loaded/event.total)*100);
        progressBar.style.width=percent+'%';
        progressText.textContent='Subiendo... '+percent+'%';
    });

    xhr.onload=function(){
        uploadBtn.disabled=false;
        progressBar.style.width='100%';
        progressText.textContent='Procesando imagen...';
        let data;
        try{data=JSON.parse(xhr.responseText);}
        catch{showError('❌ El servidor devolvió una respuesta inválida.');return;}

        if(xhr.status>=200&&xhr.status<300&&data.status===true){
            progressText.textContent='✅ Completado';
            result.style.display='block';
            resultInfo.innerHTML='📁 '+escapeHtml(data.name||selectedFile.name)+'<br>📦 '+formatSize(data.size)+'<br>⏱️ '+(data.expiresIn||'24 horas');
            resultUrl.href=data.url;
            resultUrl.textContent=data.url;
            return;
        }
        showError('❌ '+(data.message||'No se pudo subir la imagen.'));
    };

    xhr.onerror=function(){uploadBtn.disabled=false;showError('❌ Error de conexión con el servidor.');};
    xhr.ontimeout=function(){uploadBtn.disabled=false;showError('❌ La subida tardó demasiado. Intenta nuevamente.');};
    xhr.onabort=function(){uploadBtn.disabled=false;showError('❌ La subida fue cancelada.');};
    xhr.send(selectedFile);
});

copyBtn.addEventListener('click',async function(){
    try{
        await navigator.clipboard.writeText(resultUrl.href);
        copyBtn.textContent='✅ ENLACE COPIADO';
        setTimeout(()=>copyBtn.textContent='📋 COPIAR ENLACE',2000);
    }catch{
        showError('No se pudo copiar automáticamente. Mantén presionado el enlace para copiarlo.');
    }
});

function formatSize(bytes){
    if(bytes<1024)return bytes+' B';
    if(bytes<1024*1024)return (bytes/1024).toFixed(2)+' KB';
    return (bytes/1024/1024).toFixed(2)+' MB';
}
function showError(message){errorBox.textContent=message;errorBox.style.display='block';}
function hideMessages(){errorBox.style.display='none';result.style.display='none';}
function escapeHtml(text){return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
</script>
</body>
</html>`);
});

router.put('/', async (req, res) => {
    const contentType=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();

    if(!ALLOWED_TYPES[contentType]){
        return res.status(415).json({status:false,message:'Formato no permitido. Usa JPG, PNG, GIF, WEBP, AVIF o BMP.'});
    }

    const contentLength=Number(req.headers['content-length']||0);

    if(contentLength>MAX_SIZE){
        return res.status(413).json({status:false,message:'La imagen supera el límite de 16 MB.',maxSize:'16 MB'});
    }

    if(contentLength===0){
        return res.status(400).json({status:false,message:'No se recibió ninguna imagen.'});
    }

    let totalSize=0;
    const limiter=new Transform({
        transform(chunk,encoding,callback){
            totalSize+=chunk.length;
            if(totalSize>MAX_SIZE){
                callback(new Error('FILE_TOO_LARGE'));
                return;
            }
            callback(null,chunk);
        }
    });

    req.on('error',error=>limiter.destroy(error));
    req.pipe(limiter);

    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),UPLOAD_TIMEOUT);

    try{
        const imgdbUrl=`https://imgdb.io/api/v1/upload?ttl=${TTL}`;

        const response=await fetch(imgdbUrl,{
            method:'POST',
            headers:{
                'Content-Type':contentType,
                'Content-Length':String(contentLength)
            },
            body:limiter,
            duplex:'half',
            signal:controller.signal
        });

        clearTimeout(timeout);

        let data;
        try{data=await response.json();}
        catch{return res.status(502).json({status:false,message:'ImgDB devolvió una respuesta inválida.'});}

        if(!response.ok){
            if(response.status===413)return res.status(413).json({status:false,message:'ImgDB rechazó la imagen porque supera 16 MB.'});
            if(response.status===415)return res.status(415).json({status:false,message:'ImgDB no admite este formato de imagen.'});
            if(response.status===422)return res.status(422).json({status:false,message:'La imagen parece estar dañada o no es una imagen válida.'});
            if(response.status===429){
                return res.status(429).json({
                    status:false,
                    message:'ImgDB alcanzó el límite de solicitudes. Intenta nuevamente más tarde.',
                    retryAfter:response.headers.get('retry-after')||null
                });
            }
            return res.status(502).json({
                status:false,
                message:data.error||'ImgDB no pudo procesar la imagen.',
                upstreamStatus:response.status
            });
        }

        return res.status(201).json({
            status:true,
            creator:'familybot-md',
            url:data.url,
            id:data.id,
            type:data.type||contentType,
            size:data.size||totalSize,
            expires:data.expires,
            expiresIn:'24 horas'
        });

    }catch(error){
        clearTimeout(timeout);
        console.error('[IMGUPLOAD]',error.message);

        if(error.message==='FILE_TOO_LARGE'){
            return res.status(413).json({status:false,message:'La imagen supera el límite de 16 MB.',maxSize:'16 MB'});
        }
        if(error.name==='AbortError'){
            return res.status(504).json({status:false,message:'La subida tardó demasiado. Intenta nuevamente.'});
        }
        return res.status(502).json({status:false,message:'No se pudo conectar con ImgDB.'});
    }
});

router.meta={
    title:'Image Upload',
    description:'Sube imágenes y obtiene un enlace directo temporal',
    icon:'fas fa-cloud-upload-alt',
    fields:[],
    resultType:'json'
};

module.exports=router;
