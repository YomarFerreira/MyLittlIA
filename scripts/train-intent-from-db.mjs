/** Retreinamento de intenção a partir do SQLite. Sem --apply, nunca modifica o banco. */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../server/persistence/database.js';
import { retrainIntentModel } from '../server/neural/neural-intent.js';
import { trainingSamples } from '../server/language/semantic-catalog.js';

const args = process.argv.slice(2);
const at = args.indexOf('--db');
const dbPath = resolve(at >= 0 && args[at + 1] ? args[at + 1] : 'data/mylittlia.db');
const apply = args.includes('--apply');

if (!existsSync(dbPath)) {
  console.error(`Banco SQLite não encontrado: ${dbPath}`);
  console.error('Confira o caminho com --db. O script não criará um banco novo.');
  process.exit(1);
}

let db;
try {
  // --apply é uma operação de escrita explícita: aplica migrations pendentes
  // usando exatamente a mesma rotina que npm start, ANTES de ler as amostras.
  // O modo de prévia permanece realmente somente leitura.
  db = apply
    ? openDatabase(dbPath, { seed: false })
    : new DatabaseSync(dbPath, { readOnly: true });

  const table = db.prepare(`SELECT name FROM sqlite_master
    WHERE type='table' AND name='intent_training_samples'`).get();
  const migration = db.prepare(`SELECT name FROM sqlite_master
    WHERE type='table' AND name='schema_migrations'`).get();
  const version = migration
    ? (db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()?.version ?? 0)
    : 0;
  if (!table || version < 10) {
    throw new Error(`Banco ainda não atualizado (schema v${version}, necessário v10).\n` +
      'Com o servidor parado e após backup da pasta data, execute: npm run db:migrate\n' +
      'Depois, execute novamente npm run train:intent.');
  }

  const samples = trainingSamples(db);
  if (!samples.length) {
    throw new Error('Nenhum exemplo ativo em intent_training_samples. Nada foi treinado.');
  }
  const counts = Object.fromEntries([...new Set(samples.map(x => x.label))]
    .map(label => [label, samples.filter(x => x.label === label).length]));
  console.log(JSON.stringify({ database: dbPath, schemaVersion: version,
    mode: apply ? 'apply' : 'dry-run', samples: samples.length, counts }, null, 2));

  if (apply) {
    console.log('Treinando o classificador de intenção com exemplos ativos no SQLite...');
    console.log(JSON.stringify(retrainIntentModel(db), null, 2));
  } else {
    console.log('Prévia concluída. Nenhuma alteração gravada.');
  }
} catch (error) {
  console.error(`Erro no treinamento de intenções: ${error.message}`);
  process.exitCode = 1;
} finally {
  db?.close();
}
