const crypto = require('crypto');
const TTL = 30 * 60 * 1000;
const MAX_GAMES = 1000;
const games = new Map();
const WORDS = [
  ['javascript', 'Lenguaje muy usado para la web'], ['familia', 'Personas unidas por parentesco o afecto'],
  ['planeta', 'Cuerpo que gira alrededor de una estrella'], ['computadora', 'Máquina electrónica para procesar información'],
  ['montana', 'Elevación natural del terreno'], ['aventura', 'Experiencia emocionante o arriesgada'],
  ['elefante', 'Animal terrestre de gran tamaño'], ['biblioteca', 'Lugar donde se conservan libros'],
  ['programador', 'Persona que escribe código'], ['oceano', 'Gran extensión de agua salada']
];
const QUIZ = [
  { question: '¿Cuál es el planeta más cercano al Sol?', options: ['Venus', 'Mercurio', 'Marte', 'Júpiter'], answer: 1 },
  { question: '¿Cuántos lados tiene un hexágono?', options: ['5', '6', '7', '8'], answer: 1 },
  { question: '¿Cuál es el océano más grande?', options: ['Atlántico', 'Índico', 'Pacífico', 'Ártico'], answer: 2 },
  { question: '¿Qué lenguaje se ejecuta directamente en el navegador?', options: ['JavaScript', 'Python', 'C++', 'Rust'], answer: 0 },
  { question: '¿Cuántos minutos tiene una hora?', options: ['30', '45', '60', '90'], answer: 2 }
];
function cleanup() { const now = Date.now(); for (const [id, g] of games) if (g.expiresAt <= now) games.delete(id); }
function create(type, data) { cleanup(); if (games.size >= MAX_GAMES) games.delete(games.keys().next().value); const id = crypto.randomBytes(9).toString('hex'); games.set(id, { type, data, expiresAt: Date.now() + TTL }); return id; }
function get(id, type) { const g = games.get(String(id || '')); if (!g || g.type !== type || g.expiresAt <= Date.now()) { if (g) games.delete(id); return null; } g.expiresAt = Date.now() + TTL; return g; }
function stateHangman(data) { const set = new Set(data.guessed); const masked = [...data.word].map(c => set.has(c) ? c : '_').join(' '); const won = [...data.word].every(c => set.has(c)); const lost = data.wrong >= data.maxWrong; return { masked, guessed: data.guessed, wrong: data.wrong, maxWrong: data.maxWrong, status: won ? 'won' : lost ? 'lost' : 'playing', word: won || lost ? data.word : undefined }; }
function newHangman() { const [word, hint] = WORDS[Math.floor(Math.random()*WORDS.length)]; const id=create('hangman',{word,hint,guessed:[],wrong:0,maxWrong:6}); return { id, hint, ...stateHangman({word,guessed:[],wrong:0,maxWrong:6}) }; }
function hangmanGuess(id, value) { const g=get(id,'hangman'); if(!g)return {error:'Partida no encontrada o expirada.'}; const guess=String(value||'').trim().toLowerCase(); if(!/^[a-záéíóúüñ]$/.test(guess))return {error:'Debes enviar una sola letra.'}; if(g.data.guessed.includes(guess))return {error:'Ya probaste esa letra.',...stateHangman(g.data),id}; g.data.guessed.push(guess); if(!g.data.word.includes(guess))g.data.wrong++; const out=stateHangman(g.data); if(out.status!=='playing')games.delete(id); else out.id=id; return out; }
function newGuess(){const number=Math.floor(Math.random()*100)+1;const id=create('guess',{number,attempts:0,maxAttempts:7});return{id,min:1,max:100,attempts:0,maxAttempts:7,status:'playing'};}
function guessNumber(id,value){const g=get(id,'guess');if(!g)return{error:'Partida no encontrada o expirada.'};const n=Number(value);if(!Number.isInteger(n)||n<1||n>100)return{error:'El número debe ser un entero entre 1 y 100.'};g.data.attempts++;if(n===g.data.number||g.data.attempts>=g.data.maxAttempts){const won=n===g.data.number;games.delete(id);return{status:won?'won':'lost',attempts:g.data.attempts,number:won?undefined:g.data.number,message:won?'¡Correcto!':'Se acabaron los intentos.'};}return{id,status:'playing',hint:n<g.data.number?'El número secreto es mayor.':'El número secreto es menor.',attempts:g.data.attempts,remaining:g.data.maxAttempts-g.data.attempts};}
function newScramble(){const[word]=WORDS[Math.floor(Math.random()*WORDS.length)];let scrambled=word;for(let i=0;i<10&&scrambled===word;i++)scrambled=[...word].sort(()=>Math.random()-.5).join('');const id=create('scramble',{word,attempts:0});return{id,scrambled,length:word.length,status:'playing'};}
function scrambleGuess(id,value){const g=get(id,'scramble');if(!g)return{error:'Partida no encontrada o expirada.'};g.data.attempts++;const won=String(value||'').trim().toLowerCase()===g.data.word;if(won)games.delete(id);return won?{status:'won',attempts:g.data.attempts,word:g.data.word,message:'¡Palabra correcta!'}:{id,status:'playing',attempts:g.data.attempts,message:'Incorrecto, inténtalo de nuevo.'};}
function newWord(){const[word,hint]=WORDS[Math.floor(Math.random()*WORDS.length)];const id=create('word',{word,hint});return{id,hint,length:word.length,firstLetter:word[0],status:'playing'};}
function wordGuess(id,value){const g=get(id,'word');if(!g)return{error:'Partida no encontrada o expirada.'};if(String(value||'').trim().toLowerCase()===g.data.word){games.delete(id);return{status:'won',word:g.data.word,message:'¡Correcto!'};}return{id,status:'playing',message:'No es esa palabra. Sigue intentando.'};}
function newQuiz(){const question=QUIZ[Math.floor(Math.random()*QUIZ.length)];const id=create('quiz',{question});return{id,question:question.question,options:question.options,status:'playing'};}
function quizAnswer(id,value){const g=get(id,'quiz');if(!g)return{error:'Pregunta no encontrada o expirada.'};const a=Number(value);if(!Number.isInteger(a)||a<0||a>=g.data.question.options.length)return{error:'answer debe ser un índice válido.'};const correct=a===g.data.question.answer;games.delete(id);return{status:correct?'won':'lost',correct,answer:a,correctAnswer:g.data.question.answer,message:correct?'¡Respuesta correcta!':'Respuesta incorrecta.'};}
function battle(name='Jugador'){const enemies=['Dragón','Robot','Ninja','Pirata','Mago','Guardián'];const make=n=>({name:n,attack:40+Math.floor(Math.random()*61),defense:40+Math.floor(Math.random()*61),speed:40+Math.floor(Math.random()*61)});const player=make(String(name).trim().slice(0,30)||'Jugador'),opponent=make(enemies[Math.floor(Math.random()*enemies.length)]);const score=x=>x.attack+x.defense+x.speed,ps=score(player),os=score(opponent);return{status:'finished',player,opponent,scores:{player:ps,opponent:os},winner:ps===os?'draw':ps>os?'player':'opponent'};}
function memory(){const sequence=Array.from({length:5},()=>Math.floor(Math.random()*10));const id=create('memory',{sequence});return{id,length:sequence.length,sequence,status:'memorize'};}
function memoryCheck(id,value){const g=get(id,'memory');if(!g)return{error:'Partida no encontrada o expirada.'};if(!Array.isArray(value)||value.length!==g.data.sequence.length)return{error:'Envía la secuencia completa como array.'};const correct=value.every((n,i)=>Number(n)===g.data.sequence[i]);games.delete(id);return{status:correct?'won':'lost',correct,sequence:g.data.sequence};}
module.exports={newHangman,hangmanGuess,newGuess,guessNumber,newScramble,scrambleGuess,newWord,wordGuess,newQuiz,quizAnswer,battle,memory,memoryCheck};
