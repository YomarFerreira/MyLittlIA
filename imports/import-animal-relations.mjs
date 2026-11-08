import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { openDatabase } from '../server/persistence/database.js';
import { createRelation } from '../server/knowledge/relations.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = resolve(root, 'data/mylittlia.db');
const filePath = resolve(root, 'imports/animal-relations.tsv');
const rows = readFileSync(filePath, 'utf8').trim().split(/\r?\n/).map(line => line.split('\t'));
if (rows.some(fields => fields.length !== 3)) throw new Error('Arquivo de relações inválido');
const db = openDatabase(dbPath, { seed: false });
try {
  db.exec('BEGIN');
  let inserted = 0, skipped = 0;
  for (const [subject, predicate, object] of rows) {
    const result = createRelation(db, { subject, predicate, object, confidence: null, source_type: 'imported' });
    if (result.inserted) inserted++; else skipped++;
  }
  db.exec('COMMIT');
  console.log(`Importação concluída: ${inserted} relações novas, ${skipped} já existentes. Pesos anteriores preservados.`);
} catch (error) { db.exec('ROLLBACK'); throw error; }
finally { db.close(); }
