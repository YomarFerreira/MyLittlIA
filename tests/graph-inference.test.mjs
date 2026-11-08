import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation,inferRelation} from '../server/knowledge/relations.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-graph-'));
try {
 const db=openDatabase(join(dir,'test.db'),{seed:false});
 assert.equal(inferRelation(db,'O que é um flamingo?'),null);
 createRelation(db,{subject:'flamingo',predicate:'e_um',object:'ave',confidence:0.9});
 createRelation(db,{subject:'ave',predicate:'possui',object:'penas',confidence:0.8});
 const definition=inferRelation(db,'O que é um flamingo?');
 assert.equal(definition.kind,'graph-definition');
 assert.match(definition.answer,/ave/);
 const inferred=inferRelation(db,'O flamingo possui penas?');
 assert.equal(inferred.kind,'graph-inference');
 assert.equal(inferred.path.length,2);
 assert.ok(Math.abs(inferred.score-0.72)<1e-9);
 assert.equal(inferRelation(db,'O flamingo possui escamas?'),null);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM knowledge_relations').get().n,2);
 db.close();
 console.log('OK: inferencia por relacoes, pesos, sem inventar ou gravar conclusoes');
} finally {rmSync(dir,{recursive:true,force:true})}
