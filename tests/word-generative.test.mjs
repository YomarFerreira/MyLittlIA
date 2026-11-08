import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';

import {configureNeuralDatabase} from '../server/persistence/neural-storage.js';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {tokenizeWords,trainWords,generateWords,wordStatus,loadWordModel} from '../server/neural/word-generative.js';
assert.deepEqual(tokenizeWords('Qual é a capital de Pernambuco?'),['qual','é','a','capital','de','pernambuco','?']);
const root=await mkdtemp(join(tmpdir(),'mylittlia-word-'));
try {
  const db=openDatabase(join(root,'models.db'),{seed:false});
  configureNeuralDatabase(db);
 const corpus='pergunta: qual é a capital de pernambuco? resposta: recife.\npergunta: qual é a capital de alagoas? resposta: maceió.\npergunta: qual é a capital de sergipe? resposta: aracaju.\n';
 const run=await trainWords(root,{text:corpus,epochs:15});
 assert.equal(run.history.length,15);
 assert.ok(run.history.at(-1).loss<run.history[0].loss,'Loss deve diminuir');
 assert.equal(wordStatus().contextLength,8);
 const out=generateWords({prompt:'pergunta: capital de pernambuco? resposta:',length:12,temperature:0.7});
 assert.ok(out.generatedTokens>=0 && out.generatedTokens<=12);
 assert.ok(out.trace.length>=1 && out.trace.length<=12);
 assert.equal(typeof out.ended,'boolean');
 assert.ok(out.trace[0].top[0].token);
 assert.ok(JSON.parse(db.prepare("SELECT model_json FROM neural_models WHERE kind='word'").get().model_json).trainedSteps>0);
 assert.equal(db.prepare("SELECT COUNT(*) AS count FROM neural_training_runs WHERE model_kind='word'").get().count,1);
 await loadWordModel(root);
 assert.equal(wordStatus().trained,true);
 console.log('OK: tokens por palavra, treino SGD, loss, geração e checkpoint');
} finally {closeDatabases(); await rm(root,{recursive:true,force:true}); }
