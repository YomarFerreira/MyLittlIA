/** Lote 020: fatos de ranking com fonte e período; --dry-run é somente leitura. */
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase,normalize} from '../server/persistence/database.js';
const folder=dirname(fileURLToPath(import.meta.url));
const dbPath=join(folder,'..','data','mylittlia.db');
const args=process.argv.slice(2);
if(args.length!==1 || !['--apply','--dry-run'].includes(args[0])) {console.error('Uso: node imports/import-mylittlia-lote-020-rankings-brasil.mjs --dry-run|--apply');process.exit(2);}
const apply=args[0]==='--apply';
if(!existsSync(dbPath)){console.error(`Banco de dados não encontrado: ${dbPath}. Nada foi criado.`);process.exit(2);}
const dataset=JSON.parse(readFileSync(join(folder,'mylittlia-lote-020-rankings-brasil.json'),'utf8'));
const canonical=s=>normalize(String(s).replaceAll('_',' ')).replaceAll(' ','_');
const id=r=>createHash('sha256').update('mylittlia:entity_fact:'+JSON.stringify([r.entity,r.property,r.value,r.reference_year??null,r.season??null,r.competition??null])).digest('hex');
const allowed=new Set(['valuation_milhoes_brl','torcida_percentual_datafolha']);
const facts=dataset.facts.map(f=>({...f,entity:canonical(f.entity)}));
const seen=new Set();
for(const f of facts) {
 if(!f.entity || !allowed.has(f.property) || !Number.isFinite(f.numeric_value) || !Number.isInteger(f.reference_year) || !/^https:\/\//.test(f.source_url) || !f.unit || seen.has(id(f)))throw new Error('Fato inválido ou duplicado: '+JSON.stringify(f));
 seen.add(id(f));
}
let db;
try {
 if(apply)openDatabase(dbPath,{seed:false}).close();
 db=new DatabaseSync(dbPath,{readOnly:!apply});
 db.exec('PRAGMA busy_timeout=5000;');
 const has=db.prepare("SELECT 1 FROM sqlite_master WHERE name='entity_facts'").get();
 if(!has)throw new Error('A tabela entity_facts não existe; instale v0.30.14 primeiro.');
 const find=db.prepare('SELECT 1 FROM entity_facts WHERE id=?');
 const conflicting=db.prepare('SELECT id,numeric_value,source_url FROM entity_facts WHERE entity=? AND property=? AND reference_year=? AND source_url=?');
 const insert=apply?db.prepare(`INSERT OR IGNORE INTO entity_facts
 (id,entity,property,value,numeric_value,unit,reference_year,season,competition,source_url,source_note,origin_import)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,'lote-020')`):null;
 const aliases=apply?db.prepare('INSERT OR IGNORE INTO entity_fact_aliases(property,alias) VALUES (?,?)'):null;
 let added=0,skipped=0;
 if(apply)db.exec('BEGIN IMMEDIATE');
 try {
  for(const f of facts){
   const key=id(f);
   if(find.get(key)){skipped++;continue;}
   const collisions=conflicting.all(f.entity,f.property,f.reference_year,f.source_url);
   if(collisions.some(old=>old.numeric_value!==f.numeric_value))throw new Error(`Conflito detectado em ${f.entity}/${f.property}/${f.reference_year}; nada foi gravado.`);
   added++;
   if(apply)insert.run(key,f.entity,f.property,f.value,f.numeric_value,f.unit,f.reference_year,f.season,f.competition,f.source_url,f.note);
  }
  if(apply){
   for(const alias of ['torcida datafolha','pesquisa datafolha','torcida 2026','datafolha','torcida segundo datafolha'])aliases.run('torcida_percentual_datafolha',alias);
   for(const alias of ['valuation','valor de mercado','avaliacao economica'])aliases.run('valuation_milhoes_brl',alias);
   db.exec('COMMIT');
  }
 }catch(error){if(apply)db.exec('ROLLBACK');throw error;}
 console.log(`Lote 020 (${apply?'apply':'dry-run'}): ${facts.length} fatos; ${added} novos; ${skipped} já existentes. ${apply?'Sem UPDATE/DELETE de dados anteriores.':'Nenhum dado alterado.'}`);
}catch(error){console.error('ERRO:',error.message);process.exitCode=1;}finally{db?.close();}
