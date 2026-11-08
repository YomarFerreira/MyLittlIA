import {readFileSync} from 'node:fs';

// Explicit ordered history: SQL files are immutable upgrade steps, not clutter.
const versions = Array.from({length:28}, (_, index) => index + 2);

export const LATEST_SCHEMA_VERSION=versions.at(-1);

export function applyMigrations(db) {
    const applied = db.prepare('SELECT version FROM schema_migrations WHERE version=?');
    const record = db.prepare('INSERT INTO schema_migrations(version) VALUES (?)');
    for (const version of versions) {
        if (applied.get(version)) continue;
        const sql = readFileSync(new URL(`./migrations/migration-v${version}.sql`, import.meta.url), 'utf8');
        db.exec('BEGIN IMMEDIATE');
        try {
            db.exec(sql);
            record.run(version);
            db.exec('COMMIT');
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    }
}
