import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openDatabase, createKnowledge } from '../server/persistence/database.js';
import { createRelation } from '../server/knowledge/relations.js';
import { semanticAnswer } from '../server/reasoning/semantic.js';
const folder=mkdtempSync(join(tmpdir(),'mylittlia-semantic-'));
try {
    const db=openDatabase(join(folder,'test.db'),{seed:false});
    createKnowledge(db,{question:'Qual é a capital do Rio de Janeiro?',answer:'A capital do estado do Rio de Janeiro é Rio de Janeiro.',intent:'capital'});
    for(const question of [
        'QUAL A CAPITAL DO RIO DE JANEIRO?',
        'Qual é a capital do Rio de Janeiro?',
        'Que cidade é a capital do estado do Rio de Janeiro?',
        'qual a capital do rio de janeiro'
    ]) {
        const result=semanticAnswer(db,question);
        assert.equal(result.kind,'semantic-knowledge',question);
        assert.equal(result.interpretation.entity,'rio de janeiro',question);
        assert.match(result.answer,/Rio de Janeiro/);
        assert.equal(result.interpretation.neuralUsedForAnswer,false);
    }
    assert.equal(semanticAnswer(db,'Qual é a capital de Atlântida?').kind,'unknown');
    assert.equal(semanticAnswer(db,'Qual é a cor do gato?'),null);
    createRelation(db,{subject:'alagoas',predicate:'e_um',object:'estado'});
    createRelation(db,{subject:'gato',predicate:'e_um',object:'felino'});
    assert.equal(semanticAnswer(db,'O gato é um felino?').kind,'inferred-relation');
    assert.equal(semanticAnswer(db,'Qual é a capital de Alagoas?').kind,'unknown');
    db.close();
    console.log('OK: variações semânticas, fatos existentes, desconhecido e inferência');
} finally { rmSync(folder,{recursive:true,force:true}); }
