import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {normalizeSemanticText,understandAndPlan} from '../server/reasoning/semantic-core.js';
import {readableName} from '../server/language/proper-names.js';
import {trainingSamples} from '../server/language/semantic-catalog.js';
import {retrainIntentModel,classifyIntent} from '../server/neural/neural-intent.js';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v029-'));const path=join(dir,'test.db');
try{
 let db=openDatabase(path,{seed:false});
 assert.equal(db.prepare('SELECT MAX(version) v FROM schema_migrations').get().v,LATEST_SCHEMA_VERSION);
 assert.equal(normalizeSemanticText('Qual a capita?',db).normalized,'qual a capital');
 assert.equal(readableName('macapa',db),'Macapá');
 const n=trainingSamples(db).length;assert.ok(n>=50);
 db.prepare("INSERT INTO semantic_terms(kind,phrase,canonical) VALUES('lexical','metropoli','cidade')").run();
 assert.match(normalizeSemanticText('qual a metropoli?',db).normalized,/cidade/);
 db.prepare('UPDATE semantic_entities SET display_name=? WHERE entity_id=?').run('Macapá TESTE','macapa');
 assert.equal(readableName('macapa',db),'Macapá TESTE');
 db.prepare("UPDATE semantic_social_responses SET response='Saudação personalizada!' WHERE intent='greeting'").run();
 const hello=understandAndPlan(db,'Oi!');
 assert.match(hello.answer,/Saudação personalizada/);
 db.prepare("INSERT INTO intent_training_samples(label,text,normalized_text,origin) VALUES('greeting','ola meu raio de sol','ola meu raio de sol','user')").run();
 assert.equal(trainingSamples(db).length,n+1);
 const model=retrainIntentModel(db,{epochs:12});assert.equal(model.trainedExamples,n+1);
 assert.ok(classifyIntent(db,'oi').trainedFromScratch);
 db.close();db=openDatabase(path,{seed:false});
 assert.equal(readableName('macapa',db),'Macapá TESTE');
 assert.match(normalizeSemanticText('metropoli',db).normalized,/cidade/);
 assert.equal(trainingSamples(db).length,n+1);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM schema_migrations WHERE version=10').get().n,1);
 db.close();
 console.log('PASS: catálogo linguístico SQLite, edição sem JS, exemplos do zero e migração segura');
}finally{closeDatabases();rmSync(dir,{recursive:true,force:true});}
