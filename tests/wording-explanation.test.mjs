import assert from 'node:assert/strict';
import {openDatabase,closeDatabases} from './helpers/database.mjs';
import {createRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {getConversationFocus} from '../server/conversation/focus-manager.js';
import {explainWording} from '../server/conversation/wording-explanation.js';
const db=openDatabase(':memory:',{seed:false});
try {
 createRelation(db,{subject:'pato',predicate:'numero_patas_tipico',object:'2'});
 let r=sendChatMessage(db,{text:'e quantas patas tem um pato?'});const id=r.conversationId;assert.match(r.reply,/normalmente/);
 for(const text of ['porque normalmente?','por que normalmente?','O que significa normalmente?','Por que você usou normalmente?']) {
  r=sendChatMessage(db,{conversationId:id,text});assert.equal(r.result.kind,'dialogue-wording-explanation',r.reply);
  assert.match(r.reply,/registro consultado descreve uma característica típica/);assert.match(r.reply,/não.*identifiquei uma exceção/i);
  assert.equal(getConversationFocus(db,id).entity,'pato');assert.ok(r.result.path.some(row=>row.predicate==='numero_patas_tipico'));
 }
 assert.equal(explainWording(db,'por que normalmente chove?',getConversationFocus(db,id)),null);
 const partial=explainWording(db,'Por que parcial?',{entityClass:'entidade',lastResult:{answer:'Esta lista é parcial.',path:[]}});assert.equal(partial.interpretation.phrase,'parcial');assert.match(partial.answer,/registros disponíveis/);
 db.prepare("UPDATE conversational_templates SET template_text='Explicação personalizada de {word}.' WHERE template_key='wording:parcial'").run();
 assert.match(explainWording(db,'por que parcial?',{lastResult:{answer:'Uma lista parcial.'}}).answer,/Explicação personalizada/);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM knowledge_relations').get().n,1);
 console.log('OK: qualificativo em foco, evidência típica, outros termos, templates editáveis e nenhuma exceção/fato inventado.');
} finally {closeDatabases();}
