import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {generalGraphAnswer} from '../server/learning/conversational-graph.js';
import {geographicalPath,buildGeographicIndex} from '../server/reasoning/geographic-hierarchy.js';

const dir=mkdtempSync(join(tmpdir(),'mylittlia-geo-v03012-'));
const db=openDatabase(join(dir,'test.db'),{seed:false});
try {
  assert.ok(db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get().v>=22);
  const add=(s,p,o)=>createRelation(db,{subject:s,predicate:p,object:o,source_type:'imported'});
  for(const [state,region] of [['pernambuco','nordeste'],['rio_de_janeiro','sudeste'],['amapa','norte']]) {
    add(state,'e_um','unidade_federativa_brasileira');
    add(state,'localizado_em',region);
  }
  add('portugal','e_um','pais');
  for(const [club,place] of [['sport','pernambuco'],['flamengo','rio_de_janeiro'],['nautico','recife'],['porto','portugal']]) {
    add(club,'e_um','clube_de_futebol');
    add(club,'localizado_em',place);
  }
  add('recife','localizado_em','pernambuco');
  add('sport','possui_cor','preto');
  add('sport','possui_cor','vermelho');
  add('capivara','e_um','mamifero');
  add('capivara','localizado_em','pernambuco');
  // Dados também podem apresentar municipio_de, sem ampliação da lista de
  // relações que o extrator aceita para aprendizado não revisado.
  db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (?,?,?,?)')
    .run(randomUUID(),'olinda','municipio_de','pernambuco');
  add('santa_cruz','e_um','clube_de_futebol');
  add('santa_cruz','localizado_em','olinda');

  const before=db.prepare('SELECT COUNT(*) AS n FROM knowledge_relations').get().n;
  let r=sendChatMessage(db,{text:'Quais os clubes do Brasil?'});
  assert.equal(r.result.kind,'general-graph-qa');
  assert.match(r.reply,/No Brasil/);
  for(const club of ['Sport','Flamengo','Nautico','Santa Cruz']) assert.match(r.reply,new RegExp(club,'i'));
  assert.doesNotMatch(r.reply, /Porto/i);
  assert.equal(r.result.interpretation.listedCount,4);
  assert.equal(r.result.interpretation.inferred,true);
  assert.ok(r.result.path.some(x=>x.predicate==='e_um' && x.object==='unidade_federativa_brasileira'));

  r=sendChatMessage(db,{text:'E quais os times do Rio de Janeiro?'});
  assert.match(r.reply,/Flamengo/i);
  assert.doesNotMatch(r.reply,/Sport|Nautico|Santa Cruz/);

  r=sendChatMessage(db,{text:'Quais os clubes de Pernambuco?'});
  for(const club of ['Sport','Nautico','Santa Cruz']) assert.match(r.reply,new RegExp(club,'i'));
  assert.doesNotMatch(r.reply,/Flamengo|Porto/);

  r=sendChatMessage(db,{text:'Quais as equipes do Nordeste?'});
  for(const club of ['Sport','Nautico','Santa Cruz']) assert.match(r.reply,new RegExp(club,'i'));
  assert.doesNotMatch(r.reply,/Flamengo|Porto/);

  r=sendChatMessage(db,{text:'Quais os principais clubes do Brasil?'});
  assert.match(r.reply,/qual crit[eé]rio/i);
  assert.doesNotMatch(r.reply,/Sport.*[eé] o maior/i);
  assert.equal(r.result.interpretation.intent,'ranking-needs-metric');

  r=sendChatMessage(db,{text:'Quais os mamíferos do Brasil?'});
  assert.match(r.reply,/Capivara/i);
  assert.doesNotMatch(r.reply,/Flamengo/i);

  r=sendChatMessage(db,{text:'Quais as cores dos clubes do Brasil?'});
  assert.match(r.reply,/Sport: preto, vermelho/i);
  assert.match(r.reply,/para 1 de 4/i);
  assert.doesNotMatch(r.reply,/Flamengo:.*preto/i);
  assert.equal(r.result.interpretation.availableCount,1);

  r=sendChatMessage(db,{text:'Quais os faturamentos dos clubes do Brasil?'});
  assert.match(r.reply,/n[aã]o encontrei (?:informa[cç][oõ]es|valores num[eé]ricos compar[aá]veis)/i);
  assert.doesNotMatch(r.reply,/R\$\s*\d+/);
  assert.equal(r.result.interpretation.availableCount,0);

  r=sendChatMessage(db,{text:'Qual o tamanho dos clubes do Brasil?'});
  assert.match(r.reply,/crit[eé]rio.*torcida.*receita/i);

  r=sendChatMessage(db,{text:'Quais os maiores faturamentos dos clubes do Brasil?'});
  assert.match(r.reply,/n[aã]o encontrei (?:informa[cç][oõ]es|valores num[eé]ricos compar[aá]veis)/i);
  assert.doesNotMatch(r.reply,/Sport.*maior/i);
  const route=geographicalPath(buildGeographicIndex(db),'santa_cruz','brasil');
  assert.equal(route.hops,3);
  assert.equal(route.derived,true);
  assert.equal(geographicalPath(buildGeographicIndex(db),'porto','brasil'),null);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM knowledge_relations').get().n,before);

  // Uma propriedade efetivamente cadastrada deve ser recuperada do clube,
  // sem atribuir os mesmos dados a outras equipes da região.
  db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (?,?,?,?)')
    .run(randomUUID(),'sport','titulo','copa_do_brasil_2008');
  db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (?,?,?,?)')
    .run(randomUUID(),'sport','faturamento','valor_de_teste_ano_2024');
  r=sendChatMessage(db,{text:'Quais os títulos dos clubes do Brasil?'});
  assert.match(r.reply,/Sport: copa do brasil 2008/i);
  assert.doesNotMatch(r.reply,/Flamengo: copa do brasil 2008/i);
  r=sendChatMessage(db,{text:'Quais os faturamentos dos clubes do Brasil?'});
  assert.match(r.reply,/Sport: valor de teste ano 2024/i);
  assert.match(r.reply,/lista [ée] parcial|sem dados/i);
  const afterWithProperties=db.prepare('SELECT COUNT(*) AS n FROM knowledge_relations').get().n;
  assert.equal(afterWithProperties,before+2);

  // Não deve sobrescrever templates editados pelo usuário.
  db.prepare("UPDATE conversational_templates SET template_text='Clubes conhecidos em território brasileiro: {entities}.' WHERE template_key='graph-clubs-country'").run();
  db.close();
  const reopened=openDatabase(join(dir,'test.db'),{seed:false});
  try {
    assert.ok(reopened.prepare('SELECT MAX(version) AS v FROM schema_migrations').get().v>=22);
    assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM knowledge_relations').get().n,afterWithProperties);
    assert.match(sendChatMessage(reopened,{text:'Quais os clubes do Brasil?'}).reply,/territ[oó]rio brasileiro/i);
  } finally {reopened.close();}
  console.log('v0.30.12: inferência UF/cidade/país, exclusões, preservação e templates OK');
} finally {
  try{db.close();}catch{}
  rmSync(dir,{recursive:true,force:true});
}
