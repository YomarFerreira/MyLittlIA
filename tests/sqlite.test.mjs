import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listKnowledge, listExamples, createKnowledge, editKnowledge,
    removeKnowledge, mergeKnowledge, addTrainingExample, saveTraining, saveInference } from '../server/persistence/database.js';
const dir = mkdtempSync(join(tmpdir(), 'mylittlia-sqlite-'));
try {
    const db = openDatabase(join(dir,'test.db'));
    assert.equal(listExamples(db).length,29);
    assert.ok(listKnowledge(db).some(k => k.question.includes('Sergipe')));
    const added = createKnowledge(db,{question:'Qual é a capital do Tocantins?',answer:'Palmas.',intent:'capital'});
    assert.equal(added.answer,'Palmas.');
    assert.equal(editKnowledge(db, added.id, {...added,answer:'A capital é Palmas.'}).answer,'A capital é Palmas.');
    const merged = mergeKnowledge(db,[{question:'Qual é a capital do Tocantins?',answer:'Palmas.',intent:'capital'},
        {question:'Quanto é três mais cinco?',answer:'Oito.',intent:'outro'}]);
    assert.deepEqual(merged,{added:1,skipped:1});
    assert.equal(removeKnowledge(db,added.id),true);
    assert.equal(addTrainingExample(db,{text:'Onde fica a capital do Tocantins?',label:'capital'}).label,'capital');
    const id = saveTraining(db,{epochs:3,rate:0.3,examples:30,history:[{epoch:1,loss:1.2,valLoss:1.4,accuracy:50,valAccuracy:40}]});
    assert.equal(db.prepare('SELECT count(*) as c FROM training_metrics WHERE run_id=?').get(id).c,1);
    const trace={prompt:'teste',metrics:{inputTokens:1,outputTokens:1},steps:[{step:1,name:'Entrada',mode:'real',output:{}},{step:2,name:'Saída',mode:'rule-based',output:{answer:'ok',knowledgeSource:'unknown'}}]};
    const infId=saveInference(db,trace);
    assert.equal(db.prepare('SELECT count(*) as c FROM inference_steps WHERE inference_id=?').get(infId).c,2);
    db.close();
    const reopened = openDatabase(join(dir,'test.db'));
    assert.ok(listKnowledge(reopened).some(x=>x.question==='Quanto é três mais cinco?'));
    assert.equal(reopened.prepare('SELECT count(*) as c FROM schema_migrations').get().c,LATEST_SCHEMA_VERSION);
    reopened.close();
    console.log('OK: SQLite, seed, CRUD, merge, treino, trace, reabertura');
} finally {closeDatabases(); rmSync(dir,{recursive:true,force:true}); }
