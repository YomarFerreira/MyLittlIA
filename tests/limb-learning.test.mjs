import assert from 'node:assert/strict';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {createRelation,reviewProposal,extractStatement} from '../server/knowledge/relations.js';
const db=openDatabase(':memory:',{seed:false});
try {
 createRelation(db,{subject:'pato',predicate:'possui',object:'penas'});
 for(const question of ['Quantas patas tem um pato?','Quantas patas possui um pato','Qual o número de patas do pato?']) {
  const missing=sendChatMessage(db,{text:question});
  assert.equal(missing.result.kind,'property-missing',JSON.stringify(missing));
  assert.doesNotMatch(missing.reply,/possui penas/);
 }
 let correction=sendChatMessage(db,{text:'mas eu perguntei sobre as patas do pato'});
 assert.equal(correction.result.kind,'property-missing');

 for(const [text,subject,count] of [['O pato possui 2 patas.','pato','2'],['Um cachorro tem 4 patas.','cachorro','4'],['Não, o cachorro sempre tem 4 patas','cachorro','4'],['Uma aranha possui oito patas.','aranha','8']]) {
  assert.equal(extractStatement(text).subject,subject);
  let r=sendChatMessage(db,{text});
  assert.equal(r.proposals.length,1,JSON.stringify(r));
  assert.equal(r.proposals[0].object,count);
  assert.equal(db.prepare("SELECT count(*) n FROM knowledge_relations WHERE subject=? AND predicate='numero_patas_tipico'").get(subject).n,subject==='cachorro'&&text.startsWith('Não')?1:0);
  reviewProposal(db,r.proposals[0].id,'approved');
  for(const question of [`Quantas patas tem um ${subject}?`,`Quantas patas possui o ${subject}?`,`Quantas patas tem um ${subject}`]) {
   const answer=sendChatMessage(db,{text:question});
   assert.ok(answer.result.path?.some(x=>x.predicate==='numero_patas_tipico'&&x.object===count),JSON.stringify(answer));
  }
 }
 correction=sendChatMessage(db,{text:'mas eu perguntei sobre as patas do pato'});
 assert.ok(correction.result.path.some(x=>x.predicate==='numero_patas_tipico'&&x.object==='2'));
 assert.doesNotMatch(correction.reply,/penas/);
 const conflict=sendChatMessage(db,{text:'O pato possui 4 patas.'});
 assert.throws(()=>reviewProposal(db,conflict.proposals[0].id,'approved'),/Conflito/);
 assert.equal(db.prepare("SELECT object FROM knowledge_relations WHERE subject='pato' AND predicate='numero_patas_tipico'").get().object,'2');
 assert.equal(extractStatement('O pato não possui 2 patas.'),null);
 console.log('Aprendizado e consulta de quantidades: OK');
}finally{db.close();}
