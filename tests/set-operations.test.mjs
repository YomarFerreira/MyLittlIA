import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {numericRankingAnswer} from '../server/reasoning/numeric-rankings.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-sets-'));
const db=openDatabase(join(dir,'test.db'),{seed:false});
const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,source_type,evidence_count) VALUES (?,?,?,?,?,1)').run(randomUUID(),s,p,o,'test');
try {
 for (const [city,area,year] of [['petrolina','4561,87',0],['floresta','3644,169',0],['lagoa_grande','1850,07',0],['ouricuri','2381,57',2025]]) {add(city,'pertence_a','pernambuco');add(city,'area_km2',`${area} km2${year?' em '+year:''}`);}
 const first=numericRankingAnswer(db,'Qual a maior cidade de Pernambuco em extensão territorial?');
 assert.match(first.answer,/Petrolina/);
 const second=numericRankingAnswer(db,'Qual a segunda maior cidade de Pernambuco em extensão territorial?');
 assert.match(second.answer,/Floresta/);
 assert.equal(second.interpretation.position,2);
 const third=numericRankingAnswer(db,'Qual a terceira maior cidade de Pernambuco em extensão territorial?');
 assert.match(third.answer,/Lagoa grande/);
 const all=numericRankingAnswer(db,'Quais as maiores cidades de Pernambuco em extensão territorial inclua todos os periodos?');
 assert.equal(all.interpretation.includeAll,true);
 assert.equal(all.interpretation.ranking.length,4);
 assert.match(all.answer,/datas diferentes|datas desconhecidas/i);
 const chat1=sendChatMessage(db,{text:'E as maiores cidades de PE?'});
 const chat2=sendChatMessage(db,{conversationId:chat1.conversationId,text:'em extensão'});
 const chat3=sendChatMessage(db,{conversationId:chat1.conversationId,text:'não deixe nenhuma de fora'});
 assert.match(chat2.reply,/Petrolina/);
 assert.match(chat3.reply,/Ouricuri/);
 assert.equal(chat3.result.interpretation.includeAll,true);
 console.log('set operations OK');
} finally {db.close();rmSync(dir,{recursive:true,force:true});}
