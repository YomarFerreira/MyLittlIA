import assert from 'node:assert/strict';
import {openDatabase} from '../server/persistence/database.js';
import {importFootballResearch} from '../server/adapters/football/football-research-import.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {getSemanticState} from '../server/reasoning/semantic-core.js';
const db=openDatabase(':memory:',{seed:false});
try {
 importFootballResearch(db,{apply:true});
 db.prepare("INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES ('capital-fixture','pernambuco','tem_capital','recife')").run();
 let r=sendChatMessage(db,{text:'Qual a capital de Pernambuco?'});const id=r.conversationId;
 r=sendChatMessage(db,{conversationId:id,text:'Qual o maior time de Pernambuco?'});
 r=sendChatMessage(db,{conversationId:id,text:'ok, por torcida então'});assert.equal(r.result.kind,'comparative-ranking');
 r=sendChatMessage(db,{conversationId:id,text:'liste as três maiores torcidas da Paraíba'});
 assert.equal(r.result.kind,'comparative-ranking-data-gap');
 let state=getSemanticState(db,id);assert.equal(state.operation,'comparison');assert.equal(state.entity,'paraiba');assert.equal(state.requestedLimit,3);assert.equal(state.metric,'torcida');
 r=sendChatMessage(db,{conversationId:id,text:'E de Pernambuco?'});
 assert.equal(r.result.kind,'comparative-ranking',r.reply);assert.doesNotMatch(r.reply,/capital|Recife/i);
 assert.equal(r.result.interpretation.ranking.length,3);assert.equal(r.result.interpretation.scope,'pernambuco');assert.equal(r.result.interpretation.metric,'torcida');
 assert.ok(r.result.path.every(row=>row.measurement_scope==='pernambuco'));
 assert.match(r.reply,/Sport/);assert.match(r.reply,/Náutico/);assert.match(r.reply,/Santa Cruz/);
 r=sendChatMessage(db,{conversationId:id,text:'E da Paraíba?'});assert.equal(r.result.kind,'comparative-ranking-data-gap');
 r=sendChatMessage(db,{conversationId:id,text:'E de PE?'});assert.equal(r.result.kind,'comparative-ranking');assert.equal(r.result.interpretation.ranking.length,3);
 r=sendChatMessage(db,{conversationId:id,text:'Qual a capital de Pernambuco?'});assert.match(r.reply,/Recife/);
 assert.notEqual(getSemanticState(db,id).operation,'comparison');
 r=sendChatMessage(db,{conversationId:id,text:'E da Paraíba?'});assert.notEqual(r.result.kind,'comparative-ranking');
 for(const [animal,place,speed] of [['cavalo','pernambuco',80],['gato','pernambuco',40],['capivara','paraiba',null]]) {
  db.prepare("INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (?,?,?,?)").run('animal:'+animal,animal,'e_um','animal');
  db.prepare("INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (?,?,?,?)").run('place:'+animal,animal,'localizado_em',place);
  if(speed)db.prepare("INSERT INTO entity_facts(id,entity,property,value,numeric_value,unit,reference_year,source_url,origin_import) VALUES (?,?,'velocidade_maxima_kmh',?,?,'kmh',2025,'https://example.org/test-speed','test')").run('speed:'+animal,animal,String(speed),speed);
 }
 r=sendChatMessage(db,{text:'Quais os dois animais mais rápidos da Paraíba?'});const animals=r.conversationId;
 assert.equal(r.result.kind,'comparative-ranking-data-gap');
 r=sendChatMessage(db,{conversationId:animals,text:'E de Pernambuco?'});
 assert.equal(r.result.kind,'comparative-ranking');assert.equal(r.result.interpretation.metric,'velocidade');assert.equal(r.result.interpretation.ranking.length,2);
 assert.equal(r.result.interpretation.ranking[0].entity,'cavalo');
 console.log('OK: sequência da imagem, lacuna de dados mantém foco, três resultados, sigla, troca de estado e encerramento por nova pergunta.');
}finally{db.close();}
