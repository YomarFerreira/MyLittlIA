// Importador MylittlIA: um arquivo, --dry-run / --apply.
// As fontes foram consultadas durante a preparação do lote; a importação funciona offline.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRelation } from '../server/knowledge/relations.js';
import { openDatabase, normalize } from '../server/persistence/database.js';

const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--dry-run') ? 'dry-run' : null;
if (!mode || (process.argv.includes('--apply') && process.argv.includes('--dry-run'))) {
  console.error('Uso: node imports/import-mylittlia-lote-017-futebol-pernambuco.mjs --dry-run|--apply');
  process.exit(2);
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = join(root, 'data', 'mylittlia.db');
if (!existsSync(dbPath)) {
  console.error(`Banco não encontrado em ${dbPath}. Nada foi criado. Confira a instalação.`);
  process.exit(2);
}
if (!existsSync(join(root, 'server', 'persistence', 'migrations', 'migration-v18.sql'))) {
  console.error('Aplicação anterior à v0.30.7: server/persistence/migrations/migration-v18.sql ausente. Instale a v0.30.7 ou superior, preservando data/.');
  process.exit(2);
}
// Registros [sujeito, predicado, objeto, url da fonte, ano de referência, observação].
const records = [
  [
    "sport",
    "e_um",
    "clube_de_futebol",
    "https://sportrecife.com.br/historia-2/",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "sport",
    "localizado_em",
    "pernambuco",
    "https://sportrecife.com.br/historia-2/",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "sport",
    "fundado_em",
    "1905",
    "https://sportrecife.com.br/historia-2/",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "sport",
    "possui_cor",
    "vermelho",
    "https://sportrecife.com.br/o-brasao/",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "sport",
    "possui_cor",
    "preto",
    "https://sportrecife.com.br/o-brasao/",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "santa_cruz",
    "e_um",
    "clube_de_futebol",
    "https://santacruzpe.com.br/o-santa/historia",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "santa_cruz",
    "localizado_em",
    "pernambuco",
    "https://santacruzpe.com.br/o-santa/historia",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "santa_cruz",
    "fundado_em",
    "1914",
    "https://santacruzpe.com.br/o-santa/historia",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "santa_cruz",
    "possui_cor",
    "preto",
    "https://santacruzpe.com.br/o-santa/simbolos",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "santa_cruz",
    "possui_cor",
    "branco",
    "https://santacruzpe.com.br/o-santa/simbolos",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "santa_cruz",
    "possui_cor",
    "vermelho",
    "https://santacruzpe.com.br/o-santa/simbolos",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "nautico",
    "e_um",
    "clube_de_futebol",
    "https://clubenauticocapibaribe.com.br/clube/historia",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "nautico",
    "localizado_em",
    "pernambuco",
    "https://clubenauticocapibaribe.com.br/clube/historia",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "nautico",
    "fundado_em",
    "1901",
    "https://clubenauticocapibaribe.com.br/clube/historia",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "nautico",
    "possui_cor",
    "vermelho",
    "https://clubenauticocapibaribe.com.br/clube/simbolos",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "nautico",
    "possui_cor",
    "branco",
    "https://clubenauticocapibaribe.com.br/clube/simbolos",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "recife",
    "localizado_em",
    "pernambuco",
    "https://www.ibge.gov.br/cidadesat/painel/painel.php?codmun=261160",
    null,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ],
  [
    "recife",
    "bioma",
    "mata_atlantica",
    "https://www.ibge.gov.br/cidadesat/painel/painel.php?codmun=261160",
    2024,
    "Lote 017: fonte institucional; confira a atualidade dos dados."
  ]
];
const allowed = new Set(['e_um','localizado_em','tem_capital','possui_cor','fundado_em','bioma','come','bebe','produz','vegetacao_predominante','atividade_economica']);
const canonical = value => normalize(value).replaceAll(' ', '_');
const keys = new Set();
for (const [s,p,o,url,year] of records) {
  const key = `${canonical(s)}|${p}|${canonical(o)}`;
  if (!canonical(s) || !canonical(o) || canonical(s).length>100 || canonical(o).length>100 || !allowed.has(p)
    || !/^https:\/\//.test(url) || (year !== null && (!Number.isInteger(year) || year<1800 || year>2100))) {
      console.error('Registro inválido no lote: '+key);process.exit(2);
  }
  if (keys.has(key)) {console.error('Duplicação interna no lote: '+key);process.exit(2);}
  keys.add(key);
}
let db;
try {
  // Dry-run só consulta. Mesmo com v18 pendente, não modifica o banco.
  if (mode === 'apply') {
    // Aplica TODAS as migrations pendentes da versão instalada, incluindo v18,
    // sem recriar arquivo, sem seed e sem alterar dados/ ou pesos de relações.
    const migrated = openDatabase(dbPath, {seed:false});
    migrated.close();
  }
  db = new DatabaseSync(dbPath, { readOnly: mode === 'dry-run' });
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;');
  const migration = db.prepare('SELECT version FROM schema_migrations WHERE version=18').get();
  const provenanceExists = !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='relation_provenance'").get();
  if (mode === 'apply' && (!migration || !provenanceExists)) throw new Error('A migração v18 não pôde ser aplicada; confira a instalação da aplicação.');
  const existing = db.prepare('SELECT id FROM knowledge_relations WHERE subject=? AND predicate=? AND object=? LIMIT 1');
  let inserted=0,skipped=0,provenance=0;
  if (mode==='apply') db.exec('BEGIN IMMEDIATE');
  try {
    const insertProvenance = provenanceExists && mode==='apply' ? db.prepare(`INSERT OR IGNORE INTO relation_provenance
      (relation_id, source_url, reference_year, source_note) VALUES (?, ?, ?, ?)`) : null;
    for (const [s,p,o,url,year,note] of records) {
      const subject=canonical(s),object=canonical(o);
      let row=existing.get(subject,p,object);
      if (!row) {
        inserted++;
        if (mode==='apply') {
          createRelation(db,{subject,predicate:p,object,source_type:'imported'});
          row=existing.get(subject,p,object);
          if (!row) throw new Error('Relação não encontrada após inserção: '+subject);
        }
      } else skipped++;
      if (insertProvenance && row) provenance+=Number(insertProvenance.run(row.id,url,year,note).changes);
    }
    if (mode==='apply') db.exec('COMMIT');
  } catch(e) {
    if (mode==='apply') db.exec('ROLLBACK');
    throw e;
  }
  console.log(`Lote 017 (${mode}): ${records.length} relações; ${inserted} novas; ${skipped} já existentes.`);
  if (!migration && mode==='dry-run') console.log('Migração v18 pendente no banco. O --apply aplicará essa migração automaticamente antes da importação.');
  console.log(mode==='dry-run'?'SIMULAÇÃO: nenhum dado foi alterado.':`Importação concluída: ${provenance} registros de fonte acrescentados. Dados e pesos existentes preservados.`);
} catch(e) {console.error('Erro de importação:',e.message);process.exitCode=1;}
finally {db?.close();}
