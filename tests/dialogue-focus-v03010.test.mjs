import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/persistence/database.js';
import {createRelation} from '../server/knowledge/relations.js';
import {sendChatMessage} from '../server/conversation/chat.js';
import {getSemanticState} from '../server/reasoning/semantic-core.js';

const dir=mkdtempSync(join(tmpdir(),'mylittlia-focus-'));
const db=openDatabase(join(dir,'test.db'),{seed:false});
try{
 assert.equal(db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get().v>=20,true);
 for(const [club, colors] of [['nautico',['vermelho','branco']],['sport',['vermelho','preto']],['santa_cruz',['vermelho','preto','branco']]]){
   createRelation(db,{subject:club,predicate:'e_um',object:'clube_de_futebol'});
   createRelation(db,{subject:club,predicate:'localizado_em',object:'pernambuco'});
   for(const cor of colors) createRelation(db,{subject:club,predicate:'possui_cor',object:cor});
 }
 let r=sendChatMessage(db,{text:'Quais as maiores cidades de Pernambuco?'});
 const cid=r.conversationId;
 r=sendChatMessage(db,{conversationId:cid,text:'extensão'});
 assert.equal(getSemanticState(db,cid).operation,'ranking');
 r=sendChatMessage(db,{conversationId:cid,text:'Quais clubes de futebol você conhece em Pernambuco?'});
 assert.match(r.reply,/N[aá]utico|Sport/);
 r=sendChatMessage(db,{conversationId:cid,text:'Quais são os títulos mais importantes dos times de Pernambuco?'});
 assert.match(r.reply,/competi[cç][aã]o espec[ií]fica|ainda n[aã]o tenho os t[ií]tulos/i);
 assert.doesNotMatch(r.reply,/Ainda n[aã]o sei responder/);
 r=sendChatMessage(db,{conversationId:cid,text:'E qual o maior deles?'});
 assert.match(r.reply,/crit[eé]rio/i);
 assert.doesNotMatch(r.reply,/km²|[áa]rea territorial de sport/i);
 r=sendChatMessage(db,{conversationId:cid,text:'Quais são as cores do Náutico?'});
 assert.match(r.reply,/vermelho|branco/i);
 r=sendChatMessage(db,{conversationId:cid,text:'E do Sport?'});
 assert.match(r.reply,/Sport|sport/i);
 assert.match(r.reply,/preto/i);
 assert.doesNotMatch(r.reply,/extens[aã]o|territorial|km²/i);
 assert.notEqual(getSemanticState(db,cid).operation,'ranking');
 r=sendChatMessage(db,{conversationId:cid,text:'Quais são as cores do Santa Cruz?'});
 assert.match(r.reply,/preto|branco/i);
 r=sendChatMessage(db,{conversationId:cid,text:'E do Náutico?'});
 assert.match(r.reply,/branco/i);
 assert.doesNotMatch(r.reply,/extens[aã]o|territorial|km²/i);
 // Caso o tópico imediatamente anterior não determine um atributo, recusa herança antiga.
 let other=sendChatMessage(db,{text:'Quais as maiores cidades de Pernambuco?'});
 const id2=other.conversationId;
 other=sendChatMessage(db,{conversationId:id2,text:'Extensão'});
 other=sendChatMessage(db,{conversationId:id2,text:'E do Sport?'});
 assert.match(other.reply,/gostaria de saber|sobre Sport/i);
 assert.doesNotMatch(other.reply,/Sport.*km²|[áa]rea.*Sport/i);
 // As respostas conversacionais podem ser modificadas pelo usuário sem alterar o código.
 db.prepare("UPDATE conversational_templates SET template_text='Critério necessário: {subject}.' WHERE template_key='focus-ranking-criteria'").run();
 let custom=sendChatMessage(db,{conversationId:cid,text:'Quais os títulos dos times de Pernambuco?'});
 custom=sendChatMessage(db,{conversationId:cid,text:'E qual o maior deles?'});
 assert.match(custom.reply,/Crit[eé]rio necess[aá]rio:/);
 console.log('v0.30.10: contexto por turno, clubes/cidades, cores, títulos, ranking ambíguo, SQLite templates OK');
}finally{db.close();rmSync(dir,{recursive:true,force:true});}
