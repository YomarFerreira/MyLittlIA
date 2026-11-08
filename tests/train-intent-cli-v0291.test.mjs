import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION,createDatabaseAtVersion,trackDatabase} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { createKnowledge } from '../server/persistence/database.js';

const root = resolve(import.meta.dirname, '..');
const dir = mkdtempSync(join(tmpdir(), 'mylittlia-cli-v0291-'));
let dbPath = join(dir, 'old.db');
const cmd = (script, ...args) => spawnSync(process.execPath, [script, '--db', dbPath, ...args], {
  cwd: root, encoding: 'utf8', timeout: 60000,
});
try {
  let db = createDatabaseAtVersion(dbPath,9);
  createKnowledge(db, { question: 'Qual a capital do Acre?', answer: 'Rio Branco.', intent: 'capital' });
  // Fixture real da v9: não remove apenas o histórico de um schema moderno.
  db.close();

  const before = cmd('scripts/train-intent-from-db.mjs');
  assert.notEqual(before.status, 0);
  assert.match(before.stderr, /npm run db:migrate/);
  db = trackDatabase(new DatabaseSync(dbPath, { readOnly: true }));
  assert.equal(db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get().v, 9,
    'prévia não deve alterar o banco');
  db.close();

  const migrate = cmd('scripts/migrate-db.mjs');
  assert.equal(migrate.status, 0, migrate.stderr);
  assert.match(migrate.stdout, new RegExp('Migrations aplicadas até v'+LATEST_SCHEMA_VERSION));
  const preview = cmd('scripts/train-intent-from-db.mjs');
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /"mode": "dry-run"/);
  const apply = cmd('scripts/train-intent-from-db.mjs', '--apply');
  assert.equal(apply.status, 0, apply.stderr);
  assert.match(apply.stdout, /"model": "scratch-v2-db"/);
  const migrateAgain = cmd('scripts/migrate-db.mjs');
  assert.equal(migrateAgain.status, 0, migrateAgain.stderr);

  db = trackDatabase(new DatabaseSync(dbPath, { readOnly: true }));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM knowledge WHERE question=?').get('Qual a capital do Acre?').n, 1);
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM intent_training_samples').get().n >= 50);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM neural_intent_models WHERE id=1').get().n, 1);
  db.close();

  // --apply funciona mesmo que o usuário não tenha executado migrations antes.
  dbPath=join(dir,'apply-direct.db');
  db=createDatabaseAtVersion(dbPath,9);
  db.close();
  const applyDirect = cmd('scripts/train-intent-from-db.mjs', '--apply');
  assert.equal(applyDirect.status, 0, applyDirect.stderr);
  assert.match(applyDirect.stdout, new RegExp('\"schemaVersion\": '+LATEST_SCHEMA_VERSION));
  console.log('PASS: prévia segura, migrations explícitas, --apply auto-migra e preserva conhecimentos');
} finally {closeDatabases();
  rmSync(dir, { recursive: true, force: true });
}
