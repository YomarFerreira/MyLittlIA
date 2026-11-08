import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {getSemanticState} from '../server/reasoning/semantic-core.js';

const folder=mkdtempSync(join(tmpdir(),'mylittlia-v281-'));
const db=openDatabase(join(folder,'test.db'),{seed:false});
const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,source_type) VALUES (?,?,?,?,?)')
 .run(randomUUID(),s,p,o,'test');
const send=(id,text)=>sendChatMessage(db,{conversationId:id,text});
try {
  add('pernambuco','tem_capital','recife');
  for(const [name,area] of [['petrolina','4561,87 km2'],['floresta','3644,169 km2'],['lagoa_grande','1850,07 km2']]) {
    add(name,'pertence_a','pernambuco'); add(name,'area_km2',area);
  }
  add('rio de janeiro','tem_capital','rio de janeiro');
  let r=send(null,'Qual a capital de Pernambuco?'); const id=r.conversationId;
  r=send(id,'E qual a maior cidade de Pernambuco?');
  assert.match(r.reply,/população.*extensão.*PIB/i);
  assert.equal(getSemanticState(db,id).pendingClarification,'ranking-criterion');
  r=send(id,'Extensão');
  assert.match(r.reply,/Petrolina/i);
  assert.doesNotMatch(r.reply,/Sim posso\. Segue uma lista/i);
  assert.equal(getSemanticState(db,id).property,'area');
  r=send(id,'E a menor cidade?');
  assert.match(r.reply,/Lagoa Grande/i);
  assert.equal(getSemanticState(db,id).order,'ascending');
  r=send(id,'E a menor cidade do RJ?');
  assert.match(r.reply,/Rio de Janeiro/i);
  assert.match(r.reply,/extensão territorial/i);
  assert.doesNotMatch(r.reply,/população, extensão territorial ou PIB/i);
  assert.equal(getSemanticState(db,id).entity,'rio de janeiro');
  r=send(id,'População');
  assert.match(r.reply,/Rio de Janeiro/i);
  assert.match(r.reply,/população/i);
  assert.equal(getSemanticState(db,id).property,'population');
  r=send(id,'População');
  assert.match(r.reply,/população/i);
  assert.doesNotMatch(r.reply,/Ainda não sei responder a essa pergunta/i);
  r=send(id,'Se não sabe, por que perguntou qual era o critério?');
  assert.match(r.reply,/Perguntei/i);
  assert.match(r.reply,/população/i);
  assert.equal(getSemanticState(db,id).entity,'rio de janeiro');
  // Isolated criteria are consumed only with an active ranking context.
  const unrelated=send(null,'Extensão');
  assert.ok(unrelated.result.interpretation.parser!=='semantic-core-v1');
  // No knowledge is wrongly registered during the above exchange.
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM conversational_teachings').get().n,0);
  console.log('PASS: v0.28.1 contexto após Extensão/População, mudança de estado e explicação');
} finally { db.close(); rmSync(folder,{recursive:true,force:true}); }
