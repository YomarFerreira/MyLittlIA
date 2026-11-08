import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {createRelation,reviewProposal} from '../server/knowledge/relations.js';
const db=openDatabase(':memory:',{seed:false});
const legacy=(role='user')=>{const id=randomUUID();db.prepare('INSERT INTO conversations(id) VALUES (?)').run(id);db.prepare('INSERT INTO conversation_messages(id,conversation_id,role,content) VALUES (?,?,?,?)').run(randomUUID(),id,role,'O pato possui 2 patas.');return id;};
try {
 createRelation(db,{subject:'pato',predicate:'possui',object:'penas'});
 const conversationId=legacy();
 let r=sendChatMessage(db,{conversationId,text:'Quantas patas tem um pato?'});
 assert.match(r.reply,/Você me ensinou que pato tem 2 patas/);
 assert.equal(r.proposals.length,1);const pid=r.proposals[0].id;
 assert.equal(db.prepare("SELECT count(*) n FROM knowledge_relations WHERE predicate='numero_patas_tipico'").get().n,0);
 r=sendChatMessage(db,{conversationId,text:'Quantas patas tem um pato?'});assert.equal(r.proposals[0].id,pid);
 r=sendChatMessage(db,{text:'Quantas patas tem um pato?'});assert.equal(r.proposals.length,0);assert.equal(r.result.kind,'property-missing');
 r=sendChatMessage(db,{conversationId:legacy('assistant'),text:'Quantas patas tem um pato?'});assert.equal(r.proposals.length,0);
 reviewProposal(db,pid,'rejected');r=sendChatMessage(db,{conversationId,text:'Quantas patas tem um pato?'});assert.equal(r.proposals.length,0);
 r=sendChatMessage(db,{conversationId:legacy(),text:'Quantas patas tem um pato?'});reviewProposal(db,r.proposals[0].id,'approved');
 r=sendChatMessage(db,{text:'Quantas patas tem um pato?'});assert.match(r.reply,/duas patas/);assert.doesNotMatch(r.reply,/penas/);
 console.log('Recuperação: histórico, isolamento, deduplicação, rejeição, aprovação e exclusão de falas da IA OK.');
}finally{db.close();}
