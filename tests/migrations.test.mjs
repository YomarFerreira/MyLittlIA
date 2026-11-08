import {LATEST_SCHEMA_VERSION} from '../server/persistence/migrate.js';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/persistence/database.js';
import {applyMigrations} from '../server/persistence/migrate.js';
const db=openDatabase(':memory:',{seed:false});
try {
 db.exec("INSERT INTO entity_labels(entity,display_name,source_import) VALUES ('teste_preservado','Nome personalizado','test')");
 db.exec('DROP TABLE ranking_metric_classes; DELETE FROM schema_migrations WHERE version=26;');
 db.exec("CREATE TRIGGER reject_migration BEFORE INSERT ON schema_migrations WHEN NEW.version=26 BEGIN SELECT RAISE(ABORT,'falha simulada no registro'); END;");
 assert.throws(()=>applyMigrations(db),/falha simulada/);
 assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='ranking_metric_classes'").get(),undefined);
 assert.equal(db.prepare('SELECT version FROM schema_migrations WHERE version=26').get(),undefined);
 db.exec('DROP TRIGGER reject_migration');
 applyMigrations(db);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM schema_migrations').get().n,LATEST_SCHEMA_VERSION);
 const state=db.prepare('SELECT * FROM ranking_metric_classes').all();
 applyMigrations(db);
 assert.deepEqual(db.prepare('SELECT * FROM ranking_metric_classes').all(),state);
 assert.equal(db.prepare("SELECT display_name FROM entity_labels WHERE entity='teste_preservado'").get().display_name,'Nome personalizado');
 console.log('OK: atualização incremental, rollback integral, repetição e preservação dos dados.');
} finally {db.close();}

