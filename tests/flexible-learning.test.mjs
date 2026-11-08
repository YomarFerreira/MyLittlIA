import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase, createKnowledge } from '../server/persistence/database.js';
import { extractStatement, submitStatement, reviewProposal, listRelations } from '../server/knowledge/relations.js';
import { semanticAnswer } from '../server/reasoning/semantic.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-flex-'));
try {
 const db=openDatabase(join(dir,'test.db'),{seed:false});
 createKnowledge(db,{question:'Qual é a capital do Rio de Janeiro?', answer:'A capital do estado do Rio de Janeiro é Rio de Janeiro.',intent:'capital'});
 const reply=semanticAnswer(db,'O Rio de Janeiro tem capital?');
 assert.equal(reply.kind,'semantic-knowledge');
 assert.match(reply.answer,/sim, ele tem uma capital/i);
 assert.equal(semanticAnswer(db,'O Rio de Janeiro tem capital?').interpretation.neuralUsedForAnswer,false);
 assert.equal(semanticAnswer(db,'A Atlântida tem capital?').kind,'unknown');
 for (const [phrase,predicate] of [
  ['O Rio de Janeiro é violento','caracteristica'],
  ['O felino é um mamífero','e_um'],
  ['O gato tem quatro patas','numero_patas_tipico'],
  ['Maceió é a capital de Alagoas','tem_capital'],
  ['Recife fica em Pernambuco','localizado_em'],
  ['A vaca produz leite','produz']
 ]) {
  const parsed=extractStatement(phrase);
  assert.ok(parsed,phrase);
  assert.equal(parsed.predicate,predicate,phrase);
 }
 assert.equal(extractStatement('O Rio de Janeiro tem capital?'),null);
 const sub=submitStatement(db,'O Rio de Janeiro é violento');
 assert.ok(sub.proposal);
 assert.equal(listRelations(db).length,0);
 reviewProposal(db,sub.proposal.id,'approved');
 assert.equal(listRelations(db).length,1);
 assert.equal(listRelations(db)[0].predicate,'caracteristica');
 const checked=semanticAnswer(db,'O Rio de Janeiro é violento?');
 assert.equal(checked.kind,'explicit-relation');
 assert.match(checked.answer,/Tenho registrada uma afirmação/);
 assert.match(checked.answer,/ainda não foi avaliada/);
 db.close();
 console.log('OK: existência de capital, frases gerais, aprovação e persistência');
} finally { rmSync(dir,{recursive:true,force:true}); }
