import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {propertyQueryAnswer} from '../server/reasoning/property-query.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-v0301-'));
try {
 const db=openDatabase(join(dir,'test.sqlite'),{seed:false});
 const add=(subject,predicate,object)=>db.prepare('INSERT INTO knowledge_relations(id,subject,predicate,object) VALUES (lower(hex(randomblob(16))),?,?,?)').run(subject,predicate,object);
 add('borboleta','cor_tipica','diversas_cores');
 add('gato','bebe','agua');
 add('vaca','e_um','herbivoro');
 add('herbivoro','come','plantas');
 add('capivara','habitat','margens_de_rios');
 add('peixe','respira_por','branquias');
 assert.match(propertyQueryAnswer(db,'Qual a cor de uma borboleta?')?.answer??'',/diversas cores/);
 assert.match(propertyQueryAnswer(db,'O que o gato bebe?')?.answer??'',/agua/);
 assert.match(propertyQueryAnswer(db,'O que a vaca come?')?.answer??'',/plantas/);
 assert.match(propertyQueryAnswer(db,'Onde vive a capivara?')?.answer??'',/margens de rios/);
 assert.match(propertyQueryAnswer(db,'Como o peixe respira?')?.answer??'',/branquias/);
 assert.equal(propertyQueryAnswer(db,'Qual a velocidade da borboleta?'),null);
 db.prepare("UPDATE conversational_templates SET template_text='Resposta editada: {values}' WHERE template_key='property-color'").run();
 assert.match(propertyQueryAnswer(db,'Qual a cor da borboleta?').answer,/Resposta editada/);
 db.close();
 console.log('v0.30.1: consultas, herança explícita, ausência de dados e template editável OK');
} finally {rmSync(dir,{recursive:true,force:true});}
