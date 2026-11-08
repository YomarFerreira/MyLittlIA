import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {comparativeRankingAnswer} from '../server/reasoning/comparative-ranking.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-ranking-'));
const db=openDatabase(join(dir,'test.db'),{seed:false});
try {
 assert.ok(db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get().v>=23);
 for(const [place,kind] of [['pernambuco','unidade_federativa_brasileira'],['rio_de_janeiro','unidade_federativa_brasileira'],['sao_paulo','unidade_federativa_brasileira']])createRelation(db,{subject:place,predicate:'e_um',object:kind,source_type:'imported'});
 const loc=[['sport','pernambuco'],['flamengo','rio_de_janeiro'],['corinthians','sao_paulo'],['palmeiras','sao_paulo'],['sao_paulo_sp','sao_paulo'],['luso','portugal']];
 for(const [entity,place] of loc){createRelation(db,{subject:entity,predicate:'e_um',object:'clube_de_futebol',source_type:'imported'});createRelation(db,{subject:entity,predicate:'localizado_em',object:place,source_type:'imported'});}
 for(const [entity,label] of [['sport','Sport'],['flamengo','Flamengo'],['corinthians','Corinthians'],['palmeiras','Palmeiras'],['sao_paulo_sp','São Paulo']])db.prepare('INSERT INTO entity_labels(entity,display_name,source_import) VALUES(?,?,?)').run(entity,label,'test');
 const data=JSON.parse(readFileSync(new URL('../imports/mylittlia-lote-020-rankings-brasil.json',import.meta.url)));
 const insert=db.prepare(`INSERT INTO entity_facts(id,entity,property,value,numeric_value,unit,reference_year,season,competition,source_url,source_note,origin_import) VALUES(?,?,?,?,?,?,?,?,?,?,?,'test')`);
 let i=0;
 for(const f of data.facts.filter(f=>loc.some(([id])=>id===f.entity)))insert.run(String(++i),f.entity,f.property,f.value,f.numeric_value,f.unit,f.reference_year,f.season,f.competition,f.source_url,f.note);
 // Dados antigos continuam no banco; não podem contaminar o Datafolha 2026.
 insert.run('old','flamengo','torcida_percentual_atlasintel','20.6',20.6,'percent',2025,null,null,'https://example.org/atlas','Atlas 2025');
 const fake=(entity,property,n,year,source='https://example.org/test')=>insert.run(String(++i),entity,property,String(n),n,'kmh',year,null,null,source,'test');
 let result=sendChatMessage(db,{text:'Quais os 3 maiores clubes do Brasil?'});
 assert.equal(result.result.kind,'comparative-ranking-clarification');
 assert.match(result.reply,/qual critério/i);assert.doesNotMatch(result.reply,/Luso/);
 result=sendChatMessage(db,{text:'Por torcida',conversationId:result.conversationId});
 assert.equal(result.result.kind,'comparative-ranking');
 assert.match(result.reply,/1\. Flamengo — 22%/);assert.match(result.reply,/2\. Corinthians — 14%/);assert.match(result.reply,/3\. Palmeiras — 7%/);
 assert.doesNotMatch(result.reply,/Luso/);assert.doesNotMatch(result.reply,/20,6/);
 result=sendChatMessage(db,{text:'Quais os 3 maiores clubes do Brasil por valuation?'});
 assert.equal(result.result.kind,'comparative-ranking');
 assert.match(result.reply,/Flamengo/);assert.match(result.reply,/Corinthians/);assert.match(result.reply,/Palmeiras/);
 assert.match(result.reply,/2025/);assert.match(result.reply,/R\$ 5\.096 milhões/);
 // Ranking de títulos por competição com URL individual por clube, sem mesclar outros campeonatos.
 for(const [club,qty] of [['sport',1],['flamengo',5],['corinthians',4]]){
  insert.run(String(++i),club,'quantidade_titulos',String(qty),qty,'titulos',2026,null,'Copa do Brasil',`https://campeonato.net/clubes/${club}/`,'contagem histórica');
 }
 result=sendChatMessage(db,{text:'Quais 3 clubes com mais títulos da Copa do Brasil?'});
 assert.equal(result.result.kind,'comparative-ranking');assert.match(result.reply,/Flamengo — 5 títulos/);assert.match(result.reply,/Corinthians — 4 títulos/);assert.match(result.reply,/Sport — 1 título/);
 result=sendChatMessage(db,{text:'Quais os 3 clubes do Brasil com maior receita em 2025?'});
 assert.equal(result.result.kind,'comparative-ranking-data-gap');assert.match(result.reply,/n[aã]o encontrei valores num[eé]ricos compar[aá]veis/i);
 result=sendChatMessage(db,{text:'Quais os 3 maiores clubes de Pernambuco por torcida?'});
 assert.equal(result.result.kind,'comparative-ranking');assert.match(result.reply,/Sport/);assert.doesNotMatch(result.reply,/Flamengo —/);
 result=sendChatMessage(db,{text:'Quais os 3 clubes com mais títulos nacionais?'});
 assert.equal(result.result.kind,'comparative-ranking-clarification');assert.match(result.reply,/competição/i);
 // O mesmo motor trabalha com outras classes e medidas definidas no SQLite.
 for(const animal of ['guepardo','leopardo','tartaruga'])createRelation(db,{subject:animal,predicate:'e_um',object:'animal',source_type:'imported'});
 for(const [animal,n] of [['guepardo',110],['leopardo',65],['tartaruga',5]]) fake(animal,'velocidade_maxima_kmh',n,2025);
 result=comparativeRankingAnswer(db,'Quais os 2 animais mais rápidos?');
 assert.equal(result.kind,'comparative-ranking');assert.match(result.answer,/Guepardo — 110 km\/h/);assert.match(result.answer,/Leopardo — 65 km\/h/);
 assert.doesNotMatch(result.answer,/Tartaruga —/);
 // Valores não comparáveis não geram ranking inventado.
 for(const state of ['pernambuco','rio_de_janeiro'])fake(state,'pib_bilhoes_brl',state==='pernambuco'?1:2,2024);
 // Estadual não deve misturar automaticamente municípios sem indicação de classe.
 result=comparativeRankingAnswer(db,'Quais os 2 estados com maior PIB?');
 assert.ok(result===null || ['comparative-ranking','comparative-ranking-data-gap'].includes(result.kind));
 // Mesmo com muitas entidades, uma consulta de listagem não deve despejar todos os nomes.
 for(let n=0;n<20;n++){
  const entity=`clube_teste_${n}`;
  createRelation(db,{subject:entity,predicate:'e_um',object:'clube_de_futebol',source_type:'imported'});
  createRelation(db,{subject:entity,predicate:'localizado_em',object:'pernambuco',source_type:'imported'});
 }
 result=sendChatMessage(db,{text:'Quais clubes do Brasil você conhece?'});
 assert.equal(result.result.kind,'general-graph-qa');
 assert.match(result.reply,/Alguns exemplos|apenas uma amostra/i);
 assert.ok(result.reply.length<650);
 assert.ok(result.result.interpretation.listedCount>=20);
 // A fonte e o período saem do SQLite; nada de gerar números aleatórios.
 console.log('v0.30.14: comparações, limites, fonte/período, contexto, filtros territoriais e outros domínios OK');
}finally{db.close();rmSync(dir,{recursive:true,force:true});}
