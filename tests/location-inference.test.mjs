import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation,inferRelation} from '../server/knowledge/relations.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-location-'));
try {
  const db=openDatabase(join(dir,'test.db'),{seed:false});
  createRelation(db,{subject:'amapa',predicate:'localizado_em',object:'norte',confidence:null});
  for(const question of ['O Amapá fica no norte do Brasil?','Amapá está localizado na região Norte?','O Amapá fica no Norte?']) {
    const result=inferRelation(db,question);
    assert.equal(result?.kind,'graph-location', question);
    assert.match(result.answer,/Região Norte do Brasil/);
    assert.equal(result.path[0].predicate,'localizado_em');
  }
  assert.notEqual(inferRelation(db,'O Amapá fica no sul do Brasil?')?.kind,'graph-location');
  db.close();
  console.log('OK: localização positiva sem peso, sem inventar negativa');
} finally {rmSync(dir,{recursive:true,force:true})}
