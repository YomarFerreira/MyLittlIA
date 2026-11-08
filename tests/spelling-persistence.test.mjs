import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';import {createRelation} from '../server/knowledge/relations.js';import {sendChatMessage} from '../server/conversation/chat.js';
const folder=mkdtempSync(join(tmpdir(),'mylittlia-clarification-'));let db;
try {
 db=openDatabase(join(folder,'test.db'),{seed:false});
 createRelation(db,{subject:'cachorro',predicate:'e_um',object:'mamifero'});
 let r=sendChatMessage(db,{text:'O que é im caxorro?'});const id=r.conversationId;assert.equal(r.result.kind,'spelling-clarification');
 db.close();db=openDatabase(join(folder,'test.db'),{seed:false});
 r=sendChatMessage(db,{conversationId:id,text:'Sim, isto'});assert.equal(r.result.clarification.confirmed,true);assert.match(r.reply,/mam[ií]fero/);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM conversation_clarifications').get().n,0);
 const original=db.prepare("SELECT content FROM conversation_messages WHERE conversation_id=? AND role='user' ORDER BY rowid DESC LIMIT 1").get(id);assert.equal(original.content,'Sim, isto');
 console.log('OK: confirmação persiste após reabrir SQLite e histórico mantém a fala original.');
}finally{db?.close();rmSync(folder,{recursive:true,force:true});}
