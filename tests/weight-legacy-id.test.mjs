import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/persistence/database.js';
import { updateRelationWeight } from '../server/knowledge/relations.js';

const folder = mkdtempSync(join(tmpdir(), 'mylittlia-legacy-id-'));
const db = openDatabase(join(folder, 'test.db'), { seed: false });
try {
    const id = 'a'.repeat(32);
    const pattern = /^\/api\/relations\/([a-f0-9]{32}|[a-f0-9-]{36})\/weight$/;
    assert.equal(`/api/relations/${id}/weight`.match(pattern)?.[1], id);
    db.prepare(`INSERT INTO knowledge_relations (id,subject,predicate,object)
        VALUES (?,?,?,?)`).run(id, 'gato', 'pode_ingerir', 'leite_com_restricoes');
    const result = updateRelationWeight(db, id, { confidence: 0.8 });
    assert.equal(result.confidence, 0.8);
    assert.equal(db.prepare('SELECT confidence FROM knowledge_relations WHERE id=?').get(id).confidence, 0.8);
    console.log('OK: IDs SQL legados de 32 caracteres aceitos e peso persistido');
} finally {
    db.close();
    rmSync(folder, { recursive: true, force: true });
}
