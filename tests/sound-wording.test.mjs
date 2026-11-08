import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
const dir=mkdtempSync(join(tmpdir(),'mylittlia-sound-wording-'));const path=join(dir,'test.db');let db=openDatabase(path,{seed:false});
try {
 for(const [subject,predicate,object] of [['cachorro','som_emitido','latido'],['latido','onomatopeia','au_au'],['gato','som_emitido','miado'],['miado','onomatopeia','miau'],['vaca','som_emitido','mugido'],['mugido','onomatopeia','muuu']])createRelation(db,{subject,predicate,object});
 const original=db.prepare('SELECT * FROM knowledge_relations ORDER BY id').all();
 db.prepare("UPDATE conversational_templates SET template_text='Em português, {entity} {values}.' WHERE template_key='property-sound-description'").run();
 db.prepare('DELETE FROM schema_migrations WHERE version=24').run();db.close();db=openDatabase(path,{seed:false});
 for(const [animal,expected] of [['cachorro',/Cachorro late\. Esse som pode ser representado por “au au”\./],['gato',/Gato mia\. Esse som pode ser representado por “miau”\./],['vaca',/Vaca muge\. Esse som pode ser representado por “muuu”\./]]) {
  const r=sendChatMessage(db,{text:`Qual o som que o ${animal} faz?`});assert.match(r.reply,expected);assert.doesNotMatch(r.reply,/Em português/);console.log(r.reply);
 }
 assert.match(sendChatMessage(db,{text:'Como é o som do latido?'}).reply,/Latido pode ser representado por “au au”/);
 assert.deepEqual(db.prepare('SELECT * FROM knowledge_relations ORDER BY id').all(),original);
 db.prepare("UPDATE conversational_templates SET template_text='PERSONALIZADO {entity} {values}' WHERE template_key='property-sound-description'").run();
 db.prepare('DELETE FROM schema_migrations WHERE version=24').run();db.close();db=openDatabase(path,{seed:false});
 assert.match(sendChatMessage(db,{text:'Qual som o cachorro faz?'}).reply,/PERSONALIZADO/);
 console.log('OK: atualização do texto padrão, consultas, preservação dos fatos e das personalizações.');
}finally{db.close();rmSync(dir,{recursive:true,force:true});}
