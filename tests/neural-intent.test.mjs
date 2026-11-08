import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/persistence/database.js';
import { classifyIntent } from '../server/neural/neural-intent.js';
import { sendChatMessage } from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v027-'));
try {
 const db=openDatabase(join(dir,'test.db'),{seed:false});
 const hello=classifyIntent(db,'Olá, tudo ok?');
 assert.equal(hello.label,'greeting');
 const a=sendChatMessage(db,{text:'Olá, tudo ok?'});
 assert.match(a.reply,/olá/i);
 assert.equal(a.result.neuralIntent.model,'scratch-v2-db');
 const b=sendChatMessage(db,{conversationId:a.conversationId,text:'Que horas são?'});
 const c=sendChatMessage(db,{conversationId:b.conversationId,text:'E amanhã que horas serão a esta hora?'});
 assert.match(c.reply,/amanhã|hora/i);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM neural_intent_models').get().n,1);
 db.close();
 console.log('Neural intent v0.27 OK');
} finally {rmSync(dir,{force:true,recursive:true});}
