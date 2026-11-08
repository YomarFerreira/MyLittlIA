import assert from 'node:assert/strict';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const db=openDatabase(':memory:',{seed:false});
try {
 for(const [s,p,o] of [['paraiba','e_um','estado_brasileiro'],['bandeira_de_paraiba','possui','vermelho'],['pernambuco','e_um','estado_brasileiro'],['bandeira_de_pernambuco','possui','azul'],['cachorro','e_um','mamifero']])createRelation(db,{subject:s,predicate:p,object:o});
 for(const yes of ['Sim','isto','isso','exatamente','ha claro Paraíba, acabei escrevendo errado.']) {
  let r=sendChatMessage(db,{text:'Qual as cores da bandeira do estado da Paraída?'});
  assert.equal(r.result.kind,'spelling-clarification',r.reply);assert.match(r.reply,/para[ií]ba/i);
  r=sendChatMessage(db,{conversationId:r.conversationId,text:yes});console.log(yes,r.reply);assert.match(r.reply,/vermelho/i,r.reply);
  assert.equal(r.result.clarification.confirmed,true);
 }
 let r=sendChatMessage(db,{text:'O que é im caxorro?'});assert.match(r.reply,/um cachorro/i);assert.equal(r.result.kind,'spelling-clarification');
 r=sendChatMessage(db,{conversationId:r.conversationId,text:'Não'});assert.equal(r.result.kind,'spelling-rejected');
 r=sendChatMessage(db,{text:'Qual a car da bandera de PE?'});assert.match(r.reply,/cor da bandeira de PE/);
 r=sendChatMessage(db,{conversationId:r.conversationId,text:'Sim'});assert.match(r.reply,/azul/i);
 r=sendChatMessage(db,{text:'Qual as cores da bandeira da Paraída?'});
 r=sendChatMessage(db,{conversationId:r.conversationId,text:'Qual a cor da bandeira de PE?'});assert.match(r.reply,/azul/i);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM conversation_clarifications').get().n,0);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM knowledge_relations').get().n,5);
 console.log('OK: erros, confirmações naturais, rejeição, mudança de assunto, sigla e preservação dos fatos.');
} finally {db.close();}

