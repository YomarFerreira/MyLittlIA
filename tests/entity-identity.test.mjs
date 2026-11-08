import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {applyMigrations} from '../server/persistence/migrate.js';
import {canonicalEntity,resolveEntityText,registerAlias} from '../server/knowledge/entity-identity.js';
import {createRelation} from '../server/knowledge/relations.js';
const db=new DatabaseSync(':memory:');
try {
 db.exec(readFileSync(new URL('../server/persistence/migrations/schema.sql',import.meta.url),'utf8'));
 db.exec('INSERT INTO schema_migrations(version) VALUES (1)');
 for(let v=2;v<=27;v++) {
  db.exec(readFileSync(new URL(`../server/persistence/migrations/migration-v${v}.sql`,import.meta.url),'utf8'));
  db.prepare('INSERT INTO schema_migrations(version) VALUES (?)').run(v);
 }
 const add=db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,confidence,source_type,evidence_count) VALUES (?,?,?,?,?,?,?)');
 add.run('uf','pernambuco','e_um','estado_brasileiro',null,'imported',1);
 add.run('old','estado_de_pernambuco','caracteristica','registro_antigo',.42,'user-approved',3);
 add.run('flag','bandeira_de_pernambuco','possui','azul',null,'imported',1);
 const before=db.prepare('SELECT id,confidence,source_type,evidence_count FROM knowledge_relations ORDER BY id').all();
 applyMigrations(db);
 assert.deepEqual(db.prepare("SELECT id,confidence,source_type,evidence_count FROM knowledge_relations WHERE id IN ('uf','old','flag') ORDER BY id").all(),before);
 assert.equal(db.prepare("SELECT subject FROM knowledge_relations WHERE id='old'").get().subject,'pernambuco');
 assert.equal(db.prepare("SELECT original_subject FROM entity_resolution_audit WHERE relation_id='old'").get().original_subject,'estado_de_pernambuco');
 assert.equal(canonicalEntity(db,'PE'),'pernambuco');
 assert.equal(resolveEntityText(db,'Como saber se cachorro tem pé?'),'Como saber se cachorro tem pé?');
 assert.equal(db.prepare("SELECT object FROM knowledge_relations WHERE subject='pernambuco' AND predicate='tem_bandeira'").get().object,'bandeira_de_pernambuco');
 assert.equal(canonicalEntity(db,'estado de Pernambuco'),'pernambuco');
 assert.equal(resolveEntityText(db,'Qual a capital do estado de Pernambuco?'),'Qual a capital do pernambuco?');
 assert.equal(db.prepare("SELECT subject FROM knowledge_relations WHERE id='flag'").get().subject,'bandeira_de_pernambuco');
 add.run('direct','estado_de_pernambuco','localizado_em','pe',null,'imported',1);
 assert.deepEqual({...db.prepare("SELECT subject,object FROM knowledge_relations WHERE id='direct'").get()},{subject:'pernambuco',object:'pernambuco'});
 createRelation(db,{subject:'cachorro',predicate:'possui',object:'pé'});
 assert.equal(db.prepare("SELECT object FROM knowledge_relations WHERE subject='cachorro'").get().object,'pe');
 assert.throws(()=>registerAlias(db,'PE','outra_entidade'),/ambíguo/);
 const audit=db.prepare('SELECT COUNT(*) n FROM entity_resolution_audit').get().n;
 applyMigrations(db);assert.equal(db.prepare('SELECT COUNT(*) n FROM entity_resolution_audit').get().n,audit);
 console.log('OK: upgrade real, aliases, evidências e pesos preservados, SQL direto, ambiguidade, bandeira distinta e idempotência.');
} finally {db.close();}
