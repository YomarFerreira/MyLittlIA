import {readFileSync} from 'node:fs';
const currentVersion=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {sendChatMessage} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v0298-'));
try {
 const db=openDatabase(join(dir,'db.sqlite'));
 let id;
 for (const [question,expected] of [
 ['Quem é você?',/inteligência artificial experimental/i],
 ['Quando vc foi criada e por quem?',/não tenho uma data de criação nem autoria confirmadas/i],
 ['E o que vc faz?',/consultar conhecimentos/i],
 ['Para que você serve?',/inferências/i],
 ['Qual sua versão?',new RegExp('v'+currentVersion.replaceAll('.','\\.'))]
 ]) {
  const response=sendChatMessage(db,{text:question,conversationId:id});
  id=response.conversationId;
  assert.match(response.reply,expected,question);
 }
 db.close();
 console.log('PASS self-awareness v0.29.8');
} finally {closeDatabases();rmSync(dir,{recursive:true,force:true});}
