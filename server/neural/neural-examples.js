import { randomUUID } from 'node:crypto';
import { normalize } from '../persistence/database.js';

// Apenas linhas completas no formato pergunta/resposta entram no acervo.
// O texto generativo livre permanece registrado no historico, sem ser interpretado como fatos.
export function parseNeuralExamples(text) {
    const rows = [];
    for (const line of String(text).split(/\r?\n/)) {
        if (!line.trim()) continue;
        const match = line.match(/^\s*pergunta\s*:\s*(.+?)\s+resposta\s*:\s*(.+?)\s*$/iu);
        if (!match) continue;
        const question = match[1].trim(), answer = match[2].trim();
        if (question.length < 5 || question.length > 500 || !answer || answer.length > 1200) continue;
        rows.push({ question, answer, normalized_question: normalize(question), normalized_answer: normalize(answer) });
    }
    return rows;
}

export function registerNeuralExamples(db, runId, trainingText) {
    const examples = parseNeuralExamples(trainingText);
    const insert = db.prepare(`INSERT OR IGNORE INTO neural_training_examples
      (question,answer,normalized_question,normalized_answer) VALUES(?,?,?,?)`);
    const find = db.prepare(`SELECT id FROM neural_training_examples
      WHERE normalized_question=? AND normalized_answer=?`);
    const attach = db.prepare(`INSERT OR IGNORE INTO neural_training_run_examples(run_id,example_id) VALUES(?,?)`);
    for (const item of examples) {
        insert.run(item.question,item.answer,item.normalized_question,item.normalized_answer);
        const row = find.get(item.normalized_question,item.normalized_answer);
        attach.run(runId,row.id);
    }
    return examples.length;
}

export function listNeuralExamples(db) {
    return db.prepare(`SELECT e.id,e.question,e.answer,e.origin,e.created_at
      FROM neural_training_examples e
      WHERE NOT EXISTS (
        SELECT 1 FROM knowledge k
        WHERE k.normalized_question=e.normalized_question
          AND lower(trim(k.answer))=lower(trim(e.answer))
      )
      ORDER BY e.id`).all();
}

// Entrada explicita para conhecimento factual, preservando conhecimento existente.
// Insercao e seletiva e nunca modifica registros existentes.
export function incorporateNeuralExamples(db, ids) {
    if (!Array.isArray(ids) || ids.length > 5000 || ids.some(x=>!Number.isSafeInteger(x)||x<1))
        throw Object.assign(new Error('Seleção de exemplos inválida.'),{status:400});
    const unique=[...new Set(ids)];
    let added=0,existing=0,missing=0,conflicts=0;
    db.exec('BEGIN IMMEDIATE');
    try {
        const fetch=db.prepare('SELECT question,answer,normalized_question FROM neural_training_examples WHERE id=?');
        const find=db.prepare('SELECT answer FROM knowledge WHERE normalized_question=?');
        const insert=db.prepare(`INSERT INTO knowledge(id,question,normalized_question,answer,intent,origin)
          VALUES(?,?,?,?,?,?)`);
        for (const id of unique) {
            const item=fetch.get(id);
            if (!item) { missing++; continue; }
            const old=find.get(item.normalized_question);
            if (old) {if(normalize(old.answer)===normalize(item.answer))existing++;else conflicts++;continue;}
            const intent=/\bcapital\b/iu.test(item.question)?'capital':'outro';
            insert.run(randomUUID(),item.question,item.normalized_question,item.answer,intent,'neural-example');
            added++;
        }
        db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
    return {added,existing,missing,conflicts};
}
