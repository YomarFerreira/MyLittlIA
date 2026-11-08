/** Aplica migrations existentes sem recriar dados. Não treina nenhum modelo. */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { openDatabase } from '../server/persistence/database.js';

const args = process.argv.slice(2);
const at = args.indexOf('--db');
const dbPath = resolve(at >= 0 && args[at + 1] ? args[at + 1] : 'data/mylittlia.db');
if (!existsSync(dbPath)) {
  console.error(`Banco SQLite não encontrado: ${dbPath}`);
  console.error('Nenhum banco foi criado. Confira o diretório ou use --db.');
  process.exit(1);
}
let db;
try {
  db = openDatabase(dbPath, { seed: false });
  const version = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version;
  const samples = db.prepare('SELECT COUNT(*) AS total FROM intent_training_samples WHERE active=1').get().total;
  console.log(`Banco: ${dbPath}`);
  console.log(`Migrations aplicadas até v${version}.`);
  console.log(`${samples} exemplos ativos para treinamento de intenções.`);
  console.log('Conhecimentos e pesos manuais preservados. Não houve retreinamento.');
} catch (error) {
  console.error(`Erro ao migrar o banco: ${error.message}`);
  process.exitCode = 1;
} finally {
  db?.close();
}
