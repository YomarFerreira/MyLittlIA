import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/persistence/database.js';
import { sendChatMessage } from '../server/conversation/chat.js';
import { semanticAnswer } from '../server/reasoning/semantic.js';
import { createRelation } from '../server/knowledge/relations.js';

const dir = mkdtempSync(join(tmpdir(), 'mylittlia-negation-'));
try {
    const db = openDatabase(join(dir, 'test.db'));
    const initial = sendChatMessage(db, { text: 'Sergipe não é violenta.' });
    assert.equal(initial.result.kind, 'conversation-rating-request');
    assert.match(initial.reply, /não é violenta/);
    const score = sendChatMessage(db, { conversationId: initial.conversationId, text: 'uns 98' });
    assert.equal(score.result.kind, 'conversation-knowledge-acquired');
    const relation = db.prepare("SELECT confidence FROM knowledge_relations WHERE subject='sergipe' AND object='violenta'").get();
    assert.ok(Math.abs(relation.confidence - 0.02) < 1e-8);
    const answer = sendChatMessage(db, { conversationId: initial.conversationId, text: 'Sergipe é violenta?' });
    assert.notEqual(answer.result.kind, 'unknown');
    assert.match(answer.reply, /não aparenta|baixo nível/i);
    assert.match(answer.reply, /dados confiáveis/i);

    // Testa consulta de dados antigos sem regravar os registros existentes.
    createRelation(db, { subject: 'Alagoas não', predicate: 'caracteristica', object: 'violenta', confidence: 0.98 });
    const old = semanticAnswer(db, 'Alagoas é violenta?');
    assert.ok(old);
    assert.match(old.answer, /não aparenta/i);
    const original = db.prepare("SELECT confidence FROM knowledge_relations WHERE subject='alagoas_nao'").get();
    assert.equal(original.confidence, 0.98);
    db.close();
    console.log('OK: negacao, nota coloquial, resposta e compatibilidade legada');
} finally {
    rmSync(dir, { recursive: true, force: true });
}
