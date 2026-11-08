import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {numericRankingAnswer} from '../server/reasoning/numeric-rankings.js';
import {getSemanticState} from '../server/reasoning/semantic-core.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-stats-v0293-'));
const db=openDatabase(join(dir,'test.db'),{seed:false});
const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,source_type) VALUES (?,?,?,?,?)').run(randomUUID(),s,p,o,'test');
try {
  for (const [name,area] of [['cidade_a','100 km2'],['cidade_b','200 km2'],['cidade_c','300 km2'],['cidade_d','400 km2']]) {
    add(name,'pertence_a','pernambuco');add(name,'area_km2',area);
  }
  let r=sendChatMessage(db,{text:'Qual a maior cidade de Pernambuco?'});
  const id=r.conversationId;
  assert.match(r.reply,/população.*extensão.*PIB/i);
  r=sendChatMessage(db,{text:'Extensão',conversationId:id});
  assert.match(r.reply,/Cidade D/i);
  r=sendChatMessage(db,{text:'e a mediana?',conversationId:id});
  assert.match(r.reply,/250 km²/i); assert.match(r.reply,/Cidade B.*Cidade C/i);
  assert.equal(getSemanticState(db,id).property,'area');
  assert.equal(r.result.interpretation.operation,'statistics');
  assert.equal(r.result.interpretation.statistics.operation,'median');
  r=sendChatMessage(db,{text:'e a média?',conversationId:id});
  assert.match(r.reply,/250 km²/i);
  assert.equal(r.result.interpretation.statistics.operation,'mean');
  r=sendChatMessage(db,{text:'e a do meio?',conversationId:id});
  assert.match(r.reply,/duas cidades.*meio/i);
  assert.match(r.reply,/Cidade B.*Cidade C/i);
  r=sendChatMessage(db,{text:'o que é mediana?',conversationId:id});
  assert.match(r.reply,/valor central/i);
  assert.equal(getSemanticState(db,id).property,'area');
  // Média e mediana são operações diferentes; um conjunto assimétrico mostra a diferença.
  add('cidade_e','pertence_a','pernambuco'); add('cidade_e','area_km2','5000 km2');
  const mean=numericRankingAnswer(db,'Qual a média da área dos municípios de Pernambuco?');
  const median=numericRankingAnswer(db,'Qual a mediana da área dos municípios de Pernambuco?');
  assert.equal(mean.interpretation.mean,1200);
  assert.equal(median.interpretation.median,300);
  assert.match(mean.answer,/1\.200 km²/);
  assert.match(median.answer,/300 km²/);
  const middle=numericRankingAnswer(db,'Qual a cidade do meio dos municípios de Pernambuco por área?');
  assert.match(middle.answer,/Cidade C/i);
  assert.equal(middle.interpretation.middle.length,1);
  const noData=sendChatMessage(db,{text:'Qual a maior cidade de Pernambuco por população?'});
  const noDataMean=sendChatMessage(db,{text:'E a média?',conversationId:noData.conversationId});
  assert.match(noDataMean.reply,/não tenho valores suficientes/i);
  assert.doesNotMatch(noDataMean.reply,/\b250\b/);
  const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(app,/\$\('prompt'\)\.value = ''/);
  assert.match(app,/sendingMessage/);
  assert.match(app,/if \(!\$\('prompt'\)\.value\.trim\(\) && message\)/);
  console.log('PASS: v0.29.3 média, mediana, do meio, contexto, dados faltantes e limpeza do campo');
} finally {db.close();rmSync(dir,{recursive:true,force:true});}
