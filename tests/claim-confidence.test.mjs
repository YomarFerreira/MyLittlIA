import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase } from '../server/persistence/database.js';
import { createRelation, listRelations, updateRelationWeight } from '../server/knowledge/relations.js';
import { semanticAnswer } from '../server/reasoning/semantic.js';

const dir = mkdtempSync(join(tmpdir(), 'mylittlia-confidence-'));
try {
    const db = openDatabase(join(dir, 'test.db'), { seed:false });
    createRelation(db, { subject:'estado de Pernambuco', predicate:'caracteristica', object:'violento' });
    const relation = listRelations(db)[0];
    const question = 'O estado de Pernambuco é violento?';
    const before = semanticAnswer(db, question);
    assert.match(before.answer, /ainda não foi avaliada/);
    const cases = [
        [0, 'não aparenta ter um nível elevado de violência'],
        [0.09, 'não aparenta ter um nível elevado de violência'],
        [0.1, 'baixo nível de violência'],
        [0.19, 'baixo nível de violência'],
        [0.2, 'nível de violência mediano'],
        [0.5, 'nível de violência mediano'],
        [0.79, 'nível de violência mediano'],
        [0.8, 'considerado violento'],
        [0.99, 'considerado violento'],
        [1, 'considerado muito violento']
    ];
    for (const [confidence, expected] of cases) {
        updateRelationWeight(db, relation.id, { confidence });
        const result = semanticAnswer(db, question);
        assert.equal(result.assessment.confidence, confidence);
        assert.equal(result.assessment.calibratedProbability, false);
        assert.match(result.answer, new RegExp(expected));
        assert.match(result.answer, /não tenho dados confiáveis suficientes/);
        assert.doesNotMatch(result.answer, /peso|0,5|escala de 0 a 1/i);
        assert.equal(result.path[0].confidence, confidence);
        assert.ok(result.assessment.qualitativeLevel);
    }
    createRelation(db, { subject:'gato', predicate:'caracteristica', object:'felino' });
    const other = semanticAnswer(db, 'O gato é felino?');
    assert.match(other.answer, /evidências independentes/);
    assert.doesNotMatch(other.answer, /violência|peso|escala de 0 a 1/i);
    db.close();
    console.log('OK: classificações qualitativas e valores apenas no trace técnico');
} finally { rmSync(dir, { recursive:true, force:true }); }
