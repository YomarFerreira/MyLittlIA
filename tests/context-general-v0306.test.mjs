import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {sendChatMessage} from '../server/conversation/chat.js';
const folder=mkdtempSync(join(tmpdir(),'mylittlia-context-general-'));
const db=openDatabase(join(folder,'test.sqlite'),{seed:false});
const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES(lower(hex(randomblob(16))),?,?,?)').run(s,p,o);
const ask=(id,text)=>sendChatMessage(db,{conversationId:id,text});
try {
 add('cachorro','e_um','mamifero'); add('cachorro','numero_patas_tipico','4');add('cachorro','revestimento','pelos');
 add('cachorro','som_emitido','latido'); add('cachorro','bebe','agua');
 add('cachorro','habitat','ambiente_domestico'); add('cachorro','come','racao'); add('cachorro','distribuicao','distribuicao_mundial'); add('cachorro','domesticavel','sim'); add('cachorro','preda','pequenos_animais');
 add('gato','som_emitido','miado'); add('gato','bebe','agua');
 add('latido','onomatopeia','au_au');
 let r=sendChatMessage(db,{text:'o que vc sabe sobre animais?'}); const id=r.conversationId;
 r=ask(id,'e onde se encaixa o cachorro nestes grupos?'); assert.match(r.reply,/mam[ií]fero/i);
 r=ask(id,'quais características ele tem?'); assert.match(r.reply,/quatro patas/i);
 r=ask(id,'Ele faz algum som?'); assert.match(r.reply,/late|latido/i); assert.ok(r.result.path.some(row=>row.subject==='cachorro'&&row.object==='latido'));
 r=ask(id,'E como é o latido?'); assert.match(r.reply,/au au/i);
 r=ask(id,'Onde ele vive?'); assert.match(r.reply,/ambiente domestico/i);
 r=ask(id,'E o que ele come?'); assert.match(r.reply,/ra[cç][aã]o/i);
 r=ask(id,'E o que ele bebe?'); assert.match(r.reply,/[aá]gua/i);
 r=ask(id,'Qual a distribuicao geografica dele?'); assert.match(r.reply,/distribuicao mundial/i);
 r=ask(id,'Ele e domesticavel?'); assert.match(r.reply,/domesticável: sim/i);
 r=ask(id,'Quais animais ele preda?'); assert.match(r.reply,/pequenos animais/i);
 r=ask(id,'E qual som o gato faz?'); assert.match(r.reply,/mia|miado/i);assert.ok(r.result.path.some(row=>row.subject==='gato'&&row.object==='miado'));
 r=ask(id,'E o que ele bebe?'); assert.match(r.reply,/[aá]gua/i);
 const unknown=ask(id,'Qual a velocidade maxima do gato?'); assert.doesNotMatch(unknown.reply,/\d+\s*(?:km|quilometro)/i);
 console.log('v0.30.6: contexto multiaatributo, entidades explícitas, sons e limite dos dados OK');
} finally {closeDatabases();db.close();rmSync(folder,{recursive:true,force:true});}
