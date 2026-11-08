import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';import {assessRelations,listAssessments} from '../server/knowledge/assessments.js';
const dir=mkdtempSync(join(tmpdir(),'assessment-'));const db=openDatabase(join(dir,'test.db'),{seed:false});
try{
 const insert=db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object,confidence,source_type,evidence_count) VALUES(?,?,?,?,?,?,?)');
 insert.run('a','pernambuco','tem_capital','recife',.75,'manual',1);
 insert.run('b','pernambuco','tem_capital','olinda',null,'manual',1);
 insert.run('c','brasil','tem_capital','brasilia',null,'ibge',2);
 const preview=assessRelations(db,{dryRun:true});assert.equal(preview.conflict,2);
 assert.equal(listAssessments(db).total,0);
 const out=assessRelations(db);assert.equal(out.total,3);assert.equal(out.evidence,1);
 assert.equal(db.prepare("SELECT confidence FROM knowledge_relations WHERE id='a'").get().confidence,.75);
 assert.equal(listAssessments(db,{status:'conflict'}).total,2);
 assert.equal(assessRelations(db).total,3);assert.equal(listAssessments(db).total,3);
 console.log('Avaliação em lote idempotente e pesos manuais preservados.');
}finally{db.close();rmSync(dir,{recursive:true,force:true});}
