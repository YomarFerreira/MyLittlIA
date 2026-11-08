import {fileURLToPath} from 'node:url';
import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

const folder=mkdtempSync(join(tmpdir(),'mylittlia-topics-'));
const file=join(folder,'local.db');
try {
  const db=openDatabase(file,{seed:false});
  db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,confidence,source_type) VALUES (?,?,?,?,?,?)')
    .run('preexisting', 'gato','bebe','agua',0.33,'user-approved');
  db.close();
  const run=cmd=>spawnSync(process.execPath,['imports/import-conhecimentos-v0282.mjs',cmd,'--db',file],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'});
  let r=run('--dry-run'); assert.equal(r.status,0,r.stderr);
  let read=openDatabase(file,{seed:false});
  assert.equal(read.prepare('SELECT COUNT(*) n FROM knowledge_relations').get().n,1);
  read.close();
  r=run('--apply'); assert.equal(r.status,0,r.stderr);
  read=openDatabase(file,{seed:false});
  assert.ok(read.prepare('SELECT COUNT(*) n FROM knowledge_relations').get().n>200);
  assert.equal(read.prepare("SELECT confidence FROM knowledge_relations WHERE id='preexisting'").get().confidence,0.33);
  assert.equal(read.prepare("SELECT object FROM knowledge_relations WHERE subject='amapa' AND predicate='tem_capital'").get().object,'macapa');
  assert.ok(read.prepare('SELECT COUNT(*) n FROM imported_knowledge_provenance').get().n>190);
  read.close();
  r=run('--apply');assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/0 relações novas/);
  console.log('PASS: importação simulada, idempotente e pesos preservados');
}finally{closeDatabases();rmSync(folder,{recursive:true,force:true});}
