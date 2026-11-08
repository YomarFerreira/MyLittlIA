import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'myl-municipal-'));
const db=openDatabase(join(dir,'db.sqlite'),{seed:false});
const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,source_type,evidence_count) VALUES (?,?,?,?,?,1)').run(randomUUID(),s,p,o,'test');
try {
  add('recife','localizado_em','pernambuco');
  add('recife','possui','pib: 66351305000 reais em 2023');
  add('recife','possui','populacao: 1500000 habitantes em 2026');
  add('joao_pessoa','localizado_em','paraiba');
  add('joao_pessoa','possui','pib: 28442131000 reais em 2023');
  const first=sendChatMessage(db,{text:'Quais as maiores cidades da Paraíba?'});
  const second=sendChatMessage(db,{conversationId:first.conversationId,text:'PIB?'});
  assert.match(second.reply,/Jo[aã]o pessoa/i);
  const third=sendChatMessage(db,{conversationId:first.conversationId,text:'e o PIB do recife'});
  assert.match(third.reply,/66\.351\.305\.000/);
  assert.doesNotMatch(third.reply,/Jo[aã]o pessoa/i);
  const fourth=sendChatMessage(db,{conversationId:first.conversationId,text:'Qual o PIB da cidade de Recife - PE?'});
  assert.match(fourth.reply,/66\.351\.305\.000/);
  assert.match(fourth.reply,/2023/);
  const fifth=sendChatMessage(db,{conversationId:first.conversationId,text:'Qual a população de Recife?'});
  assert.match(fifth.reply,/1\.500\.000/);
  console.log('municipal lookup 0.29.10 OK');
} finally {db.close();rmSync(dir,{recursive:true,force:true});}
