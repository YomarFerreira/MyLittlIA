import { registerNeuralExamples } from '../neural/neural-examples.js';
// Persistência neural centralizada: SQLite é a única fonte ativa de checkpoints.
// Arquivos JSON legados são importados uma vez, sem remoção ou sobrescrita.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
let database = null;
export function configureNeuralDatabase(db) { database = db; }
function requireDb() { if (!database) throw new Error('Banco neural não inicializado.'); return database; }
export function readNeuralModel(kind) {
  const row = requireDb().prepare('SELECT model_json FROM neural_models WHERE kind=?').get(kind);
  return row ? JSON.parse(row.model_json) : null;
}
export async function importLegacyNeuralModel(root,kind,filename,validate) {
  if (readNeuralModel(kind)) return false;
  try {
    const legacy = JSON.parse(await readFile(join(root,'models','generated',filename),'utf8'));
    if (!validate(legacy)) { console.warn('Checkpoint legado incompatível:',kind); return false; }
    const db = requireDb();
    const statement = db.prepare(`INSERT OR IGNORE INTO neural_models(kind,model_json,trained_steps,trained_examples,updated_at)
      VALUES(?,?,?,?,CURRENT_TIMESTAMP)`);
    statement.run(kind,JSON.stringify(legacy),legacy.trainedSteps||0,legacy.trainedExamples||0);
    return true;
  } catch (error) {
    if (error.code!=='ENOENT') console.warn('Checkpoint legado não importado:',kind,error.message);
    return false;
  }
}
export function saveNeuralTraining(kind,model,details) {
  const db=requireDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`INSERT INTO neural_models(kind,model_json,trained_steps,trained_examples,updated_at)
      VALUES(?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(kind) DO UPDATE SET model_json=excluded.model_json,
      trained_steps=excluded.trained_steps, trained_examples=excluded.trained_examples,
      updated_at=CURRENT_TIMESTAMP`).run(kind,JSON.stringify(model),model.trainedSteps||0,model.trainedExamples||0);
    const result=db.prepare(`INSERT INTO neural_training_runs(model_kind,epochs,example_count,token_count,loss_initial,loss_final,training_text)
      VALUES(?,?,?,?,?,?,?)`).run(kind,details.epochs,details.exampleCount,details.tokenCount,details.history[0].loss,details.history.at(-1).loss,details.trainingText);
    const metric=db.prepare('INSERT INTO neural_training_metrics(run_id,epoch,loss) VALUES(?,?,?)');
    for (const row of details.history) metric.run(result.lastInsertRowid,row.epoch,row.loss);
    registerNeuralExamples(db, Number(result.lastInsertRowid), details.trainingText);
    db.exec('COMMIT');
    return Number(result.lastInsertRowid);
  } catch(error) {db.exec('ROLLBACK');throw error;}
}
