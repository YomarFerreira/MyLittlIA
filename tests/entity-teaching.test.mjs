import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../server/persistence/database.js';
import {extractTeachingFacts} from '../server/learning/conversational-graph.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {listConversationalTeachings,reviewConversationalTeaching} from '../server/learning/teachings.js';
import {reviewProposal,createRelation} from '../server/knowledge/relations.js';
import {retrieveKnowledge} from '../server/reasoning/attention-retrieval.js';
const explanation='Sim, o cachorro Late e o som do latido é au au. o gato mia e o som do miado é miau';
const expected=[['cachorro','som_emitido','latido'],['latido','onomatopeia','au_au'],['gato','som_emitido','miado'],['miado','onomatopeia','miau']];
const db=openDatabase(':memory:',{seed:false});
const legacy=(answer)=>{const cid=randomUUID(),id=randomUUID();db.prepare('INSERT INTO conversations(id) VALUES (?)').run(cid);db.prepare("INSERT INTO conversational_teachings(id,conversation_id,question,normalized_question,answer) VALUES (?,?,'Ele faz algum som?','ele faz algum som',?)").run(id,cid,answer);return id;};
try {
 assert.deepEqual(extractTeachingFacts(explanation,db).map(f=>[f.subject,f.predicate,f.object]),expected);
 assert.equal(extractTeachingFacts('Ele late. Ela mia.').length,0);
 assert.equal(extractTeachingFacts('O cachorro não late. O gato nunca mia.').length,0);
 assert.throws(()=>createRelation(db,{subject:'ele',predicate:'som_emitido',object:'latido'}),/inválida/);
 const taught=sendChatMessage(db,{text:explanation});assert.equal(taught.proposals.length,4);
 assert.equal(db.prepare('SELECT count(*) n FROM knowledge_relations').get().n,0);
 for(const f of taught.proposals)reviewProposal(db,f.id,'approved');
 const old=legacy(explanation);const shown=listConversationalTeachings(db).find(x=>x.id===old);assert.equal(shown.facts.length,4);
 const approved=reviewConversationalTeaching(db,old,'approve');assert.equal(approved.relations.length,4);
 assert.equal(db.prepare("SELECT count(*) n FROM knowledge WHERE normalized_question='ele faz algum som'").get().n,0);
 const unknown=legacy('Sim, ele faz au au.');assert.throws(()=>reviewConversationalTeaching(db,unknown,'approve',{confirmedReview:true}),/registro|entidade|ensinamento/i);
 assert.equal(db.prepare('SELECT status FROM conversational_teachings WHERE id=?').get(unknown).status,'pending');
 for(const [question,yes,no] of [['Qual som o cachorro faz?',/latido|au au/,/miau|miado/],['Qual som o gato faz?',/miado|miau/,/latido|au au/],['Como é o som do latido?',/au au/,/miau/]]) {
  const r=sendChatMessage(db,{text:question});assert.match(r.reply,yes);assert.doesNotMatch(r.reply,no);
 }
 createRelation(db,{subject:'vaca',predicate:'e_um',object:'mamifero'});
 let c=sendChatMessage(db,{text:'Quais características da vaca?'});
 c=sendChatMessage(db,{conversationId:c.conversationId,text:'Ele faz algum som?'});assert.doesNotMatch(c.reply,/latido|miado|au au|miau/);
 const single=sendChatMessage(db,{text:'O cachorro late.'});assert.equal(single.proposals.length,1);
 // Conteúdo antigo com pronome já aprovado não entra na recuperação geral.
 db.prepare("INSERT INTO knowledge(id,question,normalized_question,answer,intent,origin) VALUES (?,'Ele faz algum som?','ele faz algum som','Cachorro late e gato mia','outro','conversation-approved')").run(randomUUID());
 assert.equal(retrieveKnowledge(db,'Ele faz algum som?').answer,null);
 console.log('OK: quatro fatos, aprovação antiga, bloqueio de pronome, consultas separadas e prevenção de vazamento para vaca.');
}finally{db.close();}
