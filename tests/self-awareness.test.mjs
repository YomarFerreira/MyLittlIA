import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {scorePath} from '../server/knowledge/relations.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-self-'));
const appVersion=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
const appVersionPattern=new RegExp('v'+appVersion.replaceAll('.','\\.'));
try {
 const db=openDatabase(join(dir,'db.sqlite'));
 for(const [q,re] of [['Olá',/como posso ajudar/i],['Como você se chama?',/MylittlIA/],['Qual sua versão?',appVersionPattern],['Que horas são?',/agora s[aã]o/i],['Qual é a data de hoje?',/hoje [eé]/i],['Quais assuntos você está aprendendo?',/rela[cç][oõ]es/i]]) {
   const r=sendChatMessage(db,{text:q}); assert.match(r.reply,re,q);assert.equal(r.result.kind, ['Olá','Que horas são?','Qual é a data de hoje?'].includes(q)?'semantic-planned':'self-awareness');
 }
 assert.equal(scorePath([{confidence:0.4,assessment_score:0.9,assessment_status:'evidence'}]).score,0.4);
 assert.equal(scorePath([{confidence:null,assessment_score:0.8,assessment_status:'evidence'}]).score,0.8);
 assert.equal(scorePath([{confidence:null,assessment_score:0.8,assessment_status:'review'}]).score,null);
 assert.equal(scorePath([{confidence:null,assessment_score:0.8,assessment_status:'conflict'}]).score,null);
 db.close();console.log('PASS: self-awareness and effective confidence');
} finally {rmSync(dir,{recursive:true,force:true});}
