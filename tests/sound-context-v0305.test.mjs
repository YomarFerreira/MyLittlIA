import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {propertyQueryAnswer} from '../server/reasoning/property-query.js';
const folder=mkdtempSync(join(tmpdir(),'mylittlia-sound-'));
const db=openDatabase(join(folder,'test.sqlite'),{seed:false});
const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES(lower(hex(randomblob(16))),?,?,?)').run(s,p,o);
try {
  add('cachorro','e_um','mamifero');add('cachorro','numero_patas_tipico','4');add('cachorro','revestimento','pelos');
  add('cachorro','som_emitido','latido');add('gato','som_emitido','miado');
  let r=sendChatMessage(db,{text:'o que vc sabe sobre animais?'});
  r=sendChatMessage(db,{conversationId:r.conversationId,text:'e onde se encaixa o cachorro nestes grupos?'});
  r=sendChatMessage(db,{conversationId:r.conversationId,text:'sim, quais características de um cachorro?'});
  r=sendChatMessage(db,{conversationId:r.conversationId,text:'Ele faz algum som?'});
  assert.match(r.reply,/latido/i,'pronome deve recuperar cachorro');
  assert.doesNotMatch(r.reply,/miado/i);
  r=sendChatMessage(db,{conversationId:r.conversationId,text:'e o gato faz algum som?'});
  assert.match(r.reply,/miado/i,'entidade explícita deve trocar o animal');
  assert.match(propertyQueryAnswer(db,'Qual som o cachorro faz?').answer,/latido/i);
  db.prepare("UPDATE conversational_templates SET template_text='PERSONALIZADO {values}' WHERE template_key='property-sound'").run();
  assert.match(propertyQueryAnswer(db,'Qual som o cachorro faz?').answer,/PERSONALIZADO/);
  assert.equal(propertyQueryAnswer(db,'Qual som a borboleta faz?'),null);
  // Explicações não estruturadas não devem virar respostas gerais a pronomes.
  const noData=sendChatMessage(db,{text:'Quais características da borboleta?'});
  let reply=sendChatMessage(db,{conversationId:noData.conversationId,text:'Ela faz algum som?'});
  assert.match(reply.reply,/Ainda não sei/);
  reply=sendChatMessage(db,{conversationId:noData.conversationId,text:'A borboleta emite sons em algumas situações e eles podem ser inaudíveis ao ser humano.'});
  assert.equal(reply.result.kind,'conversation-teaching-not-registered');
  assert.match(reply.reply,/entidade identificada/);
  reply=sendChatMessage(db,{conversationId:noData.conversationId,text:'Ela faz algum som?'});
  assert.match(reply.reply,/Ainda não sei/);
  assert.equal(db.prepare("SELECT count(*) n FROM knowledge WHERE normalized_question='ela faz algum som'").get().n,0);
  console.log('v0.30.5: contexto animal, consulta de som, prioridade da entidade e templates OK');
} finally {db.close();rmSync(folder,{recursive:true,force:true});}
