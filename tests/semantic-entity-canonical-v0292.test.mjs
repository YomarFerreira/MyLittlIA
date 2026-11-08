import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from '../server/persistence/database.js';
import { sendChatMessage } from '../server/conversation/chat.js';
import { getSemanticState } from '../server/reasoning/semantic-core.js';

const folder=mkdtempSync(join(tmpdir(),'mylittlia-v0292-'));
const db=openDatabase(join(folder,'knowledge.db'),{seed:false});
const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,source_type) VALUES (?,?,?,?,?)').run(randomUUID(),s,p,o,'test');
try {
  add('pernambuco','tem_capital','recife');
  add('estado de pernambuco','localizado_em','nordeste'); // alias persistido em dado histórico
  for (const [city,area] of [['petrolina','4561,87'],['floresta','3644,169'],['lagoa_grande','1850,07']]) {
    add(city,'pertence_a','pernambuco');
    add(city,'area_km2',area);
  }
  const count=db.prepare("SELECT COUNT(*) n FROM knowledge_relations WHERE predicate='area_km2'").get().n;
  assert.equal(count,3);
  const first=sendChatMessage(db,{text:'E qual o maior município do estado de Pernambuco?'});
  assert.match(first.reply,/por população, extensão territorial ou PIB/i);
  assert.doesNotMatch(first.reply,/de Estado de Pernambuco/i);
  assert.equal(getSemanticState(db,first.conversationId).entity,'pernambuco');
  const second=sendChatMessage(db,{conversationId:first.conversationId,text:'Extensão'});
  assert.match(second.reply,/Petrolina/);
  assert.doesNotMatch(second.reply,/não tenho medidas suficientes/i);
  const capital=sendChatMessage(db,{text:'Qual a capital do estado de Pernambuco?'});
  assert.match(capital.reply,/Recife/);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM knowledge_relations WHERE predicate='area_km2'").get().n,count);
  console.log('PASS: estado de Pernambuco reconhecido como Pernambuco; medidas preservadas');
} finally {db.close();rmSync(folder,{recursive:true,force:true});}
