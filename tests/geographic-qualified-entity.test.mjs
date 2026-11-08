import assert from 'node:assert/strict';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const db=openDatabase(':memory:',{seed:false});
try {
 for(const state of ['pernambuco','paraiba']) {
  createRelation(db,{subject:state,predicate:'e_um',object:'unidade_federativa_brasileira'});
  createRelation(db,{subject:`estado_de_${state}`,predicate:'caracteristica',object:'registro_incidental'});
 }
 for(const color of ['azul','branco','vermelho','amarelo'])createRelation(db,{subject:'bandeira_de_pernambuco',predicate:'possui',object:color});
 createRelation(db,{subject:'bandeira_de_paraiba',predicate:'possui',object:'preto'});
 createRelation(db,{subject:'pernambuco',predicate:'tem_capital',object:'recife'});
 let conversationId;
 for(const text of ['Qual as cores da bandeira do estado da Paraíba?','Qual as cores da bandeira do estado de Pernambuco?','Quais são as cores da bandeira de Pernambuco?','Qual a capital do estado de Pernambuco?']) {
  const r=sendChatMessage(db,{text,conversationId});conversationId=r.conversationId;
  if(text.includes('capital'))assert.match(r.reply,/recife/i);
  else if(text.includes('Pernambuco')) {
   for(const color of ['azul','branco','vermelho','amarelo'])assert.match(r.reply,new RegExp(color));
   assert.doesNotMatch(r.reply,/preto|para[ií]ba/i);
   assert.ok(r.result.path.every(row=>row.subject==='bandeira_de_pernambuco'));
  } else assert.match(r.reply,/preto/);
 }
 console.log('OK: qualificadores, entidades concorrentes, troca de estado e evidencias restritas a Pernambuco.');
} finally {db.close();}
