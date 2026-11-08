import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listKnowledge } from '../server/persistence/database.js';
import { configureNeuralDatabase, saveNeuralTraining } from '../server/persistence/neural-storage.js';
import { parseNeuralExamples, listNeuralExamples, incorporateNeuralExamples } from '../server/neural/neural-examples.js';

const dir = mkdtempSync(join(tmpdir(), 'mylittlia-v014-'));
const file = join(dir, 'mylittlia.db');
try {
    const db = openDatabase(file, { seed: false });
    configureNeuralDatabase(db);
    const corpus = [
        'pergunta: Qual é a capital do Acre? resposta: Rio Branco.',
        'pergunta: Qual é a capital de Alagoas? resposta: Maceió.',
        'pergunta: Qual é a capital do Acre? resposta: Rio Branco.'
    ].join('\n');
    assert.equal(parseNeuralExamples(corpus).length, 3);
    const model = { trainedSteps: 3, trainedExamples: 3, vocab: ['palavra'] };
    const details = { epochs: 1, exampleCount: 3, tokenCount: 20,
        trainingText: corpus, history: [{ epoch: 1, loss: 2 }] };
    saveNeuralTraining('word', model, details);
    saveNeuralTraining('word', model, details);
    assert.equal(listNeuralExamples(db).length, 2);
    assert.equal(db.prepare('SELECT count(*) AS n FROM neural_training_run_examples').get().n, 4);
    const ids = listNeuralExamples(db).map(e => e.id);
    const result = incorporateNeuralExamples(db, ids);
    assert.equal(result.added, 2);
    assert.equal(listKnowledge(db).length, 2);
    assert.equal(listNeuralExamples(db).length, 0);
    const second = incorporateNeuralExamples(db, ids);
    assert.equal(second.existing, 2);
    db.close();
    const reopened = openDatabase(file, { seed: false });
    assert.equal(listNeuralExamples(reopened).length, 0);
    assert.equal(reopened.prepare('SELECT count(*) AS n FROM neural_training_run_examples').get().n, 4);
    const migrated = reopened.prepare('SELECT count(*) AS n FROM schema_migrations').get().n;
    assert.equal(migrated, LATEST_SCHEMA_VERSION);
    reopened.close();
    console.log('OK: exemplos individualizados, vinculo, incorporacao e reabertura');
} finally {closeDatabases(); rmSync(dir, { recursive: true, force: true }); }
