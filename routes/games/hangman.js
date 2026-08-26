const express = require('express');
const router = express.Router();
const game = require('../../services/games.service');
router.get('/', (req,res)=>{try{const result=req.query.gameId?game.hangmanGuess(req.query.gameId,req.query.letter):game.newHangman();if(result.error)return res.status(400).json({status:false,creator:'FamilyBot-MD',message:result.error});return res.json({status:true,creator:'FamilyBot-MD',result});}catch(e){console.error('[HANGMAN ERROR]',e);return res.status(500).json({status:false,creator:'FamilyBot-MD',message:'No se pudo ejecutar el juego.'});}});
router.meta={title:'Ahorcado',description:'Adivina la palabra letra por letra',icon:'fas fa-font',fields:[{name:'gameId',label:'ID de partida',type:'text'},{name:'letter',label:'Letra',type:'text'}],resultType:'json',resultField:'result'};
module.exports=router;
