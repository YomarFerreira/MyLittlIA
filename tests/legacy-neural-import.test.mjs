import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {configureNeuralDatabase,readNeuralModel} from '../server/persistence/neural-storage.js';
import {trainWords,loadWordModel,wordStatus} from '../server/neural/word-generative.js';
const root=await mkdtemp(join(tmpdir(),'mylittlia-legacy-neural-'));
try {
  const db=openDatabase(join(root,'data','mylittlia.db'),{seed:false});
  configureNeuralDatabase(db);
  await trainWords(root,{text:'pergunta: qual é a capital de alagoas? resposta: maceió.\npergunta: qual é a capital de pernambuco? resposta: recife.',epochs:2});
  const trained=readNeuralModel('word');
  assert.ok(trained.trainedSteps>0);
  await mkdir(join(root,'models','generated'),{recursive:true});
  const file=join(root,'models','generated','word-model.json');
  await writeFile(file,JSON.stringify(trained));
  db.prepare("DELETE FROM neural_models WHERE kind='word'").run();
  await loadWordModel(root);
  assert.equal(readNeuralModel('word').trainedSteps,trained.trainedSteps);
  const original=await readFile(file,'utf8');
  await loadWordModel(root);
  assert.equal(await readFile(file,'utf8'),original);
  assert.equal(wordStatus().trained,true);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM neural_training_runs').get().count,1);
  db.close();
  console.log('OK: migração legada uma vez, preserva JSON e histórico SQLite');
} finally { await rm(root,{recursive:true,force:true}); }
