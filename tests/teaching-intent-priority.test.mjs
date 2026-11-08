import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'myl-teaching-intent-'));
try {
 const db=openDatabase(join(dir,'test.db'));
 const unknown=sendChatMessage(db,{text:'Quem inventou a palavra girafotron?'});
 const hello=sendChatMessage(db,{conversationId:unknown.conversationId,text:'Olá'});
 assert.match(hello.reply,/olá/i);
 assert.notEqual(hello.result.kind,'conversation-teaching-pending');
 assert.equal(db.prepare("SELECT count(*) n FROM conversational_teachings").get().n,0);
 const second=sendChatMessage(db,{text:'Quem inventou a palavra girafotron?'});
 const question=sendChatMessage(db,{conversationId:second.conversationId,text:'Qual é a capital de Pernambuco?'});
 assert.notEqual(question.result.kind,'conversation-teaching-pending');
 const third=sendChatMessage(db,{text:'Quem inventou a palavra girafotron?'});
 const accept=sendChatMessage(db,{conversationId:third.conversationId,text:'Sim, posso'});
 assert.equal(accept.result.kind,'conversation-teaching-invitation');
 const greetingAgain=sendChatMessage(db,{conversationId:third.conversationId,text:'Bom dia'});
 assert.notEqual(greetingAgain.result.kind,'conversation-teaching-pending');
 const fourth=sendChatMessage(db,{text:'Quem inventou a palavra girafotron?'});
 const fact=sendChatMessage(db,{conversationId:fourth.conversationId,text:'Foi inventada por uma personagem de um conto.'});
 assert.equal(fact.result.kind,'conversation-teaching-pending');
 assert.equal(db.prepare("SELECT count(*) n FROM conversational_teachings WHERE status='pending'").get().n,1);
 db.close();
 console.log('OK: saudações e novas perguntas não viram ensino; fatos explícitos são registrados');
} finally {rmSync(dir,{recursive:true,force:true});}
