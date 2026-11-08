import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-list-teaching-'));
try {
 const db=openDatabase(join(dir,'test.db'));
 const query='E as maiores cidades de PE?';
 const first=sendChatMessage(db,{text:query});
 assert.match(first.reply,/população/i);
 const extent=sendChatMessage(db,{conversationId:first.conversationId,text:'em extensão'});
 assert.match(extent.reply,/pode me ajudar a aprender/i);
 const list='Sim posso. Segue uma lista com suas extensões.\n1. Petrolina: 4.561,87 km²\n2. Floresta: 3.644,169 km²\n3. Santa Maria da Boa Vista: 3.000,774 km²';
 const taught=sendChatMessage(db,{conversationId:first.conversationId,text:list});
 assert.equal(taught.result.kind,'conversation-teaching-pending');
 assert.match(taught.reply,/Registrei o que você me ensinou/i);
 const saved=db.prepare("SELECT question,answer FROM conversational_teachings WHERE status='pending'").all();
 assert.equal(saved.length,1);
 assert.equal(saved[0].answer,list);
 assert.match(saved[0].question,/maiores cidades de PE.*extensao/i);
 assert.equal(db.prepare('SELECT count(*) n FROM knowledge').get().n,2);
 const newQuestion=sendChatMessage(db,{text:'E as maiores cidades de PE?'});
 const again=sendChatMessage(db,{conversationId:newQuestion.conversationId,text:'em extensão'});
 assert.equal(again.result.kind,'knowledge-pending-review');
 // Também aceita a confirmação em uma mensagem separada.
 const newConversation=sendChatMessage(db,{text:'Quais os maiores municípios de Alagoas por área?'});
 assert.match(newConversation.reply,/pode me ajudar a aprender/i);
 const yes=sendChatMessage(db,{conversationId:newConversation.conversationId,text:'Sim, posso.'});
 assert.equal(yes.result.kind,'conversation-teaching-invitation');
 const next=sendChatMessage(db,{conversationId:newConversation.conversationId,text:'1. Município de exemplo: 123 km²\n2. Outro exemplo: 100 km²'});
 assert.equal(next.result.kind,'conversation-teaching-pending');
 db.close();
 console.log('OK: lista numerada ensinada após convite e armazenada somente como pendência');
} finally {rmSync(dir,{recursive:true,force:true});}
