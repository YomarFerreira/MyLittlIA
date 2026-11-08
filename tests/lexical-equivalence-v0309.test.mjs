import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {generalGraphAnswer,extractTeachingFacts} from '../server/learning/conversational-graph.js';
import {canonicalTerm,conceptInQuestion,geographicMention} from '../server/language/lexical-equivalence.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v0309-'));
const db=openDatabase(join(dir,'test.db'),{seed:false});
try {
  assert.ok(db.prepare('SELECT MAX(version) v FROM schema_migrations').get().v>=19);
  for(const club of ['sport','santa_cruz','nautico','central','retro','maguary']) {
    createRelation(db,{subject:club,predicate:'e_um',object:club==='maguary'?'time_de_futebol':'clube_de_futebol',source_type:'imported'});
    createRelation(db,{subject:club,predicate:'localizado_em',object:'pernambuco',source_type:'imported'});
  }
  createRelation(db,{subject:'flamengo',predicate:'e_um',object:'clube_de_futebol',source_type:'imported'});
  createRelation(db,{subject:'flamengo',predicate:'localizado_em',object:'rio_de_janeiro',source_type:'imported'});
  createRelation(db,{subject:'capivara',predicate:'e_um',object:'mamifero',source_type:'imported'});
  createRelation(db,{subject:'capivara',predicate:'localizado_em',object:'pernambuco',source_type:'imported'});

  assert.equal(canonicalTerm(db,'times'),'clube de futebol');
  assert.deepEqual(extractTeachingFacts('O Ibis é um time de futebol de Pernambuco. Suas cores são preto e branco.',db)
    .filter(x=>x.predicate==='e_um').map(x=>x.object),['clube_de_futebol']);
  // O classificador global não deve reescrever frases ambíguas como 'time'.
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM semantic_terms WHERE phrase='time' AND kind='lexical'").get().n,0);
  assert.equal(canonicalTerm(db,'PE','entity_alias'),'pernambuco');
  assert.equal(conceptInQuestion(db,'Quais os TIMES de PE?','clube de futebol'),'times');
  assert.equal(geographicMention(db,'quais os times do RJ').canonical,'rio de janeiro');

  let r=sendChatMessage(db,{text:'Quais clubes de futebol você conhece em Pernambuco?'});
  const cid=r.conversationId;
  assert.match(r.reply,/Sport|N[aá]utico|Santa Cruz/i);
  const queries=[
    'ok, e quais os principais times de PE?',
    'Quais as principais equipes de futebol de Pernambuco?',
    'E quais os principais clubes de PE?',
    'Quais clubes você conhece em Pernambuco?',
    'Liste os times do RJ',
    'Quais são os mamíferos de Pernambuco?',
    'Quais os principais times de PE'
  ];
  for(const q of queries) {
    r=sendChatMessage(db,{conversationId:cid,text:q});
    assert.equal(r.result.kind,/principais/.test(q.toLowerCase())?'comparative-ranking-clarification':'general-graph-qa',q+' => '+r.reply);
    assert.doesNotMatch(r.reply,/Ainda n[aã]o sei responder/);
  }
  assert.match(sendChatMessage(db,{text:'Quais os principais times de PE?'}).reply,/crit[eé]rio|classific[aá]/i);
  const noRanking=generalGraphAnswer(db,'Quais os principais times de PE?');
  assert.equal(noRanking.interpretation.qualifier,'importance-unverified');
  assert.match(noRanking.reply??noRanking.answer,/Sport/i);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM knowledge_proposals').get().n,0);
  assert.equal(generalGraphAnswer(db,'Qual a capital de Pernambuco?'),null);
  assert.equal(generalGraphAnswer(db,'Quais as cores dos times de PE?')?.kind,'graph-group-property');
  assert.equal(generalGraphAnswer(db,'Quais os títulos dos clubes de Pernambuco?')?.kind,'graph-group-property');
  assert.equal(generalGraphAnswer(db,'Quais os principais times do RJ?').interpretation.matchedLocation,'rj');
  assert.equal(generalGraphAnswer(db,'Quais as melhores equipes de Pernambuco?').interpretation.qualifier,'importance-unverified');
  // Sinônimos editáveis em SQLite, com efeito imediato e sem editar JavaScript.
  db.prepare("INSERT INTO semantic_concept_aliases(language,domain,phrase,canonical) VALUES ('pt-BR','entity_class','esquadras','clube de futebol')").run();
  const changed=generalGraphAnswer(db,'Quais esquadras de PE?');
  assert.match(changed.answer,/Sport/);
  // Sigla customizável em SQLite; nenhuma palavra curta é substituída fora de lugar.
  db.prepare("INSERT INTO semantic_terms(language,kind,phrase,canonical) VALUES ('pt-BR','entity_alias','terra do frevo','pernambuco')").run();
  assert.match(generalGraphAnswer(db,'Liste as equipes da terra do frevo').answer,/Sport/);
  assert.equal(geographicMention(db,'time não pode ter dois tempos'),null);
  // O motor não inventa ranking nem confunde desconhecimento com negativa.
  console.log('v0.30.9: equivalências SQL, abreviações, perguntas contextuais, classes gerais, distinção de ranking e personalização OK');
} finally {db.close();rmSync(dir,{recursive:true,force:true});}
