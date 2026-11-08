import assert from 'node:assert/strict';
import {openDatabase} from '../server/persistence/database.js';
import {importFootballResearch} from '../server/adapters/football/football-research-import.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {comparativeRankingAnswer} from '../server/reasoning/comparative-ranking.js';
const db=openDatabase(':memory:',{seed:false});
try {
 importFootballResearch(db,{apply:true});
 for(const text of ['qual a maior torcida em pernambuco?','Qual é a maior torcida de Pernambuco?','Qual a maior torcida no estado de Pernambuco?','Quem tem a maior torcida em PE?','Quais são as maiores torcidas em Pernambuco?','Quais os 2 clubes com maior torcida em Pernambuco?']) {
  const r=sendChatMessage(db,{text});assert.equal(r.result.kind,'comparative-ranking',text+' => '+r.reply);
  assert.equal(r.result.interpretation.ranking[0].entity,'sport');assert.equal(r.result.interpretation.ranking[0].value,30);
  assert.equal(r.result.interpretation.referenceYear,2026);assert.ok(r.result.path.every(row=>row.measurement_scope==='pernambuco'));
  assert.doesNotMatch(r.reply,/Pode me ensinar|ainda não sei/i);
  if(/^qual|^quem/i.test(text))assert.equal(r.result.interpretation.ranking.length,1);
  if(text.includes('2 clubes'))assert.equal(r.result.interpretation.ranking.length,2);
  console.log(text+' => '+r.reply.split('\n').slice(0,2).join(' '));
 }
 for(const choice of ['por torcida','torcida']) {
  let r=sendChatMessage(db,{text:'Qual o maior time de Pernambuco?'});
  r=sendChatMessage(db,{conversationId:r.conversationId,text:choice});
  assert.equal(r.result.kind,'comparative-ranking');assert.equal(r.result.interpretation.ranking[0].entity,'sport');
 }
 assert.equal(comparativeRankingAnswer(db,'Qual a maior população em Pernambuco?'),null);
 assert.equal(db.prepare('SELECT count(*) n FROM conversational_teachings').get().n,0);
 console.log('OK: domínio implícito, pergunta singular/plural, limite, estado/sigla e continuidade do critério.');
}finally{db.close();}
