/** Lote 019 — importação idempotente, fonte e ano obrigatórios.
 *  Instalar junto à versão 0.30.13. Rodar --dry-run antes de --apply.
 *  Não substitui a pasta data/ e não reimporta os lotes 017/018.
 */
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase,normalize} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';

const dir=dirname(fileURLToPath(import.meta.url));
const root=join(dir,'..');
const dbPath=join(root,'data','mylittlia.db');
const mode=process.argv.includes('--apply')?'apply':process.argv.includes('--dry-run')?'dry-run':null;
if(!mode || (process.argv.includes('--apply') && process.argv.includes('--dry-run'))) {
 console.error('Uso: node imports/import-mylittlia-lote-019-futebol-brasil-2026.mjs --dry-run|--apply');process.exit(2);
}
if(!existsSync(dbPath)) {console.error(`Banco ausente: ${dbPath}; nenhum arquivo foi criado.`);process.exit(2);}
const file=join(dir,'mylittlia-lote-019-futebol-brasil-2026.json');
const data=JSON.parse(readFileSync(file,'utf8'));
const canonical=s=>normalize(String(s).replaceAll('_',' ')).replaceAll(' ','_');
const sha=s=>createHash('sha256').update(s).digest('hex');
const aliases={
 cidade_sede:['cidade','sede','cidade sede','municipio sede','local da sede'],
 estadio_referencia:['estadio','estadio do clube','estadios','estadios dos clubes','estadio principal','arena','arenas','campo'],
 participacao:['participou','participacao','participacoes','disputou','disputaram','disputa','disputam','participaram','participa','serie','divisao'],
 participacoes_consecutivas_serie_a:['temporadas seguidas na serie a','participacoes consecutivas na serie a','anos consecutivos na serie a','seguidas na serie a'],
 torcida_percentual_atlasintel:['torcida','torcidas','tamanho da torcida','torcedores','percentual da torcida','pesquisa de torcida'],
 receita_sem_transferencias_milhoes_brl:['receita','receita recorrente','receita sem transferencias','faturamento sem transferencias','faturamento','faturamentos','receitas','receita dos clubes'],
 patrimonio_liquido_milhoes_brl:['patrimonio','patrimonio liquido','patrimonio contabil'],
 quantidade_titulos:['titulo','titulos','conquista','conquistas','trofeu','trofeus','campeonatos ganhos','quantas vezes foi campeao'],
 titulo_temporada:['campeao','foi campeao','campeonato conquistado','titulo em','conquistou']
};
const VALID=new Set(Object.keys(aliases));
const records=[];
const ids=new Set();
for(const item of data.facts){
 const entity=canonical(item.entity),property=item.property,value=String(item.value||'').trim();
 if(!entity || !VALID.has(property) || !value || !/^https:\/\//.test(item.source_url)|| (item.reference_year!=null && (!Number.isInteger(item.reference_year)||item.reference_year<1800||item.reference_year>2100))){
  console.error('Fato inválido: '+JSON.stringify(item));process.exit(2);
 }
 const c=String(item.competition??'').trim()||null;
 const key=JSON.stringify([entity,property,value,item.reference_year??null,item.season??null,c]);
 const id=sha('mylittlia:entity_fact:'+key);
 if(ids.has(id)){console.error('Fato duplicado no lote: '+key);process.exit(2);}
 ids.add(id);records.push({...item,id,entity,competition:c});
}
let db;
try {
 if(mode==='apply'){const migrated=openDatabase(dbPath,{seed:false});migrated.close();}
 db=new DatabaseSync(dbPath,{readOnly:mode==='dry-run'});
 db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;');
 const hasFacts=!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='entity_facts'").get();
 const hasAliases=!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='entity_fact_aliases'").get();
 if(mode==='apply' && (!hasFacts||!hasAliases))throw new Error('A migração v22 não foi aplicada. Instale a versão v0.30.13.');
 const found=hasFacts?db.prepare('SELECT 1 FROM entity_facts WHERE id=? LIMIT 1'):null;
 const inserted=hasFacts&&mode==='apply'?db.prepare(`INSERT OR IGNORE INTO entity_facts
 (id,entity,property,value,numeric_value,unit,reference_year,season,competition,source_url,source_note,origin_import)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`):null;
 const aliasInsert=mode==='apply'?db.prepare('INSERT OR IGNORE INTO entity_fact_aliases(property,alias) VALUES (?,?)'):null;
 const labelInsert=mode==='apply'?db.prepare('INSERT OR IGNORE INTO entity_labels(entity,display_name,source_import) VALUES (?,?,?)'):null;
 const linkLookup=db.prepare('SELECT id FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1');
 const insertProvenance=mode==='apply'?db.prepare(`INSERT OR IGNORE INTO relation_provenance
 (relation_id,source_url,reference_year,source_note) VALUES(?,?,?,?)`):null;
 let news=0,skips=0,links=0,aliasCount=0,prov=0;
 if(mode==='apply')db.exec('BEGIN IMMEDIATE');
 try {
  for(const r of records){
   if(found?.get(r.id)){skips++;continue;}
   news++;
   if(inserted)inserted.run(r.id,r.entity,r.property,r.value,r.numeric_value??null,r.unit??null,r.reference_year??null,r.season??null,r.competition??null,r.source_url,r.note??null,'lote-019');
  }
  if(mode==='apply')for(const [property,words] of Object.entries(aliases))for(const word of words)aliasCount+=Number(aliasInsert.run(property,canonical(word)).changes);
  if(mode==='apply')for(const [entity,name] of Object.entries(data.entity_labels||{}))labelInsert.run(canonical(entity),name,'lote-019');
  // Para enriquecer a cadeia geográfica, adicionamos apenas vínculos positivos (sem UPDATE ou DELETE).
  for(const r of data.geographic_relations){
   const subject=canonical(r.subject),object=canonical(r.object);
   let saved=linkLookup.get(subject,'localizado_em',object);
   if(!saved){links++;
    if(mode==='apply'){createRelation(db,{subject,predicate:'localizado_em',object,source_type:'imported'});saved=linkLookup.get(subject,'localizado_em',object);}
   }
   if(mode==='apply'&&saved)prov+=Number(insertProvenance.run(saved.id,r.source_url,2026,'Lote 019, referência de município sede e unidade federativa.').changes);
  }
  if(mode==='apply'){
   // Não criar clubes duplicados. O Santa Cruz e o Náutico já vieram do 017; novos clubes somente se ausentes.
   const newClubLookup=db.prepare("SELECT id FROM knowledge_relations WHERE subject=? AND predicate='e_um' AND object='clube_de_futebol'");
   for(const club of ['guarani','figueirense','paysandu','santa_cruz']) {
    if(!newClubLookup.get(club))createRelation(db,{subject:club,predicate:'e_um',object:'clube_de_futebol',source_type:'imported'});
   }
   db.exec('COMMIT');
  }
 } catch(e){if(mode==='apply')db.exec('ROLLBACK');throw e;}
 console.log(`Lote 019 (${mode}): ${records.length} fatos; ${news} novos; ${skips} existentes; ${links} relações geográficas adicionais; ${aliasCount} sinônimos adicionados; ${prov} proveniências adicionadas.`);
 console.log(mode==='dry-run'?'SIMULAÇÃO: nenhum dado alterado.': 'CONCLUÍDO: nenhum conhecimento anterior foi sobrescrito.');
 if(!hasFacts && mode==='dry-run')console.log('Migração v22 pendente; o --apply aplicará automaticamente antes de importar.');
} catch(error){console.error('Erro:',error.message);process.exitCode=1;}
finally{db?.close();}
