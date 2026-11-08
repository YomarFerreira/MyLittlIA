import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const folder=mkdtempSync(join(tmpdir(),'mylittlia-topics-'));
try {
 const db=openDatabase(join(folder,'test.db'),{seed:false});
 const records=[['gato','e_um','mamifero'],['gato','e_um','vertebrado'],['gato','bebe','agua'],['flamingo','e_um','ave'],['flamingo','e_um','vertebrado'],['flamingo','come','crustaceos'],['sapo','e_um','anfibio']];
 const insert=db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (?,?,?,?)');
 records.forEach((r,i)=>insert.run(`topic-${i}`,...r));
 const response=sendChatMessage(db,{text:'o que vc sabe sobre animais?'});
 assert.equal(response.result.kind,'knowledge-topic-summary');
 assert.match(response.reply,/diversos grupos de animais/);
 assert.match(response.reply,/mamifero/);
 assert.match(response.reply,/ave/);
 assert.doesNotMatch(response.reply,/SQLite|entidades distintas|relações cadastradas/);
 assert.doesNotMatch(response.reply,/Ainda não sei responder/);
 assert.match(sendChatMessage(db,{text:'fale sobre mamífero'}).reply,/classificados como mamifero/);
 db.close();
 console.log('PASS: resumos por assunto do SQLite e contagem de entidades sem duplicidade');
} finally {rmSync(folder,{recursive:true,force:true});}
