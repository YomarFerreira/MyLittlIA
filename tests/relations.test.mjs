import {openDatabase,closeDatabases,LATEST_SCHEMA_VERSION} from './helpers/database.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createRelation, listRelations, inferRelation, submitStatement,
    listProposals, reviewProposal } from '../server/knowledge/relations.js';

const dir = mkdtempSync(join(tmpdir(), 'mylittlia-relations-'));
try {
    const file = join(dir, 'test.db');
    const db = openDatabase(file);
    assert.equal(inferRelation(db,'O gato é um animal?').kind,'unknown');
    const submitted = submitStatement(db,'O gato é um felino');
    assert.ok(submitted.proposal);
    assert.equal(listProposals(db).length,1);
    assert.equal(listRelations(db).length,0,'proposta não é conhecimento aprovado');
    reviewProposal(db,submitted.proposal.id,'approved');
    assert.equal(listRelations(db).length,1);
    assert.equal(inferRelation(db,'O gato é um felino?').kind,'inferred-relation');
    createRelation(db,{subject:'felino',predicate:'e_um',object:'mamífero'});
    createRelation(db,{subject:'mamífero',predicate:'e_um',object:'animal'});
    const response=inferRelation(db,'O gato é um animal?');
    assert.equal(response.path.length,3);
    assert.equal(response.kind,'inferred-relation');
    const duplicate=createRelation(db,{subject:'gato',predicate:'e_um',object:'felino'});
    assert.equal(duplicate.inserted,false);
    const rejected=submitStatement(db,'O cachorro é um canino',submitted.conversationId);
    reviewProposal(db,rejected.proposal.id,'rejected');
    assert.equal(inferRelation(db,'O cachorro é um canino?').kind,'unknown');
    assert.ok(db.prepare('SELECT COUNT(*) AS count FROM conversation_messages').get().count>=4);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count,LATEST_SCHEMA_VERSION);
    const countBefore=db.prepare('SELECT COUNT(*) AS count FROM knowledge_relations').get().count;
    db.close();
    assert.ok(existsSync(file));
    const reopened=openDatabase(file);
    assert.equal(reopened.prepare('SELECT COUNT(*) AS count FROM knowledge_relations').get().count,countBefore);
    assert.equal(reopened.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count,LATEST_SCHEMA_VERSION);
    reopened.close();
    console.log('OK: migração v2, conversa, aprovação/rejeição, inferência transitiva, persistência');
} finally {closeDatabases(); rmSync(dir,{recursive:true,force:true}); }
