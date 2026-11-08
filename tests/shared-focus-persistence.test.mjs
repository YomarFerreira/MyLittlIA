import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';import {sendChatMessage} from '../server/conversation/chat.js';import {getConversationFocus} from '../server/conversation/focus-manager.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-shared-focus-'));let db;
try {
 const path=join(dir,'test.db');db=openDatabase(path,{seed:false});
 for(let i=1;i<=6;i++)for(const [p,o] of [['localizado_em','pernambuco'],['area_km2',String(i*100)]])db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (?,?,?,?)').run(i+':'+p,'cidade_'+i,p,o);
 let r=sendChatMessage(db,{text:'Quais as três maiores cidades de Pernambuco por extensão?'});const id=r.conversationId;
 db.close();db=openDatabase(path,{seed:false});
 r=sendChatMessage(db,{conversationId:id,text:'mostre cinco'});assert.equal(getConversationFocus(db,id).limit,5);assert.equal(r.result.interpretation.ranking.length,5);
 r=sendChatMessage(db,{conversationId:id,text:'e os menores?'});assert.equal(getConversationFocus(db,id).order,'ascending');assert.equal(r.result.interpretation.ranking[0].value,100);
 const answer=r.reply;db.close();db=openDatabase(path,{seed:false});
 r=sendChatMessage(db,{conversationId:id,text:'por quê?'});assert.equal(r.result.kind,'dialogue-focus-explanation');assert.ok(r.reply.includes(answer));
 const knowledge=db.prepare('SELECT COUNT(*) n FROM knowledge_relations').get().n;
 r=sendChatMessage(db,{text:'mostre cinco'});assert.equal(r.result.kind,'dialogue-focus-clarification');assert.equal(getConversationFocus(db,id).limit,5);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM knowledge_relations').get().n,knowledge);
 console.log('OK: foco persiste ao reabrir, evidência explica resposta correta, isolamento entre conversas e fatos preservados.');
}finally{db?.close();rmSync(dir,{recursive:true,force:true});}
