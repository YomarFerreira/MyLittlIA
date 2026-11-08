import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const folder=mkdtempSync(join(tmpdir(),'mylittlia-composer-chat-'));
const db=openDatabase(join(folder,'db.sqlite'),{seed:false});
try {
 const add=(subject,predicate,object)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (lower(hex(randomblob(16))),?,?,?)').run(subject,predicate,object);
 add('cachorro','e_um','mamifero');add('cachorro','numero_patas_tipico','4');add('cachorro','revestimento','pelos');
 let r=sendChatMessage(db,{text:'o que vc sabe sobre animais?'});
 r=sendChatMessage(db,{conversationId:r.conversationId,text:'e onde se encaixa o cachorro nestes grupos?'});
 r=sendChatMessage(db,{conversationId:r.conversationId,text:'sim, quais características de um cachorro?'});
 assert.match(r.reply,/quatro patas/);
 assert.match(r.reply,/pelos/);
 assert.doesNotMatch(r.reply,/conheço: 4, pelos/i);
 console.log('v0.30.4: conversa completa e composição semântica OK');
} finally {db.close();rmSync(folder,{recursive:true,force:true});}
