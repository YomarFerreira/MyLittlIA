import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation, inferRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const folder=mkdtempSync(join(tmpdir(),'mylittlia-flag-'));
try {
 const db=openDatabase(join(folder,'db.sqlite'),{seed:false});
 assert.equal(inferRelation(db,'Qual a cor da bandeira de Pernambuco?'),null);
 for (const color of ['azul','branco','vermelho','amarelo']) {
   createRelation(db,{subject:'bandeira de Pernambuco',predicate:'possui',object:color,confidence:null,source_type:'imported'});
 }
 for (const prompt of ['Qual; a cor da bandeira de Pernambuco?', 'Quais são as cores da bandeira de Pernambuco?', 'Qual a cor da bandeira de Pernambuco?']) {
   const result=inferRelation(db,prompt);
   assert.equal(result?.kind,'graph-property-list',prompt);
   for(const color of ['azul','branco','vermelho','amarelo']) assert.ok(result.answer.includes(color),prompt);
 }
 const chat=sendChatMessage(db,{text:'Qual a cor da bandeira de Pernambuco?'});
 assert.match(chat.result.answer,/azul/);
 assert.equal(db.prepare('select count(*) n from knowledge_relations').get().n,4);
 db.close();
 console.log('OK: cores de bandeira recuperadas do grafo no chat');
} finally {rmSync(folder,{recursive:true,force:true});}
