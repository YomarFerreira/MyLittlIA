import assert from 'node:assert/strict';
import {openDatabase} from '../server/persistence/database.js';
import {importFootballResearch} from '../server/adapters/football/football-research-import.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {createRelation} from '../server/knowledge/relations.js';
const db=openDatabase(':memory:',{seed:false});
try {
 createRelation(db,{subject:'sport',predicate:'possui_cor',object:'vermelho',confidence:0.72});
 createRelation(db,{subject:'floresta',predicate:'localizado_em',object:'pernambuco'});
 const original=db.prepare('SELECT * FROM knowledge_relations').all();
 const dry=importFootballResearch(db);assert.equal(dry.profiles,117);assert.equal(db.prepare('SELECT count(*) n FROM entity_facts').get().n,0);
 const applied=importFootballResearch(db,{apply:true});assert.ok(applied.inserted>400);assert.equal(applied.profiles,117);
 for(const row of original)assert.deepEqual(db.prepare('SELECT * FROM knowledge_relations WHERE id=?').get(row.id),row);
 assert.equal(importFootballResearch(db,{apply:true}).inserted,0);
 assert.equal(db.prepare("SELECT count(*) n FROM entity_facts WHERE entity='tombense' AND property LIKE 'receita%'").get().n,0);
 const pe=sendChatMessage(db,{text:'Qual o maior time de Pernambuco?'});assert.match(pe.reply,/Sport, Náutico, Santa Cruz/);assert.doesNotMatch(pe.reply,/Maguary|Ceará: Floresta/);console.log(pe.reply);
 const br=sendChatMessage(db,{text:'Quais os maiores times do Brasil?'});assert.match(br.reply,/Acre:|Acre/);assert.match(br.reply,/Tocantins/);
 for(const [text,pattern] of [['Qual a torcida do Sport?',/30%/],['Qual o patrimônio líquido do Náutico?',/145\.006\.596/],['Qual o faturamento do Flamengo em 2025?',/2\.089\.500\.000/],['Quais títulos nacionais tem o Tombense?',/Série D: 1 título/],['Qual o patrimônio do Tombense?',/não localizei/],['Qual o valuation do Sport?',/789\.000\.000/],['Qual o passivo do Náutico?',/291\.976\.169/]]) {
  const r=sendChatMessage(db,{text});assert.match(r.reply,pattern,text+' => '+r.reply);
 }
 const fans=sendChatMessage(db,{text:'Quais os maiores times de Pernambuco por torcida?'});assert.equal(fans.result.kind,'comparative-ranking');assert.equal(fans.result.interpretation.comparableCount,3);
 assert.deepEqual(fans.result.interpretation.ranking.map(x=>x.entity),['sport','santa_cruz','nautico']);
 const revenue=sendChatMessage(db,{text:'Quais os maiores clubes do Brasil por faturamento?'});assert.equal(revenue.result.kind,'comparative-ranking');assert.equal(revenue.result.interpretation.comparableCount,20);assert.equal(revenue.result.interpretation.ranking[0].entity,'flamengo');
 const fansBrazil=sendChatMessage(db,{text:'Quais os maiores clubes do Brasil por torcida?'});assert.equal(fansBrazil.result.interpretation.referenceYear,2025);assert.equal(fansBrazil.result.interpretation.comparableCount,20);
 console.log('OK: 117 clubes, 27 UFs, exemplos, períodos, lacunas, importação aditiva e idempotência.');console.log(applied);
}finally{db.close();}
