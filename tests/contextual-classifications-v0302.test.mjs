import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {contextualClassificationAnswer} from '../server/reasoning/contextual-classifications.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v0302-'));
try {
 const db=openDatabase(join(dir,'test.sqlite'),{seed:false});
 const add=(s,p,o)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (lower(hex(randomblob(16))),?,?,?)').run(s,p,o);
 add('cachorro','e_um','mamifero');add('cachorro','e_um','vertebrado');add('cachorro','cor_tipica','marrom');
 const history=[{role:'user',content:'o que vc sabe sobre animais?'},{role:'assistant',content:'Sei que existem diversos grupos de animais...'}];
 const r=contextualClassificationAnswer(db,'e onde se encaixa o cachorro nestes grupos?',history);
 assert.match(r?.answer??'',/mamifero/);assert.match(r?.answer??'',/vertebrado/);assert.doesNotMatch(r?.answer??'',/marrom/);
 assert.equal(contextualClassificationAnswer(db,'e onde se encaixa o cachorro nestes grupos?',[]),null);
 assert.equal(contextualClassificationAnswer(db,'e onde se encaixa o rinoceronte nestes grupos?',history),null);
 assert.equal(contextualClassificationAnswer(db,'qual a cor do cachorro?',history),null);
 db.prepare("UPDATE conversational_templates SET template_text='Classificação: {entity} => {classes}' WHERE template_key='context-animal-classes'").run();
 assert.match(contextualClassificationAnswer(db,'quais categorias tem o cachorro?',history).answer,/Classificação: cachorro/);
 db.close();
 console.log('v0.30.2: classificação contextual, precedência, ausência de dados e template editável OK');
} finally {rmSync(dir,{recursive:true,force:true});}
