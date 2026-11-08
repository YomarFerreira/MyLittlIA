import {applyMigrations} from './migrate.js';
import { registerNeuralExamples } from '../neural/neural-examples.js';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const normalize = text => String(text).toLocaleLowerCase('pt-BR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export function openDatabase(path, { seed = true } = {}) {
    mkdirSync(dirname(path), { recursive: true });
    // A atualização nunca remove nem recria um banco já existente.
    const isNewDatabase = !existsSync(path);
    const db = new DatabaseSync(path);
    db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    // Schema is versioned. Future changes belong in separate migrations.
    const migrated = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
    if (!migrated || !db.prepare('SELECT version FROM schema_migrations WHERE version=1').get()) {
        db.exec('BEGIN');
        try {
            db.exec(readFileSync(new URL('./migrations/schema.sql', import.meta.url), 'utf8'));
            db.prepare('INSERT OR IGNORE INTO schema_migrations(version) VALUES (1)').run();
            db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    // Os exemplos iniciais são adicionados apenas na criação do banco.
    // Assim, uma exclusão feita pelo usuário não reaparece após reiniciar.
    if (seed && isNewDatabase) {
        const defaults = JSON.parse(readFileSync(new URL('../../data/seed.json', import.meta.url), 'utf8'));
        db.exec('BEGIN');
        try {
            const knowledgeInsert = db.prepare(`INSERT OR IGNORE INTO knowledge
                (id,question,normalized_question,answer,intent,origin) VALUES (?,?,?,?,?,?)`);
            for (const item of defaults.knowledge) {
                knowledgeInsert.run(item.id || randomUUID(), item.question, normalize(item.question), item.answer, item.intent, 'seed');
            }
            const exampleInsert = db.prepare(`INSERT OR IGNORE INTO training_examples
                (text,normalized_text,label,source) VALUES (?,?,?,?)`);
            for (const item of defaults.examples) exampleInsert.run(item.text, normalize(item.text), item.label, 'seed');
            db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
    applyMigrations(db);
    // Reaproveita o historico v0.13.2 sem exigir novo treinamento.
    // Reprocessamento idempotente: pares e vinculos possuem UNIQUE/PRIMARY KEY.
    db.exec('BEGIN IMMEDIATE');
    try {
        const previous = db.prepare('SELECT id,training_text FROM neural_training_runs').all();
        for (const run of previous) registerNeuralExamples(db,run.id,run.training_text);
        db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return db;
}

export const listKnowledge = db => db.prepare('SELECT id,question,answer,intent,origin FROM knowledge ORDER BY created_at,id').all();
export const listExamples = db => db.prepare('SELECT id,text,label,source FROM training_examples ORDER BY id').all();

function validateKnowledge(item) {
    const question = String(item?.question ?? '').trim();
    const answer = String(item?.answer ?? '').trim();
    const intent = String(item?.intent || 'outro').trim();
    if (question.length < 5 || question.length > 500 || !answer || answer.length > 1200 || intent.length > 80) {
        throw Object.assign(new Error('Pergunta (5–500 caracteres), resposta (1–1200) ou intenção inválida.'), { status: 400 });
    }
    return { question, answer, intent, normalized: normalize(question) };
}
export function createKnowledge(db, payload, origin = 'user') {
    const item = validateKnowledge(payload);
    const id = randomUUID();
    try {
        db.prepare(`INSERT INTO knowledge (id,question,normalized_question,answer,intent,origin)
            VALUES (?,?,?,?,?,?)`).run(id, item.question, item.normalized, item.answer, item.intent, origin);
    } catch (error) {
        if (String(error).includes('UNIQUE')) throw Object.assign(new Error('Pergunta já cadastrada.'), { status: 409 });
        throw error;
    }
    return db.prepare('SELECT id,question,answer,intent,origin FROM knowledge WHERE id=?').get(id);
}
export function editKnowledge(db, id, payload) {
    const item = validateKnowledge(payload);
    try {
        const result = db.prepare(`UPDATE knowledge SET question=?,normalized_question=?,answer=?,intent=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
            .run(item.question, item.normalized, item.answer, item.intent, id);
        if (!result.changes) throw Object.assign(new Error('Conhecimento não encontrado.'), { status: 404 });
    } catch (error) {
        if (String(error).includes('UNIQUE')) throw Object.assign(new Error('Pergunta já cadastrada.'), { status: 409 });
        throw error;
    }
    return db.prepare('SELECT id,question,answer,intent,origin FROM knowledge WHERE id=?').get(id);
}
export function removeKnowledge(db, id) {
    return db.prepare('DELETE FROM knowledge WHERE id=?').run(id).changes > 0;
}
export function mergeKnowledge(db, items, origin = 'browser-import') {
    if (!Array.isArray(items) || items.length > 5000) throw Object.assign(new Error('Lista inválida (máximo 5000).'), { status: 400 });
    let added = 0, skipped = 0;
    db.exec('BEGIN');
    try {
        const insert = db.prepare(`INSERT OR IGNORE INTO knowledge
            (id,question,normalized_question,answer,intent,origin) VALUES (?,?,?,?,?,?)`);
        for (const raw of items) {
            const item = validateKnowledge(raw);
            const result = insert.run(randomUUID(), item.question, item.normalized, item.answer, item.intent, origin);
            if (result.changes) added++; else skipped++;
        }
        db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return { added, skipped };
}
// Importação explícita: atualiza registros existentes por pergunta normalizada,
// preserva IDs e todas as perguntas omitidas do JSON. Transação integral.
export function importKnowledgeUpdates(db, items) {
    if (!Array.isArray(items) || items.length > 5000) {
        throw Object.assign(new Error('Lista inválida (máximo 5000).'), { status: 400 });
    }
    const validated = items.map(validateKnowledge);
    const seen = new Set();
    for (const item of validated) {
        if (seen.has(item.normalized)) {
            throw Object.assign(new Error('Pergunta duplicada no JSON: ' + item.question), { status: 400 });
        }
        seen.add(item.normalized);
    }
    let added = 0, updated = 0, unchanged = 0;
    db.exec('BEGIN');
    try {
        const find = db.prepare('SELECT id,question,answer,intent FROM knowledge WHERE normalized_question=?');
        const update = db.prepare(`UPDATE knowledge SET question=?,answer=?,intent=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`);
        const insert = db.prepare(`INSERT INTO knowledge(id,question,normalized_question,answer,intent,origin)
            VALUES (?,?,?,?,?,'json-import')`);
        for (const item of validated) {
            const old = find.get(item.normalized);
            if (!old) {
                insert.run(randomUUID(), item.question, item.normalized, item.answer, item.intent);
                added++;
            } else if (old.question !== item.question || old.answer !== item.answer || old.intent !== item.intent) {
                update.run(item.question,item.answer,item.intent,old.id);
                updated++;
            } else unchanged++;
        }
        db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return { added, updated, unchanged };
}

export function addTrainingExample(db, raw) {
    const text = String(raw?.text || '').trim();
    const label = String(raw?.label || '').trim();
    const labels = new Set(['bebida','comida','capital','saudacao','nome','outro']);
    if (!text || text.length > 300 || !labels.has(label)) throw Object.assign(new Error('Exemplo ou intenção inválidos.'), { status: 400 });
    const result = db.prepare(`INSERT OR IGNORE INTO training_examples (text,normalized_text,label,source)
        VALUES (?,?,?,'user')`).run(text, normalize(text), label);
    if (!result.changes) throw Object.assign(new Error('Exemplo já cadastrado.'), { status: 409 });
    return { id: Number(result.lastInsertRowid), text, label };
}
export function saveTraining(db, run) {
    const id = randomUUID();
    db.exec('BEGIN');
    try {
        db.prepare('INSERT INTO training_runs (id,epochs,learning_rate,example_count) VALUES (?,?,?,?)')
            .run(id, run.epochs, run.rate, run.examples);
        const insert = db.prepare(`INSERT INTO training_metrics
            (run_id,epoch,loss,val_loss,accuracy,val_accuracy) VALUES (?,?,?,?,?,?)`);
        for (const point of run.history) insert.run(id, point.epoch, point.loss, point.valLoss, point.accuracy, point.valAccuracy);
        db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return id;
}
export function saveInference(db, trace) {
    const id = randomUUID();
    const answer = trace.steps.at(-1)?.output?.answer ?? '';
    const source = trace.steps.at(-1)?.output?.knowledgeSource ?? 'unknown';
    db.exec('BEGIN');
    try {
        db.prepare(`INSERT INTO inference_runs
            (id,prompt,answer,source,input_tokens,output_tokens) VALUES (?,?,?,?,?,?)`)
            .run(id, trace.prompt, answer, source, trace.metrics.inputTokens, trace.metrics.outputTokens);
        const insert = db.prepare(`INSERT INTO inference_steps
            (inference_id,step_number,name,mode,step_json) VALUES (?,?,?,?,?)`);
        for (const step of trace.steps) insert.run(id, step.step, step.name, step.mode, JSON.stringify(step));
        db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return id;
}
