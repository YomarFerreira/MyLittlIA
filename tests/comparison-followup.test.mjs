import assert from 'node:assert/strict';
import {openDatabase} from '../server/persistence/database.js';
import {importFootballResearch} from '../server/adapters/football/football-research-import.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {metricChoice} from '../server/conversation/dialogue-choices.js';
const db=openDatabase(':memory:',{seed:false});
try {
 importFootballResearch(db,{apply:true});
 for(const text of ['ok, por torcida então','Sim, por torcida','Pode ser pelo tamanho da torcida','Vamos comparar por torcida mesmo','eu prefiro por torcida','torcida']) {
  let r=sendChatMessage(db,{text:'Qual o maior time de Pernambuco?'});
  r=sendChatMessage(db,{conversationId:r.conversationId,text});
  assert.equal(r.result.kind,'comparative-ranking',text+' => '+r.reply);
  assert.equal(r.result.interpretation.ranking[0].entity,'sport');
  assert.equal(r.result.interpretation.contextualFollowup.metric,'torcida');
  assert.ok(r.result.path.every(row=>row.measurement_scope==='pernambuco'));
 }
 assert.equal(metricChoice(db,'vamos pela receita então')?.metric,'receita');
 assert.equal(metricChoice(db,'prefiro valor de mercado')?.metric,'valuation');
 for(const text of ['não por torcida','torcida ou faturamento','qual a torcida do Flamengo?','agora quero saber as cores do Sport'])assert.equal(metricChoice(db,text),null);
 let r=sendChatMessage(db,{text:'Qual o maior time de Pernambuco?'});
 r=sendChatMessage(db,{conversationId:r.conversationId,text:'entendi'});
 r=sendChatMessage(db,{conversationId:r.conversationId,text:'por torcida'});assert.equal(r.result.kind,'comparative-ranking');
 r=sendChatMessage(db,{conversationId:r.conversationId,text:'Qual o som do animal inexistente?'});
 r=sendChatMessage(db,{conversationId:r.conversationId,text:'por torcida'});assert.notEqual(r.result.kind,'comparative-ranking');
 r=sendChatMessage(db,{text:'por torcida'});assert.notEqual(r.result.kind,'comparative-ranking');
 console.log('OK: respostas naturais, métricas do catálogo, escopo PE, repetição após falha e bloqueio de contexto antigo/ambíguo.');
}finally{db.close();}
