import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation,reviewProposal} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {extractTeachingFacts} from '../server/learning/conversational-graph.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v0308-'));
const db=openDatabase(join(dir,'test.db'),{seed:false});
try {
  for(const [state,capital] of [['rio_de_janeiro','rio_de_janeiro'],['rio_grande_do_norte','natal'],['pernambuco','recife']]) {
    createRelation(db,{subject:state,predicate:'tem_capital',object:capital,source_type:'imported'});
  }
  const first='O Flamengo é um clube de futebol do Rio de Janeiro. Suas cores são vermelho e preto.';
  const got=extractTeachingFacts(first,db);
  assert.deepEqual(got.map(f=>[f.subject,f.predicate,f.object]),[
    ['flamengo','e_um','clube_de_futebol'],['flamengo','localizado_em','rio_de_janeiro'],
    ['flamengo','possui_cor','vermelho'],['flamengo','possui_cor','preto']
  ]);
  const send=sendChatMessage(db,{text:first});
  assert.equal(send.proposals.length,4);
  assert.equal(db.prepare("SELECT count(*) n FROM knowledge_relations WHERE subject='flamengo'").get().n,0);
  for(const proposal of send.proposals)reviewProposal(db,proposal.id,'approved');
  assert.equal(db.prepare("SELECT count(*) n FROM knowledge_relations WHERE subject='flamengo'").get().n,4);
  let ans=sendChatMessage(db,{text:'Onde fica o Flamengo?'});assert.match(ans.reply,/Rio de Janeiro/i);
  ans=sendChatMessage(db,{text:'Quais cores o Flamengo possui?'});assert.match(ans.reply,/preto/i);
  // O nome "Rio Grande do Norte" deve permanecer inteiro na relação.
  const second='O ABC é um clube de futebol do Rio Grande do Norte. Suas cores são preto e branco.';
  const abc=extractTeachingFacts(second,db);
  assert.deepEqual(abc.map(x=>x.object),['clube_de_futebol','rio_grande_do_norte','preto','branco']);
  // Mantém casos sem banco pré-existente: Pernambuco tem 1 palavra.
  assert.deepEqual(extractTeachingFacts('O Sport é um clube de futebol de Pernambuco. Suas cores são vermelho e preto.').map(x=>x.object),[
    'clube_de_futebol','pernambuco','vermelho','preto']);
  // Sem uma classificação interpretável, não inventa uma localização truncada.
  createRelation(db,{subject:'arara',predicate:'e_um',object:'ave',source_type:'imported'});
  assert.deepEqual(extractTeachingFacts('O animal azul é uma ave do Rio Grande do Norte.',db).map(x=>x.object),['ave','rio_grande_do_norte']);
  console.log('v0.30.8: locais multivocabulares, revisão, aprovação e recuperação independente OK');
} finally {db.close();rmSync(dir,{recursive:true,force:true});}
