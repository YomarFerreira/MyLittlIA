/**
 * Importação conservadora de geografia, animais, bebidas e cores.
 *   node imports/import-conhecimentos-v0282.mjs --dry-run [--db caminho]
 *   node imports/import-conhecimentos-v0282.mjs --apply   [--db caminho]
 * Nunca substitui relação existente, peso, nem banco; --dry-run abre read-only.
 * Importa referências documentais, mas NÃO verifica a verdade de cada relação.
 */
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase,normalize} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(Number(args.includes('--apply'))+Number(args.includes('--dry-run'))!==1) {
  console.error('Use exatamente uma opção: --dry-run ou --apply [--db caminho]'); process.exit(2);
}
const apply=args.includes('--apply');
const flag=args.indexOf('--db');
if(flag>=0 && !args[flag+1])throw new Error('Informe o caminho do banco após --db');
const dbPath=resolve(flag===-1?resolve(root,'data/mylittlia.db'):args[flag+1]);
if(!existsSync(dbPath))throw new Error(`Banco não encontrado: ${dbPath}. Não será criado um banco por engano.`);
const dataset=JSON.parse(readFileSync(new URL('./knowledge-topics-v0282.json',import.meta.url),'utf8'));
if(dataset.schema!=='mylittlia-curated-relations-v1'||!Array.isArray(dataset.relations))throw new Error('Formato de conjunto de dados inválido.');
const key=s=>normalize(s).replaceAll(' ','_');
const singleValued=new Set(['tem_capital','origem']);
const db=apply?openDatabase(dbPath,{seed:false}):new DatabaseSync(dbPath,{readOnly:true});
try {
  const find=db.prepare('SELECT id,object,confidence FROM knowledge_relations WHERE subject=? AND predicate=? AND object=?');
  const siblings=db.prepare('SELECT object FROM knowledge_relations WHERE subject=? AND predicate=?');
  const counts={new:0,existing:0,conflicts:0};
  const eligible=[];
  for(const row of dataset.relations) {
    if(!row.subject||!row.predicate||!row.object||row.subject.length>100||row.object.length>100)throw new Error('Relação inválida no pacote.');
    const existing=find.get(key(row.subject),row.predicate,key(row.object));
    if(existing){counts.existing++;continue;}
    if(singleValued.has(row.predicate)&&siblings.all(key(row.subject),row.predicate).some(x=>x.object!==key(row.object))) {
      counts.conflicts++; console.warn(`CONFLITO, sem importar: ${row.subject} → ${row.predicate} → ${row.object}`); continue;
    }
    counts.new++; eligible.push(row);
  }
  if(apply) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS imported_knowledge_provenance (
        relation_id TEXT PRIMARY KEY REFERENCES knowledge_relations(id) ON DELETE CASCADE,
        topic TEXT NOT NULL, source_url TEXT NOT NULL,reference_year INTEGER,
        note TEXT NOT NULL DEFAULT '',imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
      const origin=db.prepare(`INSERT OR IGNORE INTO imported_knowledge_provenance
        (relation_id,topic,source_url,reference_year,note) VALUES (?,?,?,?,?)`);
      let inserted=0;
      for(const row of eligible){
        const outcome=createRelation(db,{...row,confidence:null,source_type:'imported'});
        if(!outcome.inserted)continue;
        inserted++;
        const id=find.get(key(row.subject),row.predicate,key(row.object)).id;
        origin.run(id,row.category,row.source||'',null,row.note||'');
      }
      db.exec('COMMIT');
      console.log(`Importação concluída: ${inserted} relações novas. ${counts.existing} já presentes; ${counts.conflicts} conflitos não importados. Pesos preservados.`);
    }catch(err){db.exec('ROLLBACK');throw err;}
  }else console.log('SIMULAÇÃO (sem gravação):',counts);
  console.log('Tópicos:', [...new Set(dataset.relations.map(x=>x.category))].join(', '));
  console.log('Atenção: relações com fonte vazia são conhecimentos gerais introdutórios, não verificação independente.');
}finally {db.close();}
