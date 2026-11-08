import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from '../server/persistence/database.js';
import { createRelation } from '../server/knowledge/relations.js';
import { sendChatMessage } from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-02912-'));
const db=openDatabase(join(dir,'test.sqlite'),{seed:false});
try {
  for(const [subject,predicate,object] of [
    ['gato','bebe','agua'],['flamingo','bebe','agua'],['cachorro','bebe','agua'],['vaca','bebe','agua'],
    ['vaca','e_um','bovino'],['vaca','e_um','herbivoro']
  ]) createRelation(db,{subject,predicate,object,source_type:'imported'});
  let r=sendChatMessage(db,{text:'o que o gato bebe?'}); const conversationId=r.conversationId;
  assert.match(r.reply,/gato bebe [áa]gua/i);
  r=sendChatMessage(db,{conversationId,text:'e o flamingo?'});
  assert.match(r.reply,/flamingo bebe [áa]gua/i);
  r=sendChatMessage(db,{conversationId,text:'então, o que o gato bebe?'});
  assert.match(r.reply,/gato bebe [áa]gua/i);
  r=sendChatMessage(db,{conversationId,text:'a vaca é herbívoro?'});
  assert.match(r.reply,/sim.*vaca.*herb[ií]voro/i);
  r=sendChatMessage(db,{conversationId,text:'a vaca é carnívora?'});
  assert.match(r.reply,/não encontrei uma classificação cadastrada/i);
  assert.doesNotMatch(r.reply,/não.*é carn[ií]vora/i);
  console.log('PASS: marcador discursivo, mudança de entidade, classificação no SQLite e ausência de inferência negativa');
} finally {db.close();rmSync(dir,{recursive:true,force:true});}
