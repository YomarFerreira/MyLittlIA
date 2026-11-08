import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {extractTeachingFacts,generalGraphAnswer} from '../server/learning/conversational-graph.js';
import {listProposals,reviewProposal,updateProposal} from '../server/knowledge/relations.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v0307-'));const db=openDatabase(join(dir,'test.db'),{seed:false});
try {
 assert.ok(db.prepare('SELECT max(version) AS v FROM schema_migrations').get().v >= 18);
 const text='O Sport é um clube de futebol de Pernambuco. Suas cores são vermelho e preto.';
 const extracted=extractTeachingFacts(text);
 assert.deepEqual(extracted.map(x=>[x.subject,x.predicate,x.object]),[
  ['sport','e_um','clube_de_futebol'],['sport','localizado_em','pernambuco'],['sport','possui_cor','vermelho'],['sport','possui_cor','preto']]);
 let q=sendChatMessage(db,{text:'O que você sabe sobre o futebol de Pernambuco?'});
 assert.match(q.reply,/pouco/i); const conversationId=q.conversationId;
 q=sendChatMessage(db,{text,conversationId});
 assert.equal(q.proposals.length,4);assert.match(q.reply,/aprovar|aprova/i);
 assert.equal(db.prepare("SELECT count(*) AS n FROM knowledge_relations WHERE subject='sport'").get().n,0);
 let proposals=listProposals(db).filter(x=>x.status==='pending'&&x.subject==='sport');assert.equal(proposals.length,4);
 const wrong=proposals.find(x=>x.predicate==='possui_cor'&&x.object==='vermelho');
 const updated=updateProposal(db,wrong.id,{source_url:'https://sportrecife.com.br/o-brasao/',reference_year:2026,object:'vermelho'});
 assert.equal(updated.reference_year,2026);
 assert.throws(()=>updateProposal(db,wrong.id,{predicate:'__proto__'}),/Relação inválida/);
 for(const p of proposals){ const result=reviewProposal(db,p.id,'approved');assert.equal(result.decision,'approved'); }
 assert.equal(db.prepare("SELECT count(*) AS n FROM knowledge_relations WHERE subject='sport'").get().n,4);
 assert.equal(db.prepare('SELECT count(*) AS n FROM relation_provenance').get().n,1);
 const questions=[
  ['Quais cores o Sport possui?',/vermelho|preto/i],
  ['Cite um clube de futebol de Pernambuco.',/sport/i],
  ['Onde fica o Sport?',/pernambuco/i],
  ['Quais clubes você conhece que usam vermelho?',/sport/i],
  ['O que você sabe sobre o futebol de Pernambuco?',/sport/i]
 ];
 for(const [question,expected] of questions){const response=sendChatMessage(db,{text:question,conversationId}); assert.match(response.reply,expected,question);assert.equal(response.result.kind,'general-graph-qa');}
 // Aprovar outra cor é permitido. Propriedade singular incompatível exige resolução.
 const t=sendChatMessage(db,{conversationId,text:'O Sport é um clube de futebol de Bahia. Suas cores são azul e branco.'});
 assert.equal(t.proposals.length,4);
 const conflict=t.proposals.find(x=>x.predicate==='localizado_em');
 assert.throws(()=>reviewProposal(db,conflict.id,'approved'),/Conflito/);
 assert.equal(db.prepare('SELECT status FROM knowledge_proposals WHERE id=?').get(conflict.id).status,'pending');
 updateProposal(db,conflict.id,{object:'pernambuco'}); reviewProposal(db,conflict.id,'approved');
 assert.equal(db.prepare("SELECT count(*) AS n FROM knowledge_relations WHERE subject='sport' AND predicate='localizado_em'").get().n,1);
 // Fatos ainda pendentes não devem ser recuperados.
 assert.equal(generalGraphAnswer(db,'Quais cores o Sport possui?').answer.includes('azul'),false);
 console.log('v0.30.7: extração multirrelação, aprovação, edição, proveniência, conflito e 5 consultas bidirecionais OK');
}finally{db.close();rmSync(dir,{recursive:true,force:true});}
