import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-live-import-'));
const path=join(dir,'test.db');
try {
 let db=openDatabase(path,{seed:false}); db.close();
 const proc=spawnSync(process.execPath,['imports/import-conhecimentos-v0282.mjs','--apply','--db',path],{encoding:'utf8'});
 assert.equal(proc.status,0,proc.stderr);
 db=openDatabase(path,{seed:false});
 try {
  const states=db.prepare("SELECT DISTINCT subject FROM knowledge_relations WHERE predicate='tem_capital'").all();
  assert.equal(states.length,27);
  let r=sendChatMessage(db,{text:'O que o gato bebe?'});
  assert.match(r.reply,/gato bebe água/i);
  r=sendChatMessage(db,{conversationId:r.conversationId,text:'E leite?'});
  assert.match(r.reply,/ainda não tenho informação suficiente/i);
  r=sendChatMessage(db,{conversationId:r.conversationId,text:'E o cachorro?'});
  assert.match(r.reply,/cachorro bebe água/i);
  r=sendChatMessage(db,{text:'Quais as cores da bandeira do Brasil?'});
  assert.match(r.reply,/verde/i); assert.match(r.reply,/azul/i);
  r=sendChatMessage(db,{text:'Qual a capital do Amapá?'});
  assert.match(r.reply,/Macapá/i);
  console.log('PASS: 27 capitais, pergunta → elipse e bandeira após importação real em banco temporário');
 }finally {db.close();}
}finally {rmSync(dir,{recursive:true,force:true});}
