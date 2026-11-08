import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { sendChatMessage } from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v21-'));
const db=openDatabase(join(dir,'test.db'),{seed:false});
const add=(subject,predicate,object)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,source_type,evidence_count) VALUES (?,?,?,?,?,1)').run(randomUUID(),subject,predicate,object,'test');
try {
 add('pernambuco','tem','municipio_populoso_de_referencia_recife');
 add('pernambuco','tem','municipio_populoso_de_referencia_olinda');
 const first=sendChatMessage(db,{text:'Quais as principais cidades de Pernambuco?'});
 assert.match(first.reply,/recife/i);
 const ask=sendChatMessage(db,{conversationId:first.conversationId,text:'E as maiores cidades de PE?'});
 assert.match(ask.reply,/por população.*extensão territorial/i);
 const answer=sendChatMessage(db,{conversationId:first.conversationId,text:'em extensão'});
 assert.match(answer.reply,/medidas suficientes/i);
 assert.equal(answer.result.interpretation.contextAfter.criterion,'area');
 assert.match(answer.result.interpretation.contextBefore.query,/maiores cidades de PE/i);
 const population=sendChatMessage(db,{conversationId:first.conversationId,text:'por população'});
 assert.match(population.reply,/medidas suficientes/i);
 assert.equal(population.result.interpretation.contextAfter.criterion,'population');
 const year=sendChatMessage(db,{conversationId:first.conversationId,text:'e em 2025?'});
 assert.equal(year.result.interpretation.contextAfter.year,2025);
 assert.match(year.reply,/2025/);
 const only=sendChatMessage(db,{conversationId:first.conversationId,text:'somente as capitais'});
 assert.equal(only.result.interpretation.contextAfter.scope,'capitals');
 const region=sendChatMessage(db,{conversationId:first.conversationId,text:'do Nordeste'});
 assert.equal(region.result.interpretation.contextAfter.region,'nordeste');
 console.log('semantic context OK');
} finally {closeDatabases();db.close();rmSync(dir,{recursive:true,force:true});}
