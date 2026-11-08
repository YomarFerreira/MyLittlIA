import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v0299-'));
const db=openDatabase(join(dir,'sample.db'),{seed:false});
const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,source_type,evidence_count) VALUES (?,?,?,?,?,1)').run(randomUUID(),s,p,o,'test');
try {
  for(const [name,area,pop] of [['cidade_alpha','2.000 km2 em 2025','100.000 habitantes em 2025'],['cidade_beta','4.000 km2 em 2025','200.000 habitantes em 2025']]) {
    add(name,'pertence_a','pernambuco'); add(name,'area_km2',area);add(name,'populacao',pop);
  }
  const first=sendChatMessage(db,{text:'vc sabe qual as maiore cidades de Pernambuco?'});
  assert.match(first.reply,/popula.*extens/i);
  const second=sendChatMessage(db,{conversationId:first.conversationId,text:'populacao'});
  assert.equal(second.result.interpretation.contextAfter.criterion,'population');
  assert.match(second.reply,/200.000 habitantes/i);
  const third=sendChatMessage(db,{conversationId:first.conversationId,text:'e extensao vc sabe?'});
  assert.equal(third.result.interpretation.contextAfter.criterion,'area');
  assert.match(third.reply,/4.000 km²/i);
  assert.match(third.result.interpretation.contextReference,/cidades de Pernambuco/i);
  console.log('contextual ranking 0.29.9 OK');
} finally {db.close();rmSync(dir,{recursive:true,force:true});}
