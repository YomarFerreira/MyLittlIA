// Diagnóstico somente leitura: não inicializa, migra ou importa dados.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const dbOption = args.indexOf('--db');
if (dbOption >= 0 && (!args[dbOption + 1] || args[dbOption + 1].startsWith('--'))) {
    console.error('Informe o caminho após --db.');
    process.exit(1);
}
const root = fileURLToPath(new URL('../', import.meta.url));
const path = dbOption >= 0
    ? resolve(args[dbOption + 1])
    : resolve(root, 'data', 'mylittlia.db');
const report = {
    project: root,
    version: JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version,
    database: path,
    exists: existsSync(path),
};
let db;
try {
    if (!report.exists) throw new Error('Banco não encontrado. Nenhum banco foi criado.');
    report.bytes = statSync(path).size;
    report.walBytes = existsSync(`${path}-wal`) ? statSync(`${path}-wal`).size : 0;
    db = new DatabaseSync(path, { readOnly: true });
    db.exec('BEGIN');
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x => x.name));
    report.integrity = db.prepare('PRAGMA quick_check').all();
    report.schema = tables.has('schema_migrations')
        ? db.prepare('SELECT max(version) AS version FROM schema_migrations').get().version : null;
    report.counts = {};
    for (const table of ['knowledge', 'knowledge_relations', 'entity_facts', 'training_examples', 'conversation_messages']) {
        report.counts[table] = tables.has(table)
            ? db.prepare(`SELECT count(*) AS total FROM ${table}`).get().total : null;
    }
    report.reviews = {};
    for (const table of ['conversational_teachings', 'knowledge_proposals']) {
        report.reviews[table] = tables.has(table)
            ? db.prepare(`SELECT status, count(*) AS total FROM ${table} GROUP BY status`).all() : [];
    }
    db.exec('COMMIT');
} catch (error) {
    report.error = error.message;
    process.exitCode = 1;
} finally {
    db?.close();
}
console.log(JSON.stringify(report, null, 2));
