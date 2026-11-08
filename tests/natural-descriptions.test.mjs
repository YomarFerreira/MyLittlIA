import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/persistence/database.js';
import { createRelation, inferRelation } from '../server/knowledge/relations.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-natural-'));
try {
 const db=openDatabase(join(dir,'test.db'),{seed:false});
 for(const [subject,predicate,object] of [['flamingo','e_um','ave'],['flamingo','cor_tipica','rosada'],['ave','possui','penas']])
   createRelation(db,{subject,predicate,object,confidence:null});
 const result=inferRelation(db,'O que é um flamingo?');
 assert.match(result.answer,/uma ave/);
 assert.match(result.answer,/rosada/);
 assert.match(result.answer,/penas/);
 assert.equal(result.path.length,3);
 assert.equal(result.score,null);
 assert.equal(inferRelation(db,'O que é um ornitorrinco?'),null);
 db.close();
 console.log('OK: descrição natural por relações reais, sem pesos inventados');
} finally {rmSync(dir,{recursive:true,force:true});}
