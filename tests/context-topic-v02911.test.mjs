import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const folder=mkdtempSync(join(tmpdir(),'mylittlia-topic-'));
const db=openDatabase(join(folder,'db.sqlite'),{seed:false});
try {
 for(const [subject,predicate,object] of [['gato','bebe','agua'],['flamingo','e_um','ave'],['flamingo','cor_tipica','rosa'],['flamingo','cor_tipica','rosada'],['flamingo','numero_patas_tipico','2'],['gato','e_um','mamifero']])createRelation(db,{subject,predicate,object,source_type:'imported',confidence:null});
 let r=sendChatMessage(db,{text:'O que o gato bebe?'});const conversationId=r.conversationId;
 assert.match(r.reply,/gato bebe água/i);
 r=sendChatMessage(db,{conversationId,text:'E leite?'});
 assert.doesNotMatch(r.reply,/gato bebe um gato/i);
 r=sendChatMessage(db,{conversationId,text:'E o que é um flamingo?'});
 assert.doesNotMatch(r.reply,/gato bebe/i);
 r=sendChatMessage(db,{conversationId,text:'O que é um flamingo?'});
 assert.match(r.reply,/Flamingo é uma ave/i);
 assert.doesNotMatch(r.reply,/coloração rosa e costuma apresentar coloração rosada/i);
 r=sendChatMessage(db,{conversationId,text:'E um gato?'});
 assert.match(r.reply,/gato é um mam[ií]fero/i);
 assert.doesNotMatch(r.reply,/gato bebe um gato/i);
 console.log('PASS: troca de assunto, definição elíptica, sem bebida absurda e sem duplicidade de cor');
} finally {db.close();rmSync(folder,{recursive:true,force:true});}
