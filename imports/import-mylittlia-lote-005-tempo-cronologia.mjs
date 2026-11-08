/**
 * MylittlIA - importador idempotente do lote 005.
 * Execução a partir da raiz do projeto: node imports/import-mylittlia-lote-005-tempo-cronologia.mjs --dry-run
 *                                            node imports/import-mylittlia-lote-005-tempo-cronologia.mjs --apply
 * Opcional: --db <caminho do SQLite>.
 * NUNCA exclui, substitui ou modifica pesos manuais. Nunca cria banco por engano.
 */
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {normalize} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if(args.includes('--help')) {
  console.log('node imports/import-mylittlia-lote-005-tempo-cronologia.mjs --dry-run|--apply [--db caminho]');
  process.exit(0);
}
if(Number(args.includes('--apply'))+Number(args.includes('--dry-run'))!==1) {
  console.error('Informe --dry-run OU --apply (apenas uma opção).');
  process.exit(2);
}
const apply=args.includes('--apply');
const index=args.indexOf('--db');
if(index>=0 && !args[index+1])throw new Error('Informe o caminho após --db');
const dbPath=resolve(index<0?resolve(root,'data/mylittlia.db'):args[index+1]);
if(!existsSync(dbPath)) throw new Error(`Banco não encontrado: ${dbPath}. Nada foi criado.`);
const dataset=JSON.parse(readFileSync(new URL('./mylittlia-lote-005-tempo-cronologia.json',import.meta.url),'utf8'));
if(dataset.schema!=='mylittlia-curated-relations-v1'||!Array.isArray(dataset.relations))
  throw new Error('Arquivo de conhecimentos em formato incompatível.');
const validPredicates=new Set(['e_um','bebe','pode_ingerir','numero_patas_tipico','cor_tipica','origem','caracteristica','tem','localizado_em','produz','come','tem_capital','possui']);
const canon=x=>normalize(x).replaceAll(' ','_');
const uniquePredicates=new Set(['tem_capital','origem']);
const db=new DatabaseSync(dbPath,{readOnly:!apply});
try {
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const available=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_relations'").get();
  if(!available) throw new Error('Tabela knowledge_relations inexistente. Execute npm run db:migrate primeiro.');
  const find=db.prepare('SELECT id FROM knowledge_relations WHERE subject=? AND predicate=? AND object=?');
  const siblings=db.prepare('SELECT object FROM knowledge_relations WHERE subject=? AND predicate=?');
  const seen=new Set();
  const counts={novas:0,ja_existentes:0,duplicadas_no_pacote:0,conflitos:0};
  const eligible=[];
  for(const row of dataset.relations) {
    const s=canon(row.subject),o=canon(row.object),p=row.predicate;
    if(!s||!o||s.length>100||o.length>100||!validPredicates.has(p))
      throw new Error(`Relação inválida: ${JSON.stringify(row)}`);
    const key=JSON.stringify([s,p,o]);
    if(seen.has(key)){counts.duplicadas_no_pacote++;continue;}
    seen.add(key);
    if(find.get(s,p,o)){counts.ja_existentes++;continue;}
    if(uniquePredicates.has(p) && siblings.all(s,p).some(r=>r.object!==o)) {
      counts.conflitos++;
      console.warn(`CONFLITO NÃO IMPORTADO: ${row.subject} -> ${p} -> ${row.object}`);
      continue;
    }
    eligible.push(row);counts.novas++;
  }
  console.log(`Lote 005 | Banco: ${dbPath}`);
  console.log(`Análise: ${JSON.stringify(counts)} | Total no arquivo: ${dataset.relations.length}`);
  if(!apply){console.log('SIMULAÇÃO: nenhum dado modificado.');}
  else {
    db.exec('BEGIN IMMEDIATE');
    try{
      db.exec(`CREATE TABLE IF NOT EXISTS imported_knowledge_provenance (
        relation_id TEXT PRIMARY KEY REFERENCES knowledge_relations(id) ON DELETE CASCADE,
        topic TEXT NOT NULL, source_url TEXT NOT NULL, reference_year INTEGER,
        note TEXT NOT NULL DEFAULT '',imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
      const prov=db.prepare(`INSERT OR IGNORE INTO imported_knowledge_provenance
          (relation_id,topic,source_url,reference_year,note) VALUES (?,?,?,?,?)`);
      let written=0;
      for(const item of eligible){
        const result=createRelation(db,{...item,confidence:null,source_type:'imported'});
        if(!result.inserted) continue;
        const inserted=find.get(canon(item.subject),item.predicate,canon(item.object));
        prov.run(inserted.id,item.category||'',item.source||'',null,item.note||'');
        written++;
      }
      db.exec('COMMIT');
      console.log(`CONCLUÍDO: ${written} novas relações. Pesos existentes preservados.`);
    } catch(err) {db.exec('ROLLBACK');throw err;}
  }
} finally {db.close();}
