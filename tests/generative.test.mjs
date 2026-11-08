import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';

import {configureNeuralDatabase} from '../server/persistence/neural-storage.js';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generativeStatus, trainGenerative, generateGenerative, loadGenerative } from '../server/neural/generative.js';
const root = await mkdtemp(join(tmpdir(), 'mylittlia-gen-'));
try {
  const db=openDatabase(join(root,'models.db'),{seed:false});
  configureNeuralDatabase(db);
  assert.equal(generativeStatus().trained, false);
  await assert.rejects(async () => generateGenerative({ prompt:'pergunta:' }), /Treine/);
  const result = await trainGenerative(root, {text:'pergunta: o gato bebe? resposta: agua.\npergunta: o cachorro bebe? resposta: agua.\n', epochs:4});
  assert.equal(result.history.length, 4);
  assert.ok(result.history[3].loss < result.history[0].loss, 'Loss precisa diminuir');
  const gen = generateGenerative({ prompt:'pergunta: o gato bebe? resposta:', length:20, temperature:0.5 });
  assert.equal(gen.generatedTokens,20);
  assert.equal(gen.trace.length,20);
  assert.ok(gen.trace[0].top.every(item => typeof item.probability === 'number'));
  const saved=db.prepare("SELECT model_json FROM neural_models WHERE kind='character'").get();
  assert.ok(JSON.parse(saved.model_json).trainedSteps>0);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM neural_training_runs WHERE model_kind='character'").get().count,1);
  await loadGenerative(root);
  assert.equal(generativeStatus().trained,true);
  console.log('OK: treinamento neural, loss, geração, probabilidades e checkpoint');
} finally {closeDatabases(); await rm(root,{recursive:true,force:true}); }
