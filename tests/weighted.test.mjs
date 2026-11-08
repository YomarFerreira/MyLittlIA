import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createKnowledge, importKnowledgeUpdates, listKnowledge } from '../server/persistence/database.js';
import { createRelation, inferRelation, updateRelationWeight } from '../server/knowledge/relations.js';

const dir = mkdtempSync(join(tmpdir(), 'mylittlia-v09-'));
try {
    const path = join(dir, 'mylittlia.db');
    const db = openDatabase(path, {seed:false});
    assert.equal(db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version,LATEST_SCHEMA_VERSION);
    const first = createKnowledge(db,{question:'Qual a capital de Alagoas?',answer:'Maceió',intent:'capital'});
    const second = createKnowledge(db,{question:'Qual é a capital de Sergipe?',answer:'Aracaju',intent:'capital'});
    const stats = importKnowledgeUpdates(db,[
        {question:'Qual a capital de Alagoas?',answer:'A capital é Maceió.',intent:'capital'},
        {question:'Quantas patas tem a vaca?',answer:'Quatro.',intent:'outro'}
    ]);
    assert.deepEqual(stats,{added:1,updated:1,unchanged:0});
    assert.equal(listKnowledge(db).length,3);
    assert.equal(db.prepare('SELECT id FROM knowledge WHERE normalized_question=?').get('qual a capital de alagoas').id,first.id);
    assert.equal(db.prepare('SELECT answer FROM knowledge WHERE id=?').get(second.id).answer,'Aracaju');
    assert.throws(()=>importKnowledgeUpdates(db,[{question:'Nova pergunta válida?',answer:'Sim',intent:'outro'},{question:'err',answer:'não',intent:'outro'}]));
    assert.equal(listKnowledge(db).length,3,'rollback integral da importação');
    createRelation(db,{subject:'gato',predicate:'e_um',object:'felino'});
    createRelation(db,{subject:'felino',predicate:'e_um',object:'animal',confidence:0.9});
    createRelation(db,{subject:'gato',predicate:'e_um',object:'mamifero',confidence:0.8});
    createRelation(db,{subject:'mamifero',predicate:'e_um',object:'animal',confidence:0.7});
    const missing=inferRelation(db,'O gato é um animal?');
    assert.ok(Math.abs(missing.score-0.56)<1e-10,'escolhe caminho avaliado enquanto o outro não foi avaliado');
    assert.equal(missing.alternativePaths.length,1);
    const edge=db.prepare("SELECT id FROM knowledge_relations WHERE subject='gato' AND object='felino'").get();
    updateRelationWeight(db,edge.id,{confidence:0.95});
    const scored=inferRelation(db,'O gato é um animal?');
    assert.ok(Math.abs(scored.score-0.855)<1e-10);
    assert.equal(scored.alternativePaths.length,1);
    assert.equal(scored.scoreInfo.calibrated,false);
    db.close();
    assert.ok(existsSync(path));
    const reopen=openDatabase(path,{seed:false});
    assert.equal(reopen.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version,LATEST_SCHEMA_VERSION);
    assert.equal(reopen.prepare('SELECT confidence FROM knowledge_relations WHERE id=?').get(edge.id).confidence,0.95);
    assert.equal(reopen.prepare('SELECT COUNT(*) AS count FROM knowledge').get().count,3);
    reopen.close();
    console.log('OK: pesos, comparação de caminhos, JSON transacional e banco preservado');
} finally {closeDatabases();
    rmSync(dir,{recursive:true,force:true});
}
