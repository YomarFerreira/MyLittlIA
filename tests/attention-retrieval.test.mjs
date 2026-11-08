import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase,createKnowledge} from '../server/persistence/database.js';
import {retrieveKnowledge} from '../server/reasoning/attention-retrieval.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v015-'));
try{
 const db=openDatabase(join(dir,'test.db'),{seed:false});
 createKnowledge(db,{question:'O que é um flamingo?',answer:'Flamingo é uma ave.',intent:'outro'});
 createKnowledge(db,{question:'O que é um mamífero?',answer:'Mamífero amamenta filhotes.',intent:'outro'});
 createKnowledge(db,{question:'Qual é a capital do Acre?',answer:'Rio Branco.',intent:'capital'});
 const exact=retrieveKnowledge(db,'O que é um flamingo?');
 assert.equal(exact.answer,'Flamingo é uma ave.');
 const capital=retrieveKnowledge(db,'Qual a capital do Acre?');
 assert.equal(capital.answer,'Rio Branco.');
 assert.equal(retrieveKnowledge(db,'O que é um ornitorrinco?').answer,null);
 const reply=sendChatMessage(db,{text:'Qual a capital do Acre?'});
 assert.match(reply.reply,/Rio Branco/);
 assert.equal(reply.result.interpretation.neuralUsedForAnswer,false);
 db.close();
 console.log('OK: recuperação contextual, não invenção e conversa integrada');
}finally{rmSync(dir,{recursive:true,force:true});}
