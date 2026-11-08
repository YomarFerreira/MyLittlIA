import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {entityFactAnswer} from '../server/knowledge/entity-facts.js';
const dirname=join(fileURLToPath(new URL('.',import.meta.url)),'..');
const json=JSON.parse(readFileSync(new URL('../imports/mylittlia-lote-019-futebol-brasil-2026.json',import.meta.url),'utf8'));
assert.equal(json.facts.length,401);
assert.equal(new Set(json.facts.map(r=>JSON.stringify([r.entity,r.property,r.value,r.reference_year,r.season,r.competition]))).size,401);
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v03013-'));
const db=openDatabase(join(dir,'test.db'),{seed:false});
try {
 assert.ok(db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get().v>=22);
 // Dados de amostra retirados do lote, importados apenas para regressão sem tocar no banco do usuário.
 const subjects=['sport','nautico','flamengo','corinthians'];
 for(const c of subjects)createRelation(db,{subject:c,predicate:'e_um',object:'clube_de_futebol',source_type:'imported'});
 for(const [uf,place] of [['pernambuco','nordeste'],['rio_de_janeiro','sudeste']]){
  createRelation(db,{subject:uf,predicate:'e_um',object:'unidade_federativa_brasileira',source_type:'imported'});
  createRelation(db,{subject:uf,predicate:'localizado_em',object:place,source_type:'imported'});
 }
 for(const [c,loc] of [['sport','pernambuco'],['nautico','pernambuco'],['flamengo','rio_de_janeiro'],['corinthians','sao_paulo']]){
  createRelation(db,{subject:c,predicate:'localizado_em',object:loc,source_type:'imported'});
 }
 createRelation(db,{subject:'sao_paulo',predicate:'e_um',object:'unidade_federativa_brasileira',source_type:'imported'});
 const sample=json.facts.filter(r=>subjects.includes(r.entity));
 const stmt=db.prepare(`INSERT INTO entity_facts(id,entity,property,value,numeric_value,unit,reference_year,season,competition,source_url,source_note,origin_import)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,'test')`);
 for(const r of sample){const id=createHash('sha256').update(JSON.stringify(r)).digest('hex');stmt.run(id,r.entity,r.property,r.value,r.numeric_value,r.unit,r.reference_year,r.season,r.competition,r.source_url,r.note);}
 const aliases={estadio_referencia:['estadio','estadios'],torcida_percentual_atlasintel:['torcida','torcidas'],
  quantidade_titulos:['titulo','titulos'],titulo_temporada:['campeao'],participacao:['serie','participaram','participacao'],
  patrimonio_liquido_milhoes_brl:['patrimonio'],receita_sem_transferencias_milhoes_brl:['receita'],cidade_sede:['cidade']};
 for(const [key,vs] of Object.entries(aliases))for(const v of vs)db.prepare('INSERT INTO entity_fact_aliases VALUES (?,?)').run(key,v);
 let r=sendChatMessage(db,{text:'Qual o estádio do Sport?'});
 assert.match(r.reply,/Ilha do Retiro/);
 assert.equal(r.result.kind,'entity-facts-qualified');
 r=sendChatMessage(db,{text:'Quais os títulos do Sport?'});
 assert.match(r.reply,/Copa do Brasil/);
 r=sendChatMessage(db,{text:'Qual a torcida do Flamengo?'});
 assert.match(r.reply,/20,6%/);
 r=sendChatMessage(db,{text:'Qual o patrimônio do Corinthians?'});
 assert.match(r.reply,/774,1 milhões/);
 r=sendChatMessage(db,{text:'Qual série o Sport disputa em 2026?'});
 assert.match(r.reply,/Série B/);assert.doesNotMatch(r.reply,/Copa do Brasil/);
 r=sendChatMessage(db,{text:'Quais os estádios dos clubes de Pernambuco?'});
 assert.match(r.reply,/Aflitos/);assert.match(r.reply,/Ilha do Retiro/);assert.doesNotMatch(r.reply,/Maracanã/);
 r=sendChatMessage(db,{text:'Qual o patrimônio do Sport?'});
 assert.doesNotMatch(r.reply,/R\$\s*\d+/);
 assert.equal(db.prepare("SELECT COUNT(*) as n FROM entity_facts WHERE property='receita_sem_transferencias_milhoes_brl' AND entity='sport'").get().n,0);
 console.log('v0.30.13: tipos de dados, consultas, fontes e exclusões geográficas OK');
} finally {db.close();rmSync(dir,{recursive:true,force:true});}
