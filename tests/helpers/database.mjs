import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {openDatabase as openApplicationDatabase} from '../../server/persistence/database.js';
export {LATEST_SCHEMA_VERSION} from '../../server/persistence/migrate.js';
const connections=new Set();
export function trackDatabase(db) {
 const close=db.close.bind(db);
 db.close=()=>{if(connections.delete(db))close();};
 connections.add(db);return db;
}
export function openDatabase(...args){return trackDatabase(openApplicationDatabase(...args));}
export function closeDatabases(){for(const db of [...connections])db.close();}
export function createDatabaseAtVersion(path,version) {
 const db=trackDatabase(new DatabaseSync(path));
 db.exec('PRAGMA foreign_keys=ON');
 db.exec(readFileSync(new URL('../../server/persistence/migrations/schema.sql',import.meta.url),'utf8'));
 db.prepare('INSERT INTO schema_migrations(version) VALUES (1)').run();
 for(let n=2;n<=version;n++) {
  db.exec(readFileSync(new URL(`../../server/persistence/migrations/migration-v${n}.sql`,import.meta.url),'utf8'));
  db.prepare('INSERT INTO schema_migrations(version) VALUES (?)').run(n);
 }
 return db;
}
